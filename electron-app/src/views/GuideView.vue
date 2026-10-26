<template>
  <section class="guide">
    <header class="head">
      <span class="kicker">GUIDE / 04</span>
      <h1>装配指南</h1>
      <p>分步组装、安装改装与小零件图鉴，可打开对应手册 PDF。</p>
    </header>

    <nav class="tabs" role="tablist" aria-label="指南分区">
      <button
        v-for="(tab, i) in TABS"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-pressed="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <span class="tab-no">{{ pad2(i + 1) }}</span>
        <b>{{ tab.label }}</b>
        <i>{{ tab.en }}</i>
      </button>
    </nav>

    <div class="body">
      <!-- 1 / 2 · 分步组装 -->
      <div v-if="currentAssembly" :key="activeTab" class="content">
        <header class="section-head">
          <div>
            <h2>{{ currentAssembly.name }}</h2>
            <p class="doc">
              对应手册：{{ manualTitle(currentAssembly.doc) }} · 页码
              {{ currentAssembly.pages.join(' / ') }}
            </p>
          </div>
          <button type="button" class="pdf-btn" @click="openPdf(currentAssembly.doc)">
            打开手册 PDF ↗
          </button>
        </header>

        <ol class="steps">
          <li v-for="(step, i) in currentAssembly.steps" :key="i">
            <span class="no">{{ pad2(i + 1) }}</span>
            <div>
              <b>{{ step.title }}</b>
              <p>{{ step.text }}</p>
            </div>
          </li>
        </ol>

        <section v-if="currentAssembly.hardware" class="hardware">
          <header class="hw-head">
            <h3>{{ currentAssembly.hardware.title }}</h3>
            <span>PAGE {{ pad2(currentAssembly.hardware.page) }}</span>
          </header>
          <ul>
            <li v-for="(item, i) in currentAssembly.hardware.items" :key="i">
              <span>{{ item[0] }}</span>
              <b>{{ item[1] }}</b>
            </li>
          </ul>
          <p v-if="currentAssembly.hardware.note" class="hw-note">
            {{ currentAssembly.hardware.note }}
          </p>
          <button type="button" class="pdf-btn" @click="openPdf(currentAssembly.hardware.doc)">
            来源：{{ manualTitle(currentAssembly.hardware.doc) }}第
            {{ currentAssembly.hardware.page }} 页 ↗
          </button>
        </section>
      </div>

      <!-- 3 · 安装与改装 -->
      <div v-else-if="activeTab === 'mounts'" class="content">
        <div class="mount-grid">
          <button
            v-for="item in mountList"
            :key="item.key"
            type="button"
            class="mount-card"
            :class="{ 'is-active': activeMountKey === item.key }"
            :aria-pressed="activeMountKey === item.key"
            @click="activeMountKey = item.key"
          >
            <span class="thumb">
              <img
                v-if="showImage(item.mount.doc, item.mount.image)"
                :src="pageImageUrl(item.mount.doc, item.mount.image)"
                :alt="`${item.mount.name}原版安装图`"
                loading="lazy"
                decoding="async"
                @error="onImageError(item.mount.doc, item.mount.image)"
              />
              <span v-else class="missing">图片未载入</span>
            </span>
            <b>{{ item.mount.name }}</b>
            <small>{{ item.mount.intro }}</small>
          </button>
        </div>

        <article v-if="currentMount" class="mount-detail">
          <header class="section-head">
            <div>
              <span class="kicker">MOUNT &amp; MODIFY / {{ manualTitle(currentMount.doc) }}</span>
              <h2>{{ currentMount.name }}</h2>
            </div>
            <button type="button" class="pdf-btn" @click="openPdf(currentMount.doc)">
              手册第 {{ currentMount.image }} 页 ↗
            </button>
          </header>

          <p class="intro">{{ currentMount.intro }}</p>

          <ol class="install">
            <li v-for="(text, i) in currentMount.steps" :key="i">
              <b>{{ pad2(i + 1) }}</b>
              <p>{{ text }}</p>
            </li>
          </ol>

          <figure class="figure">
            <img
              v-if="showImage(currentMount.doc, currentMount.image)"
              :src="pageImageUrl(currentMount.doc, currentMount.image)"
              :alt="`${currentMount.name}原版说明`"
              loading="lazy"
              decoding="async"
              @error="onImageError(currentMount.doc, currentMount.image)"
            />
            <span v-else class="missing">
              该页图片未载入 · 请打开手册第 {{ currentMount.image }} 页
            </span>
          </figure>

          <button type="button" class="pdf-btn" @click="openPdf(currentMount.doc)">
            在说明书中打开 ↗
          </button>
        </article>
      </div>

      <!-- 4 · 小零件图鉴 -->
      <div v-else-if="activeTab === 'parts'" class="content">
        <p v-if="!partsGroups.length" class="empty">暂无小零件图鉴。</p>
        <section v-for="group in partsGroups" :key="group.key" class="parts-group">
          <header class="group-head">
            <h2>{{ group.name }}</h2>
            <span>{{ group.figures.length }} 组 · 对照原版手册</span>
          </header>

          <div class="parts-grid">
            <article v-for="(figure, fi) in group.figures" :key="fi" class="part-card">
              <header class="part-head">
                <h3>{{ figure.title }}</h3>
                <span>P{{ pad2(figure.page) }}</span>
              </header>

              <div class="part-figure">
                <img
                  v-if="showImage(figure.doc, figure.page)"
                  :src="pageImageUrl(figure.doc, figure.page)"
                  :alt="`${figure.title}原版安装位置图`"
                  loading="lazy"
                  decoding="async"
                  @error="onImageError(figure.doc, figure.page)"
                />
                <span v-else class="missing">
                  图片未载入 · 见手册第 {{ figure.page }} 页
                </span>
                <span
                  v-for="(spot, si) in figure.spots"
                  :key="si"
                  class="spot"
                  :style="{ left: spot[2] + '%', top: spot[3] + '%' }"
                  :title="spot[0]"
                >
                  {{ spot[1] }}
                </span>
              </div>

              <p class="part-note">{{ figure.note }}</p>
              <button type="button" class="pdf-btn" @click="openPdf(figure.doc)">
                手册第 {{ figure.page }} 页 ↗
              </button>
            </article>
          </div>
        </section>

        <section v-if="roleNotes.length" class="roles">
          <header><span>工装与选配 / ROLE</span></header>
          <div>
            <div v-for="role in roleNotes" :key="role.name">
              <b>{{ role.name }}</b>
              <p>{{ role.text }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VAULT_GUIDE_DATA } from '@/data/guide-content'
