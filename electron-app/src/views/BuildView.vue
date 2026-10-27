<template>
  <div class="build">
    <section class="stage-area">
      <AssemblyView :title="`组合预览 · ${config.sheetCode}`" :parts="assemblyParts" />
    </section>
    <aside class="console">
      <ConfigPanel />
      <ColorStudio />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AssemblyView from '@/components/three/AssemblyView.vue'
import ConfigPanel from '@/components/ConfigPanel.vue'
import ColorStudio from '@/components/ColorStudio.vue'
import { useConfigStore } from '@/stores/config'

const config = useConfigStore()

const assemblyParts = computed(() =>
  config.matchedParts.slice(0, 40).map((entry) => ({
    path: entry.p,
    category: entry.c,
  })),
)
</script>

<style scoped>
.build {
  display: grid;
  grid-template-columns: 1fr var(--console-w);
  height: 100%;
  min-height: 0;
}
.stage-area {
  min-width: 0;
  background: var(--stage);
}
.console {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid var(--line);
  background: var(--paper-hi);
}
</style>
