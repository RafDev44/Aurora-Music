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
  const [crossfadeSeconds, updateCrossfadeSeconds] = useState(() => Math.max(1, Math.min(15, Number(localStorage.getItem('aurora:crossfade')) || 3)))

  const playTrack = useCallback(async (track: Track, suppliedQueue?: Track[]) => {
    if (suppliedQueue) setQueue(suppliedQueue)
    try {
      if (currentTrack && isPlaying && currentTrack.id !== track.id) await engine.current!.crossfadeTo(track, crossfadeSeconds)
      else { engine.current!.load(track); await engine.current!.play() }
      setCurrentTrack(track)
      setIsPlaying(true)
    } catch { setIsPlaying(false) }
  }, [crossfadeSeconds, currentTrack, isPlaying])

  const next = useCallback(async () => {
    if (!currentTrack || !queue.length) return
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    const nextIndex = isShuffled ? Math.floor(Math.random() * queue.length) : index + 1
    const track = queue[nextIndex]
    if (track) await playTrack(track)
    else if (repeatMode === 'all') await playTrack(queue[0])
    else { engine.current!.stop(); setIsPlaying(false) }
  }, [currentTrack, isShuffled, playTrack, queue, repeatMode])

  const previous = useCallback(async () => {
    if (!currentTrack || !queue.length) return
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
    const syncTime = () => setCurrentTime(engine.current!.currentTime)
    const syncDuration = () => setDuration(engine.current!.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => { if (repeatMode === 'one') { engine.current!.seek(0); void engine.current!.play() } else void next() }
    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => { audio.removeEventListener('timeupdate', syncTime); audio.removeEventListener('loadedmetadata', syncDuration); audio.removeEventListener('play', onPlay); audio.removeEventListener('pause', onPause); audio.removeEventListener('ended', onEnded) }
  }, [next, repeatMode])

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
    setCrossfadeSeconds: (seconds) => updateCrossfadeSeconds(Math.max(1, Math.min(15, Math.round(seconds)))),
  }), [crossfadeSeconds, currentTrack, currentTime, duration, isPlaying, isShuffled, next, playTrack, previous, queue, repeatMode, togglePlay, volume])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
