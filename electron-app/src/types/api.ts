/** 渲染进程与主进程共享的类型定义 */

export interface LibraryState {
  root: string | null
  valid: boolean
  missing: string[]
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
