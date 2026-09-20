import { motion } from 'framer-motion'
import {
  Clock,
  Disc3,
  FolderOpen,
  Heart,
  History,
  ListMusic,
  Play,
  Shuffle,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import {
  artistContributorsForTrack,
  primaryArtistForTrack,
} from '../musicMetadata'
import type { Playlist, Track } from '../types/music'

interface HomePageProps {
  tracks: Track[]
  playlists: Playlist[]
  favoriteTrackIds: string[]
  recentlyPlayedIds: string[]
  isScanning: boolean
  isLibraryReady: boolean
  onAddFolder: () => void
  onImportFiles: () => void
  onOpenLibrary: () => void
  onOpenPlaylist: (id: string) => void
  onToggleFavorite: (trackId: string) => void
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
  favoriteTrackIds,
  recentlyPlayedIds,
  isScanning,
  isLibraryReady,
  onAddFolder,
  onImportFiles,
  onOpenLibrary,
  onOpenPlaylist,
  onToggleFavorite,
}: HomePageProps) {
  const player = usePlayer()
  const [showAllAlbums, setShowAllAlbums] = useState(false)
  const [showAllArtists, setShowAllArtists] = useState(false)
  const [collectionIndex, setCollectionIndex] = useState(2)

  const recentlyAdded = useMemo(
    () =>
      [...tracks]
        .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
        .slice(0, 8),
    [tracks],
  )

  const albums = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        artist: string
        artwork?: string
        count: number
        firstTrack: Track
      }
    >()
    for (const track of tracks) {
      const albumArtist = primaryArtistForTrack(track)
      const key = `${track.album}::${albumArtist}`
      const existing = map.get(key)
      if (existing) existing.count += 1
      else
        map.set(key, {
          name: track.album,
          artist: albumArtist,
          artwork: track.artwork,
          count: 1,
          firstTrack: track,
        })
    }
    return [...map.values()]
  }, [tracks])

  const artists = useMemo(() => {
    const map = new Map<
      string,
      { name: string; artwork?: string; count: number }
    >()
    for (const track of tracks) {
      const contributors = artistContributorsForTrack(track)
      const artistNames = contributors.length
        ? contributors
        : [primaryArtistForTrack(track)]
      for (const artistName of artistNames) {
        const existing = map.get(artistName)
        if (existing) {
          existing.count += 1
          if (!existing.artwork && track.artwork)
            existing.artwork = track.artwork
        } else {
          map.set(artistName, {
            name: artistName,
            artwork: track.artwork,
            count: 1,
          })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [tracks])

  const visibleAlbums = useMemo(
    () => (showAllAlbums ? albums : albums.slice(0, 6)),
    [albums, showAllAlbums],
  )

  const visibleArtists = useMemo(
    () => (showAllArtists ? artists : artists.slice(0, 6)),
    [artists, showAllArtists],
  )

  const favoriteTracks = useMemo(
    () =>
      favoriteTrackIds
        .map((id) => tracks.find((track) => track.id === id))
        .filter((track): track is Track => Boolean(track)),
    [favoriteTrackIds, tracks],
  )

  const recentlyPlayed = useMemo(
    () =>
      recentlyPlayedIds
        .map((id) => tracks.find((track) => track.id === id))
        .filter((track): track is Track => Boolean(track)),
    [recentlyPlayedIds, tracks],
  )

  const startShuffle = () => {
    if (!tracks.length) return
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    void player.playTrack(shuffled[0], shuffled)
  }

  if (!tracks.length)
    return (
      <EmptyHome
        isReady={isLibraryReady}
        isScanning={isScanning}
        onAddFolder={onAddFolder}
        onImportFiles={onImportFiles}
      />
    )

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
          <h1 className="text-4xl font-semibold tracking-tight text-gradient">
            {greeting()}.
          </h1>
          <p className="mt-2 text-[15px] text-text-secondary">
            Pick up where you left off, or start something new.
          </p>
        </motion.div>

        {/* Quick actions */}
        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <QuickTile
            icon={<Play size={18} fill="currentColor" />}
            title={player.currentTrack ? 'Resume' : 'Play latest'}
            subtitle={
              player.currentTrack?.title ??
              recentlyAdded[0]?.title ??
              'No track yet'
            }
            onClick={() => {
              if (player.currentTrack) void player.togglePlay()
              else if (recentlyAdded[0])
                void player.playTrack(recentlyAdded[0], recentlyAdded)
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

        <CollectionShelf
          collectionIndex={collectionIndex}
          favoriteTracks={favoriteTracks}
          recentlyPlayed={recentlyPlayed}
          playlists={playlists}
          favoriteTrackIds={favoriteTrackIds}
          onCollectionChange={setCollectionIndex}
          onPlayTrack={(track, queue) => void player.playTrack(track, queue)}
          onOpenLibrary={onOpenLibrary}
          onOpenPlaylist={onOpenPlaylist}
          onToggleFavorite={onToggleFavorite}
        />

        {/* Albums */}
        {albums.length > 0 && (
          <Section
            title="Albums"
            delay={0.28}
            actionLabel={
              albums.length > 6
                ? showAllAlbums
                  ? 'Show less'
                  : 'See more'
                : undefined
            }
            onAction={
              albums.length > 6
                ? () => setShowAllAlbums((value) => !value)
                : undefined
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {visibleAlbums.map((album, idx) => (
                <motion.button
                  key={`${album.name}-${album.artist}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 + idx * 0.03, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  onClick={() => {
                    const albumTracks = tracks.filter(
                      (t) =>
                        t.album === album.name &&
                        primaryArtistForTrack(t) === album.artist,
                    )
                    if (albumTracks.length)
                      void player.playTrack(albumTracks[0], albumTracks)
                  }}
                  className="glass-card group p-3 text-left"
                >
                  <div className="art aspect-square w-full">
                    {album.artwork ? (
                      <img
                        src={album.artwork}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
          <Section
            title="Artists"
            delay={0.36}
            actionLabel={
              artists.length > 6
                ? showAllArtists
                  ? 'Show less'
                  : 'See more'
                : undefined
            }
            onAction={
              artists.length > 6
                ? () => setShowAllArtists((value) => !value)
                : undefined
            }
          >
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {visibleArtists.map((artist, idx) => (
                <motion.button
                  key={artist.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.03, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  onClick={() => {
                    const artistTracks = tracks.filter((t) =>
                      artistContributorsForTrack(t).includes(artist.name),
                    )
                    if (artistTracks.length)
                      void player.playTrack(artistTracks[0], artistTracks)
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
                      <img
                        src={artist.artwork}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
      </div>
    </div>
  )
}

function CollectionShelf({
  collectionIndex,
  favoriteTracks,
  recentlyPlayed,
  playlists,
  favoriteTrackIds,
  onCollectionChange,
  onPlayTrack,
  onOpenLibrary,
  onOpenPlaylist,
  onToggleFavorite,
}: {
  collectionIndex: number
  favoriteTracks: Track[]
  recentlyPlayed: Track[]
  playlists: Playlist[]
  favoriteTrackIds: string[]
  onCollectionChange: (value: number) => void
  onPlayTrack: (track: Track, queue: Track[]) => void
  onOpenLibrary: () => void
  onOpenPlaylist: (id: string) => void
  onToggleFavorite: (trackId: string) => void
}) {
  const collections = [
    { label: 'Favorites', icon: Heart },
    { label: 'Playlists', icon: ListMusic },
    { label: 'Recently played', icon: History },
  ]
  const selectedCollection = collections[collectionIndex] ?? collections[2]

  return (
    <Section
      title={selectedCollection.label}
      delay={0.2}
      actionLabel={collectionIndex === 1 ? undefined : 'Browse library'}
      onAction={collectionIndex === 1 ? undefined : onOpenLibrary}
    >
      <div className="mb-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] p-2 shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-3 gap-1">
          {collections.map((collection, index) => {
            const Icon = collection.icon
            const isActive = collectionIndex === index
            return (
              <motion.button
                key={collection.label}
                whileTap={{ scale: 0.97 }}
                onClick={() => onCollectionChange(index)}
                aria-pressed={isActive}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11.5px] font-medium transition ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-accent-light shadow-[0_0_18px_-8px_var(--accent-glow)]'
                    : 'text-text-tertiary hover:bg-[var(--glass-strong)] hover:text-text-secondary'
                }`}
              >
                <Icon size={13} />
                <span className="truncate">{collection.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {collectionIndex === 0 && (
        <TrackCollectionGrid
          tracks={favoriteTracks}
          emptyTitle="No favorites yet"
          emptyDescription="Tap the heart on a song here to keep it close."
          emptyAction="Browse your library"
          favoriteTrackIds={favoriteTrackIds}
          onPlayTrack={onPlayTrack}
          onOpenLibrary={onOpenLibrary}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {collectionIndex === 1 && (
        <PlaylistCollectionGrid
          playlists={playlists}
          onOpenPlaylist={onOpenPlaylist}
        />
      )}

      {collectionIndex === 2 && (
        <TrackCollectionGrid
          tracks={recentlyPlayed}
          emptyTitle="Nothing played yet"
          emptyDescription="Songs you play will appear here, ready for another listen."
          emptyAction="Browse your library"
          favoriteTrackIds={favoriteTrackIds}
          onPlayTrack={onPlayTrack}
          onOpenLibrary={onOpenLibrary}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </Section>
  )
}

function TrackCollectionGrid({
  tracks,
  emptyTitle,
  emptyDescription,
  emptyAction,
  favoriteTrackIds,
  onPlayTrack,
  onOpenLibrary,
  onToggleFavorite,
}: {
  tracks: Track[]
  emptyTitle: string
  emptyDescription: string
  emptyAction: string
  favoriteTrackIds: string[]
  onPlayTrack: (track: Track, queue: Track[]) => void
  onOpenLibrary: () => void
  onToggleFavorite: (trackId: string) => void
}) {
  if (!tracks.length)
    return (
      <div className="glass-card flex min-h-36 flex-col items-center justify-center px-5 py-7 text-center">
        <Heart size={19} className="mb-2 text-accent-light" />
        <p className="text-[13px] font-semibold text-text-primary">
          {emptyTitle}
        </p>
        <p className="mt-1 max-w-sm text-[12px] text-text-tertiary">
          {emptyDescription}
        </p>
        <button
          onClick={onOpenLibrary}
          className="btn-ghost mt-4 !px-3 !py-1.5 text-[12px]"
        >
          {emptyAction}
        </button>
      </div>
    )

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tracks.slice(0, 8).map((track, index) => {
        const isFavorite = favoriteTrackIds.includes(track.id)
        return (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.32 }}
            whileHover={{ y: -3 }}
            className="glass-card group relative p-3"
          >
            <button
              onClick={() => onPlayTrack(track, tracks)}
              className="block w-full text-left"
              aria-label={`Play ${track.title}`}
            >
              <div className="art aspect-square w-full">
                {track.artwork ? (
                  <img
                    src={track.artwork}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Disc3 size={32} />
                )}
                <span className="absolute inset-0 grid place-items-center bg-[var(--glass-strong)] opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
              <div className="mt-3 truncate pr-7 text-[13.5px] font-semibold text-text-primary">
                {track.title}
              </div>
              <div className="truncate text-[12px] text-text-tertiary">
                {track.artist}
              </div>
            </button>
            <button
              onClick={() => onToggleFavorite(track.id)}
              aria-label={
                isFavorite
                  ? `Remove ${track.title} from favorites`
                  : `Add ${track.title} to favorites`
              }
              aria-pressed={isFavorite}
              className={`absolute right-4 top-[calc(100%-3.35rem)] grid h-7 w-7 place-items-center rounded-full transition ${
                isFavorite
                  ? 'bg-[var(--accent-soft)] text-accent-light'
                  : 'text-text-muted opacity-0 hover:bg-[var(--glass-strong)] hover:text-text-primary group-hover:opacity-100 group-focus-within:opacity-100'
              }`}
            >
              <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </motion.div>
        )
      })}
    </div>
  )
}

function PlaylistCollectionGrid({
  playlists,
  onOpenPlaylist,
}: {
  playlists: Playlist[]
  onOpenPlaylist: (id: string) => void
}) {
  if (!playlists.length)
    return (
      <div className="glass-card flex min-h-36 flex-col items-center justify-center px-5 py-7 text-center">
        <ListMusic size={20} className="mb-2 text-accent-light" />
        <p className="text-[13px] font-semibold text-text-primary">
          No playlists yet
        </p>
        <p className="mt-1 text-[12px] text-text-tertiary">
          Create a playlist from the navigation panel to build your next mix.
        </p>
      </div>
    )

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {playlists.slice(0, 8).map((playlist, index) => (
        <motion.button
          key={playlist.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.32 }}
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
  )
}

function Section({
  title,
  children,
  onSeeAll,
  onAction,
  actionLabel,
  delay = 0,
}: {
  title: string
  children: React.ReactNode
  onSeeAll?: () => void
  onAction?: () => void
  actionLabel?: string
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
        {(onAction || onSeeAll) && (
          <button
            onClick={onAction ?? onSeeAll}
            className="text-[12px] font-medium text-text-tertiary transition hover:text-accent-light"
          >
            {actionLabel ?? 'See all >'}
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
          background:
            'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
          boxShadow: '0 10px 24px -8px var(--accent-glow)',
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-text-primary">
          {title}
        </span>
        <span className="block truncate text-[12px] text-text-tertiary">
          {subtitle}
        </span>
      </span>
    </motion.button>
  )
}

function EmptyHome({
  isReady,
  isScanning,
  onAddFolder,
  onImportFiles,
}: {
  isReady: boolean
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
            background:
              'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
            boxShadow: '0 24px 60px -14px var(--accent-glow)',
          }}
        >
          <Disc3 size={44} strokeWidth={1.8} />
        </div>
        <div className="chip mb-4">
          <Sparkles size={11} />
          {isReady ? 'Aurora is ready' : 'Preparing your library'}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">
          {isReady ? 'Bring in your music.' : 'Getting things ready.'}
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-text-secondary">
          Import a folder and Aurora will detect MP3, FLAC, WAV, AAC, M4A and
          OGG files - plus embedded artwork, metadata and matching LRC lyrics.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={onAddFolder}
            disabled={!isReady || isScanning}
            className="btn-primary"
          >
            <FolderOpen size={16} />
            {!isReady
              ? 'Loading library...'
              : isScanning
                ? 'Scanning your music...'
                : 'Choose folder'}
          </button>
          <button
            onClick={onImportFiles}
            disabled={!isReady || isScanning}
            className="btn-ghost"
          >
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
