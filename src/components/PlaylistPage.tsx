import { motion } from 'framer-motion'
import { Cloud, Disc3, ListMusic, Pencil, Play, Trash2 } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'
import type { Playlist, Track } from '../types/music'

const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

interface PlaylistPageProps {
  playlist: Playlist
  tracks: Track[]
  onRename: () => void
  onDelete: () => void
  onRemoveTrack: (trackId: string) => void
  onEditArtwork: () => void
}

export function PlaylistPage({
  playlist,
  tracks,
  onRename,
  onDelete,
  onRemoveTrack,
  onEditArtwork,
}: PlaylistPageProps) {
  const player = usePlayer()
  const playlistTracks = playlist.trackIds
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track): track is Track => Boolean(track))

  return (
    <div className="page">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div className="flex min-w-0 items-end gap-6">
          <button onClick={onEditArtwork} className="art art-lg group relative h-32 w-32 flex-shrink-0" title="Set playlist cover" aria-label="Set playlist cover">
            {playlist.artwork ? <img src={playlist.artwork} alt="" className="h-full w-full object-cover" /> : <ListMusic size={46} />}
            <span className="absolute inset-x-3 bottom-3 rounded-full bg-[var(--glass-strong)] px-3 py-1 text-[10px] font-semibold text-text-primary opacity-0 backdrop-blur-xl transition group-hover:opacity-100">
              Set cover
            </span>
          </button>

          <div className="min-w-0">
            <p className="eyebrow">Playlist - {playlistTracks.length} songs</p>
            <h1 className="page-title truncate text-gradient">{playlist.name}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onRename} className="secondary-button">
                <Pencil size={15} />
                Rename
              </button>
              {playlistTracks.length > 0 && (
                <button onClick={() => void player.playTrack(playlistTracks[0], playlistTracks)} className="btn-primary">
                  <Play size={16} fill="currentColor" />
                  Play playlist
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={onDelete} className="secondary-button text-accent-light">
          <Trash2 size={15} />
          Delete
        </button>
      </motion.header>

      {playlistTracks.length ? (
        <>
          <div className="mb-3 hidden grid-cols-[42px_minmax(230px,1fr)_minmax(140px,.7fr)_60px_40px] gap-4 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted lg:grid">
            <span>#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Time</span>
            <span />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            {playlistTracks.map((track, index) => {
              const isActive = player.currentTrack?.id === track.id
              return (
                <motion.div
                  key={`${track.id}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.018, 0.25), duration: 0.28 }}
                  className={`playlist-row row-panel group mb-2 grid grid-cols-[42px_minmax(190px,1fr)_54px_38px] items-center gap-4 rounded-2xl px-4 py-3 lg:grid-cols-[42px_minmax(230px,1fr)_minmax(140px,.7fr)_60px_40px] ${
                    isActive ? 'row-panel-active' : ''
                  }`}
                >
                  <span className="text-center text-sm tabular-nums text-text-tertiary">{index + 1}</span>
                  <button onClick={() => void player.playTrack(track, playlistTracks)} className="flex min-w-0 items-center gap-3 text-left">
                    <span className="art h-11 w-11 flex-shrink-0">
                      {track.artwork ? <img className="h-full w-full object-cover" src={track.artwork} alt="" /> : <Disc3 size={19} />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-sm font-semibold text-text-primary">{track.title}{track.sourceKind === 'drive' && <Cloud size={12} className="shrink-0 text-accent-light" aria-label="Google Drive track" />}</span>
                      <span className="block truncate text-xs text-text-tertiary">{track.artist}</span>
                    </span>
                  </button>
                  <span className="playlist-album hidden truncate text-sm text-text-tertiary lg:block">{track.album}</span>
                  <span className="text-xs tabular-nums text-text-muted">{duration(track.duration)}</span>
                  <button
                    onClick={() => onRemoveTrack(track.id)}
                    className="grid h-9 w-9 place-items-center rounded-full text-text-tertiary opacity-0 transition hover:bg-[var(--glass)] hover:text-accent-light group-hover:opacity-100"
                    title="Remove from playlist"
                    aria-label={`Remove ${track.title} from playlist`}
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="empty-state pb-16">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="empty-icon">
              <ListMusic size={40} strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">This playlist is waiting for music.</h2>
            <p className="page-subtitle mx-auto">
              Drag songs from your Library onto this playlist in the sidebar.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}
