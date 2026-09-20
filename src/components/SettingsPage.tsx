import { motion } from 'framer-motion'
import {
  Check,
  Cloud,
  FolderOpen,
  LogIn,
  LogOut,
  Moon,
  Paintbrush,
  PanelTop,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Waves,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import type { SleepTimerOption } from '../context/player-context'
import { isValidHex, normalizeHex } from '../theme/colorUtils'
import { useTheme } from '../theme/useTheme'
import type { CloudStatus, DriveFolder } from '../types/music'
import { formatCountdown } from '../utils/formatTime'

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  )
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

const liveThemeTokens = [
  { label: 'Background', variable: '--background' },
  { label: 'Surface', variable: '--surface' },
  { label: 'Glass', variable: '--glass' },
  { label: 'Accent', variable: '--accent' },
  { label: 'Accent light', variable: '--accent-light' },
  { label: 'Accent dark', variable: '--accent-dark' },
  { label: 'Glow', variable: '--accent-glow' },
  { label: 'Border', variable: '--glass-border' },
  { label: 'Primary text', variable: '--text-primary' },
  { label: 'Secondary text', variable: '--text-secondary' },
  { label: 'Muted text', variable: '--text-muted' },
] as const

const sleepTimerOptions: Array<{ value: SleepTimerOption; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 'end-of-track', label: 'End of current song' },
]

