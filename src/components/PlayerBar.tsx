import { motion } from 'framer-motion'
import {
  Captions,
  Cloud,
  ListMusic,
  MonitorSpeaker,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { ElasticSlider } from './ElasticSlider'
import { SleepTimerButton } from './SleepTimerButton'

const formatTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`
}

export function PlayerBar({
  onOpenLyrics,
  onOpenQueue,
}: {
  onOpenLyrics: () => void
  onOpenQueue: () => void
}) {
  const player = usePlayer()
  const hasTrack = Boolean(player.currentTrack)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const isScrubbing = useRef(false)
  const displayedTime = scrubTime ?? player.currentTime
  const progress = player.duration ? (displayedTime / player.duration) * 100 : 0
  const volumePercent = Math.round(player.volume * 100)

  const clampSeekTime = (time: number) => {
    if (!player.duration || !Number.isFinite(time)) return 0
    return Math.max(0, Math.min(player.duration, time))
  }

  const previewSeek = (time: number) => {
    if (!hasTrack || !player.duration) return
    setScrubTime(clampSeekTime(time))
  }

  const commitSeek = (time: number) => {
    if (!hasTrack || !player.duration) return
    const nextTime = clampSeekTime(time)
    setScrubTime(nextTime)
    player.seek(nextTime)
    window.setTimeout(() => setScrubTime(null), 0)
  }

  return (
    <motion.footer
      initial={{ opacity: 0, y: 24, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="player-bar"
    >
      <button
        onClick={onOpenLyrics}
        className="group flex min-w-0 items-center gap-3 text-left"
        title="Open lyrics"
        aria-label="Open lyrics"
      >
        <span className="art h-[68px] w-[68px] flex-shrink-0 rounded-[24px]">
          {player.currentTrack?.artwork ? (
            <img
              src={player.currentTrack.artwork}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold">A</span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold text-text-primary">
            {player.currentTrack?.title ?? 'Nothing playing'}
            {player.currentTrack?.sourceKind === 'drive' && (
              <Cloud
                size={13}
                className="ml-1 inline text-accent-light"
                aria-label="Google Drive track"
              />
            )}
          </span>
          <span className="mt-1 block truncate text-xs text-text-tertiary">
            {player.currentTrack?.artist ??
              'Add music in Library to get started'}
          </span>
        </span>
      </button>

      <div className="flex min-w-0 flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            className={`control-button ${player.isShuffled ? 'dock-ctrl-active' : ''}`}
            onClick={player.toggleShuffle}
            title="Shuffle"
            aria-label="Shuffle"
          >
            <Shuffle size={16} />
          </button>
          <button
            className="control-button"
            onClick={() => void player.previous()}
            disabled={!hasTrack}
            title="Previous"
            aria-label="Previous track"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="dock-play"
            onClick={() => void player.togglePlay()}
            disabled={!hasTrack}
            title={player.isPlaying ? 'Pause' : 'Play'}
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </motion.button>
          <button
            className="control-button"
            onClick={() => void player.next()}
            disabled={!hasTrack}
            title="Next"
            aria-label="Next track"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button
            className={`control-button ${player.repeatMode !== 'off' ? 'dock-ctrl-active' : ''}`}
            onClick={player.cycleRepeat}
            title={`Repeat: ${player.repeatMode}`}
            aria-label={`Repeat: ${player.repeatMode}`}
          >
            {player.repeatMode === 'one' ? (
              <Repeat1 size={17} />
            ) : (
              <Repeat size={17} />
            )}
          </button>
        </div>

        <div
          className="flex w-full min-w-0 select-none items-center gap-3 text-[11px] tabular-nums text-text-tertiary"
          draggable={false}
          onDragStart={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          <span className="w-9 text-right" draggable={false}>
            {formatTime(displayedTime)}
          </span>
          <input
            aria-label="Seek"
            className="range"
            type="range"
            min="0"
            max={player.duration || 0}
            step="0.01"
            value={displayedTime}
            draggable={false}
            style={{ '--progress': `${progress}%` } as CSSProperties}
            onInput={(event) => previewSeek(Number(event.currentTarget.value))}
            onChange={(event) => {
              if (!isScrubbing.current)
                commitSeek(Number(event.currentTarget.value))
            }}
            onPointerDown={(event) => {
              event.stopPropagation()
              isScrubbing.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
              previewSeek(Number(event.currentTarget.value))
            }}
            onPointerUp={(event) => {
              isScrubbing.current = false
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
              commitSeek(Number(event.currentTarget.value))
            }}
            onPointerCancel={() => {
              isScrubbing.current = false
              setScrubTime(null)
            }}
            onBlur={() => {
              isScrubbing.current = false
              if (scrubTime !== null) commitSeek(scrubTime)
            }}
            onDragStart={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onWheel={(event) => {
              if (!hasTrack || !player.duration) return
              event.preventDefault()
              event.stopPropagation()
              const direction = event.deltaY < 0 ? 1 : -1
              commitSeek(displayedTime + direction * 5)
            }}
            disabled={!hasTrack}
          />
          <span className="w-9" draggable={false}>
            {formatTime(player.duration)}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <button
          className={`control-button ${player.isEqualizerEnabled ? 'dock-ctrl-active' : ''}`}
          onClick={() => player.setEqualizerEnabled(!player.isEqualizerEnabled)}
          title={
            player.isEqualizerEnabled ? 'Disable equalizer' : 'Enable equalizer'
          }
          aria-label={
            player.isEqualizerEnabled ? 'Disable equalizer' : 'Enable equalizer'
          }
          aria-pressed={player.isEqualizerEnabled}
        >
          <SlidersHorizontal size={17} />
        </button>
        <button
          className="control-button"
          onClick={onOpenQueue}
          title="Open queue"
          aria-label="Open queue"
        >
          <ListMusic size={18} />
        </button>
        <button
          className="control-button"
          title="Playback device"
          aria-label="Playback device"
        >
          <MonitorSpeaker size={18} />
        </button>
        <button
          className="control-button"
          onClick={onOpenLyrics}
          title="Lyrics"
          aria-label="Open lyrics"
        >
          <Captions size={18} />
        </button>
        <SleepTimerButton />
        <button
          className="control-button"
          onClick={() => player.setVolume(player.volume ? 0 : 0.8)}
          title={player.volume ? 'Mute' : 'Unmute'}
          aria-label={player.volume ? 'Mute' : 'Unmute'}
        >
          {player.volume ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <ElasticSlider
          value={volumePercent}
          max={100}
          step={1}
          ariaLabel="Volume"
          className="w-24 sm:w-28"
          onValueChange={(value) => player.setVolume(value / 100)}
        />
        <button
          className="control-button"
          onClick={player.stop}
          disabled={!hasTrack}
          title="Stop"
          aria-label="Stop playback"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </motion.footer>
  )
}
