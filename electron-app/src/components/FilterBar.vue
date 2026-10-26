<template>
  <div class="filters">
    <div class="search">
      <input
        v-model="query"
        type="search"
        placeholder="搜索部件 / 路径 / 变体…"
        aria-label="搜索部件"
      />
    </div>
    <div class="groups" role="group" aria-label="部件分组">
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        :class="{ 'is-active': modelGroup === group.id }"
        :aria-pressed="modelGroup === group.id"
        @click="modelGroup = group.id"
      >
        {{ group.label }}
      </button>
    </div>
    <label>
      <span>FAMILY</span>
      <select v-model="modelFamily" aria-label="按族筛选">
        <option value="">全部</option>
        <option v-for="f in families" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </label>
    <label>
      <span>CATEGORY</span>
      <select v-model="modelCategory" aria-label="按类别筛选">
        <option value="">全部</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VAULT_DATA } from '@/data/manifest'

const query = defineModel<string>('query', { default: '' })
const modelGroup = defineModel<string>('group', { default: '' })
const modelFamily = defineModel<string>('family', { default: '' })
const modelCategory = defineModel<string>('category', { default: '' })

const groups = [
  { id: '', label: '全部' },
  { id: 'drawers', label: '抽屉' },
  { id: 'sustainers', label: '收纳箱' },
  { id: 'mods', label: '改装件' },
]

// manifest 的 f 字段是 ASCII（L2 / XL2），下拉展示使用上标，value 仍保持原值
const FAMILY_LABELS: Record<string, string> = {
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  L2: 'L²',
  XL2: 'XL²',
  U: 'U',
}
const FAMILY_ORDER = ['S', 'M', 'L', 'XL', 'L2', 'XL2', 'U']

const families = computed(() => {
  const present = new Set<string>()
  for (const entry of VAULT_DATA.files) {
    if (entry.f) present.add(entry.f)
  }
  const rank = (value: string): number => {
    const index = FAMILY_ORDER.indexOf(value)
    return index === -1 ? FAMILY_ORDER.length : index
  }
  return Array.from(present)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((value) => ({ value, label: FAMILY_LABELS[value] ?? value }))
})

const categories = computed(() =>
  Array.from(new Set(VAULT_DATA.files.map((entry) => entry.c))).sort((a, b) => a.localeCompare(b)),
)
</script>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px var(--gutter);
  border-bottom: 1px solid var(--line);
}
.search {
  flex: 1;
  min-width: 200px;
}
.search input {
  width: 100%;
  padding: 8px 12px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 2px;
  font-size: 12px;
}
.search input:focus {
  outline: none;
  border-color: var(--accent);
}
.groups {
  display: flex;
  gap: 2px;
}
.groups button {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
}
.groups button:hover {
  color: var(--ink);
}
.groups button.is-active {
  color: var(--accent);
  border-color: var(--line);
  background: var(--paper-hi);
}
label {
  display: grid;
  gap: 2px;
}
label span {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--muted);
}
label select {
  padding: 5px 8px;
  font-size: 11px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 2px;
}
label select:focus {
  outline: none;
  border-color: var(--accent);
}
</style>
