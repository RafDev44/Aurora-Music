import { AnimatePresence, motion } from 'framer-motion'
import { Captions, Home, Library, ListMusic, Search, Settings, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HomePage } from './components/HomePage'
import { LibraryPage } from './components/LibraryPage'
import { LyricsPage } from './components/LyricsPage'
import { PlayerBar } from './components/PlayerBar'
import { PlaylistPage } from './components/PlaylistPage'
import { QueuePage } from './components/QueuePage'
import { SettingsPage } from './components/SettingsPage'
import { Sidebar } from './components/Sidebar'
import { usePlayer } from './hooks/usePlayer'
import { parseLrc } from './lyrics/parseLrc'
import type { LyricLine, Playlist, Track } from './types/music'

const navigation = [
  { label: 'Home', icon: Home },
  { label: 'Library', icon: Library },
  { label: 'Lyrics', icon: Captions },
  { label: 'Queue', icon: ListMusic },
  { label: 'Settings', icon: Settings },
] as const

type Page = (typeof navigation)[number]['label'] | 'Playlist'

export default function App() {
  const player = usePlayer()
  const [page, setPage] = useState<Page>('Home')
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [searchRequest, setSearchRequest] = useState(0)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const [playlistDialog, setPlaylistDialog] = useState<'create' | 'rename' | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId)

  useEffect(() => {
    void window.aurora.loadLibrary().then(setTracks).catch(() => setTracks([]))
    void window.aurora.loadPlaylists().then(setPlaylists).catch(() => setPlaylists([]))
  }, [])

  useEffect(() => {
    if (!player.currentTrack?.lrcPath) {
      setLyrics([])
      return
    }

    void window.aurora
      .loadLyrics(player.currentTrack.lrcPath)
      .then((source) => setLyrics(parseLrc(source)))
      .catch(() => setLyrics([]))
  }, [player.currentTrack?.id, player.currentTrack?.lrcPath])

  const selectFolder = async () => {
    const folder = await window.aurora.selectMusicFolder()
    if (!folder) return
    setIsScanning(true)
    try {
      setTracks(await window.aurora.scanFolder(folder))
      setPage('Library')
    } finally {
      setIsScanning(false)
    }
  }

  const importMusicFiles = async () => {
    const files = await window.aurora.selectMusicFiles()
    if (!files.length) return
    setIsScanning(true)
    try {
      setTracks(await window.aurora.importFiles(files))
      setPage('Library')
    } finally {
      setIsScanning(false)
    }
  }

  const importDroppedFiles = async (files: FileList) => {
    const paths = [...files].map((file) => window.aurora.getPathForFile(file)).filter(Boolean)
    if (!paths.length) return
    setIsScanning(true)
    try {
      setTracks(await window.aurora.importFiles(paths))
      setPage('Library')
    } finally {
      setIsScanning(false)
    }
  }

  const loadLyrics = async () => {
    const filePath = await window.aurora.selectLyricsFile()
    if (!filePath) return
    setLyrics(parseLrc(await window.aurora.loadLyrics(filePath)))
    setPage('Lyrics')
  }

  const setTrackArtwork = async (trackId: string) => {
    const artwork = await window.aurora.selectArtwork()
    if (artwork) setTracks(await window.aurora.setTrackArtwork(trackId, artwork))
  }

  const setPlaylistArtwork = async () => {
    if (!selectedPlaylist) return
    const artwork = await window.aurora.selectArtwork()
    if (artwork) setPlaylists(await window.aurora.setPlaylistArtwork(selectedPlaylist.id, artwork))
  }

  const openCreatePlaylist = () => {
    setPlaylistName('New playlist')
    setPlaylistDialog('create')
  }

  const openRenamePlaylist = () => {
    if (!selectedPlaylist) return
    setPlaylistName(selectedPlaylist.name)
    setPlaylistDialog('rename')
  }

  const savePlaylist = async () => {
    const name = playlistName.trim()
    if (!name) return

    if (playlistDialog === 'create') {
      const updated = await window.aurora.createPlaylist(name)
      setPlaylists(updated)
      const created = updated.at(-1)
      if (created) {
        setSelectedPlaylistId(created.id)
        setPage('Playlist')
      }
    }

    if (playlistDialog === 'rename' && selectedPlaylist) {
      setPlaylists(await window.aurora.renamePlaylist(selectedPlaylist.id, name))
    }

    setPlaylistDialog(null)
  }

  const deletePlaylist = async () => {
    if (!selectedPlaylist || !window.confirm(`Delete "${selectedPlaylist.name}"?`)) return
    setPlaylists(await window.aurora.deletePlaylist(selectedPlaylist.id))
    setSelectedPlaylistId(null)
    setPage('Home')
  }

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    setPlaylists(await window.aurora.addTrackToPlaylist(playlistId, trackId))
  }

  const removeTrack = async (trackId: string) => {
    if (selectedPlaylist) {
      setPlaylists(await window.aurora.removeTrackFromPlaylist(selectedPlaylist.id, trackId))
    }
  }

  const choosePlaylist = (id: string) => {
    setSelectedPlaylistId(id)
    setPage('Playlist')
  }

  const openSearch = () => {
    setPage('Library')
    setSearchRequest((value) => value + 1)
  }

  return (
    <main
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        void importDroppedFiles(event.dataTransfer.files)
      }}
      className="app-window flex text-text-primary"
    >
      <div className="drag-strip" />
      <div className="aurora-canvas" aria-hidden>
        <div className="aurora-orb" />
        <div className="aurora-grain" />
      </div>

      <Sidebar
        navigation={navigation}
        activePage={page}
        onNavigate={(label) => setPage(label as Page)}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        onSelectPlaylist={choosePlaylist}
        onCreatePlaylist={openCreatePlaylist}
        onImportFiles={() => void importMusicFiles()}
        onAddFolder={() => void selectFolder()}
        onDropTrackOnPlaylist={(playlistId, trackId) => void addTrackToPlaylist(playlistId, trackId)}
        isScanning={isScanning}
      />

      <section className="app-content">
        <button onClick={openSearch} className="floating-search icon-btn" title="Search library">
          <Search size={18} />
        </button>

        <div className="content-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${page}-${selectedPlaylistId ?? 'none'}`}
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex min-h-0 flex-1"
            >
              {page === 'Home' && (
                <HomePage
                  tracks={tracks}
                  playlists={playlists}
                  isScanning={isScanning}
                  onAddFolder={() => void selectFolder()}
                  onImportFiles={() => void importMusicFiles()}
                  onOpenLibrary={() => setPage('Library')}
                  onOpenPlaylist={choosePlaylist}
                />
              )}

              {page === 'Library' && (
                <LibraryPage
                  tracks={tracks}
                  onAddFolder={() => void selectFolder()}
                  onEditArtwork={(trackId) => void setTrackArtwork(trackId)}
                  focusRequest={searchRequest}
                />
              )}

              {page === 'Lyrics' && <LyricsPage lines={lyrics} onLoad={() => void loadLyrics()} />}

              {page === 'Queue' && <QueuePage onOpenLibrary={() => setPage('Library')} />}

              {page === 'Settings' && <SettingsPage />}

              {page === 'Playlist' && selectedPlaylist && (
                <PlaylistPage
                  playlist={selectedPlaylist}
                  tracks={tracks}
                  onRename={openRenamePlaylist}
                  onDelete={() => void deletePlaylist()}
                  onRemoveTrack={(trackId) => void removeTrack(trackId)}
                  onEditArtwork={() => void setPlaylistArtwork()}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {isLyricsExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex bg-[var(--background)]/95 backdrop-blur-2xl"
              >
                <LyricsPage lines={lyrics} onLoad={() => void loadLyrics()} onClose={() => setIsLyricsExpanded(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          <PlayerBar onOpenLyrics={() => setIsLyricsExpanded(true)} onOpenQueue={() => setPage('Queue')} />
        </div>
      </section>

      <AnimatePresence>
        {playlistDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
          >
            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onSubmit={(event) => {
                event.preventDefault()
                void savePlaylist()
              }}
              className="modal"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">{playlistDialog === 'create' ? 'New mix' : 'Playlist details'}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {playlistDialog === 'create' ? 'Create playlist' : 'Rename playlist'}
                  </h2>
                </div>
                <button type="button" onClick={() => setPlaylistDialog(null)} className="icon-btn" title="Close">
                  <X size={17} />
                </button>
              </div>

              <label className="mt-6 block text-sm font-medium text-text-secondary">
                Playlist name
                <input
                  autoFocus
                  value={playlistName}
                  onChange={(event) => setPlaylistName(event.target.value)}
                  className="input mt-2"
                  placeholder="Late night drives"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setPlaylistDialog(null)} className="secondary-button">
                  Cancel
                </button>
                <button className="btn-primary">
                  {playlistDialog === 'create' ? 'Create playlist' : 'Save changes'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
