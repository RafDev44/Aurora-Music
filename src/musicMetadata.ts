import type { Track } from './types/music'

const artistSplitPattern = /\s*(?:;|,|&| x | X | feat\.?|ft\.?|featuring|\/)\s*/i

export const cleanMusicText = (value?: string) =>
  (value ?? '')
    .replace(/\u00c3\u00a9/g, 'é')
    .replace(/\s*-\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

export const cleanTrackTitle = (value?: string) =>
  cleanMusicText(value)
    .replace(/\((?:From|from)\s+_([^_]+)_\)/g, '($1)')
    .replace(/_/g, '')
    .trim()

export const artistContributorsForTrack = (track: Pick<Track, 'artist' | 'albumartist'>) => {
  const values = [track.albumartist, track.artist]
    .map(cleanMusicText)
    .filter(Boolean)

  const contributors = values.flatMap((value) =>
    value
      .split(artistSplitPattern)
      .map(cleanMusicText)
      .filter(Boolean),
  )

  return [...new Set(contributors)] as string[]
}

export const primaryArtistForTrack = (track: Pick<Track, 'artist' | 'albumartist'>) =>
  artistContributorsForTrack(track)[0] || cleanMusicText(track.albumartist) || cleanMusicText(track.artist) || 'Unknown artist'

export const normalizeTrack = (track: Track): Track => {
  const contributors = artistContributorsForTrack(track)
  const artist = contributors.join(', ') || cleanMusicText(track.artist) || 'Unknown artist'
  const albumartist = cleanMusicText(track.albumartist) || contributors[0] || undefined

  return {
    ...track,
    title: cleanTrackTitle(track.title) || 'Unknown title',
    artist,
    album: cleanMusicText(track.album) || 'Unknown album',
    albumartist,
  }
}

