import { ref } from 'vue'

export interface PreviewTarget {
  path: string
  name: string
  category: string
}

const target = ref<PreviewTarget | null>(null)

export function usePreview() {
  return {
    target,
    open(next: PreviewTarget): void {
      target.value = next
    },
    close(): void {
      target.value = null
    },
  }
}
