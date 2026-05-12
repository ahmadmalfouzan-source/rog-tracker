import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ---------- Types ----------
interface Game {
  id: number
  name: string
  background_image: string | null
  released: string
  genres: { name: string }[]
}
interface UserGame extends Game {
  addedAt: string
  performance: { preset: string; fps: number; tdp: number } | null
  hltb: { mainStory: number; mainPlusExtras: number; completionist: number } | null
}
type Page = 'library' | 'search' | 'detail'

// ---------- Storage ----------
const STORAGE_KEY = 'reaper-vault'
const loadLibrary = (): UserGame[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
const saveLibrary = (lib: UserGame[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))

// ---------- APIs & Helpers ----------
const RAWQ_KEY = '4d04b89bb977405d831f7dd24b492dd7'
const PERF_DB: Record<string, { preset: string; fps: number; tdp: number }> = {
  'elden ring': { preset: 'High', fps: 45, tdp: 25 },
  'cyberpunk 2077': { preset: 'Medium', fps: 40, tdp: 25 },
  'red dead redemption 2': { preset: 'Medium', fps: 45, tdp: 25 },
  'the witcher 3': { preset: 'High', fps: 60, tdp: 20 },
}

const searchRAWG = async (q: string): Promise<Game[]> => {
  const res = await fetch(`https://api.rawg.io/api/games?key=${RAWQ_KEY}&search=${encodeURIComponent(q)}&page_size=8`)
  if (!res.ok) throw new Error('Search failed')
  const data = await res.json()
  return data.results || []
}
const fetchHLTB = async (name: string) => {
  try {
    const res = await fetch('https://howlongtobeat.com/api/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
const getPerformance = (name: string, year: number): { preset: string; fps: number; tdp: number } => {
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(PERF_DB)) if (lower.includes(key)) return val
  if (year <= 2018) return { preset: 'High', fps: 60, tdp: 15 }
  if (year >= 2023) return { preset: 'Low', fps: 40, tdp: 25 }
  return { preset: 'Medium', fps: 50, tdp: 20 }
}

// ---------- Main App ----------
export default function App() {
  const [page, setPage] = useState<Page>('library')
  const [library, setLibrary] = useState<UserGame[]>(() => loadLibrary())
  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null)

  useEffect(() => { saveLibrary(library) }, [library])

  const addGame = async (game: Game) => {
    setPage('library')
    const [details, hltb] = await Promise.all([
      Promise.resolve(game), // Minimal fetching, real details are already in search
      fetchHLTB(game.name)
    ])
    const year = parseInt(details.released?.split('-')[0]) || 2022
    const newGame: UserGame = { ...details, addedAt: new Date().toISOString(), performance: getPerformance(details.name, year), hltb }
    setLibrary(prev => [newGame, ...prev.filter(g => g.id !== newGame.id)])
    setSelectedGame(newGame)
  }
  const removeGame = (id: number) => setLibrary(prev => prev.filter(g => g.id !== id))

  return (
    <div className="min-h-screen flex flex-col bg-[#121318] text-[#e3e1e9]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-5 h-16 bg-[rgba(18,20,28,0.7)] backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#c3f5ff] text-[24px]">sports_esports</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">{page === 'detail' ? selectedGame?.name : 'Reaper Vault'}</h1>
        </div>
        {page === 'detail' ? (
          <button onClick={() => { setPage('library'); setSelectedGame(null) }} className="text-[#849396] p-2 -mr-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : (
          <button onClick={() => setPage('search')} className="text-[#c3f5ff]">
            <span className="material-symbols-outlined">search</span>
          </button>
        )}
      </header>

      {/* Body */}
      <AnimatePresence mode="wait">
        <motion.div key={page + (selectedGame?.id || '')} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="flex-1 px-5 pt-20 pb-28">
          {page === 'library' && <LibraryPage library={library} onSelect={(g) => { setSelectedGame(g); setPage('detail') }} onDelete={removeGame} />}
          {page === 'search' && <SearchPage onAdd={addGame} />}
          {page === 'detail' && selectedGame && <DetailPage game={selectedGame} onDelete={() => { removeGame(selectedGame.id); setPage('library'); setSelectedGame(null) }} />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full h-20 flex justify-around items-center px-8 bg-[rgba(18,20,28,0.7)] backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,218,243,0.15)] z-50">
        <button onClick={() => { setPage('library'); setSelectedGame(null) }} className={`flex flex-col items-center gap-1 transition-all ${page === 'library' ? 'text-[#c3f5ff] scale-110' : 'text-[#849396]'}`}>
          <span className="material-symbols-outlined text-[28px]">shelves</span>
        </button>
        <button onClick={() => setPage('search')} className={`flex flex-col items-center gap-1 transition-all ${page === 'search' ? 'text-[#c3f5ff] scale-110' : 'text-[#849396]'}`}>
          <span className="material-symbols-outlined text-[28px]">search</span>
        </button>
      </nav>
    </div>
  )
}

// ---------- Library Page (Stitch Design) ----------
function LibraryPage({ library, onSelect, onDelete }: { library: UserGame[]; onSelect: (g: UserGame) => void; onDelete: (id: number) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {library.length === 0 ? (
        <div className="text-center mt-24 text-[#849396]">
          <span className="material-symbols-outlined text-6xl opacity-50 mb-4">ghost</span>
          <p className="text-lg">No games yet</p>
        </div>
      ) : (
        library.map(game => (
          <article key={game.id} className="glass-panel rounded-xl p-4 flex gap-4 relative group">
            <div className="w-28 h-[112px] shrink-0 rounded-lg overflow-hidden border border-white/10">
              <img src={game.background_image || 'https://via.placeholder.com/112'} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-between flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <button onClick={() => onSelect(game)} className="text-xl font-bold text-left line-clamp-2 mb-1"><span className="material-symbols-outlined">arrow_back</span>text-[#e3e1e9] hover:text-[#c3f5ff]">{game.name}</button>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {game.genres?.map(g => <span key={g.name} className="px-2 py-1 rounded bg-[#292a2f] border border-[#3b494c] text-[11px]">{g.name}</span>)}
                  </div>
                </div>
                <button onClick={() => onDelete(game.id)} className="text-[#849396] opacity-0 group-hover:opacity-100 transition-opacity p-2"><span className="material-symbols-outlined">delete</span></button>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                {game.performance && <span className="px-2 py-1 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#c3f5ff] font-bold text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">speed</span>{game.performance.fps} FPS @ {game.performance.preset}</span>}
                {game.hltb && <span className="px-2 py-1 rounded-full bg-[#34343a] font-bold text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{Math.round(game.hltb.mainStory)}h</span>}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  )
}

// ---------- Search Page (Stitch Design) ----------
function SearchPage({ onAdd }: { onAdd: (g: Game) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (query.trim().length < 3) return
    setLoading(true)
    try { setResults(await searchRAWG(query)) } catch { console.error('Search error') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#849396]">search</span>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="w-full bg-[#34343a]/60 border border-white/10 rounded-full py-4 pl-12 pr-12 text-lg focus:outline-none focus:border-[#00e5ff] backdrop-blur-md" placeholder="Search games..." />
        {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#849396]"><span className="material-symbols-outlined">close</span></button>}
      </div>
      
      {loading && <p className="text-center py-10 text-[#849396]">Searching...</p>}
      
      <div className="flex flex-col gap-3">
        {results.map(game => (
          <div key={game.id} className="flex items-center gap-4 p-2 bg-[#121318]/40 backdrop-blur-xl border border-white/10 rounded-xl group">
            <div className="w-[60px] h-[80px] rounded-lg overflow-hidden shrink-0 border border-white/5">
              <img src={game.background_image || ''} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-xl font-bold truncate group-hover:text-[#c3f5ff]">{game.name}</h3>
              <p className="text-sm text-[#849396]">{game.released || 'TBA'}</p>
            </div>
            <button onClick={() => onAdd(game)} className="w-9 h-9 rounded-full border border-[#00e5ff]/50 text-[#c3f5ff] flex items-center justify-center shrink-0"><span className="material-symbols-outlined">add</span></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Detail Page (Stitch Design) ----------
function DetailPage({ game, onDelete }: { game: UserGame; onDelete: () => void }) {
  return (
    <div>
      <div className="relative rounded-xl overflow-hidden mb-6 h-52">
        <img src={game.background_image || ''} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121318] via-[#121318]/80 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <h2 className="text-3xl font-extrabold text-[#c3f5ff] drop-shadow-[0_0_12px_rgba(195,245,255,0.4)]">{game.name}</h2>
          <div className="flex gap-2 mt-1">{game.genres?.map(g => <span key={g.name} className="px-2 py-1 bg-[#6800ec]/30 border border-[#d1bcff]/20 rounded text-xs">{g.name}</span>)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-panel rounded-xl p-4 border-[#00e5ff]/10">
          <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[#00daf3]">speed</span><h3 className="font-bold text-xs">PERFORMANCE</h3></div>
          <div className="flex items-baseline justify-between border-b border-white/5 pb-1"><span className="text-3xl font-extrabold text-[#00daf3]">{game.performance?.fps || '?'}</span><span className="text-xs">FPS</span></div>
          <div className="flex justify-between mt-1 text-sm"><span>Preset</span><span className="font-bold">{game.performance?.preset || 'N/A'}</span></div>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[#d1bcff]">schedule</span><h3 className="font-bold text-xs">MAIN STORY</h3></div>
          <div className="flex items-baseline gap-1"><span className="text-4xl font-extrabold text-[#d1bcff]">{game.hltb ? Math.round(game.hltb.mainStory) : '?'}</span><span className="text-xs">HRS</span></div>
        </div>
      </div>

      {game.hltb && (
        <div className="glass-panel rounded-xl overflow-hidden mb-6">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            <div className="p-4 text-center bg-white/5"><span className="text-xs">Main</span><p className="text-2xl font-bold">{Math.round(game.hltb.mainStory)}h</p></div>
            <div className="p-4 text-center"><span className="text-xs">Extras</span><p className="text-2xl font-bold">{Math.round(game.hltb.mainPlusExtras)}h</p></div>
            <div className="p-4 text-center"><span className="text-xs">100%</span><p className="text-2xl font-bold text-[#d1bcff]">{Math.round(game.hltb.completionist)}h</p></div>
          </div>
        </div>
      )}

      <button onClick={onDelete} className="w-full py-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined">delete</span>Remove from Vault</button>
    </div>
  )
}// ---------- Pages ----------
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
