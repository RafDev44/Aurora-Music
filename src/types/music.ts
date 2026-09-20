export interface Track {
  id: string
  title: string
  artist: string
  album: string
  albumartist?: string
  duration: number
  source: string
  artwork?: string
  sourcePath?: string
  genre?: string
  addedAt?: string
  lrcPath?: string
  normalizationGain?: number
  metadataRead?: boolean
  sourceKind?: 'local' | 'drive'
  driveFileId?: string
  driveModifiedTime?: string
}

export interface DriveFolder {
  id: string
  name: string
  parentId?: string
}

export interface CloudStatus {
  configured: boolean
  connected: boolean
  email?: string
  selectedFolders: DriveFolder[]
  cacheBytes: number
  cacheLimitBytes: number
}

export type RepeatMode = 'off' | 'all' | 'one'

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: string
  updatedAt: string
  artwork?: string
}

export interface LyricLine {
  time: number
  text: string
}

export type LyricsKind = 'loading' | 'synced' | 'plain' | 'none'
export type LyricsSource = 'embedded' | 'sidecar' | 'cache' | 'online' | 'manual' | 'none'

export interface LyricsPayload {
  kind: LyricsKind
  content: string
  source: LyricsSource
}
