import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MiniPlayerWindow } from './components/MiniPlayerWindow'
import { PlayerProvider } from './context/PlayerContext'
import { ThemeProvider } from './theme/ThemeProvider'
import './styles/globals.css'

// Keep the single first-paint veil in place until the existing library
// hydration has completed, then fade directly into the application.
const isMiniPlayerWindow = new URLSearchParams(window.location.search).has(
  'miniPlayer',
)
const bootSplash = isMiniPlayerWindow
  ? document.getElementById('boot-splash')?.remove()
  : document.getElementById('boot-splash')
if (bootSplash) {
  const startedAt = performance.now()
  const minimumDuration = 700
  let removed = false

  const removeBootSplash = () => {
    if (removed) return
    removed = true
    bootSplash.classList.add('boot-splash-exit')
    window.setTimeout(() => bootSplash.remove(), 450)
  }

  const onLibraryReady = () => {
    const elapsed = performance.now() - startedAt
    window.setTimeout(removeBootSplash, Math.max(0, minimumDuration - elapsed))
  }

  window.addEventListener('aurora:library-ready', onLibraryReady, {
    once: true,
  })
  // A failed renderer initialization should not leave the window covered
  // forever; normal launches hand off through the event above.
  window.setTimeout(removeBootSplash, 60_000)
}

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <ThemeProvider>
      {isMiniPlayerWindow ? (
        <MiniPlayerWindow />
      ) : (
        <PlayerProvider>
          <App />
        </PlayerProvider>
      )}
    </ThemeProvider>
  </StrictMode>,
)
