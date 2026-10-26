/// <reference types="vite/client" />

import type { LibraryState } from './types/api'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface VaultApi {
    getLibraryState(): Promise<LibraryState>
    selectLibraryRoot(): Promise<LibraryState>
  }

  interface Window {
    vaultApi: VaultApi
  }
}

export {}
