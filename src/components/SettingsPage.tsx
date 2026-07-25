import { motion } from 'framer-motion'
import { Paintbrush, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { isValidHex, normalizeHex } from '../theme/colorUtils'
import { useTheme } from '../theme/useTheme'

export function SettingsPage() {
  const { crossfadeSeconds, setCrossfadeSeconds } = usePlayer()
  const { accent, setAccent, presets } = useTheme()
  const [draftAccent, setDraftAccent] = useState(accent)
  const isValidAccent = isValidHex(draftAccent)

  const commitAccent = () => {
    if (isValidAccent) setAccent(draftAccent)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Preferences</p>
          <h1 className="page-title text-gradient">Settings</h1>
          <p className="page-subtitle">
            Tune playback feel and the single accent color that generates Aurora's surfaces, glow, glass, and text tokens.
          </p>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.55fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-card p-6"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
                <SlidersHorizontal size={20} />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-text-primary">Crossfade</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                  Blend the end of the current song into the next one. A longer fade creates a smoother transition.
                </p>
              </div>
            </div>
            <span className="chip">{crossfadeSeconds}s</span>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <span className="text-xs text-text-muted">1s</span>
            <input
              aria-label="Crossfade duration"
              className="range"
              type="range"
              min="1"
              max="15"
              step="1"
              value={crossfadeSeconds}
              style={{ '--progress': `${((crossfadeSeconds - 1) / 14) * 100}%` } as React.CSSProperties}
              onChange={(event) => setCrossfadeSeconds(Number(event.target.value))}
            />
            <span className="text-xs text-text-muted">15s</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="glass-card p-6"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
              <Paintbrush size={20} />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">Accent color</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                One hex value updates every design token through ThemeProvider.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <input
              aria-label="Accent hex"
              value={draftAccent}
              onChange={(event) => setDraftAccent(event.target.value)}
              onBlur={commitAccent}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitAccent()
              }}
              className="input font-mono uppercase"
              placeholder="#7C3AED"
            />
            <input
              aria-label="Accent picker"
              type="color"
              value={isValidAccent ? normalizeHex(draftAccent) : accent}
              onChange={(event) => {
                setDraftAccent(event.target.value)
                setAccent(event.target.value)
              }}
              className="h-11 w-14 cursor-pointer rounded-xl border border-glass-border bg-[var(--glass)] p-1"
            />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDraftAccent(preset)
                  setAccent(preset)
                }}
                className={`swatch ${normalizeHex(accent) === normalizeHex(preset) ? 'swatch-active' : ''}`}
                style={{ background: preset }}
                title={preset}
              />
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-glass-border bg-[var(--glass)] p-4">
            <div className="chip mb-3">
              <Sparkles size={12} />
              Live theme
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['--background', '--surface', '--glass', '--accent'].map((token) => (
                <span key={token} className="rounded-2xl border border-glass-border bg-[var(--glass)] p-3 text-[10px] text-text-tertiary">
                  {token}
                </span>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
