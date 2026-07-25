import { app, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseFile } from 'music-metadata'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDevelopment = !app.isPackaged
const supportedExtensions = new Set(['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg'])
protocol.registerSchemesAsPrivileged([{ scheme: 'aurora-media', privileges: { secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }])

interface LibraryTrack { id: string; title: string; artist: string; album: string; albumartist?: string; duration: number; source: string; sourcePath: string; artwork?: string; genre?: string; addedAt: string; lrcPath?: string; normalizationGain?: number; metadataRead?: boolean }
interface StoredPlaylist { id: string; name: string; trackIds: string[]; createdAt: string; updatedAt: string; artwork?: string }

const libraryPath = () => path.join(app.getPath('userData'), 'library.json')
const playlistsPath = () => path.join(app.getPath('userData'), 'playlists.json')
const mediaUrl = (filePath: string) => `aurora-media://track/${Buffer.from(filePath).toString('base64url')}`
async function findLrc(filePath: string): Promise<string | undefined> { const candidate = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}.lrc`); try { await fs.access(candidate); return candidate } catch { return undefined } }

async function collectAudioFiles(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(folder, entry.name)
    if (entry.isDirectory()) return collectAudioFiles(entryPath).catch(() => [])
    return entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()) ? [entryPath] : []
  }))
  return nested.flat()
}

async function readTrack(filePath: string): Promise<LibraryTrack> {
  const filename = path.basename(filePath, path.extname(filePath))
  const fallback: LibraryTrack = { id: Buffer.from(filePath).toString('base64url'), title: filename, artist: 'Unknown artist', album: 'Unknown album', duration: 0, source: mediaUrl(filePath), sourcePath: filePath, addedAt: new Date().toISOString(), lrcPath: await findLrc(filePath), metadataRead: false }
  try {
    const metadata = await parseFile(filePath, { duration: true, skipCovers: false })
    const picture = metadata.common.picture?.[0]
    const artwork = picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}` : undefined
    const replayGain = (metadata.common as typeof metadata.common & { replaygain?: { trackGain?: number } }).replaygain?.trackGain
    const normalizationGain = typeof replayGain === 'number' ? Math.max(0.5, Math.min(1.5, Math.pow(10, replayGain / 20))) : 1
    return { ...fallback, title: metadata.common.title || filename, artist: metadata.common.artist || 'Unknown artist', album: metadata.common.album || 'Unknown album', albumartist: metadata.common.albumartist, duration: metadata.format.duration || 0, artwork, genre: metadata.common.genre?.[0], normalizationGain, metadataRead: true }
  } catch (error) {
    console.error(`[Aurora] Failed to read metadata for ${filePath}`, error)
    return fallback
  }
}

async function loadLibrary(): Promise<LibraryTrack[]> {
  try {
    const stored = JSON.parse(await fs.readFile(libraryPath(), 'utf8')) as LibraryTrack[]
    let refreshedAny = false
    const library = await Promise.all(stored.map(async (track) => {
      const normalized = { ...track, source: mediaUrl(track.sourcePath), lrcPath: track.lrcPath ?? await findLrc(track.sourcePath) }
      if (normalized.metadataRead === true) return normalized

      const refreshed = await readTrack(normalized.sourcePath)
      refreshedAny = true
      return {
        ...normalized,
        ...refreshed,
        id: normalized.id,
        addedAt: normalized.addedAt,
        artwork: normalized.artwork ?? refreshed.artwork,
      }
    }))
    if (refreshedAny) await saveLibrary(library)
    return library
  } catch { return [] }
}

