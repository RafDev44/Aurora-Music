import { motion } from 'framer-motion'
import { Clock3, Disc3, FolderOpen, Music2, Play, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import type { Track } from '../types/music'

const formatDuration = (duration: number) =>
  `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`

export function LibraryPage({
  tracks,
  onAddFolder,
  onEditArtwork,
  focusRequest = 0,
}: {
  tracks: Track[]
  onAddFolder: () => void
  onEditArtwork: (trackId: string) => void
  focusRequest?: number
}) {
  const player = usePlayer()
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All genres')
  const [sort, setSort] = useState<'title' | 'artist' | 'album' | 'recent'>('title')
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusRequest) searchInput.current?.focus()
  }, [focusRequest])

  const genres = useMemo(
    () =>
      [...new Set(tracks.map((track) => track.genre).filter((item): item is string => Boolean(item)))].sort(),
    [tracks],
  )

  const visibleTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return tracks
      .filter(
        (track) =>
          (genre === 'All genres' || track.genre === genre) &&
          (!needle ||
            [track.title, track.artist, track.album, track.genre].some((value) =>
              value?.toLocaleLowerCase().includes(needle),
            )),
      )
      .sort((left, right) => {
        if (sort === 'recent') return (right.addedAt ?? '').localeCompare(left.addedAt ?? '')
        return left[sort].localeCompare(right[sort])
      })
  }, [genre, query, sort, tracks])

  if (!tracks.length) return <EmptyLibrary onAddFolder={onAddFolder} />

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your collection</p>
          <h1 className="page-title text-gradient">Library</h1>
          <p className="page-subtitle">
            Search, sort, play, drag into playlists, or right-click a track to update its artwork.
          </p>
        </div>
        <button className="btn-primary" onClick={onAddFolder}>
          <FolderOpen size={16} />
          Add folder
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35 }}
        className="glass-card mb-5 grid gap-3 p-3 md:grid-cols-[minmax(260px,1fr)_auto_auto]"
      >
        <label className="spotlight">
          <Search className="spotlight-icon" size={17} />
          <input
            ref={searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, artist, album, or genre"
          />
          <span className="kbd">/</span>
        </label>
        <span className="flex items-center gap-2 text-text-tertiary">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Genre filter"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="library-select"
          >
            <option>All genres</option>
            {genres.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </span>
        <select
          aria-label="Sort library"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="library-select"
        >
          <option value="title">Title</option>
          <option value="artist">Artist</option>
          <option value="album">Album</option>
          <option value="recent">Recently added</option>
        </select>
      </motion.div>

      <div className="mb-3 hidden grid-cols-[minmax(280px,1.6fr)_minmax(140px,1fr)_minmax(130px,1fr)_58px] gap-4 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted lg:grid">
        <span>Title</span>
        <span>Album</span>
        <span>Genre</span>
        <span className="text-right">Time</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {visibleTracks.map((track, index) => {
          const isActive = player.currentTrack?.id === track.id
          return (
            <motion.button
              key={track.id}
              draggable
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.015, 0.24), duration: 0.28 }}
              onDragStartCapture={(event) =>
                event.dataTransfer.setData('application/x-aurora-track', track.id)
              }
              onContextMenu={(event) => {
                event.preventDefault()
                onEditArtwork(track.id)
              }}
              onClick={() => void player.playTrack(track, visibleTracks)}
              className={`row-panel group mb-2 grid w-full cursor-grab grid-cols-[minmax(210px,1fr)_58px] items-center gap-4 rounded-2xl px-4 py-3 text-left active:cursor-grabbing lg:grid-cols-[minmax(280px,1.6fr)_minmax(140px,1fr)_minmax(130px,1fr)_58px] ${
                isActive ? 'row-panel-active' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="art h-12 w-12 shrink-0">
                  {track.artwork ? <img className="h-full w-full object-cover" src={track.artwork} alt="" /> : <Music2 size={18} />}
                  <span className="absolute inset-0 hidden place-items-center bg-[var(--glass-strong)] backdrop-blur-sm group-hover:grid">
                    <Play size={17} fill="var(--accent-foreground)" />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 truncate text-sm font-semibold text-text-primary">
                    {track.title}
                    {isActive && <span className="eq-bars"><span /><span /><span /></span>}
                  </span>
                  <span className="block truncate text-xs text-text-tertiary">{track.artist}</span>
                </span>
              </span>
              <span className="hidden truncate text-sm text-text-secondary lg:block">{track.album}</span>
              <span className="hidden truncate text-sm text-text-tertiary lg:block">{track.genre || 'Unsorted'}</span>
              <span className="text-right text-xs tabular-nums text-text-muted">{formatDuration(track.duration)}</span>
            </motion.button>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        {visibleTracks.length} of {tracks.length} songs. Click to play, drag to a playlist, right-click to set cover art.
      </p>
    </div>
  )
}

function EmptyLibrary({ onAddFolder }: { onAddFolder: () => void }) {
  return (
    <div className="empty-state">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className="empty-icon">
          <Disc3 size={42} strokeWidth={1.8} />
        </div>
        <div className="chip mb-4">
          <Clock3 size={12} />
          Local-first library
        </div>
        <h1 className="page-title text-gradient">Build your library.</h1>
        <p className="page-subtitle mx-auto">
          Select a folder and Aurora will find MP3, FLAC, WAV, AAC, M4A, and OGG files with metadata and embedded artwork.
        </p>
        <button onClick={onAddFolder} className="btn-primary mt-7">
          <FolderOpen size={16} />
          Choose music folder
        </button>
      </motion.div>
    </div>
  )
}
