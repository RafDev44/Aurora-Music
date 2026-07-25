"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('aurora', {
    selectMusicFolder: () => electron_1.ipcRenderer.invoke('dialog:select-music-folder'),
    selectMusicFiles: () => electron_1.ipcRenderer.invoke('dialog:select-music-files'),
    selectLyricsFile: () => electron_1.ipcRenderer.invoke('dialog:select-lyrics-file'),
    selectArtwork: () => electron_1.ipcRenderer.invoke('dialog:select-artwork'),
    loadLibrary: () => electron_1.ipcRenderer.invoke('library:load'),
    scanFolder: (folder) => electron_1.ipcRenderer.invoke('library:scan-folder', folder),
    importFiles: (paths) => electron_1.ipcRenderer.invoke('library:import-files', paths),
    getPathForFile: (file) => electron_1.webUtils.getPathForFile(file),
    loadLyrics: (filePath) => electron_1.ipcRenderer.invoke('lyrics:load', filePath),
    setTrackArtwork: (trackId, artwork) => electron_1.ipcRenderer.invoke('library:set-artwork', trackId, artwork),
    loadPlaylists: () => electron_1.ipcRenderer.invoke('playlists:load'),
    createPlaylist: (name) => electron_1.ipcRenderer.invoke('playlists:create', name),
    renamePlaylist: (id, name) => electron_1.ipcRenderer.invoke('playlists:rename', id, name),
    deletePlaylist: (id) => electron_1.ipcRenderer.invoke('playlists:delete', id),
    addTrackToPlaylist: (id, trackId) => electron_1.ipcRenderer.invoke('playlists:add-track', id, trackId),
    removeTrackFromPlaylist: (id, trackId) => electron_1.ipcRenderer.invoke('playlists:remove-track', id, trackId),
    setPlaylistArtwork: (id, artwork) => electron_1.ipcRenderer.invoke('playlists:set-artwork', id, artwork),
});
