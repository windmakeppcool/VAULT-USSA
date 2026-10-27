<template>
  <div ref="host" class="three-canvas">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useThreeStage } from '@/composables/useThreeStage'

const host = ref<HTMLElement | null>(null)
const stage = useThreeStage(host)

defineExpose({ stage, invalidate: stage.invalidate })
</script>

<style scoped>
.three-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.three-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
