import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  net,
  protocol,
} from 'electron'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseFile } from 'music-metadata'
import { resolveLyrics, type LyricsTrack } from './lyrics.js'
import { DriveService } from './drive.js'
import type {
  MiniPlayerControl,
  MiniPlayerPlaybackState,
} from '../src/types/mini-player.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDevelopment = !app.isPackaged
const supportedExtensions = new Set([
  '.mp3',
  '.flac',
  '.wav',
  '.aac',
  '.m4a',
  '.ogg',
])
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'aurora-media',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'aurora-drive',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
])

interface LibraryTrack {
  id: string
  title: string
  artist: string
  album: string
  albumartist?: string
  duration: number
  source: string
  sourcePath?: string
  artwork?: string
  genre?: string
  addedAt: string
  lrcPath?: string
  normalizationGain?: number
  metadataRead?: boolean
  sourceKind?: 'local' | 'drive'
  driveFileId?: string
  driveModifiedTime?: string
}
interface StoredPlaylist {
  id: string
  name: string
  trackIds: string[]
  createdAt: string
  updatedAt: string
  artwork?: string
}
let mainWindow: BrowserWindow | null = null
let miniPlayerWindow: BrowserWindow | null = null
let scanGeneration = 0
let miniPlayerAutoShow = true
let miniPlayerShouldShow = false
let miniPlayerRendererReady = false
let isQuitting = false
let miniPlayerState: MiniPlayerPlaybackState = {
  track: null,
  isPlaying: false,
}

const libraryPath = () => path.join(app.getPath('userData'), 'library.json')
const playlistsPath = () => path.join(app.getPath('userData'), 'playlists.json')
const mediaUrl = (filePath: string) =>
  `aurora-media://track/${Buffer.from(filePath).toString('base64url')}`
const normalizeLocalPath = (filePath: string) =>
  path.normalize(filePath).toLowerCase()
async function findLrc(filePath: string): Promise<string | undefined> {
  const candidate = path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}.lrc`,
  )
  try {
    await fs.access(candidate)
    return candidate
  } catch {
    return undefined
  }
}

async function collectAudioFiles(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(folder, entry.name)
      if (entry.isDirectory())
        return collectAudioFiles(entryPath).catch(() => [])
      return entry.isFile() &&
        supportedExtensions.has(path.extname(entry.name).toLowerCase())
        ? [entryPath]
        : []
    }),
  )
  return nested.flat()
}

async function readTrack(filePath: string): Promise<LibraryTrack> {
  const filename = path.basename(filePath, path.extname(filePath))
  const fallback: LibraryTrack = {
    id: Buffer.from(filePath).toString('base64url'),
    title: filename,
    artist: 'Unknown artist',
    album: 'Unknown album',
    duration: 0,
    source: mediaUrl(filePath),
    sourcePath: filePath,
    addedAt: new Date().toISOString(),
    lrcPath: await findLrc(filePath),
    metadataRead: false,
    sourceKind: 'local',
  }
  try {
    const metadata = await parseFile(filePath, {
      duration: true,
      skipCovers: false,
    })
    const picture = metadata.common.picture?.[0]
    const artwork = picture
      ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`
      : undefined
    const replayGain = (
      metadata.common as typeof metadata.common & {
        replaygain?: { trackGain?: number }
      }
    ).replaygain?.trackGain
    const normalizationGain =
      typeof replayGain === 'number'
        ? Math.max(0.5, Math.min(1.5, Math.pow(10, replayGain / 20)))
        : 1
    return {
      ...fallback,
      title: metadata.common.title || filename,
      artist: metadata.common.artist || 'Unknown artist',
      album: metadata.common.album || 'Unknown album',
      albumartist: metadata.common.albumartist,
      duration: metadata.format.duration || 0,
      artwork,
      genre: metadata.common.genre?.[0],
      normalizationGain,
      metadataRead: true,
    }
  } catch (error) {
    console.error(`[Aurora] Failed to read metadata for ${filePath}`, error)
    return fallback
  }
}

async function loadLocalLibrary(): Promise<LibraryTrack[]> {
  try {
    const stored = JSON.parse(
      await fs.readFile(libraryPath(), 'utf8'),
    ) as LibraryTrack[]
    let refreshedAny = false
    const hydrated = await Promise.all(
      stored.map(async (track) => {
        const sourcePath = track.sourcePath
        if (!sourcePath) return track
        try {
          await fs.access(sourcePath)
        } catch {
          refreshedAny = true
          return null
        }
        const normalized = {
          ...track,
          source: mediaUrl(sourcePath),
          sourcePath,
          lrcPath: track.lrcPath ?? (await findLrc(sourcePath)),
        }
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
      }),
    )
    const library = hydrated.filter(
      (track): track is LibraryTrack => track !== null,
    )
    if (refreshedAny) await saveLibrary(library)
    return library
  } catch {
    return []
  }
}

