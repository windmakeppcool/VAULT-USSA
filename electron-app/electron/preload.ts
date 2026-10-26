import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getLibraryState: () => ipcRenderer.invoke('library:get'),
  selectLibraryRoot: () => ipcRenderer.invoke('library:select'),
  exportZip: (relPaths: string[], jobId: string) =>
    ipcRenderer.invoke('export:start', relPaths, jobId),
  cancelExport: (jobId: string) => ipcRenderer.send('export:cancel', jobId),
  openManual: (name: string) => ipcRenderer.invoke('manual:open', name),
  onExportProgress: (handler: (p: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => handler(payload)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.removeListener('export:progress', listener)
  },
}

contextBridge.exposeInMainWorld('vaultApi', api)

export type VaultApi = typeof api
