import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioEngine,
  type EqualizerBand,
  type EqualizerSettings,
} from '../audio/AudioEngine'
import type { RepeatMode, Track } from '../types/music'
import {
  PlayerContext,
  type PlayerState,
  type SleepTimerOption,
} from './player-context'

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<AudioEngine>()
  if (!engine.current) engine.current = new AudioEngine()
  const [queue, setQueue] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, updateVolume] = useState(0.8)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [crossfadeSeconds, updateCrossfadeSeconds] = useState(() => {
    const stored = localStorage.getItem('aurora:crossfade')
    const parsed = stored === null ? 3 : Number(stored)
    return Number.isFinite(parsed)
      ? Math.max(0, Math.min(15, Math.round(parsed)))
      : 3
  })
  const [equalizer, updateEqualizer] = useState<EqualizerSettings>(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem('aurora:equalizer') ?? '{}',
      )
      return {
        bass: clampEqualizerGain(stored.bass),
        mid: clampEqualizerGain(stored.mid),
        treble: clampEqualizerGain(stored.treble),
      }
    } catch {
      return { bass: 0, mid: 0, treble: 0 }
    }
  })
  const [isEqualizerEnabled, updateEqualizerEnabled] = useState(
    () => localStorage.getItem('aurora:equalizer-enabled') !== 'false',
  )
  const [sleepTimer, updateSleepTimer] = useState<SleepTimerOption>('off')
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] =
    useState(0)
  const crossfadeStartedFor = useRef<string | null>(null)
  const manualSeekHoldFor = useRef<string | null>(null)
  const sleepTimerDeadline = useRef<number | null>(null)
  const sleepTimerTrackId = useRef<string | null>(null)

  const clearSleepTimer = useCallback(() => {
    sleepTimerDeadline.current = null
    sleepTimerTrackId.current = null
    updateSleepTimer('off')
    setSleepTimerRemainingSeconds(0)
  }, [])

  const setSleepTimer = useCallback(
    (option: SleepTimerOption) => {
      if (option === 'off') {
        clearSleepTimer()
        return
      }
      if (option === 'end-of-track') {
        if (!currentTrack) return
        sleepTimerDeadline.current = null
        sleepTimerTrackId.current = currentTrack.id
        updateSleepTimer(option)
        setSleepTimerRemainingSeconds(0)
        return
      }

      const seconds = option * 60
      sleepTimerDeadline.current = Date.now() + seconds * 1000
      sleepTimerTrackId.current = null
      updateSleepTimer(option)
      setSleepTimerRemainingSeconds(seconds)
    },
    [clearSleepTimer, currentTrack],
  )

  useEffect(() => {
    if (typeof sleepTimer !== 'number') return
    const tick = () => {
      const deadline = sleepTimerDeadline.current
      if (!deadline) return
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSleepTimerRemainingSeconds(remaining)
      if (remaining !== 0) return
      engine.current!.pause()
      setIsPlaying(false)
      clearSleepTimer()
    }
    tick()
    const timer = window.setInterval(tick, 1_000)
    return () => window.clearInterval(timer)
  }, [clearSleepTimer, sleepTimer])

  useEffect(() => {
    if (
      sleepTimer === 'end-of-track' &&
      sleepTimerTrackId.current !== currentTrack?.id
    )
      clearSleepTimer()
  }, [clearSleepTimer, currentTrack?.id, sleepTimer])

  const playTrack = useCallback(
    async (track: Track, suppliedQueue?: Track[]) => {
      if (suppliedQueue) setQueue(suppliedQueue)
      if (engine.current!.isCrossfading) return
      try {
        if (
          crossfadeSeconds > 0 &&
          currentTrack &&
          isPlaying &&
          currentTrack.id !== track.id
        )
          await engine.current!.crossfadeTo(track, crossfadeSeconds)
        else {
          engine.current!.load(track)
          await engine.current!.play()
        }
        setCurrentTrack(track)
        setCurrentTime(engine.current!.currentTime)
        setDuration(engine.current!.duration)
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    },
    [crossfadeSeconds, currentTrack, isPlaying],
  )

  const next = useCallback(async () => {
    if (!currentTrack || !queue.length || engine.current!.isCrossfading) return
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    const nextIndex = isShuffled
      ? Math.floor(Math.random() * queue.length)
      : index + 1
    const track = queue[nextIndex]
    if (track) await playTrack(track)
    else if (repeatMode === 'all') await playTrack(queue[0])
    else {
      engine.current!.stop()
      setIsPlaying(false)
    }
  }, [currentTrack, isShuffled, playTrack, queue, repeatMode])

  const previous = useCallback(async () => {
    if (!currentTrack || !queue.length || engine.current!.isCrossfading) return
    if (engine.current!.currentTime > 3) {
      engine.current!.seek(0)
      return
    }
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    await playTrack(queue[index > 0 ? index - 1 : queue.length - 1])
  }, [currentTrack, playTrack, queue])

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return
    if (engine.current!.paused) {
      try {
        await engine.current!.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    } else {
      engine.current!.pause()
      setIsPlaying(false)
    }
  }, [currentTrack])

  useEffect(() => {
    const audio = engine.current!.element
    const syncTime = () => {
      setCurrentTime(engine.current!.currentTime)
      if (
        crossfadeSeconds <= 0 ||
        repeatMode === 'one' ||
        (sleepTimer === 'end-of-track' &&
          sleepTimerTrackId.current === currentTrack?.id) ||
        !currentTrack ||
        engine.current!.isCrossfading ||
        crossfadeStartedFor.current === currentTrack.id
      )
        return
      const index = queue.findIndex((track) => track.id === currentTrack.id)
      const canAdvance = isShuffled
        ? queue.length > 1
        : index >= 0 &&
          (index < queue.length - 1 ||
            (repeatMode === 'all' && queue.length > 1))
      const remaining = engine.current!.duration - engine.current!.currentTime
      if (manualSeekHoldFor.current === currentTrack.id) {
        if (remaining <= crossfadeSeconds + 0.25) return
        manualSeekHoldFor.current = null
      }
      if (canAdvance && remaining > 0 && remaining <= crossfadeSeconds) {
        crossfadeStartedFor.current = currentTrack.id
        void next()
      }
    }
    const syncDuration = () => setDuration(engine.current!.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      if (engine.current!.isCrossfading) return
      if (
        sleepTimer === 'end-of-track' &&
        sleepTimerTrackId.current === currentTrack?.id
      ) {
        setIsPlaying(false)
        clearSleepTimer()
        return
      }
      if (repeatMode === 'one') {
        engine.current!.seek(0)
        void engine.current!.play()
      } else void next()
    }
    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', syncTime)
      audio.removeEventListener('loadedmetadata', syncDuration)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [
    clearSleepTimer,
    crossfadeSeconds,
    currentTrack,
    isShuffled,
    next,
    queue,
    repeatMode,
    sleepTimer,
  ])

  useEffect(() => {
    crossfadeStartedFor.current = null
    manualSeekHoldFor.current = null
  }, [currentTrack])

  useEffect(
    () => () => {
      engine.current!.dispose()
    },
    [],
  )
  useEffect(() => {
    localStorage.setItem('aurora:crossfade', String(crossfadeSeconds))
  }, [crossfadeSeconds])
  useEffect(() => {
    localStorage.setItem('aurora:equalizer', JSON.stringify(equalizer))
    engine.current!.setEqualizer(equalizer, isEqualizerEnabled)
  }, [equalizer, isEqualizerEnabled])
  useEffect(() => {
    localStorage.setItem('aurora:equalizer-enabled', String(isEqualizerEnabled))
  }, [isEqualizerEnabled])

  const seek = useCallback(
    (time: number) => {
      const audioDuration = engine.current!.duration
      const safeTime =
        audioDuration > 0
          ? Math.max(0, Math.min(time, Math.max(0, audioDuration - 0.05)))
          : Math.max(0, time)

      engine.current!.seek(safeTime)
      setCurrentTime(engine.current!.currentTime)

      if (currentTrack && crossfadeSeconds > 0 && audioDuration > 0) {
        const remaining = audioDuration - engine.current!.currentTime
        manualSeekHoldFor.current =
          remaining <= crossfadeSeconds ? currentTrack.id : null
      }
    },
    [crossfadeSeconds, currentTrack],
  )

  const setEqualizerBand = useCallback((band: EqualizerBand, gain: number) => {
    updateEqualizer((settings) => ({
      ...settings,
      [band]: clampEqualizerGain(gain),
    }))
  }, [])
  const getFrequencyData = useCallback(
    () => engine.current!.getFrequencyData(),
    [],
  )

  const value = useMemo<PlayerState>(
    () => ({
      currentTrack,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      isShuffled,
      repeatMode,
      crossfadeSeconds,
      equalizer,
      isEqualizerEnabled,
      sleepTimer,
      sleepTimerRemainingSeconds,
      setQueue,
      playTrack,
      togglePlay,
      stop: () => {
        engine.current!.stop()
        setIsPlaying(false)
        setCurrentTime(0)
      },
      next,
      previous,
      seek,
      setVolume: (value) => {
        engine.current!.setVolume(value)
        updateVolume(value)
      },
      toggleShuffle: () => setIsShuffled((value) => !value),
      cycleRepeat: () =>
        setRepeatMode((mode) =>
          mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off',
        ),
      setCrossfadeSeconds: (seconds) =>
        updateCrossfadeSeconds(Math.max(0, Math.min(15, Math.round(seconds)))),
      setEqualizerBand,
      setEqualizerEnabled: updateEqualizerEnabled,
      setSleepTimer,
      getFrequencyData,
    }),
    [
      crossfadeSeconds,
      currentTrack,
      currentTime,
      duration,
      equalizer,
      getFrequencyData,
      isEqualizerEnabled,
      isPlaying,
      isShuffled,
      next,
      playTrack,
      previous,
      queue,
      repeatMode,
      seek,
      setEqualizerBand,
      setSleepTimer,
      sleepTimer,
      sleepTimerRemainingSeconds,
      togglePlay,
      volume,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  )
}

function clampEqualizerGain(value: unknown) {
  const gain = typeof value === 'number' ? value : 0
  return Math.max(-12, Math.min(12, gain))
}
