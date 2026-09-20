import { motion } from 'framer-motion'
import { FolderOpen, ListMusic, Music2, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Playlist } from '../types/music'
import { AuroraLogo } from './AuroraLogo'

export interface NavItem {
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  navigation: readonly NavItem[]
  activePage: string
  onNavigate: (label: string) => void
  playlists: Playlist[]
  selectedPlaylistId: string | null
  onSelectPlaylist: (id: string) => void
  onCreatePlaylist: () => void
  onImportFiles: () => void
  onAddFolder: () => void
  onDropTrackOnPlaylist: (playlistId: string, trackId: string) => void
  isScanning: boolean
}

export function Sidebar({
  navigation,
  activePage,
  onNavigate,
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onImportFiles,
  onAddFolder,
  onDropTrackOnPlaylist,
  isScanning,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-8 flex items-center gap-3 px-3"
      >
        <AuroraLogo size={40} showWordmark />
      </motion.div>

      {/* Primary nav */}
      <nav className="space-y-1 px-1">
        {navigation.map(({ label, icon: Icon }, index) => {
          const isActive = activePage === label
          return (
            <motion.button
              key={label}
              onClick={() => onNavigate(label)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * index, duration: 0.3 }}
              whileTap={{ scale: 0.97 }}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-icon">
                <Icon size={17} strokeWidth={2} />
              </span>
              <span className="flex-1 truncate">{label}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* Playlists */}
      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            Playlists
          </p>
          <button
            onClick={onCreatePlaylist}
            className="grid h-6 w-6 place-items-center rounded-md text-text-tertiary transition hover:bg-[var(--glass)] hover:text-text-primary"
            title="Create playlist"
            aria-label="Create playlist"
          >
            <Plus size={14} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar px-1 pb-2">
          {playlists.map((playlist) => {
            const active = selectedPlaylistId === playlist.id && activePage === 'Playlist'
            return (
              <motion.button
                key={playlist.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectPlaylist(playlist.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const trackId = event.dataTransfer.getData('application/x-aurora-track')
                  if (trackId) onDropTrackOnPlaylist(playlist.id, trackId)
                }}
                className={`playlist-chip ${active ? 'playlist-chip-active' : ''}`}
              >
                <span className="playlist-thumb">
                  {playlist.artwork ? (
                    <img
                      src={playlist.artwork}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ListMusic size={15} />
                  )}
                </span>
                <span className="min-w-0 truncate">{playlist.name}</span>
              </motion.button>
            )
          })}
          <button
            onClick={onCreatePlaylist}
            className="playlist-chip mt-1 text-text-tertiary"
          >
            <span className="playlist-thumb bg-transparent shadow-none border border-dashed border-glass-border-strong">
              <Plus size={15} />
            </span>
            <span>New playlist</span>
          </button>
        </div>
      </div>

      {/* Import actions */}
      <div className="mt-3 space-y-2 px-1">
        <button
          onClick={onImportFiles}
          disabled={isScanning}
          className="btn-ghost w-full"
        >
          <Music2 size={15} strokeWidth={2} />
          Import files
        </button>
        <button
          onClick={onAddFolder}
          disabled={isScanning}
          className="btn-ghost w-full"
        >
          <FolderOpen size={15} strokeWidth={2} />
          {isScanning ? 'Importing…' : 'Add folder'}
        </button>
      </div>
    </aside>
  )
}
