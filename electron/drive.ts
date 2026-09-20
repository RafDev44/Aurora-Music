import { promises as fs, createWriteStream } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { Readable } from 'node:stream'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, net, safeStorage, shell } from 'electron'
import { parseBuffer } from 'music-metadata'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg'])
const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/flac', 'audio/wav', 'audio/x-wav', 'audio/aac',
  'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'application/ogg',
])
const DEFAULT_CACHE_LIMIT = 5 * 1024 * 1024 * 1024

interface OAuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  email?: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  parents?: string[]
}

interface DriveFileList { files: DriveFile[]; nextPageToken?: string }

export interface DriveFolder { id: string; name: string; parentId?: string }

export interface CloudStatus {
  configured: boolean
  connected: boolean
  email?: string
  selectedFolders: DriveFolder[]
  cacheBytes: number
  cacheLimitBytes: number
}

export interface CloudTrack {
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
  normalizationGain?: number
  metadataRead?: boolean
  sourceKind: 'drive'
  driveFileId: string
  driveModifiedTime?: string
}

interface DriveSettings {
  selectedFolders: DriveFolder[]
  cacheLimitBytes: number
}

// OAuth client IDs are public identifiers for installed applications. Keep the
// shipped desktop client usable while allowing development builds to override it.
const bundledClientId = '642599100277-q51sp03rk8jgtsgsc4tu4hs471cqssaq.apps.googleusercontent.com'
const clientId = () => process.env.AURORA_GOOGLE_CLIENT_ID?.trim() || bundledClientId
const clientSecret = () => process.env.AURORA_GOOGLE_CLIENT_SECRET?.trim() || ''
const tokenPath = () => path.join(app.getPath('userData'), 'google-drive-token.bin')
const settingsPath = () => path.join(app.getPath('userData'), 'google-drive.json')
const tracksPath = () => path.join(app.getPath('userData'), 'google-drive-library.json')
const cacheDirectory = () => path.join(app.getPath('appData'), 'Aurora', 'Cache', 'CloudMusic')
const cacheKey = (fileId: string) => createHash('sha256').update(fileId).digest('hex')
const cachePath = (fileId: string) => path.join(cacheDirectory(), `${cacheKey(fileId)}.audio`)
const driveUrl = (fileId: string) => `aurora-drive://track/${encodeURIComponent(fileId)}`

function defaultSettings(): DriveSettings {
  return { selectedFolders: [], cacheLimitBytes: DEFAULT_CACHE_LIMIT }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')) as T } catch { return fallback }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value), 'utf8')
}

function toBase64Url(value: Buffer): string { return value.toString('base64url') }

export class DriveService {
  private token: OAuthToken | null = null
  private refreshPromise: Promise<string | null> | null = null
  private cachePromises = new Map<string, Promise<void>>()

  async initialize(): Promise<void> {
    this.token = await this.readToken()
  }

  get configured(): boolean { return Boolean(clientId()) }

  async status(): Promise<CloudStatus> {
    const settings = await readJson(settingsPath(), defaultSettings())
    const accessToken = await this.accessToken()
    return {
      configured: this.configured,
      connected: Boolean(accessToken),
      email: accessToken ? this.token?.email : undefined,
      selectedFolders: settings.selectedFolders,
      cacheBytes: await this.cacheSize(),
      cacheLimitBytes: settings.cacheLimitBytes,
    }
  }

  async connect(): Promise<CloudStatus> {
    if (!this.configured) throw new Error('Google Drive is not configured. Set AURORA_GOOGLE_CLIENT_ID before signing in.')
    const verifier = toBase64Url(randomBytes(32))
    const challenge = toBase64Url(createHash('sha256').update(verifier).digest())
    const state = toBase64Url(randomBytes(24))
    const server = createServer()
    const { redirectUri, waitForCallback } = await this.listenForOAuth(server, state)
    const endpoint = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    endpoint.searchParams.set('client_id', clientId())
    endpoint.searchParams.set('redirect_uri', redirectUri)
    endpoint.searchParams.set('response_type', 'code')
    endpoint.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/drive.readonly')
    endpoint.searchParams.set('access_type', 'offline')
    endpoint.searchParams.set('prompt', 'consent')
    endpoint.searchParams.set('code_challenge', challenge)
    endpoint.searchParams.set('code_challenge_method', 'S256')
    endpoint.searchParams.set('state', state)
    await shell.openExternal(endpoint.toString())

    try {
      const code = await waitForCallback
      const tokenParams = new URLSearchParams({
        client_id: clientId(), code, code_verifier: verifier, redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
      if (clientSecret()) tokenParams.set('client_secret', clientSecret())
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams,
      })
      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 400 && !clientSecret() && errorText.includes('client_secret')) {
          throw new Error('Google requires a client secret for this OAuth client. Set AURORA_GOOGLE_CLIENT_SECRET before launching Aurora.')
        }
        throw new Error(`Google token exchange failed (${response.status}): ${errorText}`)
      }

