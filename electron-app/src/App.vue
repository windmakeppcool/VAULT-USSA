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
    <SinglePreview
      v-if="previewTarget"
      :key="previewTarget.path"
      :path="previewTarget.path"
      :name="previewTarget.name"
      :category="previewTarget.category"
      @close="preview.close()"
    />
    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppRail from '@/components/AppRail.vue'
import LibraryGate from '@/components/LibraryGate.vue'
import ToastHost from '@/components/ToastHost.vue'
import BomDrawer from '@/components/bom/BomDrawer.vue'
import SinglePreview from '@/components/three/SinglePreview.vue'
import { useLibraryStore } from '@/stores/library'
import { useBomStore } from '@/stores/bom'
import { usePreview } from '@/composables/usePreview'

const library = useLibraryStore()
const bom = useBomStore()
const bomOpen = ref(false)

const preview = usePreview()
// usePreview() 返回的 target 是 ref，在模板里通过 computed 展平，保证 v-if 缩窄生效
const previewTarget = computed(() => preview.target.value)

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
