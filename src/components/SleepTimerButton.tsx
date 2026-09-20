import { Moon, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import type { SleepTimerOption } from '../context/player-context'
import { formatCountdown } from '../utils/formatTime'

const options: Array<{ value: SleepTimerOption; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 'end-of-track', label: 'End of current song' },
]

export function SleepTimerButton() {
  const player = usePlayer()
  const [isOpen, setIsOpen] = useState(false)
  const activeLabel =
    player.sleepTimer === 'end-of-track'
      ? 'End of song'
      : player.sleepTimer === 'off'
        ? ''
        : formatCountdown(player.sleepTimerRemainingSeconds)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isOpen])

  return (
    <div className="relative">
      <button
        className={`control-button ${player.sleepTimer !== 'off' ? 'dock-ctrl-active' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        title={activeLabel ? `Sleep timer: ${activeLabel}` : 'Sleep timer'}
        aria-label={activeLabel ? `Sleep timer: ${activeLabel}` : 'Sleep timer'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Moon size={17} />
        {activeLabel && (
          <span className="sleep-timer-value">{activeLabel}</span>
        )}
      </button>

      {isOpen && (
        <div
          className="sleep-timer-popover"
          role="dialog"
          aria-label="Sleep timer"
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Sleep timer
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {activeLabel
                  ? `Active: ${activeLabel}`
                  : 'Pause playback later.'}
              </p>
            </div>
            <button
              className="icon-btn h-8 w-8"
              onClick={() => setIsOpen(false)}
              aria-label="Close sleep timer"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
          <div className="grid gap-1">
            {options.map((option) => (
              <button
                key={String(option.value)}
                className={`sleep-timer-option ${player.sleepTimer === option.value ? 'sleep-timer-option-active' : ''}`}
                onClick={() => {
                  player.setSleepTimer(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