async function saveLibrary(library: LibraryTrack[]): Promise<void> {
  await fs.writeFile(libraryPath(), JSON.stringify(library), 'utf8')
}
async function importFiles(filePaths: string[]): Promise<LibraryTrack[]> {
  const imported = await Promise.all(filePaths.map(readTrack))
  const existing = await loadLocalLibrary()
  const importedPaths = new Set(
    imported.map((track) => normalizeLocalPath(track.sourcePath ?? '')),
  )
  const merged = [
    ...existing.filter(
      (track) => !importedPaths.has(normalizeLocalPath(track.sourcePath ?? '')),
    ),
    ...imported,
  ].sort((a, b) => a.title.localeCompare(b.title))
  await saveLibrary(merged)
  return merged
}
async function scanFolder(folder: string): Promise<LibraryTrack[]> {
  const files = await collectAudioFiles(folder)
  const generation = ++scanGeneration
  const firstBatch = files.slice(0, 12)
  const imported: LibraryTrack[] = await Promise.all(firstBatch.map(readTrack))
  await saveLibrary(imported.sort((a, b) => a.title.localeCompare(b.title)))
  mainWindow?.webContents.send('library:updated', await loadLibrary(), false)

  void (async () => {
    const remaining = files.slice(12)
    for (let index = 0; index < remaining.length; index += 4) {
      if (generation !== scanGeneration) return
      const batch = await Promise.all(
        remaining.slice(index, index + 4).map(readTrack),
      )
      imported.push(...batch)
      await saveLibrary(imported.sort((a, b) => a.title.localeCompare(b.title)))
      mainWindow?.webContents.send(
        'library:updated',
        await loadLibrary(),
        index + 4 >= remaining.length,
      )
    }
    if (!remaining.length && generation === scanGeneration)
      mainWindow?.webContents.send('library:updated', await loadLibrary(), true)
  })().catch(async (error) => {
    console.error('[Aurora] Background library scan failed', error)
    if (generation === scanGeneration)
      mainWindow?.webContents.send('library:updated', await loadLibrary(), true)
  })

  return loadLibrary()
}
async function loadLibrary(): Promise<LibraryTrack[]> {
  const [local, cloud] = await Promise.all([
    loadLocalLibrary(),
    drive.loadTracks(),
  ])
  return [...local, ...cloud].sort((a, b) => a.title.localeCompare(b.title))
}
async function loadPlaylists(): Promise<StoredPlaylist[]> {
  try {
    return JSON.parse(
      await fs.readFile(playlistsPath(), 'utf8'),
    ) as StoredPlaylist[]
  } catch {
    return []
  }
}
async function savePlaylists(
  playlists: StoredPlaylist[],
): Promise<StoredPlaylist[]> {
  await fs.writeFile(playlistsPath(), JSON.stringify(playlists), 'utf8')
  return playlists
}
const imageMimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}
const drive = new DriveService()

