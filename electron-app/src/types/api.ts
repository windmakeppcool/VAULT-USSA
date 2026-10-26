/** 渲染进程与主进程共享的类型定义 */

export interface LibraryState {
  root: string | null
  valid: boolean
  missing: string[]
}
