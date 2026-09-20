/// <reference types="vite/client" />

interface Window {
  aurora: {
    selectMusicFolder: () => Promise<string | null>
    selectMusicFiles: () => Promise<string[]>
    selectLyricsFile: () => Promise<string | null>
    selectArtwork: () => Promise<string | null>
    loadLibrary: () => Promise<import('./types/music').Track[]>
    onLibraryUpdated: (
      callback: (
        tracks: import('./types/music').Track[],
        complete: boolean,
      ) => void,
    ) => () => void
    scanFolder: (folder: string) => Promise<import('./types/music').Track[]>
    importFiles: (paths: string[]) => Promise<import('./types/music').Track[]>
    getPathForFile: (file: File) => string
    loadLyrics: (filePath: string) => Promise<string>
    resolveLyrics: (
      track: Pick<
        import('./types/music').Track,
        | 'id'
        | 'title'
        | 'artist'
        | 'album'
        | 'duration'
        | 'sourcePath'
        | 'lrcPath'
      >,
    ) => Promise<import('./types/music').LyricsPayload>
    setTrackArtwork: (
      trackId: string,
      artwork: string,
    ) => Promise<import('./types/music').Track[]>
    getCloudStatus: () => Promise<import('./types/music').CloudStatus>
    connectGoogleDrive: () => Promise<import('./types/music').CloudStatus>
    disconnectGoogleDrive: () => Promise<import('./types/music').CloudStatus>
    listDriveFolders: () => Promise<import('./types/music').DriveFolder[]>
    setDriveFolders: (
      folders: import('./types/music').DriveFolder[],
    ) => Promise<import('./types/music').CloudStatus>
    scanDrive: () => Promise<import('./types/music').Track[]>
    clearDriveCache: () => Promise<import('./types/music').CloudStatus>
    setDriveCacheLimit: (
      bytes: number,
    ) => Promise<import('./types/music').CloudStatus>
    loadPlaylists: () => Promise<import('./types/music').Playlist[]>
    createPlaylist: (
      name: string,
    ) => Promise<import('./types/music').Playlist[]>
    renamePlaylist: (
      id: string,
      name: string,
    ) => Promise<import('./types/music').Playlist[]>
    deletePlaylist: (id: string) => Promise<import('./types/music').Playlist[]>
    addTrackToPlaylist: (
      id: string,
      trackId: string,
    ) => Promise<import('./types/music').Playlist[]>
    removeTrackFromPlaylist: (
      id: string,
      trackId: string,
    ) => Promise<import('./types/music').Playlist[]>
    setPlaylistArtwork: (
      id: string,
      artwork: string,
    ) => Promise<import('./types/music').Playlist[]>
    setMiniPlayerAutoShow: (enabled: boolean) => Promise<void>
    publishMiniPlayerState: (
      state: import('./types/mini-player').MiniPlayerPlaybackState,
    ) => void
    publishMiniPlayerFrequency: (frequency: number[]) => void
    onMiniPlayerControl: (
      callback: (
        control: import('./types/mini-player').MiniPlayerControl,
      ) => void,
    ) => () => void
    onMiniPlayerVisibility: (callback: (visible: boolean) => void) => () => void
    getMiniPlayerState: () => Promise<
      import('./types/mini-player').MiniPlayerPlaybackState
    >
    getMiniPlayerVisibility: () => Promise<boolean>
    sendMiniPlayerControl: (
      control: import('./types/mini-player').MiniPlayerControl,
    ) => Promise<boolean>
    onMiniPlayerState: (
      callback: (
        state: import('./types/mini-player').MiniPlayerPlaybackState,
      ) => void,
    ) => () => void
    onMiniPlayerFrequency: (
      callback: (frequency: number[]) => void,
    ) => () => void
    onMediaControl: (
      callback: (
        control: Exclude<
          import('./types/mini-player').MiniPlayerControl,
          'close'
        >,
      ) => void,
    ) => () => void
  }
}
