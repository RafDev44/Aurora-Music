import { AnimatePresence, motion } from 'framer-motion'
import {
  Captions,
  Cloud,
  Home,
  Library,
  ListMusic,
  Search,
  Settings,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { HomePage } from './components/HomePage'
import { CloudDrivePage } from './components/CloudDrivePage'
import { AuroraAmbient } from './components/AuroraAmbient'
import { CommandPalette } from './components/CommandPalette'
import { LibraryPage } from './components/LibraryPage'
import { LyricsPage } from './components/LyricsPage'
import { PlayerBar } from './components/PlayerBar'
import { PlaylistPage } from './components/PlaylistPage'
import { QueuePage } from './components/QueuePage'
import { SettingsPage } from './components/SettingsPage'
import { Sidebar } from './components/Sidebar'
import { usePlayer } from './hooks/usePlayer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { isLrcSource } from './lyrics/parseLrc'
import { normalizeTrack } from './musicMetadata'
import type { LyricsPayload, Playlist, Track } from './types/music'

const navigation = [
  { label: 'Home', icon: Home },
  { label: 'Library', icon: Library },
  { label: 'Cloud Drive', icon: Cloud },
  { label: 'Lyrics', icon: Captions },
  { label: 'Queue', icon: ListMusic },
  { label: 'Settings', icon: Settings },
] as const

type Page = (typeof navigation)[number]['label'] | 'Playlist'

export default function App() {
  const player = usePlayer()
  const {
    currentTrack,
    isPlaying,
    next,
    previous,
    togglePlay,
    getFrequencyData,
    playTrack,
  } = player
  const [page, setPage] = useState<Page>('Home')
  const [tracks, setTracks] = useState<Track[]>([])
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aurora:favorites') ?? '[]')
      return Array.isArray(saved)
        ? saved.filter((id): id is string => typeof id === 'string')
        : []
    } catch {
      return []
    }
  })
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('aurora:recently-played') ?? '[]',
      )
      return Array.isArray(saved)
        ? saved.filter((id): id is string => typeof id === 'string')
        : []
    } catch {
      return []
    }
  })
  const [isInitialLibraryReady, setIsInitialLibraryReady] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  )
  const [isScanning, setIsScanning] = useState(false)
  const [searchRequest, setSearchRequest] = useState(0)
  const [lyrics, setLyrics] = useState<LyricsPayload>({
    kind: 'none',
    content: '',
    source: 'none',
  })
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [playlistDialog, setPlaylistDialog] = useState<
    'create' | 'rename' | null
  >(null)
  const [playlistName, setPlaylistName] = useState('')
  const selectedPlaylist = playlists.find(
    (playlist) => playlist.id === selectedPlaylistId,
  )
  const normalizeTracks = (items: Track[]) => items.map(normalizeTrack)

  useEffect(() => {
    void window.aurora
      .loadLibrary()
      .then((items) => setTracks(normalizeTracks(items)))
      .catch(() => setTracks([]))
      .finally(() => {
        setIsInitialLibraryReady(true)
        // Let the single static first-paint veil hand off after the existing
        // library hydration has completed.
        window.dispatchEvent(new Event('aurora:library-ready'))
      })
    void window.aurora
      .loadPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]))
  }, [])

  useEffect(() => {
    const enabled =
      localStorage.getItem('aurora:mini-player-on-minimize') !== 'false'
    void window.aurora.setMiniPlayerAutoShow(enabled)
  }, [])

  useEffect(() => {
    window.aurora.publishMiniPlayerState({
      track: currentTrack
        ? {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            artwork: currentTrack.artwork,
            sourceKind: currentTrack.sourceKind,
          }
        : null,
      isPlaying,
    })
  }, [currentTrack, isPlaying])

  useEffect(() => {
    const removeControlListener = window.aurora.onMiniPlayerControl(
      (control) => {
        if (control === 'previous') void previous()
        if (control === 'toggle-play') void togglePlay()
        if (control === 'next') void next()
      },
    )
    const removeVisibilityListener = window.aurora.onMiniPlayerVisibility(
      setIsMiniPlayerVisible,
    )
    return () => {
      removeControlListener()
      removeVisibilityListener()
    }
  }, [next, previous, togglePlay])

  useEffect(() => {
    if (!isMiniPlayerVisible || !isPlaying) {
      window.aurora.publishMiniPlayerFrequency([])
      return
    }
    const publishFrequency = () => {
      window.aurora.publishMiniPlayerFrequency(
        Array.from(getFrequencyData() ?? []),
      )
    }
    publishFrequency()
    const interval = window.setInterval(publishFrequency, 100)
    return () => window.clearInterval(interval)
  }, [getFrequencyData, isMiniPlayerVisible, isPlaying])

  useEffect(() => {
    localStorage.setItem('aurora:favorites', JSON.stringify(favoriteTrackIds))
  }, [favoriteTrackIds])

  useEffect(() => {
    localStorage.setItem(
      'aurora:recently-played',
      JSON.stringify(recentlyPlayedIds),
    )
  }, [recentlyPlayedIds])

  useEffect(() => {
    const trackId = player.currentTrack?.id
    if (!trackId) return
    setRecentlyPlayedIds((ids) =>
      [trackId, ...ids.filter((id) => id !== trackId)].slice(0, 30),
    )
  }, [player.currentTrack])

  useEffect(() => {
    const unsubscribe = window.aurora.onLibraryUpdated((items, complete) => {
      setTracks(items.map(normalizeTrack))
      if (complete) setIsScanning(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const track = player.currentTrack
    if (!track) {
      setLyrics({ kind: 'none', content: '', source: 'none' })
      return
    }

    let cancelled = false
    setLyrics({ kind: 'loading', content: '', source: 'none' })
    void window.aurora
      .resolveLyrics(track)
      .then((result) => {
        if (!cancelled) setLyrics(result)
      })
      .catch(() => {
        if (!cancelled) setLyrics({ kind: 'none', content: '', source: 'none' })
      })
    return () => {
      cancelled = true
    }
  }, [player.currentTrack])

  const selectFolder = async () => {
    const folder = await window.aurora.selectMusicFolder()
    if (!folder) return
    setIsScanning(true)
    setPage('Library')
    try {
      setTracks(normalizeTracks(await window.aurora.scanFolder(folder)))
    } catch {
      setIsScanning(false)
    }
  }

  const importMusicFiles = async () => {
    const files = await window.aurora.selectMusicFiles()
    if (!files.length) return
    setIsScanning(true)
    setPage('Library')
    try {
      setTracks(normalizeTracks(await window.aurora.importFiles(files)))
    } finally {
      setIsScanning(false)
    }
  }

  const importDroppedFiles = async (files: FileList) => {
    const paths = [...files]
      .map((file) => window.aurora.getPathForFile(file))
      .filter(Boolean)
    if (!paths.length) return
    setIsScanning(true)
    setPage('Library')
    try {
      setTracks(normalizeTracks(await window.aurora.importFiles(paths)))
    } finally {
      setIsScanning(false)
    }
  }

  const loadLyrics = async () => {
    const filePath = await window.aurora.selectLyricsFile()
    if (!filePath) return
    try {
      const source = await window.aurora.loadLyrics(filePath)
      setLyrics({
        kind: isLrcSource(source) ? 'synced' : 'plain',
        content: source,
        source: 'manual',
      })
      setPage('Lyrics')
    } catch {
      setLyrics({ kind: 'none', content: '', source: 'none' })
    }
  }

  const setTrackArtwork = async (trackId: string) => {
    const artwork = await window.aurora.selectArtwork()
    if (artwork)
      setTracks(
        normalizeTracks(await window.aurora.setTrackArtwork(trackId, artwork)),
      )
  }

  const setPlaylistArtwork = async () => {
    if (!selectedPlaylist) return
    const artwork = await window.aurora.selectArtwork()
    if (artwork)
      setPlaylists(
        await window.aurora.setPlaylistArtwork(selectedPlaylist.id, artwork),
      )
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
      setPlaylists(
        await window.aurora.renamePlaylist(selectedPlaylist.id, name),
      )
    }

    setPlaylistDialog(null)
  }

  const deletePlaylist = async () => {
    if (
      !selectedPlaylist ||
      !window.confirm(`Delete "${selectedPlaylist.name}"?`)
    )
      return
    setPlaylists(await window.aurora.deletePlaylist(selectedPlaylist.id))
    setSelectedPlaylistId(null)
    setPage('Home')
  }

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    setPlaylists(await window.aurora.addTrackToPlaylist(playlistId, trackId))
  }

  const removeTrack = async (trackId: string) => {
    if (selectedPlaylist) {
      setPlaylists(
        await window.aurora.removeTrackFromPlaylist(
          selectedPlaylist.id,
          trackId,
        ),
      )
    }
  }

  const choosePlaylist = (id: string) => {
    setSelectedPlaylistId(id)
    setPage('Playlist')
  }

  const toggleFavorite = (trackId: string) => {
    setFavoriteTrackIds((ids) =>
      ids.includes(trackId)
        ? ids.filter((id) => id !== trackId)
        : [trackId, ...ids],
    )
  }

  const openSearch = () => {
    setPage('Library')
    setSearchRequest((value) => value + 1)
  }

  const openCommandPalette = () => setIsCommandPaletteOpen(true)

  useKeyboardShortcuts({
    onFocusSearch: openSearch,
    onOpenCommandPalette: openCommandPalette,
    onToggleFavorite: () => {
      if (player.currentTrack) toggleFavorite(player.currentTrack.id)
    },
    onOpenQueue: () => setPage('Queue'),
    onEscape: () => {
      if (isCommandPaletteOpen) setIsCommandPaletteOpen(false)
      else if (playlistDialog) setPlaylistDialog(null)
      else if (isLyricsExpanded) setIsLyricsExpanded(false)
    },
  })

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
      <AuroraAmbient
        isReady={isInitialLibraryReady}
        activePage={page}
        startupEnabled={false}
      />

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
        onDropTrackOnPlaylist={(playlistId, trackId) =>
          void addTrackToPlaylist(playlistId, trackId)
        }
        isScanning={isScanning}
      />

      <section className="app-content">
        <button
          onClick={openCommandPalette}
          className="floating-search icon-btn"
          title="Search commands and library (Ctrl+K)"
          aria-label="Search commands and library"
        >
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
                  isLibraryReady={isInitialLibraryReady}
                  playlists={playlists}
                  favoriteTrackIds={favoriteTrackIds}
                  recentlyPlayedIds={recentlyPlayedIds}
                  isScanning={isScanning}
                  onAddFolder={() => void selectFolder()}
                  onImportFiles={() => void importMusicFiles()}
                  onOpenLibrary={() => setPage('Library')}
                  onOpenPlaylist={choosePlaylist}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              {page === 'Library' && (
                <LibraryPage
                  tracks={tracks}
                  isLibraryReady={isInitialLibraryReady}
                  isScanning={isScanning}
                  onAddFolder={() => void selectFolder()}
                  onEditArtwork={(trackId) => void setTrackArtwork(trackId)}
                  focusRequest={searchRequest}
                />
              )}

              {page === 'Cloud Drive' && (
                <CloudDrivePage
                  tracks={tracks}
                  onLibraryChanged={async () =>
                    setTracks(
                      normalizeTracks(await window.aurora.loadLibrary()),
                    )
                  }
                  onOpenSettings={() => setPage('Settings')}
                  onEditArtwork={(trackId) => void setTrackArtwork(trackId)}
                />
              )}

              {page === 'Lyrics' && (
                <LyricsPage lyrics={lyrics} onLoad={() => void loadLyrics()} />
              )}

              {page === 'Queue' && (
                <QueuePage onOpenLibrary={() => setPage('Library')} />
              )}

              {page === 'Settings' && (
                <SettingsPage
                  onLibraryChanged={async () =>
                    setTracks(
                      normalizeTracks(await window.aurora.loadLibrary()),
                    )
                  }
                />
              )}

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
                <LyricsPage
                  lyrics={lyrics}
                  onLoad={() => void loadLyrics()}
                  onClose={() => setIsLyricsExpanded(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <PlayerBar
            onOpenLyrics={() => setIsLyricsExpanded(true)}
            onOpenQueue={() => setPage('Queue')}
          />
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
                  <p className="eyebrow">
                    {playlistDialog === 'create'
                      ? 'New mix'
                      : 'Playlist details'}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {playlistDialog === 'create'
                      ? 'Create playlist'
                      : 'Rename playlist'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPlaylistDialog(null)}
                  className="icon-btn"
                  title="Close"
                >
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
                <button
                  type="button"
                  onClick={() => setPlaylistDialog(null)}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button className="btn-primary">
                  {playlistDialog === 'create'
                    ? 'Create playlist'
                    : 'Save changes'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        tracks={tracks}
        isPlaying={isPlaying}
        currentTrack={currentTrack}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(target) => setPage(target)}
        onPlayTrack={(track) => void playTrack(track, tracks)}
        onAddFolder={() => void selectFolder()}
        onTogglePlay={() => void togglePlay()}
        onPrevious={() => void previous()}
        onNext={() => void next()}
      />
    </main>
  )
}
