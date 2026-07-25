import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioEngine } from '../audio/AudioEngine'
import type { RepeatMode, Track } from '../types/music'
import { PlayerContext, type PlayerState } from './player-context'

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
    return Number.isFinite(parsed) ? Math.max(0, Math.min(15, Math.round(parsed))) : 3
  })
  const crossfadeStartedFor = useRef<string | null>(null)

  const playTrack = useCallback(async (track: Track, suppliedQueue?: Track[]) => {
    if (suppliedQueue) setQueue(suppliedQueue)
    if (engine.current!.isCrossfading) return
    try {
      if (crossfadeSeconds > 0 && currentTrack && isPlaying && currentTrack.id !== track.id) await engine.current!.crossfadeTo(track, crossfadeSeconds)
      else { engine.current!.load(track); await engine.current!.play() }
      setCurrentTrack(track)
      setCurrentTime(engine.current!.currentTime)
      setDuration(engine.current!.duration)
      setIsPlaying(true)
    } catch { setIsPlaying(false) }
  }, [crossfadeSeconds, currentTrack, isPlaying])

  const next = useCallback(async () => {
    if (!currentTrack || !queue.length || engine.current!.isCrossfading) return
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    const nextIndex = isShuffled ? Math.floor(Math.random() * queue.length) : index + 1
    const track = queue[nextIndex]
    if (track) await playTrack(track)
    else if (repeatMode === 'all') await playTrack(queue[0])
    else { engine.current!.stop(); setIsPlaying(false) }
  }, [currentTrack, isShuffled, playTrack, queue, repeatMode])

  const previous = useCallback(async () => {
    if (!currentTrack || !queue.length || engine.current!.isCrossfading) return
    if (engine.current!.currentTime > 3) { engine.current!.seek(0); return }
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    await playTrack(queue[index > 0 ? index - 1 : queue.length - 1])
  }, [currentTrack, playTrack, queue])

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return
    if (engine.current!.paused) { try { await engine.current!.play(); setIsPlaying(true) } catch { setIsPlaying(false) } }
    else { engine.current!.pause(); setIsPlaying(false) }
  }, [currentTrack])

  useEffect(() => {
    const audio = engine.current!.element
    const syncTime = () => {
      setCurrentTime(engine.current!.currentTime)
      if (crossfadeSeconds <= 0 || repeatMode === 'one' || !currentTrack || engine.current!.isCrossfading || crossfadeStartedFor.current === currentTrack.id) return
      const index = queue.findIndex((track) => track.id === currentTrack.id)
      const canAdvance = isShuffled
        ? queue.length > 1
        : index >= 0 && (index < queue.length - 1 || (repeatMode === 'all' && queue.length > 1))
      const remaining = engine.current!.duration - engine.current!.currentTime
      if (canAdvance && remaining > 0 && remaining <= crossfadeSeconds) {
        crossfadeStartedFor.current = currentTrack.id
        void next()
      }
    }
    const syncDuration = () => setDuration(engine.current!.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => { if (engine.current!.isCrossfading) return; if (repeatMode === 'one') { engine.current!.seek(0); void engine.current!.play() } else void next() }
    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => { audio.removeEventListener('timeupdate', syncTime); audio.removeEventListener('loadedmetadata', syncDuration); audio.removeEventListener('play', onPlay); audio.removeEventListener('pause', onPause); audio.removeEventListener('ended', onEnded) }
  }, [crossfadeSeconds, currentTrack, isShuffled, next, queue, repeatMode])

  useEffect(() => { crossfadeStartedFor.current = null }, [currentTrack])

  useEffect(() => () => engine.current!.dispose(), [])
  useEffect(() => { localStorage.setItem('aurora:crossfade', String(crossfadeSeconds)) }, [crossfadeSeconds])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') { event.preventDefault(); void togglePlay() }
      if (event.code === 'ArrowRight' && event.altKey) { event.preventDefault(); void next() }
      if (event.code === 'ArrowLeft' && event.altKey) { event.preventDefault(); void previous() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, previous, togglePlay])

  const value = useMemo<PlayerState>(() => ({
    currentTrack, queue, isPlaying, currentTime, duration, volume, isShuffled, repeatMode, crossfadeSeconds, setQueue, playTrack, togglePlay,
    stop: () => { engine.current!.stop(); setIsPlaying(false); setCurrentTime(0) }, next, previous,
    seek: (time) => engine.current!.seek(time), setVolume: (value) => { engine.current!.setVolume(value); updateVolume(value) },
    toggleShuffle: () => setIsShuffled((value) => !value), cycleRepeat: () => setRepeatMode((mode) => mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'),
    setCrossfadeSeconds: (seconds) => updateCrossfadeSeconds(Math.max(0, Math.min(15, Math.round(seconds)))),
  }), [crossfadeSeconds, currentTrack, currentTime, duration, isPlaying, isShuffled, next, playTrack, previous, queue, repeatMode, togglePlay, volume])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
