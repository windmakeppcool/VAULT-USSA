/// <reference types="vite/client" />

import type { ExportProgress, LibraryState } from './types/api'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface VaultApi {
    getLibraryState(): Promise<LibraryState>
    selectLibraryRoot(): Promise<LibraryState>
    exportZip(relPaths: string[], jobId: string): Promise<{ canceled: boolean; savedTo?: string }>
    cancelExport(jobId: string): void
    onExportProgress(handler: (p: ExportProgress) => void): () => void
  }

  interface Window {
    vaultApi: VaultApi
  }
}

export {}
