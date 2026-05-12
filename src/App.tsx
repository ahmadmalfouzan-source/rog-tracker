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

// ---------- APIs ----------
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

export default function App() {
  const [page, setPage] = useState<Page>('library')
  const [library, setLibrary] = useState<UserGame[]>(() => loadLibrary())
  const [selectedGame, setSelectedGame] = useState<UserGame | null>(null)

  useEffect(() => { saveLibrary(library) }, [library])

  const addGame = async (game: Game) => {
    setPage('library')
    const hltb = await fetchHLTB(game.name)
    const year = parseInt(game.released?.split('-')[0]) || 2022
    const newGame: UserGame = { ...game, addedAt: new Date().toISOString(), performance: getPerformance(game.name, year), hltb }
    setLibrary(prev => [newGame, ...prev.filter(g => g.id !== newGame.id)])
    setSelectedGame(newGame)
  }
  const removeGame = (id: number) => setLibrary(prev => prev.filter(g => g.id !== id))

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md">
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-margin-mobile h-16 bg-surface/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">sports_esports</span>
          <h1 className="font-display-lg text-display-lg text-gradient">{page === 'detail' ? selectedGame?.name : 'Reaper Vault'}</h1>
        </div>
        {page === 'detail' ? (
          <button onClick={() => { setPage('library'); setSelectedGame(null) }} className="text-outline p-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : (
          <button onClick={() => setPage('search')} className="text-primary">
            <span className="material-symbols-outlined">search</span>
          </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={page + (selectedGame?.id || '')} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="flex-1 pt-20 pb-24 px-margin-mobile">
          {page === 'library' && <LibraryPage library={library} onSelect={(g) => { setSelectedGame(g); setPage('detail') }} onDelete={removeGame} />}
          {page === 'search' && <SearchPage onAdd={addGame} />}
          {page === 'detail' && selectedGame && <DetailPage game={selectedGame} onDelete={() => { removeGame(selectedGame.id); setPage('library'); setSelectedGame(null) }} />}
        </motion.div>
      </AnimatePresence>

      <nav className="fixed bottom-0 w-full h-20 flex justify-around items-center px-xl pb-safe bg-surface/70 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,218,243,0.15)] z-50">
        <button onClick={() => { setPage('library'); setSelectedGame(null) }} className={`flex flex-col items-center gap-1 transition-all ${page === 'library' ? 'text-primary scale-110' : 'text-outline opacity-50'}`}>
          <span className="material-symbols-outlined text-[28px]">shelves</span>
        </button>
        <button onClick={() => setPage('search')} className={`flex flex-col items-center gap-1 transition-all ${page === 'search' ? 'text-primary scale-110' : 'text-outline opacity-50'}`}>
          <span className="material-symbols-outlined text-[28px]">search</span>
        </button>
      </nav>
    </div>
  )
}

// ---------- Library Page (Stitch Design) ----------
function LibraryPage({ library, onSelect, onDelete }: { library: UserGame[]; onSelect: (g: UserGame) => void; onDelete: (id: number) => void }) {
  return (
    <div className="flex flex-col gap-md">
      {library.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-xl my-xl text-center glass-panel rounded-xl p-lg">
          <span className="material-symbols-outlined text-6xl text-outline opacity-50 mb-md">ghost</span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-sm">No games yet</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">Your vault is empty. Start adding games to track your stats.</p>
        </div>
      ) : (
        library.map(game => (
          <article key={game.id} className="glass-panel rounded-xl p-md flex gap-md relative group">
            <div className="w-28 h-[112px] shrink-0 rounded-lg overflow-hidden border border-white/10">
              <img src={game.background_image || 'https://via.placeholder.com/112'} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-between flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <button onClick={() => onSelect(game)} className="font-headline-sm text-headline-sm text-on-surface text-left line-clamp-2 mb-xs hover:text-primary">{game.name}</button>
                  <div className="flex flex-wrap gap-xs mb-sm">
                    {game.genres?.map(g => <span key={g.name} className="px-sm py-xs rounded bg-surface-container-high border border-outline-variant font-label-sm text-label-sm text-on-surface-variant">{g.name}</span>)}
                  </div>
                </div>
                <button onClick={() => onDelete(game.id)} className="text-outline opacity-0 group-hover:opacity-100 transition-opacity p-xs"><span className="material-symbols-outlined">delete</span></button>
              </div>
              <div className="flex items-center gap-sm mt-auto">
                {game.performance && <span className="px-sm py-xs rounded-full bg-primary/10 border border-primary/30 font-label-bold text-label-bold text-primary flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">speed</span>{game.performance.fps} FPS @ {game.performance.preset}</span>}
                {game.hltb && <span className="px-sm py-xs rounded-full bg-surface-container-highest font-label-bold text-label-bold text-on-surface-variant flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">schedule</span>{Math.round(game.hltb.mainStory)}h</span>}
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
    try { setResults(await searchRAWG(query)) } catch { }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="w-full bg-surface-container-highest/60 border border-white/10 rounded-full py-md pl-[48px] pr-[48px] font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-surface-container-high transition-all backdrop-blur-md" placeholder="Search games..." />
        {query && <button onClick={() => setQuery('')} className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>}
      </div>
      {loading && <p className="text-center text-outline">Searching...</p>}
      <div className="flex flex-col gap-md">
        {results.map(game => (
          <div key={game.id} className="flex items-center gap-md p-sm bg-surface/40 backdrop-blur-xl border border-white/10 rounded-xl group">
            <div className="w-[60px] h-[80px] rounded-lg overflow-hidden shrink-0 border border-white/5">
              <img src={game.background_image || ''} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="font-headline-sm text-headline-sm text-on-surface truncate group-hover:text-primary">{game.name}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{game.released || 'TBA'}</p>
            </div>
            <button onClick={() => onAdd(game)} className="w-9 h-9 rounded-full border border-primary/50 text-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined">add</span></button>
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
      <div className="relative w-full h-[442px] min-h-[400px] mb-lg">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${game.background_image}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full px-margin-mobile pb-lg">
          <h1 className="font-display-lg text-display-lg text-primary drop-shadow-[0_0_12px_rgba(195,245,255,0.4)]">{game.name}</h1>
          <div className="flex items-center gap-sm mt-xs">
            {game.genres?.map(g => <span key={g.name} className="px-sm py-xs bg-secondary-container/30 border border-secondary/20 rounded-md font-label-sm text-label-sm text-secondary-fixed">{g.name}</span>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-md mb-lg">
        <div className="glass-panel rounded-xl p-md border-primary/10">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
            <h3 className="font-label-bold text-label-bold text-on-surface-variant">PERFORMANCE</h3>
          </div>
          <div className="flex items-baseline justify-between border-b border-white/5 pb-xs">
            <span className="text-[28px] leading-tight text-primary-fixed-dim drop-shadow-[0_0_8px_rgba(0,218,243,0.3)]">{game.performance?.fps || '?'}</span>
            <span className="font-label-sm text-label-sm text-outline">FPS</span>
          </div>
          <div className="flex justify-between items-center mt-xs">
            <span className="font-body-md text-body-md text-on-surface">Preset</span>
            <span className="font-label-bold text-label-bold text-primary">{game.performance?.preset || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body-md text-body-md">TDP</span>
            <span className="font-label-bold text-label-bold">{game.performance?.tdp || '-'}W</span>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-md">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined text-secondary text-[20px]">schedule</span>
            <h3 className="font-label-bold text-label-bold text-on-surface-variant">MAIN STORY</h3>
          </div>
          <div className="flex items-baseline gap-xs">
            <span className="text-[36px] leading-none text-secondary">{game.hltb ? Math.round(game.hltb.mainStory) : '?'}</span>
            <span className="font-label-bold text-label-bold text-outline">HRS</span>
          </div>
        </div>
      </div>

      {game.hltb && (
        <section className="glass-panel rounded-xl overflow-hidden mb-lg">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            <div className="p-md flex flex-col items-center justify-center bg-white/5 relative">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Main</span>
              <span className="font-headline-md text-headline-md text-primary">{Math.round(game.hltb.mainStory)}h</span>
            </div>
            <div className="p-md flex flex-col items-center justify-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Extras</span>
              <span className="font-headline-md text-headline-md text-on-surface">{Math.round(game.hltb.mainPlusExtras)}h</span>
            </div>
            <div className="p-md flex flex-col items-center justify-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">100%</span>
              <span className="font-headline-md text-headline-md text-secondary">{Math.round(game.hltb.completionist)}h</span>
            </div>
          </div>
        </section>
      )}

      <button onClick={onDelete} className="w-full py-md rounded-lg border border-error/30 bg-error-container/10 text-error font-label-bold text-label-bold flex items-center justify-center gap-sm">
        <span className="material-symbols-outlined">delete</span>
        Remove from Vault
      </button>
    </div>
  )
}
