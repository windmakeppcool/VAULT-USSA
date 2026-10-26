import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getLibraryState: () => ipcRenderer.invoke('library:get'),
  selectLibraryRoot: () => ipcRenderer.invoke('library:select'),
}

contextBridge.exposeInMainWorld('vaultApi', api)

export type VaultApi = typeof api