async function saveLibrary(library: LibraryTrack[]): Promise<void> { await fs.writeFile(libraryPath(), JSON.stringify(library), 'utf8') }
async function importFiles(filePaths: string[]): Promise<LibraryTrack[]> {
  const imported = await Promise.all(filePaths.map(readTrack))
  const existing = await loadLibrary()
  const merged = [...existing.filter((track) => !imported.some((item) => item.sourcePath === track.sourcePath)), ...imported].sort((a, b) => a.title.localeCompare(b.title))
  await saveLibrary(merged)
  return merged
}
async function loadPlaylists(): Promise<StoredPlaylist[]> { try { return JSON.parse(await fs.readFile(playlistsPath(), 'utf8')) as StoredPlaylist[] } catch { return [] } }
async function savePlaylists(playlists: StoredPlaylist[]): Promise<StoredPlaylist[]> { await fs.writeFile(playlistsPath(), JSON.stringify(playlists), 'utf8'); return playlists }
const imageMimeTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#101014',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDevelopment) window.loadURL('http://localhost:5173')
  else window.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  protocol.handle('aurora-media', (request) => {
    const encodedPath = new URL(request.url).pathname.slice(1)
    const filePath = Buffer.from(encodedPath, 'base64url').toString()
    return net.fetch(pathToFileURL(filePath).href)
  })
  ipcMain.handle('dialog:select-music-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('dialog:select-music-files', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio files', extensions: [...supportedExtensions].map((extension) => extension.slice(1)) }] })
    return result.canceled ? [] : result.filePaths
  })
  ipcMain.handle('dialog:select-lyrics-file', async () => { const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'LRC lyrics', extensions: ['lrc'] }] }); return result.canceled ? null : result.filePaths[0] })
  ipcMain.handle('dialog:select-artwork', async () => { const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }] }); if (result.canceled) return null; const filePath = result.filePaths[0]; return `data:${imageMimeTypes[path.extname(filePath).toLowerCase()] ?? 'image/jpeg'};base64,${(await fs.readFile(filePath)).toString('base64')}` })
  ipcMain.handle('library:load', loadLibrary)
  ipcMain.handle('library:scan-folder', async (_event, folder: string) => {
    const files = await collectAudioFiles(folder)
    return importFiles(files)
  })
  ipcMain.handle('library:import-files', (_event, filePaths: string[]) => importFiles(filePaths.filter((filePath) => supportedExtensions.has(path.extname(filePath).toLowerCase()))))
  ipcMain.handle('library:set-artwork', async (_event, trackId: string, artwork: string) => { const library = (await loadLibrary()).map((track) => track.id === trackId ? { ...track, artwork } : track); await saveLibrary(library); return library })
  ipcMain.handle('lyrics:load', async (_event, filePath: string) => fs.readFile(filePath, 'utf8'))
  ipcMain.handle('playlists:load', loadPlaylists)
  ipcMain.handle('playlists:create', async (_event, name: string) => {
    const now = new Date().toISOString()
    const playlist: StoredPlaylist = { id: crypto.randomUUID(), name: name.trim() || 'Untitled playlist', trackIds: [], createdAt: now, updatedAt: now }
    return savePlaylists([...await loadPlaylists(), playlist])
  })
  ipcMain.handle('playlists:rename', async (_event, id: string, name: string) => savePlaylists((await loadPlaylists()).map((playlist) => playlist.id === id ? { ...playlist, name: name.trim() || playlist.name, updatedAt: new Date().toISOString() } : playlist)))
  ipcMain.handle('playlists:delete', async (_event, id: string) => savePlaylists((await loadPlaylists()).filter((playlist) => playlist.id !== id)))
  ipcMain.handle('playlists:add-track', async (_event, id: string, trackId: string) => savePlaylists((await loadPlaylists()).map((playlist) => playlist.id === id ? { ...playlist, trackIds: playlist.trackIds.includes(trackId) ? playlist.trackIds : [...playlist.trackIds, trackId], updatedAt: new Date().toISOString() } : playlist)))
  ipcMain.handle('playlists:remove-track', async (_event, id: string, trackId: string) => savePlaylists((await loadPlaylists()).map((playlist) => playlist.id === id ? { ...playlist, trackIds: playlist.trackIds.filter((item) => item !== trackId), updatedAt: new Date().toISOString() } : playlist)))
  ipcMain.handle('playlists:set-artwork', async (_event, id: string, artwork: string) => savePlaylists((await loadPlaylists()).map((playlist) => playlist.id === id ? { ...playlist, artwork, updatedAt: new Date().toISOString() } : playlist)))
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
