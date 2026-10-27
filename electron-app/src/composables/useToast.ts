import { ref } from 'vue'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'warn'
}

/** 全局 Toast 队列，由 ToastHost 渲染 */
export const toasts = ref<Toast[]>([])
let nextId = 1

export function toast(text: string, kind: Toast['kind'] = 'info', ms = 2600): void {
  const id = nextId++
  toasts.value.push({ id, text, kind })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, ms)
}
