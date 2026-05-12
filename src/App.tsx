import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaGamepad, FaSearch, FaTrash, FaArrowLeft, FaPlus, FaClock, FaMicrochip } from 'react-icons/fa'

// ---------- Types ----------
interface Game {
  id: number
  name: string
  background_image: string | null
  released: string
  genres: { name: string }[]
  metacritic: number | null
}

interface UserGame extends Game {
  addedAt: string
  performance: GamePerformance | null
  hltb: HLTBData | null
}

interface GamePerformance {
  preset: string
  fps: number
  tdp: number
  notes: string
}

interface HLTBData {
  mainStory: number
  mainPlusExtras: number
  completionist: number
}

// ---------- Performance DB ----------
const PERF_DB: Record<string, GamePerformance> = {
  'elden ring': { preset: 'High', fps: 45, tdp: 25, notes: 'RSR on' },
  'cyberpunk 2077': { preset: 'Medium', fps: 40, tdp: 25, notes: 'FSR Balanced' },
  'red dead redemption 2': { preset: 'Medium', fps: 45, tdp: 25, notes: 'Favor Performance' },
  'the witcher 3': { preset: 'High', fps: 60, tdp: 20, notes: 'Hairworks Off' },
  'crimson desert': { preset: 'Medium', fps: 35, tdp: 25, notes: 'FSR Performance' },
  'hogwarts legacy': { preset: 'Low', fps: 40, tdp: 25, notes: 'FSR 2 Performance' },
  'god of war': { preset: 'Original', fps: 50, tdp: 25, notes: 'DLSS/FSR Balanced' },
  'spider-man': { preset: 'Medium', fps: 55, tdp: 25, notes: 'FSR 2.0 Performance' },
  'baldur\'s gate 3': { preset: 'Medium', fps: 40, tdp: 25, notes: 'FSR Ultra Quality' },
  'diablo 4': { preset: 'High', fps: 60, tdp: 20, notes: 'FSR 2 Quality' },
  'fortnite': { preset: 'Low', fps: 90, tdp: 15, notes: 'Performance mode' },
  'gta v': { preset: 'High', fps: 60, tdp: 20, notes: 'Very High' },
  'forza horizon 5': { preset: 'High', fps: 60, tdp: 20, notes: 'Dynamic Optimisation' },
  'overwatch 2': { preset: 'High', fps: 100, tdp: 15, notes: 'Epic settings' },
}

// ---------- Storage ----------
const STORAGE_KEY = 'reaper-vault'

