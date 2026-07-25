import { motion } from 'framer-motion'
import {
  Captions,
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
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'

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
  const progress = player.duration ? (player.currentTime / player.duration) * 100 : 0

  return (
    <motion.footer
      initial={{ opacity: 0, y: 24, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="player-bar"
    >
      <button onClick={onOpenLyrics} className="group flex min-w-0 items-center gap-3 text-left" title="Open lyrics">
        <span className="art h-[68px] w-[68px] flex-shrink-0 rounded-[24px]">
          {player.currentTrack?.artwork ? (
            <img src={player.currentTrack.artwork} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-semibold">A</span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold text-text-primary">
            {player.currentTrack?.title ?? 'Nothing playing'}
          </span>
          <span className="mt-1 block truncate text-xs text-text-tertiary">
            {player.currentTrack?.artist ?? 'Add music in Library to get started'}
          </span>
        </span>
      </button>

      <div className="flex min-w-0 flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            className={`control-button ${player.isShuffled ? 'dock-ctrl-active' : ''}`}
            onClick={player.toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>
          <button className="control-button" onClick={() => void player.previous()} disabled={!hasTrack} title="Previous">
            <SkipBack size={18} fill="currentColor" />
          </button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="dock-play"
            onClick={() => void player.togglePlay()}
            disabled={!hasTrack}
            title={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </motion.button>
          <button className="control-button" onClick={() => void player.next()} disabled={!hasTrack} title="Next">
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button
            className={`control-button ${player.repeatMode !== 'off' ? 'dock-ctrl-active' : ''}`}
            onClick={player.cycleRepeat}
            title={`Repeat: ${player.repeatMode}`}
          >
            {player.repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        <div className="flex w-full min-w-0 items-center gap-3 text-[11px] tabular-nums text-text-tertiary">
          <span className="w-9 text-right">{formatTime(player.currentTime)}</span>
          <input
            aria-label="Seek"
            className="range"
            type="range"
            min="0"
            max={player.duration || 0}
            value={player.currentTime}
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
            onChange={(event) => player.seek(Number(event.target.value))}
            disabled={!hasTrack}
          />
          <span className="w-9">{formatTime(player.duration)}</span>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <button className="control-button" onClick={onOpenQueue} title="Open queue">
          <ListMusic size={18} />
        </button>
        <button className="control-button" title="Playback device">
          <MonitorSpeaker size={18} />
        </button>
        <button className="control-button" onClick={onOpenLyrics} title="Lyrics">
          <Captions size={18} />
        </button>
        <button className="control-button" onClick={() => player.setVolume(player.volume ? 0 : 0.8)} title="Mute">
          {player.volume ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <input
          aria-label="Volume"
          className="range w-24"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={player.volume}
          style={{ '--progress': `${player.volume * 100}%` } as React.CSSProperties}
          onChange={(event) => player.setVolume(Number(event.target.value))}
        />
        <button className="control-button" onClick={player.stop} disabled={!hasTrack} title="Stop">
          <RotateCcw size={16} />
        </button>
      </div>
    </motion.footer>
  )
}
