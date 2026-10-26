<template>
  <section class="catalog">
    <header class="head">
      <span class="kicker">LIBRARY / 02</span>
      <h1>部件库</h1>
      <p>检索全部 {{ VAULT_DATA.files.length }} 个 STL。按分组、族与类别筛选，逐件加入打印清单。</p>
    </header>

    <FilterBar
      v-model:query="query"
      v-model:group="group"
      v-model:family="family"
      v-model:category="category"
    />

    <div class="meta">
      <span aria-live="polite">{{ filtered.length }} 个结果</span>
      <span>按路径排序</span>
    </div>

    <PartTable :entries="filtered" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import FilterBar from '@/components/FilterBar.vue'
import PartTable from '@/components/PartTable.vue'
import { VAULT_DATA } from '@/data/manifest'

const query = ref('')
const group = ref('')
const family = ref('')
const category = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return VAULT_DATA.files
    .filter((entry) => {
      if (group.value && entry.g !== group.value) return false
      if (family.value && entry.f !== family.value) return false
      if (category.value && entry.c !== category.value) return false
      if (!q) return true
      return (
        entry.n.toLowerCase().includes(q) ||
        entry.p.toLowerCase().includes(q) ||
        entry.v.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => a.p.localeCompare(b.p, 'zh-CN'))
})
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.head {
  padding: 18px var(--gutter) 12px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h1 {
  margin: 6px 0 4px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: 0.03em;
}
.head p {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.meta {
  display: flex;
  justify-content: space-between;
  padding: 8px var(--gutter);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}
</style>
