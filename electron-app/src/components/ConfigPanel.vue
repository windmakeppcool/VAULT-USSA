<template>
  <section class="panel">
    <header>
      <span class="kicker">CONFIGURATOR / 01</span>
      <h2>自由构型</h2>
      <p class="code">{{ config.sheetCode }}</p>
    </header>

    <div class="modes">
      <button
        v-for="mode in modes"
        :key="mode.id"
        :class="{ 'is-active': config.mode === mode.id }"
        @click="config.mode = mode.id"
      >
        <span>{{ mode.no }}</span><b>{{ mode.label }}</b>
      </button>
    </div>

    <template v-if="config.mode !== 'mod'">
      <label class="field">
        <span>规格族 <em>FAMILY</em></span>
        <select v-model="config.family">
          <option v-for="f in families" :key="f" :value="f">{{ f }}</option>
        </select>
      </label>
      <label class="field">
        <span>档位 <em>SIZE</em></span>
        <select v-model="config.size">
          <option v-for="s in sizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="field">
        <span>高度 <em>HEIGHT</em></span>
        <select v-model="config.height">
          <option v-for="h in heights" :key="h" :value="h">{{ h }}</option>
        </select>
      </label>
    </template>

    <div class="result">
      <span>匹配部件</span><b>{{ config.matchedParts.length }}</b>
    </div>

    <ul class="parts">
      <li v-for="entry in config.matchedParts.slice(0, 60)" :key="entry.p">
        <span class="name" :title="entry.p">{{ entry.n }}</span>
        <button class="add" @click="addToBom(entry)">加入清单</button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import { useBomStore } from '@/stores/bom'
import { toast } from '@/composables/useToast'
import type { ManifestEntry } from '@/data/types'

const config = useConfigStore()
const bom = useBomStore()

const modes = [
  { id: 'drawer' as const, no: '01', label: '抽屉' },
  { id: 'sustainer' as const, no: '02', label: '收纳箱' },
  { id: 'mod' as const, no: '03', label: '改装件' },
]
// 注意：L² / XL² 中的上标字符必须与 manifest 保持完全一致
const families = ['S', 'M', 'L', 'L²', 'XL', 'XL²']
const sizes = ['3', '4', '5', '6', '7']
const heights = ['1F', '2F', '4F']

function addToBom(entry: ManifestEntry): void {
  bom.add(entry.p, entry.n, entry.q, entry.c)
  toast(`已加入：${entry.n}`)
}
</script>

<style scoped>
.panel {
  padding: 18px;
  border-bottom: 1px solid var(--line);
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h2 {
  margin: 6px 0 2px;
  font-family: var(--display);
  font-size: 24px;
  letter-spacing: 0.02em;
}
.code {
  margin: 0 0 14px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin-bottom: 14px;
}
.modes button {
  display: grid;
  gap: 1px;
  padding: 8px 4px;
  background: var(--paper-dim);
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
}
.modes button span {
  font-family: var(--mono);
  font-size: 8px;
  opacity: 0.6;
}
.modes button b {
  font-size: 12px;
  color: var(--ink);
}
.modes button.is-active {
  background: var(--paper-hi);
  border-bottom-color: var(--accent);
}
.modes button.is-active b {
  color: var(--accent);
}
.field {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
}
.field > span {
  font-size: 11px;
  color: var(--muted);
}
.field em {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  font-style: normal;
  opacity: 0.6;
  margin-left: 6px;
}
.field select {
  padding: 7px 10px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
  color: var(--ink);
}
.result {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 14px 0 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
  font-size: 11px;
  color: var(--muted);
}
.result b {
  font-family: var(--mono);
  font-size: 18px;
  color: var(--ink);
}
.parts {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 320px;
  overflow-y: auto;
}
.parts li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  background: var(--paper);
  border-radius: 2px;
}
.parts li:hover {
  background: var(--paper-dim);
}
.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.add {
  flex-shrink: 0;
  padding: 3px 9px;
  font-size: 10px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.add:hover {
  color: var(--paper-hi);
  background: var(--accent);
  border-color: var(--accent);
}
</style>