      const result = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
      if (!result.access_token) throw new Error('Google did not return an access token.')

const email = await this.fetchEmail(result.access_token);
      this.token = {
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresAt: Date.now() + Math.max(60, result.expires_in ?? 3600) * 1000,
        email,
      }
      await this.writeToken(this.token)
      return this.status()
    } finally {
      server.close()
    }
  }

  async disconnect(): Promise<CloudStatus> {
    if (this.token?.accessToken) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: this.token.accessToken }),
        })
      } catch { /* Local sign-out still succeeds if revocation is offline. */ }
    }
    this.token = null
    try { await fs.unlink(tokenPath()) } catch { /* Already disconnected. */ }
    return this.status()
  }

  async listFolders(): Promise<DriveFolder[]> {
    await this.requireToken()
    const folders: DriveFolder[] = []
    let pageToken: string | undefined
    do {
      const result = await this.driveJson<DriveFileList>('/files', {
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'nextPageToken,files(id,name,parents)',
        pageSize: '1000',
        orderBy: 'name',
        pageToken,
      })
      folders.push(...result.files.map((folder) => ({ id: folder.id, name: folder.name, parentId: folder.parents?.[0] })))
      pageToken = result.nextPageToken
    } while (pageToken)
    return folders
  }

  async setSelectedFolders(selectedFolders: DriveFolder[]): Promise<CloudStatus> {
    const current = await readJson(settingsPath(), defaultSettings())
    await writeJson(settingsPath(), { ...current, selectedFolders })
    return this.status()
  }

  async setCacheLimit(cacheLimitBytes: number): Promise<CloudStatus> {
    const current = await readJson(settingsPath(), defaultSettings())
    const safeLimit = Math.max(256 * 1024 * 1024, Math.min(50 * 1024 * 1024 * 1024, Math.round(cacheLimitBytes)))
    await writeJson(settingsPath(), { ...current, cacheLimitBytes: safeLimit })
    await this.enforceCacheLimit(safeLimit)
    return this.status()
  }

  async clearCache(): Promise<CloudStatus> {
    await fs.rm(cacheDirectory(), { recursive: true, force: true })
    return this.status()
  }

  async scanSelectedFolders(): Promise<CloudTrack[]> {
    await this.requireToken()
    const settings = await readJson(settingsPath(), defaultSettings())
    const files = new Map<string, DriveFile>()
    const visitedFolders = new Set<string>()
    const visit = async (folderId: string): Promise<void> => {
      if (visitedFolders.has(folderId)) return
      visitedFolders.add(folderId)
      let pageToken: string | undefined
      do {
        const result = await this.driveJson<DriveFileList>('/files', {
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)',
          pageSize: '1000',
          orderBy: 'name',
          pageToken,
        })
        for (const file of result.files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') await visit(file.id)
          else if (this.isAudio(file)) files.set(file.id, file)
        }
        pageToken = result.nextPageToken
      } while (pageToken)
    }
    for (const folder of settings.selectedFolders) await visit(folder.id)
    const existing = await this.loadTracks()
    const tracks = await Promise.all([...files.values()].map((file) => this.toTrack(file, existing.find((track) => track.driveFileId === file.id))))
    await writeJson(tracksPath(), tracks)
    return tracks
  }

  async loadTracks(): Promise<CloudTrack[]> {
    return readJson(tracksPath(), [])
  }

  async setTrackArtwork(trackId: string, artwork: string): Promise<void> {
    const tracks = await this.loadTracks()
    await writeJson(tracksPath(), tracks.map((track) => track.id === trackId ? { ...track, artwork } : track))
  }

  async openMedia(request: Request): Promise<Response> {
    const fileId = decodeURIComponent(new URL(request.url).pathname.slice(1))
    const localPath = cachePath(fileId)
    try {
      await fs.access(localPath)
      return net.fetch(pathToFileUrl(localPath))
    } catch { /* Fetch from Drive when the cache is cold. */ }

    const range = request.headers.get('range')
    const response = await this.driveFetch(`/files/${encodeURIComponent(fileId)}`, {
      alt: 'media',
      ...(range ? { headers: { Range: range } } : {}),
    })
    if (!response.ok) return response
    if (!range) void this.cacheResponse(fileId, response.clone())
    else void this.cacheFullFile(fileId)
    return response
  }

  private async cacheFullFile(fileId: string): Promise<void> {
    if (this.cachePromises.has(fileId)) return this.cachePromises.get(fileId)
    const task = (async () => {
      try {
        const response = await this.driveFetch(`/files/${encodeURIComponent(fileId)}`, { alt: 'media' })
        if (response.ok) await this.cacheResponse(fileId, response)
      } catch { /* Cache is best-effort and must not interrupt playback. */ }
    })()
    this.cachePromises.set(fileId, task)
    await task
    this.cachePromises.delete(fileId)
  }

  private async cacheResponse(fileId: string, response: Response): Promise<void> {
    if (!response.body) return
    await fs.mkdir(cacheDirectory(), { recursive: true })
    const temporary = `${cachePath(fileId)}.part`
    try {
      const stream = createWriteStream(temporary)
      await new Promise<void>((resolve, reject) => {
        const readable = (requireReadable(response.body!))
        readable.on('error', reject)
        stream.on('error', reject)
        stream.on('finish', resolve)
        readable.pipe(stream)
      })
      await fs.rename(temporary, cachePath(fileId))
      const settings = await readJson(settingsPath(), defaultSettings())
      await this.enforceCacheLimit(settings.cacheLimitBytes)
    } catch {
      try { await fs.unlink(temporary) } catch { /* Nothing to remove. */ }
    }
  }

  private async toTrack(file: DriveFile, previous?: CloudTrack): Promise<CloudTrack> {
    if (previous && previous.driveModifiedTime === file.modifiedTime && previous.metadataRead) {
      return { ...previous, source: driveUrl(file.id) }
    }
    const filename = path.basename(file.name, path.extname(file.name))
    const fallback: CloudTrack = {
      id: `drive:${file.id}`,
      title: filename,
      artist: 'Unknown artist',
      album: 'Unknown album',
      duration: 0,
      source: driveUrl(file.id),
      addedAt: previous?.addedAt ?? new Date().toISOString(),
      metadataRead: false,
      sourceKind: 'drive',
      driveFileId: file.id,
      driveModifiedTime: file.modifiedTime,
    }
    try {
      const metadata = await this.readRangeMetadata(file)
      const picture = metadata?.common.picture?.[0]
      return {
        ...fallback,
        title: metadata?.common.title || filename,
        artist: metadata?.common.artist || fallback.artist,
        album: metadata?.common.album || fallback.album,
        albumartist: metadata?.common.albumartist,
        duration: metadata?.format.duration || 0,
        genre: metadata?.common.genre?.[0],
        artwork: picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}` : undefined,
        normalizationGain: 1,
        metadataRead: true,
      }
    } catch {
      return fallback
    }
  }

  private async readRangeMetadata(file: DriveFile) {
    const response = await this.driveFetch(`/files/${encodeURIComponent(file.id)}`, {
      alt: 'media',
      headers: { Range: 'bytes=0-4194303' },
    })
    if (!response.ok) throw new Error(`Unable to read Drive metadata (${response.status})`)
    const buffer = Buffer.from(await response.arrayBuffer())
    return parseBuffer(buffer, file.mimeType, { duration: true, skipCovers: false })
  }

  private isAudio(file: DriveFile): boolean {
    return AUDIO_MIME_TYPES.has(file.mimeType) || AUDIO_EXTENSIONS.has(path.extname(file.name).toLowerCase())
  }

  private async fetchEmail(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!response.ok) return undefined
      const result = await response.json() as { email?: string }
      return result.email
    } catch { return undefined }
  }

  private async requireToken(): Promise<string> {
    const accessToken = await this.accessToken()
    if (!accessToken) throw new Error('Google Drive is not connected.')
    return accessToken
  }

  private async accessToken(): Promise<string | null> {
    if (!this.token) return null
    if (this.token.expiresAt > Date.now() + 60_000) return this.token.accessToken
    if (!this.token.refreshToken) return null
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = this.refreshAccessToken().finally(() => { this.refreshPromise = null })
    return this.refreshPromise
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.token?.refreshToken) return null
    const refreshParams = new URLSearchParams({ client_id: clientId(), refresh_token: this.token.refreshToken, grant_type: 'refresh_token' })
    if (clientSecret()) refreshParams.set('client_secret', clientSecret())
    let response: Response
    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: refreshParams,
      })
    } catch { return null }
    if (!response.ok) return null
    const result = await response.json() as { access_token?: string; expires_in?: number }
    if (!result.access_token) return null
    this.token = { ...this.token, accessToken: result.access_token, expiresAt: Date.now() + Math.max(60, result.expires_in ?? 3600) * 1000 }
    await this.writeToken(this.token)
    return this.token.accessToken
  }

  private async driveFetch(endpoint: string, options: { alt?: string; headers?: Record<string, string> } = {}): Promise<Response> {
    const accessToken = await this.requireToken()
    const url = new URL(`${DRIVE_API}${endpoint}`)
    if (options.alt) url.searchParams.set('alt', options.alt)
    let response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, ...options.headers } })
    if (response.status === 401 && this.token?.refreshToken) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) response = await fetch(url, { headers: { Authorization: `Bearer ${refreshed}`, ...options.headers } })
    }
    return response
  }

  private async driveJson<T>(endpoint: string, params: Record<string, string | undefined>): Promise<T> {
    const url = new URL(`${DRIVE_API}${endpoint}`)
    for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
    const response = await this.driveFetch(`${endpoint}${url.search}`)
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`)
    return response.json() as Promise<T>
  }

  private async listenForOAuth(server: Server, expectedState: string): Promise<{ redirectUri: string; waitForCallback: Promise<string> }> {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Could not start the OAuth callback server.')
    const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`
    const waitForCallback = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Google sign-in timed out.')), 5 * 60 * 1000)
      server.on('request', (request, response) => {
        const url = new URL(request.url ?? '/', redirectUri)
        if (url.pathname !== '/oauth2callback') return
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end('<!doctype html><title>Aurora</title><p>Google Drive is connected. You can close this tab.</p>')
        clearTimeout(timeout)
        if (url.searchParams.get('state') !== expectedState) { reject(new Error('Invalid OAuth state.')); return }
        const error = url.searchParams.get('error')
        if (error) { reject(new Error(`Google sign-in was cancelled (${error}).`)); return }
        const code = url.searchParams.get('code')
        if (!code) { reject(new Error('Google did not return an authorization code.')); return }
        resolve(code)
      })
    })
    return { redirectUri, waitForCallback }
  }

  private async readToken(): Promise<OAuthToken | null> {
    if (!safeStorage.isEncryptionAvailable()) return null
    try {
      const encrypted = await fs.readFile(tokenPath())
      return JSON.parse(safeStorage.decryptString(encrypted)) as OAuthToken
    } catch { return null }
  }

  private async writeToken(token: OAuthToken): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable on this system.')
    await fs.mkdir(path.dirname(tokenPath()), { recursive: true })
    await fs.writeFile(tokenPath(), safeStorage.encryptString(JSON.stringify(token)))
  }

  private async cacheSize(): Promise<number> {
    try {
      const entries = await fs.readdir(cacheDirectory(), { withFileTypes: true })
      const sizes = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => (await fs.stat(path.join(cacheDirectory(), entry.name))).size))
      return sizes.reduce((total, size) => total + size, 0)
    } catch { return 0 }
  }

  private async enforceCacheLimit(limit: number): Promise<void> {
    try {
      const entries = await fs.readdir(cacheDirectory(), { withFileTypes: true })
      const files = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.audio')).map(async (entry) => {
        const filePath = path.join(cacheDirectory(), entry.name)
        const stat = await fs.stat(filePath)
        return { filePath, size: stat.size, mtime: stat.mtimeMs }
      }))
      let total = files.reduce((sum, file) => sum + file.size, 0)
      for (const file of files.sort((left, right) => left.mtime - right.mtime)) {
        if (total <= limit) break
        await fs.unlink(file.filePath)
        total -= file.size
      }
    } catch { /* Cache maintenance is best effort. */ }
  }
}

function pathToFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href
}

function requireReadable(body: ReadableStream<Uint8Array>) {
  // Electron's Node runtime exposes the WHATWG stream returned by fetch. The
  // cast keeps this bridge compatible with the Node stream typings used here.
  return Readable.fromWeb(body as never)
}
