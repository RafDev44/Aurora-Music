import { motion } from 'framer-motion'
import { Check, Cloud, FolderOpen, LogIn, LogOut, Play, RefreshCw, Search, Settings, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import type { CloudStatus, DriveFolder, Track } from '../types/music'

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '--:--'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export function CloudDrivePage({
  tracks,
  onLibraryChanged,
  onOpenSettings,
  onEditArtwork,
}: {
  tracks: Track[]
  onLibraryChanged: () => Promise<void>
  onOpenSettings: () => void
  onEditArtwork: (trackId: string) => void
}) {
  const player = usePlayer()
  const [status, setStatus] = useState<CloudStatus | null>(null)
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [showFolders, setShowFolders] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void window.aurora.getCloudStatus().then(setStatus).catch(() => setStatus(null))
  }, [])

  const cloudTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return tracks.filter((track) => track.sourceKind === 'drive' && (!needle || [track.title, track.artist, track.album, track.genre].some((value) => value?.toLocaleLowerCase().includes(needle))))
  }, [query, tracks])

  const run = async (action: () => Promise<CloudStatus>) => {
    setBusy(true)
    setError('')
    try { setStatus(await action()) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Google Drive is unavailable.') }
    finally { setBusy(false) }
  }

  const connect = () => void run(() => window.aurora.connectGoogleDrive())
  const disconnect = () => void run(() => window.aurora.disconnectGoogleDrive())

  const chooseFolders = async () => {
    setBusy(true)
    setError('')
    try {
      setFolders(await window.aurora.listDriveFolders())
      setShowFolders(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load Drive folders.') }
    finally { setBusy(false) }
  }

  const toggleFolder = (folder: DriveFolder) => {
    if (!status) return
    const selected = status.selectedFolders.some((item) => item.id === folder.id)
    const next = selected ? status.selectedFolders.filter((item) => item.id !== folder.id) : [...status.selectedFolders, folder]
    void run(() => window.aurora.setDriveFolders(next))
  }

  const rescan = async () => {
    setBusy(true)
    setError('')
    try {
      await window.aurora.scanDrive()
      setStatus(await window.aurora.getCloudStatus())
      await onLibraryChanged()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sync Google Drive.') }
    finally { setBusy(false) }
  }

  return (
    <div className="page page-scroll">
      <header className="page-header">
        <div>
          <p className="eyebrow">Cloud library</p>
          <h1 className="page-title text-gradient">Google Drive</h1>
          <p className="page-subtitle">Browse and play selected Drive folders alongside your local music.</p>
        </div>
        <button onClick={onOpenSettings} className="secondary-button"><Settings size={15} /> Cloud settings</button>
      </header>

      <section className="glass-card mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-[var(--accent-muted)] text-accent-light"><Cloud size={20} /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{status?.connected ? status.email ?? 'Google account connected' : 'Connect Google Drive'}</p>
              <p className="mt-1 truncate text-xs text-text-tertiary">
                {status?.connected ? `${status.selectedFolders.length} folder${status.selectedFolders.length === 1 ? '' : 's'} selected · ${formatBytes(status.cacheBytes)} cached` : status?.configured === false ? 'Set AURORA_GOOGLE_CLIENT_ID to enable sign-in.' : 'Sign in to stream your cloud music.'}
              </p>
            </div>
          </div>
          {status?.connected ? (
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button" disabled={busy} onClick={() => void chooseFolders()}><FolderOpen size={15} /> Folders</button>
              <button className="secondary-button" disabled={busy || !status.selectedFolders.length} onClick={() => void rescan()}><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Rescan</button>
              <button className="secondary-button" disabled={busy} onClick={() => void run(() => window.aurora.clearDriveCache())}><Trash2 size={14} /> Clear cache</button>
              <button className="secondary-button" disabled={busy} onClick={disconnect}><LogOut size={15} /> Disconnect</button>
            </div>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={connect}><LogIn size={15} /> Sign in with Google</button>
          )}
        </div>

        {status?.connected && status.selectedFolders.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {status.selectedFolders.map((folder) => <span key={folder.id} className="chip"><Check size={12} /> {folder.name}</span>)}
          </div>
        )}

        {status?.connected && showFolders && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-glass-border bg-[var(--surface)] p-2">
            {folders.map((folder) => {
              const selected = status.selectedFolders.some((item) => item.id === folder.id)
              return <button key={folder.id} onClick={() => toggleFolder(folder)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--glass-strong)]"><span className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? 'border-accent bg-accent text-accent-foreground' : 'border-glass-border text-transparent'}`}><Check size={13} /></span><span className="truncate text-text-secondary">{folder.name}</span></button>
            })}
            {!folders.length && <p className="p-3 text-xs text-text-tertiary">No Drive folders found.</p>}
          </div>
        )}
        {error && <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-200">{error}</p>}
      </section>

      {status?.connected && (
        <>
          <label className="spotlight mb-5">
            <Search className="spotlight-icon" size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Google Drive music" aria-label="Search Google Drive music" />
          </label>
          {cloudTracks.length ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              {cloudTracks.map((track, index) => {
                const isActive = player.currentTrack?.id === track.id
                return <motion.button key={track.id} draggable initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.02, 0.25), duration: 0.28 }} onDragStartCapture={(event) => event.dataTransfer.setData('application/x-aurora-track', track.id)} onContextMenu={(event) => { event.preventDefault(); onEditArtwork(track.id) }} onClick={() => void player.playTrack(track, cloudTracks)} className={`row-panel group mb-2 grid w-full cursor-grab grid-cols-[minmax(0,1fr)_58px] items-center gap-4 rounded-2xl px-4 py-3 text-left active:cursor-grabbing ${isActive ? 'row-panel-active' : ''}`}>
                  <span className="flex min-w-0 items-center gap-3"><span className="art h-12 w-12 shrink-0">{track.artwork ? <img src={track.artwork} alt="" className="h-full w-full object-cover" /> : <Cloud size={18} />}<span className="absolute inset-0 hidden place-items-center bg-[var(--glass-strong)] backdrop-blur-sm group-hover:grid"><Play size={17} fill="var(--accent-foreground)" /></span></span><span className="min-w-0"><span className="flex items-center gap-2 truncate text-sm font-semibold text-text-primary">{track.title}{isActive && <span className="eq-bars"><span /><span /><span /></span>}</span><span className="block truncate text-xs text-text-tertiary">{track.artist} · {track.album}</span><span className="block text-[10px] font-medium text-accent-light">Google Drive</span></span></span>
                  <span className="text-right text-xs tabular-nums text-text-muted">{formatDuration(track.duration)}</span>
                </motion.button>
              })}
            </div>
          ) : (
            <div className="empty-state"><div><div className="empty-icon"><Cloud size={42} strokeWidth={1.8} /></div><h2 className="page-title text-gradient">No cloud music yet.</h2><p className="page-subtitle mx-auto">Choose one or more Drive folders, then rescan to bring their music into Aurora.</p><button onClick={() => void chooseFolders()} className="btn-primary mt-7"><FolderOpen size={16} /> Choose Drive folders</button></div></div>
          )}
        </>
      )}

      {!status?.connected && <div className="empty-state"><div><div className="empty-icon"><Cloud size={42} strokeWidth={1.8} /></div><h2 className="page-title text-gradient">Your cloud library.</h2><p className="page-subtitle mx-auto">Connect Google Drive to stream selected folders without downloading your whole library.</p><button disabled={busy} onClick={connect} className="btn-primary mt-7"><LogIn size={16} /> Sign in with Google</button></div></div>}
    </div>
  )
}
