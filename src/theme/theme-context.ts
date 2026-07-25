import { createContext } from 'react'

export interface ThemeState {
  accent: string
  setAccent: (hex: string) => void
  presets: readonly string[]
}

export const ThemeContext = createContext<ThemeState | null>(null)
