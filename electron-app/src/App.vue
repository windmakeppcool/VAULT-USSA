<template>
  <LibraryGate v-if="library.checked && !library.ready" />
  <div v-else class="shell">
    <AppRail>
      <template #actions>
        <button class="bom-fab" @click="bomOpen = true">
          <span>打印清单</span><b>{{ bom.fileCount }}</b>
        </button>
      </template>
    </AppRail>
    <main class="work">
      <RouterView />
    </main>
    <BomDrawer v-model:open="bomOpen" />
    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppRail from '@/components/AppRail.vue'
import LibraryGate from '@/components/LibraryGate.vue'
import ToastHost from '@/components/ToastHost.vue'
// Task 11 接入完整清单抽屉，这里先使用最小占位版
import BomDrawer from '@/components/bom/BomDrawer.vue'
import { useLibraryStore } from '@/stores/library'
import { useBomStore } from '@/stores/bom'

const library = useLibraryStore()
const bom = useBomStore()
const bomOpen = ref(false)

onMounted(() => library.refresh())
</script>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.work {
  flex: 1;
  min-height: 0;
}
.bom-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.bom-fab:hover {
  background: var(--accent);
}
.bom-fab b {
  font-family: var(--mono);
  font-size: 11px;
  padding: 1px 6px;
  background: var(--accent);
  border-radius: 8px;
}
.bom-fab:hover b {
  background: var(--ink);
}
</style>