const loadLibrary = (): UserGame[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
const saveLibrary = (lib: UserGame[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))

// ---------- API ----------
const RAWQ_KEY = '4d04b89bb977405d831f7dd24b492dd7'

const searchRAWG = async (q: string): Promise<Game[]> => {
  const res = await fetch(`https://api.rawg.io/api/games?key=${RAWQ_KEY}&search=${encodeURIComponent(q)}&page_size=8`)
  if (!res.ok) throw new Error('Search failed')
  const data = await res.json()
  return data.results || []
}

const getGameDetails = async (id: number): Promise<Game> => {
  const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${RAWQ_KEY}`)
  if (!res.ok) throw new Error('Details failed')
  return res.json()
}

const searchHLTB = async (name: string): Promise<HLTBData | null> => {
  try {
    const res = await fetch('https://howlongtobeat.com/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchType: 'games', searchTerms: [name], searchPage: 1, size: 20 })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.data?.length) return null
    const b = data.data[0]
    return {
      mainStory: (b.comp_main || 0) / 3600,
      mainPlusExtras: (b.comp_plus || 0) / 3600,
      completionist: (b.comp_100 || 0) / 3600
    }
  } catch { return null }
}

const getPerformance = (name: string, year: number, genres: string[]): GamePerformance => {
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(PERF_DB)) {
    if (lower.includes(key)) return val
  }
  if (genres.some(g => g.toLowerCase().includes('indie'))) return { preset: 'High', fps: 60, tdp: 15, notes: 'Indie' }
  if (year >= 2023) return { preset: 'Low', fps: 40, tdp: 25, notes: 'Modern title' }
  if (year <= 2018) return { preset: 'High', fps: 60, tdp: 15, notes: 'Older title' }
  return { preset: 'Medium', fps: 50, tdp: 20, notes: 'Estimated' }
}

// ---------- Pages ----------
type Page = 'library' | 'search' | 'detail'

// ---------- Particles ----------
const Particles = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    {Array.from({ length: 30 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-0.5 h-0.5 bg-cyan-400/40 rounded-full"
        style={{
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animation: `twinkle ${2 + Math.random() * 3}s infinite ${Math.random() * 2}s`
        }}
      />
    ))}
    <style>{`@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:.8}}`}</style>
  </div>
)

// ---------- Main ----------
export default function App() {
  const [page, setPage] = useState<Page>('library')
  const [library, setLibrary] = useState<UserGame[]>(() => loadLibrary())
  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null)

  useEffect(() => { saveLibrary(library) }, [library])

  const addGame = async (game: Game) => {
    setPage('library')
    const [details, hltb] = await Promise.all([
      getGameDetails(game.id),
      searchHLTB(game.name)
    ])
    const year = parseInt(details.released?.split('-')[0]) || 2022
    const perf = getPerformance(details.name, year, details.genres?.map(g => g.name) || [])
    const newGame: UserGame = {
      ...details,
      addedAt: new Date().toISOString(),
      performance: perf,
      hltb
    }
    setLibrary(prev => [newGame, ...prev.filter(g => g.id !== newGame.id)])
    setSelectedGame(newGame)
  }

  const removeGame = (id: number) => setLibrary(prev => prev.filter(g => g.id !== id))

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f]">
      <Particles />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#090a0f]/80 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center gap-3">
        {page === 'detail' ? (
          <button onClick={() => { setPage('library'); setSelectedGame(null) }} className="text-cyan-400 p-2 -ml-2">
            <FaArrowLeft size={24} />
          </button>
        ) : (
          <FaGamepad className="text-cyan-400" size={28} />
        )}
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          {page === 'library' ? 'Reaper Vault' : page === 'search' ? 'Search Games' : selectedGame?.name || 'Details'}
        </h1>
        {page === 'library' && (
          <button onClick={() => setPage('search')} className="ml-auto text-cyan-400 p-2">
            <FaSearch size={24} />
          </button>
        )}
      </header>

      {/* Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page + (selectedGame?.id || '')}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="flex-1 px-5 py-5"
        >
          {page === 'library' && (
            <LibraryPage library={library} onSelect={(g) => { setSelectedGame(g); setPage('detail') }} onDelete={removeGame} onAddClick={() => setPage('search')} />
          )}
          {page === 'search' && (
            <SearchPage onAdd={addGame} onBack={() => setPage('library')} />
          )}
          {page === 'detail' && selectedGame && (
            <DetailPage game={selectedGame} onDelete={() => { removeGame(selectedGame.id); setPage('library'); setSelectedGame(null) }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Nav - أضخم */}
      <nav className="sticky bottom-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/10 px-8 py-4 flex justify-around z-20">
        {[
          { id: 'library', icon: FaGamepad, label: 'Vault' },
          { id: 'search', icon: FaSearch, label: 'Search' }
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setPage(id as Page); setSelectedGame(null) }}
            className={`flex flex-col items-center gap-1.5 transition-all duration-200 transform active:scale-90 ${page === id ? 'text-cyan-400 scale-110' : 'text-gray-500'}`}
          >
            <Icon size={26} />
            <span className="text-xs font-semibold tracking-wide">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ---------- Library Page (محسّنة) ----------
function LibraryPage({ library, onSelect, onDelete, onAddClick }: {
  library: UserGame[]
  onSelect: (g: UserGame) => void
  onDelete: (id: number) => void
  onAddClick: () => void
}) {
  return (
    <div>
      <p className="text-gray-500 text-sm mb-6 font-medium">{library.length} games in vault</p>
      {library.length === 0 ? (
        <div className="text-center mt-24 text-gray-500">
          <FaGamepad className="mx-auto text-4xl mb-4 opacity-30" />
          <p className="text-lg">No games yet</p>
          <button onClick={onAddClick} className="mt-4 bg-cyan-400 text-black px-8 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
            Search & Add
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {library.map(game => (
            <motion.div key={game.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
              <div className="flex">
                <img src={game.background_image || 'https://via.placeholder.com/120x160'} alt="" className="w-28 h-32 object-cover" />
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <button onClick={() => onSelect(game)} className="font-bold text-base text-left hover:text-cyan-400 line-clamp-2 mb-2">{game.name}</button>
                    <div className="flex gap-2 flex-wrap">
                      {game.genres?.slice(0, 2).map(g => <span key={g.name} className="text-[11px] px-2 py-1 bg-[#1e1e1e] rounded-lg">{g.name}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                    {game.performance && (
                      <span className="flex items-center gap-1.5 text-cyan-400 font-semibold bg-cyan-400/10 px-2 py-1 rounded-lg">
                        <FaMicrochip size={14} />
                        {game.performance.fps}fps {game.performance.preset}
                      </span>
                    )}
                    {game.hltb && (
                      <span className="flex items-center gap-1.5 font-semibold bg-gray-800 px-2 py-1 rounded-lg">
                        <FaClock size={14} />
                        {Math.round(game.hltb.mainStory)}h
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => onDelete(game.id)} className="p-3 text-gray-700 hover:text-red-500 transition-colors self-start">
                  <FaTrash size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Search Page (محسّنة) ----------
function SearchPage({ onAdd, onBack }: { onAdd: (g: Game) => void; onBack: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (query.trim().length < 3) return
    setLoading(true)
    setError('')
    try {
      const res = await searchRAWG(query)
      setResults(res)
    } catch { setError('Search failed') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search game..."
          className="flex-1 bg-[#111] border border-white/5 rounded-2xl px-5 py-4 text-base outline-none focus:border-cyan-400 transition-colors"
          autoFocus
        />
        <button onClick={handleSearch} className="bg-cyan-400 text-black px-5 rounded-2xl font-bold active:scale-95 transition-transform">
          <FaSearch size={20} />
        </button>
      </div>

      {loading && <p className="text-gray-500 text-sm text-center py-10">Searching...</p>}
      {error && <p className="text-red-400 text-sm text-center py-10">{error}</p>}

      <div className="space-y-3">
        {results.map(game => (
          <motion.div key={game.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex bg-[#111] border border-white/5 rounded-2xl overflow-hidden items-center active:scale-[0.98] transition-transform">
            <img src={game.background_image || 'https://via.placeholder.com/80x100'} className="w-20 h-24 object-cover" />
            <div className="flex-1 px-4">
              <p className="font-bold text-base line-clamp-2">{game.name}</p>
              <p className="text-xs text-gray-500 mt-1">{game.released || 'TBA'}</p>
            </div>
            <button onClick={() => onAdd(game)} className="p-4 text-cyan-400 active:scale-75 transition-transform">
              <FaPlus size={22} />
            </button>
          </motion.div>
        ))}
      </div>

      {!loading && !error && query.length >= 3 && results.length === 0 && (
        <p className="text-gray-500 text-center mt-10">No games found</p>
      )}
    </div>
  )
}

// ---------- Detail Page (محسّنة) ----------
function DetailPage({ game, onDelete }: { game: UserGame; onDelete: () => void }) {
  const { performance: perf, hltb } = game
  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden mb-6 shadow-2xl shadow-black">
        <img src={game.background_image || ''} className="w-full h-52 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <h2 className="absolute bottom-5 left-5 text-2xl font-extrabold pr-4 drop-shadow-lg">{game.name}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 text-center">
          <FaMicrochip className="text-cyan-400 mx-auto mb-2" size={28}/>
          <p className="text-3xl font-extrabold font-mono">{perf?.fps || '?'}<span className="text-base text-gray-400 font-normal"> fps</span></p>
          <p className="text-sm text-gray-400 mt-1">{perf?.preset} • {perf?.tdp}W</p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 text-center">
          <FaClock className="text-purple-400 mx-auto mb-2" size={28}/>
          <p className="text-3xl font-extrabold">{hltb ? Math.round(hltb.mainStory) : '?'}<span className="text-base text-gray-400 font-normal"> h</span></p>
          <p className="text-sm text-gray-400 mt-1">Main Story</p>
        </div>
      </div>

      {hltb && (
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 grid grid-cols-3 text-center mb-6">
          <div><p className="font-extrabold text-2xl">{Math.round(hltb.mainStory)}h</p><p className="text-gray-500 text-xs mt-1">Main</p></div>
          <div><p className="font-extrabold text-2xl">{Math.round(hltb.mainPlusExtras)}h</p><p className="text-gray-500 text-xs mt-1">+Extras</p></div>
          <div><p className="font-extrabold text-2xl">{Math.round(hltb.completionist)}h</p><p className="text-gray-500 text-xs mt-1">100%</p></div>
        </div>
      )}

      <button onClick={onDelete} className="w-full bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl py-4 text-base font-bold active:scale-95 transition-transform">
        Remove from Vault
      </button>
    </div>
  )
}
