import type { LyricLine } from '../types/music'

const timestamp = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g

export function isLrcSource(source: string): boolean {
  return /\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/.test(source)
}

export function parseLrc(source: string): LyricLine[] {
  const lyrics: LyricLine[] = []
  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const text = rawLine.replace(timestamp, '').trim()
    let match: RegExpExecArray | null
    timestamp.lastIndex = 0
    while ((match = timestamp.exec(rawLine))) {
      const fraction = Number(`0.${match[3] ?? '0'}`)
      lyrics.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text })
    }
  }
  return lyrics.sort((left, right) => left.time - right.time)
}