import { toast } from '@/composables/useToast'

/* ---------------- 本地类型（GuideData 在迁移数据里是宽泛的 Record） ---------------- */

interface AssemblyStep {
  title: string
  text: string
}

interface Hardware {
  title: string
  doc: string
  page: number
  items: [string, string][]
  note?: string
}

interface AssemblySection {
  name: string
  doc: string
  pages: number[]
  steps: AssemblyStep[]
  hardware?: Hardware
}

/** [零件键, 标签, x%, y%] */
type Spot = [string, string, number, number]

interface Figure {
  doc: string
  page: number
  title: string
  note: string
  spots: Spot[]
}

interface PartsGroup {
  name: string
  figures: Figure[]
}

interface RoleNote {
  name: string
  text: string
}

interface Mount {
  name: string
  doc: string
  image: number
  intro: string
  steps: string[]
}

interface Manual {
  title: string
  pdf: string
}

interface GuideShape {
  assembly: Record<string, AssemblySection>
  mounts: Record<string, Mount>
  smallParts: {
    order: string[]
    groups: Record<string, PartsGroup>
    roles: Record<string, RoleNote>
  }
  manuals: Record<string, Manual>
}

const DATA = VAULT_GUIDE_DATA as unknown as GuideShape

/* ---------------- 分区 ---------------- */

