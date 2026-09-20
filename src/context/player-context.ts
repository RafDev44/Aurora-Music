import { createContext } from 'react'
import type { EqualizerBand, EqualizerSettings } from '../audio/AudioEngine'
import type { RepeatMode, Track } from '../types/music'

export type { EqualizerBand, EqualizerSettings }

export type SleepTimerOption = 'off' | 15 | 30 | 45 | 60 | 'end-of-track'

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
  equalizer: EqualizerSettings
  isEqualizerEnabled: boolean
  sleepTimer: SleepTimerOption
  sleepTimerRemainingSeconds: number
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
  setEqualizerBand: (band: EqualizerBand, gain: number) => void
  setEqualizerEnabled: (enabled: boolean) => void
  setSleepTimer: (option: SleepTimerOption) => void
  getFrequencyData: () => Uint8Array | null
}

export const PlayerContext = createContext<PlayerState | null>(null)
