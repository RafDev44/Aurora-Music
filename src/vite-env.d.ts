/// <reference types="vite/client" />

interface Window {
  aurora: {
    selectMusicFolder: () => Promise<string | null>
    selectMusicFiles: () => Promise<string[]>
    selectLyricsFile: () => Promise<string | null>
    selectArtwork: () => Promise<string | null>
    loadLibrary: () => Promise<import('./types/music').Track[]>
    scanFolder: (folder: string) => Promise<import('./types/music').Track[]>
    importFiles: (paths: string[]) => Promise<import('./types/music').Track[]>
    getPathForFile: (file: File) => string
    loadLyrics: (filePath: string) => Promise<string>
    setTrackArtwork: (trackId: string, artwork: string) => Promise<import('./types/music').Track[]>
    loadPlaylists: () => Promise<import('./types/music').Playlist[]>
    createPlaylist: (name: string) => Promise<import('./types/music').Playlist[]>
    renamePlaylist: (id: string, name: string) => Promise<import('./types/music').Playlist[]>
    deletePlaylist: (id: string) => Promise<import('./types/music').Playlist[]>
    addTrackToPlaylist: (id: string, trackId: string) => Promise<import('./types/music').Playlist[]>
    removeTrackFromPlaylist: (id: string, trackId: string) => Promise<import('./types/music').Playlist[]>
    setPlaylistArtwork: (id: string, artwork: string) => Promise<import('./types/music').Playlist[]>
  }
}