const TABS = [
  { id: 'drawer', label: '抽屉组装', en: 'DRAWER' },
  { id: 'sustainer', label: '储物箱组装', en: 'SUSTAINER' },
  { id: 'mounts', label: '安装与改装', en: 'MOUNT' },
  { id: 'parts', label: '小零件图鉴', en: 'SMALL PARTS' },
] as const

type TabId = (typeof TABS)[number]['id']

const activeTab = ref<TabId>('drawer')

const currentAssembly = computed<AssemblySection | null>(() => {
  if (activeTab.value !== 'drawer' && activeTab.value !== 'sustainer') return null
  return DATA.assembly?.[activeTab.value] ?? null
})

const mountList = computed(() =>
  Object.keys(DATA.mounts ?? {}).map((key) => ({ key, mount: DATA.mounts[key] })),
)

const activeMountKey = ref(mountList.value[0]?.key ?? '')

const currentMount = computed<Mount | null>(
  () => DATA.mounts?.[activeMountKey.value] ?? null,
)

const partsGroups = computed(() => {
  const parts = DATA.smallParts
  if (!parts?.groups) return []
  const order = parts.order?.length ? parts.order : Object.keys(parts.groups)
  return order
    .filter((key) => parts.groups[key]?.figures?.length)
    .map((key) => ({ key, ...parts.groups[key] }))
})

// 旧版只展示 jig 与 rails 两条角色说明
const roleNotes = computed<RoleNote[]>(() =>
  ['jig', 'rails']
    .map((key) => DATA.smallParts?.roles?.[key])
    .filter((role): role is RoleNote => Boolean(role)),
)

/* ---------------- 页图 ---------------- */

const PAGE_IMAGES = import.meta.glob('../assets/manuals/**/page-*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function pageImageUrl(doc: string, page: number): string | undefined {
  const key = `../assets/manuals/${doc}/page-${String(page).padStart(2, '0')}.jpg`
  return PAGE_IMAGES[key]
}

/** 已经加载失败的页图，避免同一页在缩略图与详情里重复破图 */
const failedImages = ref<Set<string>>(new Set())

function imageFailed(doc: string, page: number): boolean {
  return failedImages.value.has(`${doc}:${page}`)
}

function showImage(doc: string, page: number): boolean {
  return Boolean(pageImageUrl(doc, page)) && !imageFailed(doc, page)
}

function onImageError(doc: string, page: number): void {
  const next = new Set(failedImages.value)
  next.add(`${doc}:${page}`)
  failedImages.value = next
}

/* ---------------- 工具 ---------------- */

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function manualTitle(doc: string): string {
  return DATA.manuals?.[doc]?.title ?? `手册 ${doc}`
}

async function openPdf(doc: string): Promise<void> {
  const manual = DATA.manuals?.[doc]
  if (!manual?.pdf) {
    toast(`未找到手册 ${doc} 的 PDF`, 'warn')
    return
  }
  if (typeof window.vaultApi?.openManual !== 'function') {
    toast('当前环境不支持打开手册', 'warn')
    return
  }
  try {
    await window.vaultApi.openManual(manual.pdf)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    toast(`打开手册失败：${reason}`, 'warn')
  }
}
</script>

