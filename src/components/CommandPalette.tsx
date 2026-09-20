import { AnimatePresence, motion } from 'framer-motion'
import {
  Captions,
  ChevronRight,
  Cloud,
  FolderOpen,
  Home,
  Library,
  ListMusic,
  Pause,
  Play,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Track } from '../types/music'

type AuroraPage =
  'Home' | 'Library' | 'Cloud Drive' | 'Lyrics' | 'Queue' | 'Settings'

interface CommandItem {
  id: string
  label: string
  description: string
  group: 'Navigation' | 'Playback' | 'Library' | 'Songs'
  icon: ReactNode
  artwork?: string
  run: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  tracks: Track[]
  isPlaying: boolean
  currentTrack: Track | null
  onClose: () => void
  onNavigate: (page: AuroraPage) => void
  onPlayTrack: (track: Track) => void
  onAddFolder: () => void
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
}

export function CommandPalette({
  isOpen,
  tracks,
  isPlaying,
  currentTrack,
  onClose,
  onNavigate,
  onPlayTrack,
  onAddFolder,
  onTogglePlay,
  onPrevious,
  onNext,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: 'go-home',
        label: 'Go to Home',
        description: 'Overview, favourites, and recent plays',
        group: 'Navigation',
        icon: <Home size={17} />,
        run: () => onNavigate('Home'),
      },
      {
        id: 'go-library',
        label: 'Open Library',
        description: 'Browse and search all music',
        group: 'Navigation',
        icon: <Library size={17} />,
        run: () => onNavigate('Library'),
      },
      {
        id: 'go-cloud',
        label: 'Open Cloud Drive',
        description: 'Browse connected Google Drive music',
        group: 'Navigation',
        icon: <Cloud size={17} />,
        run: () => onNavigate('Cloud Drive'),
      },
      {
        id: 'go-queue',
        label: 'Open Queue',
        description: 'See what plays next',
        group: 'Navigation',
        icon: <ListMusic size={17} />,
        run: () => onNavigate('Queue'),
      },
      {
        id: 'go-lyrics',
        label: 'Open Lyrics',
        description: 'View lyrics for the current song',
        group: 'Navigation',
        icon: <Captions size={17} />,
        run: () => onNavigate('Lyrics'),
      },
      {
        id: 'go-settings',
        label: 'Open Settings',
        description: 'Theme, playback, and cloud preferences',
        group: 'Navigation',
        icon: <Settings size={17} />,
        run: () => onNavigate('Settings'),
      },
      {
        id: 'add-folder',
        label: 'Add music folder',
        description: 'Import music from a local folder',
        group: 'Library',
        icon: <FolderOpen size={17} />,
        run: onAddFolder,
      },
      ...(currentTrack
        ? [
            {
              id: 'toggle-playback',
              label: isPlaying ? 'Pause playback' : 'Resume playback',
              description: currentTrack.title,
              group: 'Playback' as const,
              icon: isPlaying ? <Pause size={17} /> : <Play size={17} />,
              run: onTogglePlay,
            },
            {
              id: 'previous-track',
              label: 'Previous track',
              description: 'Return to the previous song in the queue',
              group: 'Playback' as const,
              icon: <SkipBack size={17} />,
              run: onPrevious,
            },
            {
              id: 'next-track',
              label: 'Next track',
              description: 'Skip to the next song in the queue',
              group: 'Playback' as const,
              icon: <SkipForward size={17} />,
              run: onNext,
            },
          ]
        : []),
    ],
    [
      currentTrack,
      isPlaying,
      onAddFolder,
      onNavigate,
      onNext,
      onPrevious,
      onTogglePlay,
    ],
  )

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    const commandResults = !needle
      ? commands
      : commands.filter((command) =>
          `${command.label} ${command.description}`
            .toLocaleLowerCase()
            .includes(needle),
        )
    const songResults = needle
      ? tracks
          .filter((track) =>
            [track.title, track.artist, track.album].some((value) =>
              value.toLocaleLowerCase().includes(needle),
            ),
          )
          .slice(0, 8)
          .map<CommandItem>((track) => ({
            id: `song-${track.id}`,
            label: track.title,
            description: `${track.artist} · ${track.album}`,
            group: 'Songs',
            icon: <Play size={16} />,
            artwork: track.artwork,
            run: () => onPlayTrack(track),
          }))
      : []
    return [...songResults, ...commandResults]
  }, [commands, onPlayTrack, query, tracks])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveIndex(0)
      return
    }
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)))
  }, [results.length])

  const run = (command: CommandItem | undefined) => {
    if (!command) return
    command.run()
    onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      run(results[activeIndex])
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="command-palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="command-palette"
            initial={{ opacity: 0, y: -14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          >
            <div className="command-palette-search">
              <Search size={19} aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search songs, pages, and actions"
                aria-label="Search commands and songs"
                aria-autocomplete="list"
                aria-controls="aurora-command-results"
                aria-activedescendant={
                  results[activeIndex]
                    ? `aurora-command-${results[activeIndex].id}`
                    : undefined
                }
              />
              <button
                className="command-palette-close"
                onClick={onClose}
                aria-label="Close command palette"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div
              id="aurora-command-results"
              className="command-palette-results"
              role="listbox"
            >
              {results.map((command, index) => {
                const previousGroup = results[index - 1]?.group
                return (
                  <div key={command.id}>
                    {command.group !== previousGroup && (
                      <p className="command-palette-group">{command.group}</p>
                    )}
                    <motion.button
                      id={`aurora-command-${command.id}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      className={`command-palette-item ${activeIndex === index ? 'command-palette-item-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(command)}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.16,
                        delay: Math.min(index * 0.018, 0.12),
                      }}
                    >
                      <span className="command-palette-icon">
                        {command.artwork ? (
                          <img src={command.artwork} alt="" />
                        ) : (
                          command.icon
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {command.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-text-tertiary">
                          {command.description}
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        className="command-palette-arrow"
                      />
                    </motion.button>
                  </div>
                )
              })}
              {!results.length && (
                <div className="command-palette-empty">
                  No matching songs or commands.
                </div>
              )}
            </div>

            <footer className="command-palette-footer">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> Navigate
              </span>
              <span>
                <kbd>↵</kbd> Open
              </span>
              <span>
                <kbd>Esc</kbd> Close
              </span>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
