import { motion } from 'framer-motion'
import { Disc3, Library, ListMusic, Play, Trash2 } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'
import type { Track } from '../types/music'

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export function QueuePage({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const player = usePlayer()
  const currentIndex = player.currentTrack
    ? player.queue.findIndex((track) => track.id === player.currentTrack?.id)
    : -1
  const upcoming = currentIndex >= 0 ? player.queue.slice(currentIndex + 1) : player.queue

  const removeTrack = (trackId: string) => {
    player.setQueue(player.queue.filter((track) => track.id !== trackId))
  }

  if (!player.queue.length) {
    return (
      <div className="empty-state">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="empty-icon">
            <ListMusic size={42} strokeWidth={1.8} />
          </div>
          <div className="chip mb-4">Queue is clear</div>
          <h1 className="page-title text-gradient">Line something up.</h1>
          <p className="page-subtitle mx-auto">
            Start playback from the library, an album, or a playlist and Aurora will build the queue around it.
          </p>
          <button onClick={onOpenLibrary} className="btn-primary mt-7">
            <Library size={16} />
            Open library
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Up next</p>
          <h1 className="page-title text-gradient">Queue</h1>
          <p className="page-subtitle">
            {player.queue.length} tracks loaded. The current song stays in view while the next listens wait below.
          </p>
        </div>
        <button onClick={() => player.setQueue([])} className="secondary-button">
          <Trash2 size={15} />
          Clear queue
        </button>
      </header>

      {player.currentTrack && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-5 flex items-center gap-5 p-4"
        >
          <Artwork track={player.currentTrack} size="large" />
          <div className="min-w-0 flex-1">
            <div className="chip mb-3">Now playing</div>
            <h2 className="truncate text-2xl font-semibold tracking-tight text-text-primary">
              {player.currentTrack.title}
            </h2>
            <p className="mt-1 truncate text-sm text-text-secondary">{player.currentTrack.artist}</p>
          </div>
          <button onClick={() => void player.togglePlay()} className="dock-play" title={player.isPlaying ? 'Pause' : 'Play'}>
            <Play size={18} fill="currentColor" />
          </button>
        </motion.section>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {upcoming.length ? (
          upcoming.map((track, index) => (
            <motion.div
              key={`${track.id}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025, duration: 0.3 }}
              className="row-panel group mb-2 grid grid-cols-[42px_minmax(220px,1fr)_minmax(140px,.7fr)_58px_40px] items-center gap-4 rounded-2xl px-4 py-3"
            >
              <span className="text-center text-sm tabular-nums text-text-tertiary">{index + 1}</span>
              <button
                onClick={() => void player.playTrack(track)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <Artwork track={track} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-primary">{track.title}</span>
                  <span className="block truncate text-xs text-text-tertiary">{track.artist}</span>
                </span>
              </button>
              <span className="truncate text-sm text-text-tertiary">{track.album}</span>
              <span className="text-xs tabular-nums text-text-muted">{formatDuration(track.duration)}</span>
              <button
                onClick={() => removeTrack(track.id)}
                className="grid h-9 w-9 place-items-center rounded-full text-text-tertiary opacity-0 transition hover:bg-[var(--glass)] hover:text-accent-light group-hover:opacity-100"
                title="Remove from queue"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))
        ) : (
          <div className="glass-card grid place-items-center p-10 text-center">
            <ListMusic className="mb-3 text-text-muted" size={34} />
            <h2 className="text-lg font-semibold">Nothing else is queued.</h2>
            <p className="mt-2 text-sm text-text-tertiary">Add more music from Library or a playlist.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Artwork({ track, size = 'default' }: { track: Track; size?: 'default' | 'large' }) {
  const className = size === 'large' ? 'art art-lg h-24 w-24 flex-shrink-0' : 'art h-11 w-11 flex-shrink-0'

  return (
    <span className={className}>
      {track.artwork ? <img className="h-full w-full object-cover" src={track.artwork} alt="" /> : <Disc3 size={22} />}
    </span>
  )
}
