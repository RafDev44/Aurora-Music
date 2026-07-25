import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('aurora', {
    selectMusicFolder: () => ipcRenderer.invoke('dialog:select-music-folder'),
    loadLibrary: () => ipcRenderer.invoke('library:load'),
    scanFolder: (folder) => ipcRenderer.invoke('library:scan-folder', folder),
});
