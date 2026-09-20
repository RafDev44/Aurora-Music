import { useEffect, useRef } from 'react'
import { usePlayer } from './usePlayer'

interface KeyboardShortcutActions {
  onFocusSearch: () => void
  onOpenCommandPalette: () => void
  onToggleFavorite: () => void
  onOpenQueue: () => void
  onEscape: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

function isNativeControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('button, a') !== null
}

export function useKeyboardShortcuts(actions: KeyboardShortcutActions): void {
  const player = usePlayer()
  const actionsRef = useRef(actions)
  const playerRef = useRef(player)
  actionsRef.current = actions
  playerRef.current = player

  useEffect(() => {
    const runPlaybackControl = (
      control: 'previous' | 'toggle-play' | 'next',
    ) => {
      const currentPlayer = playerRef.current
      if (control === 'previous') void currentPlayer.previous()
      if (control === 'toggle-play') void currentPlayer.togglePlay()
      if (control === 'next') void currentPlayer.next()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const currentPlayer = playerRef.current
      const currentActions = actionsRef.current
      const modifier = event.ctrlKey || event.metaKey

      if (modifier) {
        if (event.key.toLowerCase() === 'k') {
          event.preventDefault()
          currentActions.onOpenCommandPalette()
        }
        if (event.key.toLowerCase() === 'f') {
          event.preventDefault()
          currentActions.onFocusSearch()
        }
        if (event.key.toLowerCase() === 'l') {
          event.preventDefault()
          currentActions.onToggleFavorite()
        }
        if (event.key.toLowerCase() === 'q') {
          event.preventDefault()
          currentActions.onOpenQueue()
        }
        return
      }

      if (event.key === 'Escape') {
        currentActions.onEscape()
        return
      }

      if (isNativeControl(event.target)) return

      switch (event.key) {
        case ' ':
        case 'Spacebar':
        case 'MediaPlayPause':
          event.preventDefault()
          void currentPlayer.togglePlay()
          break
        case 'ArrowLeft':
        case 'MediaPreviousTrack':
        case 'MediaTrackPrevious':
          event.preventDefault()
          void currentPlayer.previous()
          break
        case 'ArrowRight':
        case 'MediaNextTrack':
        case 'MediaTrackNext':
          event.preventDefault()
          void currentPlayer.next()
          break
        case 'ArrowUp':
          event.preventDefault()
          currentPlayer.setVolume(Math.min(1, currentPlayer.volume + 0.05))
          break
        case 'ArrowDown':
          event.preventDefault()
          currentPlayer.setVolume(Math.max(0, currentPlayer.volume - 0.05))
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    const removeMediaListener = window.aurora.onMediaControl(runPlaybackControl)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      removeMediaListener()
    }
  }, [])
}
