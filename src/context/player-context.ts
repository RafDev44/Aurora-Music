import { createContext } from 'react'
import type { RepeatMode, Track } from '../types/music'

export interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isShuffled: boolean
  repeatMode: RepeatMode
  crossfadeSeconds: number
  setQueue: (tracks: Track[]) => void
  playTrack: (track: Track, queue?: Track[]) => Promise<void>
  togglePlay: () => Promise<void>
  stop: () => void
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setCrossfadeSeconds: (seconds: number) => void
}

export const PlayerContext = createContext<PlayerState | null>(null)
