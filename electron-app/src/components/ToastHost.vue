<template>
  <div class="toasts" role="status" aria-live="polite">
    <transition-group name="toast">
      <div v-for="item in toasts" :key="item.id" class="toast" :class="item.kind">
        {{ item.text }}
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { toasts } from '@/composables/useToast'
</script>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: 26px;
  z-index: 90;
  display: grid;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
}
.toast {
  padding: 9px 18px;
  font-size: 12px;
  color: var(--paper-hi);
  background: var(--ink);
  border-radius: 2px;
  box-shadow: 0 6px 20px rgba(20, 20, 15, 0.22);
}
.toast.warn {
  background: var(--accent);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s var(--ease), transform 0.22s var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