function findRendererEntry(): string | null {
  const candidates = [
    path.join(__dirname, '../../dist/index.html'),
    path.join(__dirname, '../dist/index.html'),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

async function loadRenderer(
  window: BrowserWindow,
  miniPlayer = false,
): Promise<void> {
  if (isDevelopment) {
    await window.loadURL(
      miniPlayer
        ? 'http://localhost:5173/?miniPlayer=1'
        : 'http://localhost:5173/',
    )
    return
  }

  const rendererEntry = findRendererEntry()
  if (!rendererEntry) {
    throw new Error(
      `Renderer entry not found. Checked: ${[
        path.join(__dirname, '../../dist/index.html'),
        path.join(__dirname, '../dist/index.html'),
      ].join(', ')}`,
    )
  }
  if (miniPlayer) {
    await window.loadFile(rendererEntry, { query: { miniPlayer: '1' } })
  } else {
    await window.loadFile(rendererEntry)
  }
}

function reportRendererFailures(window: BrowserWindow, label: string): void {
  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      console.error(
        `[Aurora] ${label} renderer failed to load (${errorCode}): ${errorDescription} (${validatedURL})`,
      )
    },
  )
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Aurora] ${label} renderer process exited`, details)
  })
}

function sendMiniPlayerVisibility(visible: boolean): void {
  mainWindow?.webContents.send('mini-player:visibility', visible)
  miniPlayerWindow?.webContents.send('mini-player:visibility', visible)
}

function sendMiniPlayerState(): void {
  miniPlayerWindow?.webContents.send('mini-player:state', miniPlayerState)
}

function createMiniPlayerWindow(): BrowserWindow {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed())
    return miniPlayerWindow

  const window = new BrowserWindow({
    width: 430,
    height: 208,
    minWidth: 430,
    minHeight: 208,
    maxWidth: 430,
    maxHeight: 208,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })
  miniPlayerWindow = window
  miniPlayerRendererReady = false
  window.setAlwaysOnTop(true, 'floating')
  reportRendererFailures(window, 'mini player')
  window.once('ready-to-show', () => {
    miniPlayerRendererReady = true
    if (!miniPlayerShouldShow || window.isDestroyed()) return
    window.showInactive()
    sendMiniPlayerState()
    sendMiniPlayerVisibility(true)
  })
  window.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    miniPlayerShouldShow = false
    window.hide()
    sendMiniPlayerVisibility(false)
  })
  window.on('closed', () => {
    if (miniPlayerWindow === window) {
      miniPlayerWindow = null
      miniPlayerRendererReady = false
    }
  })
  void loadRenderer(window, true).catch((error: unknown) => {
    console.error('[Aurora] Failed to load mini player renderer', error)
  })
  return window
}

function showMiniPlayer(): void {
  miniPlayerShouldShow = true
  const window = createMiniPlayerWindow()
  if (miniPlayerRendererReady && !window.isVisible()) {
    window.showInactive()
    sendMiniPlayerState()
    sendMiniPlayerVisibility(true)
  }
}

function hideMiniPlayer(): void {
  miniPlayerShouldShow = false
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed())
    miniPlayerWindow.hide()
  sendMiniPlayerVisibility(false)
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    // Do not reveal the renderer's first paint before the Aurora startup layer
    // is ready; otherwise the previous shell can flash during module loading.
    show: false,
    backgroundColor: '#09090B',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep audio, timeupdate handlers, and crossfade timers alive while the
      // window is minimized or covered by another application.
      backgroundThrottling: false,
    },
  })
  mainWindow = window
  reportRendererFailures(window, 'main')
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show()
  })
  window.on('minimize', () => {
    if (miniPlayerAutoShow) showMiniPlayer()
  })
  window.on('restore', hideMiniPlayer)
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
    hideMiniPlayer()
  })
  void loadRenderer(window).catch((error: unknown) => {
    console.error('[Aurora] Failed to load main renderer', error)
    if (!window.isDestroyed()) {
      dialog.showErrorBox(
        'Aurora could not start',
        'The Aurora interface could not be loaded. Please restart the app and check the application log for details.',
      )
    }
  })
}

app.whenReady().then(async () => {
  await drive.initialize()
  protocol.handle('aurora-media', (request) => {
    const encodedPath = new URL(request.url).pathname.slice(1)
    const filePath = Buffer.from(encodedPath, 'base64url').toString()
    return net.fetch(pathToFileURL(filePath).href)
  })
  protocol.handle('aurora-drive', (request) => drive.openMedia(request))
  ipcMain.handle('dialog:select-music-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('dialog:select-music-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Audio files',
          extensions: [...supportedExtensions].map((extension) =>
            extension.slice(1),
          ),
        },
      ],
    })
    return result.canceled ? [] : result.filePaths
  })
  ipcMain.handle('dialog:select-lyrics-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'LRC lyrics', extensions: ['lrc'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('dialog:select-artwork', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      ],
    })
    if (result.canceled) return null
    const filePath = result.filePaths[0]
    return `data:${imageMimeTypes[path.extname(filePath).toLowerCase()] ?? 'image/jpeg'};base64,${(await fs.readFile(filePath)).toString('base64')}`
  })
  ipcMain.handle('library:load', loadLibrary)
  ipcMain.handle('library:scan-folder', async (_event, folder: string) =>
    scanFolder(folder),
  )
  ipcMain.handle('library:import-files', (_event, filePaths: string[]) =>
    importFiles(
      filePaths.filter((filePath) =>
        supportedExtensions.has(path.extname(filePath).toLowerCase()),
      ),
    ),
  )
  ipcMain.handle(
    'library:set-artwork',
    async (_event, trackId: string, artwork: string) => {
      if (trackId.startsWith('drive:'))
        await drive.setTrackArtwork(trackId, artwork)
      else {
        const library = (await loadLocalLibrary()).map((track) =>
          track.id === trackId ? { ...track, artwork } : track,
        )
        await saveLibrary(library)
      }
      return loadLibrary()
    },
  )
  ipcMain.handle('drive:status', () => drive.status())
  ipcMain.handle('drive:connect', () => drive.connect())
  ipcMain.handle('drive:disconnect', () => drive.disconnect())
  ipcMain.handle('drive:list-folders', () => drive.listFolders())
  ipcMain.handle('drive:set-folders', (_event, folders) =>
    drive.setSelectedFolders(folders),
  )
  ipcMain.handle('drive:scan', () => drive.scanSelectedFolders())
  ipcMain.handle('drive:clear-cache', () => drive.clearCache())
  ipcMain.handle('drive:set-cache-limit', (_event, bytes: number) =>
    drive.setCacheLimit(bytes),
  )
  ipcMain.handle('lyrics:load', async (_event, filePath: string) =>
    fs.readFile(filePath, 'utf8'),
  )
  ipcMain.handle('lyrics:resolve', (_event, track: LyricsTrack) =>
    resolveLyrics(track),
  )
  ipcMain.handle('playlists:load', loadPlaylists)
  ipcMain.handle('playlists:create', async (_event, name: string) => {
    const now = new Date().toISOString()
    const playlist: StoredPlaylist = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Untitled playlist',
      trackIds: [],
      createdAt: now,
      updatedAt: now,
    }
    return savePlaylists([...(await loadPlaylists()), playlist])
  })
  ipcMain.handle('playlists:rename', async (_event, id: string, name: string) =>
    savePlaylists(
      (await loadPlaylists()).map((playlist) =>
        playlist.id === id
          ? {
              ...playlist,
              name: name.trim() || playlist.name,
              updatedAt: new Date().toISOString(),
            }
          : playlist,
      ),
    ),
  )
  ipcMain.handle('playlists:delete', async (_event, id: string) =>
    savePlaylists(
      (await loadPlaylists()).filter((playlist) => playlist.id !== id),
    ),
  )
  ipcMain.handle(
    'playlists:add-track',
    async (_event, id: string, trackId: string) =>
      savePlaylists(
        (await loadPlaylists()).map((playlist) =>
          playlist.id === id
            ? {
                ...playlist,
                trackIds: playlist.trackIds.includes(trackId)
                  ? playlist.trackIds
                  : [...playlist.trackIds, trackId],
                updatedAt: new Date().toISOString(),
              }
            : playlist,
        ),
      ),
  )
  ipcMain.handle(
    'playlists:remove-track',
    async (_event, id: string, trackId: string) =>
      savePlaylists(
        (await loadPlaylists()).map((playlist) =>
          playlist.id === id
            ? {
                ...playlist,
                trackIds: playlist.trackIds.filter((item) => item !== trackId),
                updatedAt: new Date().toISOString(),
              }
            : playlist,
        ),
      ),
  )
  ipcMain.handle(
    'playlists:set-artwork',
    async (_event, id: string, artwork: string) =>
      savePlaylists(
        (await loadPlaylists()).map((playlist) =>
          playlist.id === id
            ? { ...playlist, artwork, updatedAt: new Date().toISOString() }
            : playlist,
        ),
      ),
  )
  ipcMain.handle('mini-player:set-auto-show', (_event, enabled: boolean) => {
    miniPlayerAutoShow = enabled
  })
  ipcMain.handle('mini-player:get-state', () => miniPlayerState)
  ipcMain.handle('mini-player:get-visibility', () =>
    Boolean(
      miniPlayerWindow &&
      !miniPlayerWindow.isDestroyed() &&
      miniPlayerWindow.isVisible(),
    ),
  )
  ipcMain.on('mini-player:state', (event, state: MiniPlayerPlaybackState) => {
    if (event.sender !== mainWindow?.webContents) return
    miniPlayerState = state
    sendMiniPlayerState()
  })
  ipcMain.on('mini-player:frequency', (event, frequency: number[]) => {
    if (event.sender !== mainWindow?.webContents) return
    miniPlayerWindow?.webContents.send('mini-player:frequency', frequency)
  })
  ipcMain.handle('mini-player:control', (event, control: MiniPlayerControl) => {
    if (event.sender !== miniPlayerWindow?.webContents) return false
    if (control === 'close') {
      hideMiniPlayer()
      return true
    }
    if (!mainWindow || mainWindow.isDestroyed()) return false
    mainWindow?.webContents.send('mini-player:control', control)
    return true
  })

  const mediaControls: Array<[string, Exclude<MiniPlayerControl, 'close'>]> = [
    ['MediaPlayPause', 'toggle-play'],
    ['MediaPreviousTrack', 'previous'],
    ['MediaNextTrack', 'next'],
  ]
  for (const [accelerator, control] of mediaControls) {
    const registered = globalShortcut.register(accelerator, () => {
      mainWindow?.webContents.send('media-control', control)
    })
    if (!registered && isDevelopment)
      console.warn(`[Aurora] Could not register ${accelerator}`)
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
