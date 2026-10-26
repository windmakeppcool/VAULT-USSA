<template>
  <section class="guide">
    <header class="head">
      <span class="kicker">GUIDE / 04</span>
      <h1>装配指南</h1>
      <p>分步组装与零件图鉴，可跳转对应手册页。</p>
    </header>

    <div class="body">
      <nav class="sections">
        <button
          v-for="(section, key) in sections"
          :key="key"
          :class="{ 'is-active': activeSection === key }"
          @click="activeSection = key"
        >
          {{ section.name }}
        </button>
      </nav>

      <div class="content">
        <template v-if="current">
          <h2>{{ current.name }}</h2>
          <p class="doc">对应手册：{{ current.doc }} · 页码 {{ current.pages.join(' / ') }}</p>

          <ol class="steps">
            <li v-for="(step, i) in current.steps" :key="i">
              <span class="no">{{ String(i + 1).padStart(2, '0') }}</span>
              <div>
                <b>{{ step.title }}</b>
                <p>{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </template>
        <p v-else class="empty">暂无内容。</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VAULT_GUIDE_DATA } from '@/data/guide-content'

interface GuideStep {
  title: string
  text: string
}

interface GuideSection {
  name: string
  doc: string
  pages: number[]
  steps: GuideStep[]
}

// assembly 下实际只有 drawer / sustainer 两个键；按实际存在的键渲染
const sections = computed(
  () => (VAULT_GUIDE_DATA.assembly ?? {}) as unknown as Record<string, GuideSection>,
)
const activeSection = ref(Object.keys(sections.value)[0] ?? '')
const current = computed<GuideSection | null>(() => sections.value[activeSection.value] ?? null)
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
.body {
  display: grid;
  grid-template-columns: 200px 1fr;
  flex: 1;
  min-height: 0;
}
.sections {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 12px;
  border-right: 1px solid var(--line);
  overflow-y: auto;
}
.sections button {
  padding: 8px 12px;
  font-size: 12px;
  text-align: left;
  color: var(--muted);
  background: transparent;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}
.sections button:hover {
  background: var(--paper-hi);
}
.sections button.is-active {
  color: var(--accent);
  background: var(--paper-hi);
  font-weight: 600;
}
.content {
  padding: 18px var(--gutter);
  overflow-y: auto;
}
h2 {
  margin: 0 0 4px;
  font-family: var(--display);
  font-size: 22px;
}
.doc {
  margin: 0 0 16px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
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
.empty {
  font-size: 11px;
  color: var(--muted);
}
</style>
