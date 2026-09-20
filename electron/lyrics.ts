import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { app } from 'electron'
import { parseFile } from 'music-metadata'

export type LyricsKind = 'loading' | 'synced' | 'plain' | 'none'
export type LyricsSource = 'embedded' | 'sidecar' | 'cache' | 'online' | 'manual' | 'none'

export interface LyricsPayload {
  kind: LyricsKind
  content: string
  source: LyricsSource
}

export interface LyricsTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  sourcePath?: string
  lrcPath?: string
}

interface CachedLyrics {
  kind: 'synced' | 'plain'
  content: string
}

interface LrclibResponse {
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

const inFlight = new Map<string, Promise<LyricsPayload>>()

const lyricsCacheDirectory = () => path.join(app.getPath('appData'), 'Aurora', 'Cache', 'Lyrics')

function cacheKey(track: LyricsTrack): string {
  const identity = track.id || `${track.title}\0${track.artist}\0${track.album}\0${track.duration}`
  return createHash('sha256').update(identity).digest('hex')
}

function payload(kind: LyricsPayload['kind'], content: string, source: LyricsPayload['source']): LyricsPayload {
  return { kind, content, source }
}

function isLrc(source: string): boolean {
  return /\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/.test(source)
}

function toLrcTimestamp(milliseconds: number): string {
  const centiseconds = Math.max(0, Math.round(milliseconds / 10))
  const minutes = Math.floor(centiseconds / 6000)
  const seconds = Math.floor((centiseconds % 6000) / 100)
  const fraction = centiseconds % 100
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(fraction).padStart(2, '0')}]`
}

async function readEmbeddedLyrics(sourcePath?: string): Promise<LyricsPayload | null> {
  if (!sourcePath) return null
  try {
    const metadata = await parseFile(sourcePath, { skipCovers: true })
    let plainText: string | null = null
    for (const entry of metadata.common.lyrics ?? []) {
      const synced = (entry.syncText ?? [])
        .filter((line) => typeof line.timestamp === 'number' && line.text.trim())
        .sort((left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0))
      if (synced.length) {
        return payload('synced', synced.map((line) => `${toLrcTimestamp(line.timestamp ?? 0)} ${line.text}`).join('\n'), 'embedded')
      }
      if (!plainText && entry.text?.trim()) plainText = entry.text.trim()
    }
    if (plainText) return payload('plain', plainText, 'embedded')
  } catch {
    // An unreadable source should fall through to local and online lyrics.
  }
  return null
}

async function readCache(key: string): Promise<LyricsPayload | null> {
  try {
    const source = await fs.readFile(path.join(lyricsCacheDirectory(), `${key}.json`), 'utf8')
    const cached = JSON.parse(source) as CachedLyrics
    if ((cached.kind === 'synced' || cached.kind === 'plain') && cached.content.trim()) {
      return payload(cached.kind, cached.content, 'cache')
    }
  } catch {
    // A missing or malformed cache entry is treated as a cache miss.
  }
  return null
}

async function writeCache(key: string, lyrics: LyricsPayload): Promise<void> {
  await fs.mkdir(lyricsCacheDirectory(), { recursive: true })
  const cached: CachedLyrics = { kind: lyrics.kind as 'synced' | 'plain', content: lyrics.content }
  await fs.writeFile(path.join(lyricsCacheDirectory(), `${key}.json`), JSON.stringify(cached), 'utf8')
}

async function readSidecar(track: LyricsTrack): Promise<LyricsPayload | null> {
  if (!track.lrcPath) return null
  try {
    const source = (await fs.readFile(track.lrcPath, 'utf8')).trim()
    if (source) return payload(isLrc(source) ? 'synced' : 'plain', source, 'sidecar')
  } catch {
    // Sidecar lyrics are optional.
  }
  return null
}

async function fetchOnline(track: LyricsTrack): Promise<LyricsPayload | null> {
  if (!track.title || !track.artist || !track.album || !Number.isFinite(track.duration) || track.duration <= 0) return null
  const endpoint = new URL('https://lrclib.net/api/get')
  endpoint.searchParams.set('track_name', track.title)
  endpoint.searchParams.set('artist_name', track.artist)
  endpoint.searchParams.set('album_name', track.album)
  endpoint.searchParams.set('duration', String(Math.round(track.duration)))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Aurora Player/0.1.0' },
    })
    if (!response.ok) return null
    const result = await response.json() as LrclibResponse
    const synced = result.syncedLyrics?.trim()
    if (synced) return payload('synced', synced, 'online')
    const plain = result.plainLyrics?.trim()
    if (plain) return payload('plain', plain, 'online')
  } catch {
    // Network failures must never affect playback.
  } finally {
    clearTimeout(timeout)
  }
  return null
}

async function resolveLyricsInternal(track: LyricsTrack): Promise<LyricsPayload> {
  const embedded = await readEmbeddedLyrics(track.sourcePath)
  if (embedded) return embedded

  const key = cacheKey(track)
  const cached = await readCache(key)
  if (cached) return cached

  const sidecar = await readSidecar(track)
  if (sidecar) return sidecar

  const online = await fetchOnline(track)
  if (online) {
    try { await writeCache(key, online) } catch { /* Cache failure must not affect playback. */ }
    return online
  }
  return payload('none', '', 'none')
}

export function resolveLyrics(track: LyricsTrack): Promise<LyricsPayload> {
  const key = cacheKey(track)
  const existing = inFlight.get(key)
  if (existing) return existing
  const request = resolveLyricsInternal(track).finally(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}
