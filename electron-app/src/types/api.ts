/** 渲染进程与主进程共享的类型定义 */

export interface LibraryState {
  root: string | null
  valid: boolean
  missing: string[]
}

declare global {
  interface VaultApi {
    /** 在系统默认阅读器中打开打包的手册 PDF */
    openManual(pdfName: string): Promise<void>
  }
}

/** 导出进度载荷，由主进程通过 `export:progress` 事件推送 */
export interface ExportProgress {
  jobId: string
  done: number
  total: number
  bytes: number
  currentFile: string
  state: 'running' | 'done' | 'failed' | 'canceled'
  error?: string
}
