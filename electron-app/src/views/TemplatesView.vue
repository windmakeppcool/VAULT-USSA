<template>
  <section class="templates">
    <header class="head">
      <span class="kicker">SCENES / 03</span>
      <h1>场景模板</h1>
      <p>{{ VAULT_SCENE_TEMPLATES.title }} · 套用后生成对应打印清单与三色配色。</p>
    </header>

    <p class="notice">{{ VAULT_SCENE_TEMPLATES.notice }}</p>

    <div class="grid">
      <article v-for="group in VAULT_SCENE_TEMPLATES.groups" :key="group.id" class="card">
        <div class="card-head">
          <span class="id">{{ group.id }}</span>
          <h2>{{ group.name }}</h2>
        </div>
        <p class="why">{{ group.why }}</p>
        <div class="counts">
          <div><span>抽屉</span><b>{{ group.counts.drawers }}</b></div>
          <div><span>模块</span><b>{{ group.counts.modules }}</b></div>
          <div><span>箱体</span><b>{{ group.counts.cases }}</b></div>
          <div><span>件数</span><b>{{ totalQty(group) }}</b></div>
        </div>
        <button class="apply" @click="apply(group)">套用模板</button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { VAULT_SCENE_TEMPLATES } from '@/data/scene-templates'
import { useBomStore } from '@/stores/bom'
import { useColorStore } from '@/stores/color'
import { toast } from '@/composables/useToast'
import type { SceneGroup } from '@/data/types'

const bom = useBomStore()
const color = useColorStore()
const router = useRouter()

/** 模板内各文件的份数之和 */
function totalQty(group: SceneGroup): number {
  return group.items.reduce((sum, item) => sum + item.q, 0)
}

function apply(group: SceneGroup): void {
  bom.applyTemplate(group)
  // 模板中的 color 字段是 1/2/3 的色序，映射到当前预设的前三色
  const preset = Object.values(color.colors)
  group.items.forEach((item) => {
    const hex = preset[(item.color - 1) % 3]
    if (hex) color.setColor(item.part, hex)
  })
  toast(`已套用模板「${group.name}」：${bom.fileCount} 个文件 / ${bom.totalQty} 件`)
  void router.push('/build')
}
</script>

<style scoped>
.templates {
  height: 100%;
  overflow-y: auto;
  padding: 18px var(--gutter) 32px;
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
.notice {
  margin: 14px 0 20px;
  padding: 10px 14px;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
  background: var(--paper-dim);
  border-left: 2px solid var(--accent);
  border-radius: 2px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.card-head {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.id {
  font-family: var(--mono);
  font-size: 10px;
  padding: 1px 6px;
  color: var(--paper-hi);
  background: var(--ink);
  border-radius: 2px;
}
h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.why {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
  flex: 1;
}
.counts {
  display: flex;
  gap: 16px;
}
.counts div {
  display: grid;
  gap: 1px;
}
.counts span {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.counts b {
  font-family: var(--mono);
  font-size: 13px;
}
.apply {
  padding: 8px;
  font-size: 12px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
  cursor: pointer;
}
.apply:hover {
  background: var(--accent);
}
</style>
