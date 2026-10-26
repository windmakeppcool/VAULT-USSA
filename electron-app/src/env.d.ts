/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface VaultApi {}

declare global {
  interface Window {
    vaultApi: VaultApi
  }
}

export {}
