import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { Track } from '../src/types/music'
import type {
  MiniPlayerControl,
  MiniPlayerPlaybackState,
} from '../src/types/mini-player'

contextBridge.exposeInMainWorld('aurora', {
  selectMusicFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-music-folder'),
  selectMusicFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('dialog:select-music-files'),
  selectLyricsFile: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-lyrics-file'),
  selectArtwork: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-artwork'),
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  onLibraryUpdated: (
    callback: (tracks: Track[], complete: boolean) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      tracks: Track[],
      complete: boolean,
    ) => callback(tracks, complete)
    ipcRenderer.on('library:updated', listener)
    return () => ipcRenderer.removeListener('library:updated', listener)
  },
  scanFolder: (folder: string) =>
    ipcRenderer.invoke('library:scan-folder', folder),
  importFiles: (paths: string[]) =>
    ipcRenderer.invoke('library:import-files', paths),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  loadLyrics: (filePath: string) => ipcRenderer.invoke('lyrics:load', filePath),
  resolveLyrics: (track: {
    id: string
    title: string
    artist: string
    album: string
    duration: number
    sourcePath?: string
    lrcPath?: string
  }) => ipcRenderer.invoke('lyrics:resolve', track),
  setTrackArtwork: (trackId: string, artwork: string) =>
    ipcRenderer.invoke('library:set-artwork', trackId, artwork),
  getCloudStatus: () => ipcRenderer.invoke('drive:status'),
  connectGoogleDrive: () => ipcRenderer.invoke('drive:connect'),
  disconnectGoogleDrive: () => ipcRenderer.invoke('drive:disconnect'),
  listDriveFolders: () => ipcRenderer.invoke('drive:list-folders'),
  setDriveFolders: (
    folders: { id: string; name: string; parentId?: string }[],
  ) => ipcRenderer.invoke('drive:set-folders', folders),
  scanDrive: () => ipcRenderer.invoke('drive:scan'),
  clearDriveCache: () => ipcRenderer.invoke('drive:clear-cache'),
  setDriveCacheLimit: (bytes: number) =>
    ipcRenderer.invoke('drive:set-cache-limit', bytes),
  loadPlaylists: () => ipcRenderer.invoke('playlists:load'),
  createPlaylist: (name: string) =>
    ipcRenderer.invoke('playlists:create', name),
  renamePlaylist: (id: string, name: string) =>
    ipcRenderer.invoke('playlists:rename', id, name),
  deletePlaylist: (id: string) => ipcRenderer.invoke('playlists:delete', id),
  addTrackToPlaylist: (id: string, trackId: string) =>
    ipcRenderer.invoke('playlists:add-track', id, trackId),
  removeTrackFromPlaylist: (id: string, trackId: string) =>
    ipcRenderer.invoke('playlists:remove-track', id, trackId),
  setPlaylistArtwork: (id: string, artwork: string) =>
    ipcRenderer.invoke('playlists:set-artwork', id, artwork),
  setMiniPlayerAutoShow: (enabled: boolean) =>
    ipcRenderer.invoke('mini-player:set-auto-show', enabled),
  publishMiniPlayerState: (state: MiniPlayerPlaybackState) =>
    ipcRenderer.send('mini-player:state', state),
  publishMiniPlayerFrequency: (frequency: number[]) =>
    ipcRenderer.send('mini-player:frequency', frequency),
  onMiniPlayerControl: (callback: (control: MiniPlayerControl) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      control: MiniPlayerControl,
    ) => callback(control)
    ipcRenderer.on('mini-player:control', listener)
    return () => ipcRenderer.removeListener('mini-player:control', listener)
  },
  onMiniPlayerVisibility: (callback: (visible: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, visible: boolean) =>
      callback(visible)
    ipcRenderer.on('mini-player:visibility', listener)
    return () => ipcRenderer.removeListener('mini-player:visibility', listener)
  },
  getMiniPlayerState: () => ipcRenderer.invoke('mini-player:get-state'),
  getMiniPlayerVisibility: () =>
    ipcRenderer.invoke('mini-player:get-visibility'),
  sendMiniPlayerControl: (control: MiniPlayerControl) =>
    ipcRenderer.invoke('mini-player:control', control),
  onMiniPlayerState: (callback: (state: MiniPlayerPlaybackState) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: MiniPlayerPlaybackState,
    ) => callback(state)
    ipcRenderer.on('mini-player:state', listener)
    return () => ipcRenderer.removeListener('mini-player:state', listener)
  },
  onMiniPlayerFrequency: (callback: (frequency: number[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, frequency: number[]) =>
      callback(frequency)
    ipcRenderer.on('mini-player:frequency', listener)
    return () => ipcRenderer.removeListener('mini-player:frequency', listener)
  },
  onMediaControl: (
    callback: (control: Exclude<MiniPlayerControl, 'close'>) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      control: Exclude<MiniPlayerControl, 'close'>,
    ) => callback(control)
    ipcRenderer.on('media-control', listener)
    return () => ipcRenderer.removeListener('media-control', listener)
  },
})
