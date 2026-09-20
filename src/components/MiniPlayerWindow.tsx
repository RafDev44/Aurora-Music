import { Music2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MiniPlayerPlaybackState } from '../types/mini-player'
import { AudioVisualizer } from './AudioVisualizer'
import { AuroraLogo } from './AuroraLogo'

const emptyState: MiniPlayerPlaybackState = { track: null, isPlaying: false }

export function MiniPlayerWindow() {
  const [playback, setPlayback] = useState<MiniPlayerPlaybackState>(emptyState)
  const [frequencyData, setFrequencyData] = useState<number[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const track = playback.track

  useEffect(() => {
    document.body.classList.add('mini-player-body')
    void window.aurora
      .getMiniPlayerState()
      .then(setPlayback)
      .catch(() => undefined)
    void window.aurora
      .getMiniPlayerVisibility()
      .then(setIsVisible)
      .catch(() => undefined)
    const removeStateListener = window.aurora.onMiniPlayerState(setPlayback)
    const removeFrequencyListener =
      window.aurora.onMiniPlayerFrequency(setFrequencyData)
    const removeVisibilityListener =
      window.aurora.onMiniPlayerVisibility(setIsVisible)
    return () => {
      document.body.classList.remove('mini-player-body')
      removeStateListener()
      removeFrequencyListener()
      removeVisibilityListener()
    }
  }, [])

  const sendControl = (
    control: 'previous' | 'toggle-play' | 'next' | 'close',
  ) => {
    void window.aurora.sendMiniPlayerControl(control).catch(() => undefined)
  }

  return (
    <main className="mini-player-window" aria-label="Aurora mini player">
      <div className="mini-player-window-drag" aria-hidden />
      <div className="mini-player-window-content">
        <div className="mini-player-cover art">
          {track?.artwork ? (
            <img
              src={track.artwork}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <AuroraLogo size={34} />
          )}
        </div>

        <div className="mini-player-track min-w-0 flex-1">
          <span className="mini-player-status">
            <Music2 size={11} aria-hidden />
            {playback.isPlaying ? 'Now playing' : 'Paused'}
          </span>
          <p className="truncate text-sm font-semibold text-text-primary">
            {track?.title ?? 'Nothing playing'}
          </p>
          <p className="mt-1 truncate text-xs text-text-tertiary">
            {track?.artist ?? 'Choose a song in Aurora'}
          </p>
          <AudioVisualizer
            className="mini-player-visualizer mt-3"
            frequencyData={frequencyData}
            isPlaying={playback.isPlaying && isVisible}
          />
        </div>

        <div className="mini-player-actions">
          <button
            className="mini-player-close"
            onClick={() => sendControl('close')}
            aria-label="Hide mini player"
            title="Hide mini player"
          >
            <X size={14} />
          </button>
          <div className="mini-player-transport">
            <button
              className="mini-player-control"
              onClick={() => sendControl('previous')}
              disabled={!track}
              aria-label="Previous track"
              title="Previous"
            >
              <SkipBack size={16} fill="currentColor" />
            </button>
            <button
              className="mini-player-play"
              onClick={() => sendControl('toggle-play')}
              disabled={!track}
              aria-label={playback.isPlaying ? 'Pause' : 'Play'}
              title={playback.isPlaying ? 'Pause' : 'Play'}
            >
              {playback.isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </button>
            <button
              className="mini-player-control"
              onClick={() => sendControl('next')}
              disabled={!track}
              aria-label="Next track"
              title="Next"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
