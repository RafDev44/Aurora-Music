import { motion } from 'framer-motion'
import { Clock, Disc3, FolderOpen, ListMusic, Play, Shuffle, Sparkles, Upload } from 'lucide-react'
import { useMemo } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import type { Playlist, Track } from '../types/music'

interface HomePageProps {
  tracks: Track[]
  playlists: Playlist[]
  isScanning: boolean
  onAddFolder: () => void
  onImportFiles: () => void
  onOpenLibrary: () => void
  onOpenPlaylist: (id: string) => void
}

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late night listening'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage({
  tracks,
  playlists,
  isScanning,
  onAddFolder,
  onImportFiles,
  onOpenLibrary,
  onOpenPlaylist,
}: HomePageProps) {
  const player = usePlayer()

  const recentlyAdded = useMemo(
    () =>
      [...tracks]
        .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
        .slice(0, 8),
    [tracks],
  )

  const albums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; artwork?: string; count: number; firstTrack: Track }>()
    for (const track of tracks) {
      const key = `${track.album}::${track.artist}`
      const existing = map.get(key)
      if (existing) existing.count += 1
      else
        map.set(key, {
          name: track.album,
          artist: track.artist,
          artwork: track.artwork,
          count: 1,
          firstTrack: track,
        })
    }
    return [...map.values()].slice(0, 6)
  }, [tracks])

  const artists = useMemo(() => {
    const map = new Map<string, { name: string; artwork?: string; count: number }>()
    for (const track of tracks) {
      const existing = map.get(track.artist)
      if (existing) existing.count += 1
      else map.set(track.artist, { name: track.artist, artwork: track.artwork, count: 1 })
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  }, [tracks])

  const startShuffle = () => {
    if (!tracks.length) return
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    void player.playTrack(shuffled[0], shuffled)
  }

  if (!tracks.length) return <EmptyHome isScanning={isScanning} onAddFolder={onAddFolder} onImportFiles={onImportFiles} />

  return (
    <div className="relative z-10 flex-1 overflow-y-auto pb-40">
      <div className="mx-auto max-w-6xl px-10 pt-2">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="chip mb-4">
            <Sparkles size={12} strokeWidth={2.4} />
            {tracks.length} tracks - {playlists.length} playlists
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-gradient">{greeting()}.</h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            Pick up where you left off, or start something new.
          </p>
        </motion.div>

        {/* Quick actions */}
        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <QuickTile
            icon={<Play size={18} fill="currentColor" />}
            title={player.currentTrack ? 'Resume' : 'Play latest'}
            subtitle={player.currentTrack?.title ?? recentlyAdded[0]?.title ?? 'No track yet'}
            onClick={() => {
              if (player.currentTrack) void player.togglePlay()
              else if (recentlyAdded[0]) void player.playTrack(recentlyAdded[0], recentlyAdded)
            }}
            delay={0.05}
          />
          <QuickTile
            icon={<Shuffle size={18} />}
            title="Shuffle library"
            subtitle="Play everything in random order"
            onClick={startShuffle}
            delay={0.1}
          />
          <QuickTile
            icon={<Upload size={18} />}
            title="Import music"
            subtitle="Add files or scan a folder"
            onClick={onImportFiles}
            delay={0.15}
          />
        </div>

        {/* Recently played */}
        {recentlyAdded.length > 0 && (
          <Section title="Recently added" onSeeAll={onOpenLibrary} delay={0.2}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {recentlyAdded.slice(0, 8).map((track, idx) => (
                <motion.button
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + idx * 0.03, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  onClick={() => void player.playTrack(track, recentlyAdded)}
                  className="glass-card group p-3 text-left"
                >
                  <div className="art aspect-square w-full">
                    {track.artwork ? (
                      <img src={track.artwork} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Disc3 size={32} />
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-[var(--glass-strong)] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <span
                        className="grid h-11 w-11 place-items-center rounded-full text-accent-foreground shadow-glow-strong"
                        style={{
                          background:
                            'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
                        }}
                      >
                        <Play size={16} fill="currentColor" />
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 truncate text-[13.5px] font-semibold text-text-primary">
                    {track.title}
                  </div>
                  <div className="truncate text-[12px] text-text-tertiary">{track.artist}</div>
                </motion.button>
              ))}
            </div>
          </Section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <Section title="Albums" delay={0.28}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {albums.map((album, idx) => (
                <motion.button
                  key={`${album.name}-${album.artist}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 + idx * 0.03, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  onClick={() => {
                    const albumTracks = tracks.filter(
                      (t) => t.album === album.name && t.artist === album.artist,
                    )
                    if (albumTracks.length)
                      void player.playTrack(albumTracks[0], albumTracks)
                  }}
                  className="glass-card group p-3 text-left"
                >
                  <div className="art aspect-square w-full">
                    {album.artwork ? (
                      <img src={album.artwork} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Disc3 size={28} />
                    )}
                  </div>
                  <div className="mt-2.5 truncate text-[13px] font-semibold text-text-primary">
                    {album.name}
                  </div>
                  <div className="truncate text-[11.5px] text-text-tertiary">
                    {album.artist} - {album.count} songs
                  </div>
                </motion.button>
              ))}
            </div>
          </Section>
        )}

        {/* Artists */}
        {artists.length > 0 && (
          <Section title="Artists" delay={0.36}>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {artists.map((artist, idx) => (
                <motion.button
                  key={artist.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.03, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  onClick={() => {
                    const artistTracks = tracks.filter((t) => t.artist === artist.name)
                    if (artistTracks.length) void player.playTrack(artistTracks[0], artistTracks)
                  }}
                  className="group text-center"
                >
                  <div
                    className="art aspect-square w-full !rounded-full"
                    style={{
                      boxShadow:
                        '0 12px 30px -10px rgba(0,0,0,0.6), 0 0 40px -14px var(--accent-glow-soft)',
                    }}
                  >
                    {artist.artwork ? (
                      <img src={artist.artwork} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Disc3 size={26} />
                    )}
                  </div>
                  <div className="mt-2.5 truncate text-[12.5px] font-medium text-text-primary">
                    {artist.name}
                  </div>
                  <div className="truncate text-[11px] text-text-tertiary">
                    {artist.count} {artist.count === 1 ? 'song' : 'songs'}
                  </div>
                </motion.button>
              ))}
            </div>
          </Section>
        )}

        {/* Playlists preview */}
        {playlists.length > 0 && (
          <Section title="Your playlists" delay={0.44}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {playlists.slice(0, 8).map((playlist, idx) => (
                <motion.button
                  key={playlist.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48 + idx * 0.03, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  onClick={() => onOpenPlaylist(playlist.id)}
                  className="glass-card group flex items-center gap-3 p-3 text-left"
                >
                  <div
                    className="art h-14 w-14 flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
                    }}
                  >
                    {playlist.artwork ? (
                      <img
                        src={playlist.artwork}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ListMusic size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-text-primary">
                      {playlist.name}
                    </div>
                    <div className="text-[11.5px] text-text-tertiary">
                      {playlist.trackIds.length}{' '}
                      {playlist.trackIds.length === 1 ? 'song' : 'songs'}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  onSeeAll,
  delay = 0,
}: {
  title: string
  children: React.ReactNode
  onSeeAll?: () => void
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mt-10"
    >
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-[12px] font-medium text-text-tertiary transition hover:text-accent-light"
          >
            See all &gt;
          </button>
        )}
      </div>
      {children}
    </motion.section>
  )
}

function QuickTile({
  icon,
  title,
  subtitle,
  onClick,
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
  delay?: number
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="quick-tile"
    >
      <span
        className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-accent-foreground"
        style={{
          background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
          boxShadow: '0 10px 24px -8px var(--accent-glow)',
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-text-primary">{title}</span>
        <span className="block truncate text-[12px] text-text-tertiary">{subtitle}</span>
      </span>
    </motion.button>
  )
}

function EmptyHome({
  isScanning,
  onAddFolder,
  onImportFiles,
}: {
  isScanning: boolean
  onAddFolder: () => void
  onImportFiles: () => void
}) {
  return (
    <div className="relative z-10 flex flex-1 items-center justify-center pb-32">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg text-center"
      >
        <div
          className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl text-accent-foreground"
          style={{
            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
            boxShadow: '0 24px 60px -14px var(--accent-glow)',
          }}
        >
          <Disc3 size={44} strokeWidth={1.8} />
        </div>
        <div className="chip mb-4">
          <Sparkles size={11} />
          Aurora is ready
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">
          Bring in your music.
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-text-secondary">
          Import a folder and Aurora will detect MP3, FLAC, WAV, AAC, M4A and OGG files -
          plus embedded artwork, metadata and matching LRC lyrics.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button onClick={onAddFolder} disabled={isScanning} className="btn-primary">
            <FolderOpen size={16} />
            {isScanning ? 'Scanning your music...' : 'Choose folder'}
          </button>
          <button onClick={onImportFiles} disabled={isScanning} className="btn-ghost">
            <Upload size={15} />
            Pick files
          </button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-text-muted">
          <Clock size={12} />
          Your library stays entirely local.
        </p>
      </motion.div>
    </div>
  )
}
