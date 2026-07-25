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