export function SettingsPage({
  onLibraryChanged,
}: {
  onLibraryChanged?: () => Promise<void> | void
}) {
  const {
    crossfadeSeconds,
    setCrossfadeSeconds,
    equalizer,
    isEqualizerEnabled,
    setEqualizerBand,
    setEqualizerEnabled,
    sleepTimer,
    sleepTimerRemainingSeconds,
    setSleepTimer,
  } = usePlayer()
  const { accent, setAccent, presets } = useTheme()
  const [draftAccent, setDraftAccent] = useState(accent)
  const isValidAccent = isValidHex(draftAccent)
  const [cloud, setCloud] = useState<CloudStatus | null>(null)
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [showFolders, setShowFolders] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [themeValues, setThemeValues] = useState<Record<string, string>>({})
  const [openMiniPlayerOnMinimize, setOpenMiniPlayerOnMinimize] = useState(
    () => localStorage.getItem('aurora:mini-player-on-minimize') !== 'false',
  )

  useEffect(() => {
    void window.aurora
      .getCloudStatus()
      .then(setCloud)
      .catch(() => setCloud(null))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const styles = getComputedStyle(root)
    setThemeValues(
      Object.fromEntries(
        liveThemeTokens.map(({ variable }) => [
          variable,
          styles.getPropertyValue(variable).trim(),
        ]),
      ),
    )
  }, [accent])

  useEffect(() => {
    localStorage.setItem(
      'aurora:mini-player-on-minimize',
      String(openMiniPlayerOnMinimize),
    )
    void window.aurora.setMiniPlayerAutoShow(openMiniPlayerOnMinimize)
  }, [openMiniPlayerOnMinimize])

  const runCloudAction = async (action: () => Promise<CloudStatus>) => {
    setCloudBusy(true)
    setCloudError('')
    try {
      setCloud(await action())
    } catch (error) {
      setCloudError(
        error instanceof Error ? error.message : 'Google Drive is unavailable.',
      )
    } finally {
      setCloudBusy(false)
    }
  }

  const connect = () =>
    void runCloudAction(() => window.aurora.connectGoogleDrive())
  const disconnect = () =>
    void runCloudAction(() => window.aurora.disconnectGoogleDrive())
  const loadFolders = async () => {
    setCloudBusy(true)
    setCloudError('')
    try {
      setFolders(await window.aurora.listDriveFolders())
      setShowFolders(true)
    } catch (error) {
      setCloudError(
        error instanceof Error
          ? error.message
          : 'Could not load Drive folders.',
      )
    } finally {
      setCloudBusy(false)
    }
  }
  const toggleFolder = (folder: DriveFolder) => {
    if (!cloud) return
    const exists = cloud.selectedFolders.some((item) => item.id === folder.id)
    const selectedFolders = exists
      ? cloud.selectedFolders.filter((item) => item.id !== folder.id)
      : [...cloud.selectedFolders, folder]
    void runCloudAction(() => window.aurora.setDriveFolders(selectedFolders))
  }
  const rescan = async () => {
    setCloudBusy(true)
    setCloudError('')
    try {
      await window.aurora.scanDrive()
      setCloud(await window.aurora.getCloudStatus())
      await onLibraryChanged?.()
    } catch (error) {
      setCloudError(
        error instanceof Error ? error.message : 'Could not sync Google Drive.',
      )
    } finally {
      setCloudBusy(false)
    }
  }

  const commitAccent = () => {
    if (isValidAccent) setAccent(draftAccent)
  }

  return (
    <div className="page page-scroll">
      <header className="page-header">
        <div>
          <p className="eyebrow">Preferences</p>
          <h1 className="page-title text-gradient">Settings</h1>
          <p className="page-subtitle">
            Tune playback feel and the single accent color that generates
            Aurora's surfaces, glow, glass, and text tokens.
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.55fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          aria-labelledby="crossfade-heading"
          className="glass-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
                <SlidersHorizontal size={20} />
              </span>
              <div>
                <h2
                  id="crossfade-heading"
                  className="text-xl font-semibold tracking-tight text-text-primary"
                >
                  Crossfade
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                  Blend the end of the current song into the next one. A longer
                  fade creates a smoother transition.
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
              style={
                {
                  '--progress': `${((crossfadeSeconds - 1) / 14) * 100}%`,
                } as React.CSSProperties
              }
              onChange={(event) =>
                setCrossfadeSeconds(Number(event.target.value))
              }
            />
            <span className="text-xs text-text-muted">15s</span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          aria-labelledby="accent-heading"
          className="glass-card p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
              <Paintbrush size={20} />
            </span>
            <div>
              <h2
                id="accent-heading"
                className="text-xl font-semibold tracking-tight text-text-primary"
              >
                Accent color
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                One hex value updates every design token through ThemeProvider.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="min-w-0">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Hex value
              </span>
              <input
                aria-label="Accent hex value"
                value={draftAccent}
                onChange={(event) => setDraftAccent(event.target.value)}
                onBlur={commitAccent}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitAccent()
                }}
                className="input font-mono uppercase"
                placeholder="#7C3AED"
              />
            </label>
            <label className="flex items-end gap-2 sm:flex-col sm:items-start">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Picker
              </span>
              <input
                aria-label="Accent color picker"
                type="color"
                value={isValidAccent ? normalizeHex(draftAccent) : accent}
                onChange={(event) => {
                  setDraftAccent(event.target.value)
                  setAccent(event.target.value)
                }}
                className="h-11 w-14 cursor-pointer rounded-xl border border-glass-border bg-[var(--glass)] p-1"
              />
            </label>
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
                title={`Use ${preset}`}
                aria-label={`Use accent color ${preset}`}
              />
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-glass-border bg-[var(--glass)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="chip mb-2">
                  <Sparkles size={12} />
                  Live theme
                </div>
                <p className="text-xs text-text-tertiary">
                  Every preview below reads the same CSS variables used by
                  Aurora.
                </p>
              </div>
              <span className="rounded-full border border-glass-border bg-[var(--surface)] px-3 py-1 font-mono text-[10px] text-text-muted">
                {normalizeHex(accent)}
              </span>
            </div>

            <div
              className="mt-4 overflow-hidden rounded-2xl border border-glass-border"
              style={{ background: 'var(--background)' }}
            >
              <div
                className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3"
                style={{ background: 'var(--glass)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 0 14px var(--accent-glow)',
                    }}
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    Aurora preview
                  </span>
                </div>
                <span className="text-[10px] text-text-muted">
                  Auto-generated palette
                </span>
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-[1.2fr_.8fr]">
                <div
                  className="rounded-xl border border-glass-border p-3"
                  style={{ background: 'var(--surface)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Now playing
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    A palette that follows your accent.
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Surfaces, borders, and readable text stay balanced
                    automatically.
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-3 px-3 py-2 text-xs"
                  >
                    Primary action
                  </button>
                </div>
                <div
                  className="rounded-xl border border-glass-border p-3"
                  style={{ background: 'var(--glass)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Accent glow
                  </p>
                  <div
                    className="mt-3 h-10 rounded-lg"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 12px 28px var(--accent-glow)',
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between text-[10px]">
                    <span className="text-text-secondary">Light</span>
                    <span className="text-accent-light">Accent</span>
                    <span className="text-accent-dark">Dark</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {liveThemeTokens.map(({ label, variable }) => (
                <div
                  key={variable}
                  className="min-w-0 rounded-2xl border border-glass-border p-2.5"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-md border border-glass-border"
                      style={{ background: `var(${variable})` }}
                    />
                    <span className="truncate text-[10px] font-medium text-text-secondary">
                      {label}
                    </span>
                  </div>
                  <span
                    className="mt-1 block truncate font-mono text-[9px] text-text-muted"
                    title={themeValues[variable] ?? variable}
                  >
                    {themeValues[variable] || variable}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        aria-labelledby="sleep-timer-heading"
        className="glass-card mt-5 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
              <Moon size={20} />
            </span>
            <div>
              <h2
                id="sleep-timer-heading"
                className="text-xl font-semibold tracking-tight text-text-primary"
              >
                Sleep timer
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Pause Aurora after a set time, or finish the current song
                without continuing the queue.
              </p>
            </div>
          </div>
          {sleepTimer !== 'off' && (
            <span className="chip">
              {sleepTimer === 'end-of-track'
                ? 'End of song'
                : formatCountdown(sleepTimerRemainingSeconds)}
            </span>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="min-w-[210px] flex-1">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              Pause playback
            </span>
            <select
              aria-label="Sleep timer"
              className="select w-full"
              value={String(sleepTimer)}
              onChange={(event) => {
                const option = sleepTimerOptions.find(
                  (item) => String(item.value) === event.target.value,
                )
                if (option) setSleepTimer(option.value)
              }}
            >
              {sleepTimerOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {sleepTimer !== 'off' && (
            <button
              className="secondary-button self-end"
              onClick={() => setSleepTimer('off')}
            >
              Cancel timer
            </button>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
        aria-labelledby="mini-player-heading"
        className="glass-card mt-5 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
              <PanelTop size={20} />
            </span>
            <div>
              <h2
                id="mini-player-heading"
                className="text-xl font-semibold tracking-tight text-text-primary"
              >
                Mini Player
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Keep essential playback controls visible above other apps when
                Aurora is minimized.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={openMiniPlayerOnMinimize}
            onClick={() =>
              setOpenMiniPlayerOnMinimize((enabled) => !enabled)
            }
            className={`settings-switch ${openMiniPlayerOnMinimize ? 'settings-switch-on' : ''}`}
          >
            <span className="sr-only">Open Mini Player when Aurora is minimized</span>
            <span className="settings-switch-knob" />
          </button>
        </div>
        <p className="mt-5 text-xs text-text-tertiary">
          {openMiniPlayerOnMinimize
            ? 'Mini Player opens automatically whenever the main window is minimized.'
            : 'Mini Player stays hidden when the main window is minimized.'}
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13, duration: 0.35 }}
        aria-labelledby="equalizer-heading"
        className="glass-card mt-5 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
              <Waves size={21} />
            </span>
            <div>
              <h2
                id="equalizer-heading"
                className="text-xl font-semibold tracking-tight text-text-primary"
              >
                Equalizer
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Shape low end, vocals, and high detail. The live visualizer in
                the player reflects the audio after these adjustments.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEqualizerEnabled}
            onClick={() => setEqualizerEnabled(!isEqualizerEnabled)}
            className={`relative h-8 w-14 rounded-full border transition ${
              isEqualizerEnabled
                ? 'border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_20px_var(--accent-glow-soft)]'
                : 'border-glass-border bg-[var(--surface-strong)]'
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-[var(--text-primary)] shadow-sm transition-transform ${isEqualizerEnabled ? 'translate-x-7' : 'translate-x-0'}`}
            />
            <span className="sr-only">
              {isEqualizerEnabled ? 'Disable equalizer' : 'Enable equalizer'}
            </span>
          </button>
        </div>

        <div
          className={`mt-7 grid gap-5 md:grid-cols-3 ${isEqualizerEnabled ? '' : 'opacity-55'}`}
        >
          {(
            [
              ['bass', 'Bass', '160 Hz'],
              ['mid', 'Mid', '1 kHz'],
              ['treble', 'Treble', '5.6 kHz'],
            ] as const
          ).map(([band, label, frequency]) => (
            <label
              key={band}
              className="rounded-2xl border border-glass-border bg-[var(--glass)] p-4"
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold text-text-primary">
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] text-text-muted">
                    {frequency}
                  </span>
                </span>
                <span className="chip !px-2 !py-1 font-mono">
                  {equalizer[band] > 0 ? '+' : ''}
                  {equalizer[band]} dB
                </span>
              </span>
              <input
                aria-label={`${label} equalizer gain`}
                className="range mt-5"
                type="range"
                min="-12"
                max="12"
                step="1"
                disabled={!isEqualizerEnabled}
                value={equalizer[band]}
                style={
                  {
                    '--progress': `${((equalizer[band] + 12) / 24) * 100}%`,
                  } as React.CSSProperties
                }
                onChange={(event) =>
                  setEqualizerBand(band, Number(event.target.value))
                }
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-tertiary">
            Changes are saved on this device and apply during crossfades too.
          </p>
          <button
            type="button"
            onClick={() => {
              setEqualizerBand('bass', 0)
              setEqualizerBand('mid', 0)
              setEqualizerBand('treble', 0)
            }}
            className="secondary-button"
            disabled={
              equalizer.bass === 0 &&
              equalizer.mid === 0 &&
              equalizer.treble === 0
            }
          >
            Reset to balanced
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        aria-labelledby="cloud-heading"
        className="glass-card mt-5 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light">
              <Cloud size={20} />
            </span>
            <div>
              <h2
                id="cloud-heading"
                className="text-xl font-semibold tracking-tight text-text-primary"
              >
                Cloud Music
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Stream selected Google Drive folders alongside your local
                library. Aurora only scans folders you choose.
              </p>
            </div>
          </div>
          {cloud?.connected ? (
            <span className="chip">
              <Check size={12} /> Connected
            </span>
          ) : (
            <span className="chip">Not connected</span>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-glass-border bg-[var(--glass)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Google Account
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {cloud?.email ??
                  (cloud?.configured === false
                    ? 'Add AURORA_GOOGLE_CLIENT_ID to enable sign-in.'
                    : 'Sign in to browse Drive.')}
              </p>
            </div>
            {cloud?.connected ? (
              <button
                className="secondary-button"
                disabled={cloudBusy}
                onClick={disconnect}
              >
                <LogOut size={15} /> Disconnect
              </button>
            ) : (
              <button
                className="btn-primary"
                disabled={cloudBusy}
                onClick={connect}
              >
                <LogIn size={15} /> Sign in with Google
              </button>
            )}
          </div>
        </div>

        {cloud?.connected && (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]">
              <div className="rounded-3xl border border-glass-border bg-[var(--glass)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Selected folders
                    </p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {cloud.selectedFolders.length
                        ? `${cloud.selectedFolders.length} folder${cloud.selectedFolders.length === 1 ? '' : 's'} selected`
                        : 'No folders selected'}
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={cloudBusy}
                    onClick={() => void loadFolders()}
                  >
                    <FolderOpen size={15} /> Choose folders
                  </button>
                </div>
                {cloud.selectedFolders.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cloud.selectedFolders.map((folder) => (
                      <span key={folder.id} className="chip">
                        {folder.name}
                      </span>
                    ))}
                  </div>
                )}
                {showFolders && (
                  <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-glass-border bg-[var(--surface)] p-2">
                    {folders.map((folder) => {
                      const selected = cloud.selectedFolders.some(
                        (item) => item.id === folder.id,
                      )
                      return (
                        <button
                          key={folder.id}
                          onClick={() => toggleFolder(folder)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--glass-strong)]"
                        >
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? 'border-accent bg-accent text-accent-foreground' : 'border-glass-border text-transparent'}`}
                          >
                            <Check size={13} />
                          </span>
                          <span className="truncate text-text-secondary">
                            {folder.name}
                          </span>
                        </button>
                      )
                    })}
                    {!folders.length && (
                      <p className="p-3 text-xs text-text-tertiary">
                        No Drive folders found.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-glass-border bg-[var(--glass)] p-4">
                <p className="text-sm font-semibold text-text-primary">
                  Offline cache
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {formatBytes(cloud.cacheBytes)} used of{' '}
                  {formatBytes(cloud.cacheLimitBytes)}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.min(100, (cloud.cacheBytes / cloud.cacheLimitBytes) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <select
                    className="select text-xs"
                    value={cloud.cacheLimitBytes}
                    onChange={(event) =>
                      void runCloudAction(() =>
                        window.aurora.setDriveCacheLimit(
                          Number(event.target.value),
                        ),
                      )
                    }
                  >
                    {[1, 5, 10, 25].map((size) => (
                      <option key={size} value={size * 1024 * 1024 * 1024}>
                        {size} GB cache
                      </option>
                    ))}
                  </select>
                  <button
                    className="secondary-button"
                    disabled={cloudBusy}
                    onClick={() =>
                      void runCloudAction(() => window.aurora.clearDriveCache())
                    }
                  >
                    <Trash2 size={14} /> Clear cache
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="secondary-button"
                disabled={cloudBusy || !cloud.selectedFolders.length}
                onClick={() => void rescan()}
              >
                <RefreshCw
                  size={15}
                  className={cloudBusy ? 'animate-spin' : ''}
                />{' '}
                Rescan Drive
              </button>
              <span className="text-xs text-text-tertiary">
                Metadata changes and deleted files are reconciled on each scan.
              </span>
            </div>
          </>
        )}
        {cloudError && (
          <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-200">
            {cloudError}
          </p>
        )}
      </motion.section>
    </div>
  )
}