<style scoped>
.guide {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.head {
  padding: 18px var(--gutter) 12px;
  border-bottom: 1px solid var(--line);
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

/* ---------------- Tabs ---------------- */
.tabs {
  display: flex;
  flex: none;
  padding: 0 var(--gutter);
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
}
.tab {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 10px 14px;
  color: var(--muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
}
.tab:hover {
  background: var(--paper-hi);
}
.tab.is-active {
  color: var(--accent);
  background: var(--paper-hi);
  border-bottom-color: var(--accent);
}
.tab-no {
  font-family: var(--mono);
  font-size: 9px;
}
.tab b {
  font-size: 12px;
  font-weight: 600;
}
.tab i {
  font-family: var(--mono);
  font-size: 8px;
  font-style: normal;
  letter-spacing: 0.14em;
}

/* ---------------- 内容容器 ---------------- */
.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.content {
  padding: 18px var(--gutter) 32px;
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
h2 {
  margin: 0 0 4px;
  font-family: var(--display);
  font-size: 22px;
}
.doc {
  margin: 0;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
.pdf-btn {
  flex: none;
  padding: 6px 9px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--accent);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.pdf-btn:hover {
  background: var(--paper-hi);
  border-color: var(--accent);
}

/* ---------------- 组装步骤 ---------------- */
.steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  padding: 12px 14px;
  background: var(--paper-hi);
  border: 1px solid var(--line-soft);
  border-radius: 2px;
}
.no {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--accent);
}
.steps b {
  display: block;
  font-size: 12px;
  margin-bottom: 3px;
}
.steps p {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--muted);
}

/* ---------------- 五金卡片 ---------------- */
.hardware {
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-left: 2px solid var(--accent);
  border-radius: 3px;
}
.hw-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.hw-head h3 {
  margin: 0;
  font-size: 12px;
}
.hw-head span {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
}
.hardware ul {
  display: grid;
  gap: 1px;
  margin: 10px 0;
  padding: 0;
  list-style: none;
}
.hardware li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  font-size: 11px;
  border-bottom: 1px solid var(--line-soft);
}
.hardware li b {
  font-family: var(--mono);
  color: var(--accent);
}
.hw-note {
  margin: 8px 0;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
}

/* ---------------- 安装与改装 ---------------- */
.mount-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.mount-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  text-align: left;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.mount-card:hover {
  border-color: var(--muted);
}
.mount-card.is-active {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}
.mount-card b {
  font-size: 12px;
}
.mount-card small {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 10px;
  line-height: 1.5;
  color: var(--muted);
}
.thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--paper-dim);
  border-radius: 2px;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mount-detail {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.mount-detail .intro {
  margin: 0;
  font-size: 11px;
  line-height: 1.75;
  color: var(--muted);
}
.install {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.install li {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 10px;
}
.install li b {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--accent);
}
.install li p {
  margin: 0;
  font-size: 11px;
  line-height: 1.75;
}
.figure {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  margin: 0;
  overflow: hidden;
  background: var(--paper-dim);
  border: 1px solid var(--line);
  border-radius: 2px;
}
.figure img {
  display: block;
  width: 100%;
  height: auto;
}
.missing {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 10px;
  line-height: 1.7;
  text-align: center;
  color: var(--muted);
}

/* ---------------- 小零件图鉴 ---------------- */
.parts-group {
  margin-bottom: 20px;
}
.group-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.group-head h2 {
  margin: 0;
}
.group-head span {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
}
.parts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}
.part-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.part-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.part-head h3 {
  margin: 0;
  font-size: 12px;
}
.part-head span {
  flex: none;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--accent);
}
.part-figure {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  overflow: hidden;
  background: var(--paper-dim);
  border: 1px solid var(--line-soft);
  border-radius: 2px;
}
.part-figure img {
  display: block;
  width: 100%;
  height: auto;
}
.spot {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 2px 5px;
  font-size: 8px;
  line-height: 1.4;
  white-space: nowrap;
  color: var(--paper-hi);
  background: rgba(20, 20, 15, 0.82);
  border: 1px solid var(--paper-hi);
  border-radius: 2px;
  pointer-events: none;
}
.spot::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  width: 1px;
  height: 8px;
  background: var(--accent);
}
.part-note {
  margin: 0;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
}

/* ---------------- 工装与选配 ---------------- */
.roles {
  padding: 14px 16px;
  background: var(--paper-dim);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.roles > header span {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--accent);
}
.roles > div {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
.roles b {
  font-size: 11px;
}
.roles p {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
}
.empty {
  font-size: 11px;
  color: var(--muted);
}
</style>
