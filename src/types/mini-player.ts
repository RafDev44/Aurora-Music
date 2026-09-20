import type { Track } from './music.js'

export type MiniPlayerControl = 'previous' | 'toggle-play' | 'next' | 'close'

export interface MiniPlayerPlaybackState {
  track: Pick<Track, 'id' | 'title' | 'artist' | 'artwork' | 'sourceKind'> | null
  isPlaying: boolean
}
