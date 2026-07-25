import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext, type ThemeState } from './theme-context'
import { hexToRgb, isValidHex, mix, normalizeHex, shiftLightness, withAlpha } from './colorUtils'

const STORAGE_KEY = 'aurora:accent'
const DEFAULT_ACCENT = '#8B5CF6'
const PRESETS = ['#8B5CF6', '#00D4FF', '#00FF9C', '#FF5CA8', '#FFB84C', '#F43F5E', '#38BDF8', '#A3E635'] as const

// Derive every design token from ONE hex and paint them onto <html>.
// Any component that reads var(--accent), var(--glass), etc. updates automatically.
function paintTheme(accent: string) {
  const root = document.documentElement
  const safe = isValidHex(accent) ? normalizeHex(accent) : DEFAULT_ACCENT
  const { r, g, b } = hexToRgb(safe)

  const accentLight = shiftLightness(safe, 0.12)
  const accentDark = shiftLightness(safe, -0.14)
  const gradientStart = shiftLightness(safe, 0.08)
  const gradientEnd = shiftLightness(safe, -0.18)

  // Deep near-black canvas softly tinted with the accent (~7% mix).
  const canvasBase = '#09090B'
  const background = mix(canvasBase, safe, 0.07)
  const backgroundDeep = mix(canvasBase, safe, 0.03)
  const surface = mix('#141419', safe, 0.05)
  const surfaceStrong = mix('#1B1B22', safe, 0.06)

  root.style.setProperty('--accent', safe)
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--accent-light', accentLight)
  root.style.setProperty('--accent-dark', accentDark)
  root.style.setProperty('--accent-soft', withAlpha(safe, 0.18))
  root.style.setProperty('--accent-muted', withAlpha(safe, 0.1))
  root.style.setProperty('--accent-glow', withAlpha(safe, 0.45))
  root.style.setProperty('--accent-glow-soft', withAlpha(safe, 0.22))
  root.style.setProperty('--accent-shadow', withAlpha(accentDark, 0.55))
  root.style.setProperty('--accent-foreground', '#FFFFFF')

  root.style.setProperty('--gradient-start', gradientStart)
  root.style.setProperty('--gradient-end', gradientEnd)
  root.style.setProperty('--gradient-conic', `conic-gradient(from 210deg at 50% 50%, ${gradientStart}, ${gradientEnd}, ${gradientStart})`)

  root.style.setProperty('--background', background)
  root.style.setProperty('--background-deep', backgroundDeep)
  root.style.setProperty('--surface', surface)
  root.style.setProperty('--surface-strong', surfaceStrong)

  root.style.setProperty('--glass', 'rgba(255, 255, 255, 0.045)')
  root.style.setProperty('--glass-strong', 'rgba(255, 255, 255, 0.08)')
  root.style.setProperty('--glass-tint', withAlpha(safe, 0.06))
  root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.09)')
  root.style.setProperty('--glass-border-strong', 'rgba(255, 255, 255, 0.14)')

  root.style.setProperty('--text-primary', '#F5F5F7')
  root.style.setProperty('--text-secondary', 'rgba(245, 245, 247, 0.72)')
  root.style.setProperty('--text-tertiary', 'rgba(245, 245, 247, 0.5)')
  root.style.setProperty('--text-muted', 'rgba(245, 245, 247, 0.32)')

  root.style.setProperty('--aurora-1', withAlpha(safe, 0.28))
  root.style.setProperty('--aurora-2', withAlpha(accentLight, 0.22))
  root.style.setProperty('--aurora-3', withAlpha(accentDark, 0.24))

  root.style.setProperty('--shadow-soft', `0 10px 40px ${withAlpha('#000000', 0.35)}`)
  root.style.setProperty('--shadow-lift', `0 24px 60px ${withAlpha('#000000', 0.5)}, 0 0 0 1px rgba(255,255,255,0.03)`)
  root.style.setProperty('--shadow-dock', `0 30px 80px ${withAlpha('#000000', 0.55)}, 0 0 0 1px rgba(255,255,255,0.04)`)

  // Set the meta theme-color so the window chrome matches.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', background)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_ACCENT
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && isValidHex(stored) ? normalizeHex(stored) : DEFAULT_ACCENT
  })

  useEffect(() => {
    paintTheme(accent)
    try {
      window.localStorage.setItem(STORAGE_KEY, accent)
    } catch {
      /* localStorage may be blocked — theme still applies via CSS vars. */
    }
  }, [accent])

  const setAccent = useCallback((hex: string) => {
    if (!isValidHex(hex)) return
    setAccentState(normalizeHex(hex))
  }, [])

  const value = useMemo<ThemeState>(() => ({ accent, setAccent, presets: PRESETS }), [accent, setAccent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
