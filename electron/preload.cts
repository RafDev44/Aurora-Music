import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('aurora', {
  selectMusicFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-music-folder'),
  selectMusicFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:select-music-files'),
  selectLyricsFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-lyrics-file'),
  selectArtwork: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-artwork'),
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  scanFolder: (folder: string) => ipcRenderer.invoke('library:scan-folder', folder),
  importFiles: (paths: string[]) => ipcRenderer.invoke('library:import-files', paths),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  loadLyrics: (filePath: string) => ipcRenderer.invoke('lyrics:load', filePath),
  setTrackArtwork: (trackId: string, artwork: string) => ipcRenderer.invoke('library:set-artwork', trackId, artwork),
  loadPlaylists: () => ipcRenderer.invoke('playlists:load'),
  createPlaylist: (name: string) => ipcRenderer.invoke('playlists:create', name),
  renamePlaylist: (id: string, name: string) => ipcRenderer.invoke('playlists:rename', id, name),
  deletePlaylist: (id: string) => ipcRenderer.invoke('playlists:delete', id),
  addTrackToPlaylist: (id: string, trackId: string) => ipcRenderer.invoke('playlists:add-track', id, trackId),
  removeTrackFromPlaylist: (id: string, trackId: string) => ipcRenderer.invoke('playlists:remove-track', id, trackId),
  setPlaylistArtwork: (id: string, artwork: string) => ipcRenderer.invoke('playlists:set-artwork', id, artwork),
})
