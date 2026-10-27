<template>
  <nav class="rail" aria-label="主导航">
    <div class="brand">
      <span class="mark">VAULT<i>/</i>USSA</span>
      <span class="tag">STL CONFIGURATOR</span>
    </div>
    <div class="tabs">
      <RouterLink
        v-for="(tab, i) in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab"
        active-class="is-active"
      >
        <span>{{ String(i + 1).padStart(2, '0') }}</span>
        <b>{{ tab.label }}</b>
        <i>{{ tab.en }}</i>
      </RouterLink>
    </div>
    <slot name="actions" />
  </nav>
</template>

<script setup lang="ts">
const tabs = [
  { name: 'build', path: '/build', label: '构型', en: 'BUILD' },
  { name: 'catalog', path: '/catalog', label: '部件库', en: 'PARTS' },
  { name: 'templates', path: '/templates', label: '模板', en: 'SCENES' },
  { name: 'guide', path: '/guide', label: '指南', en: 'GUIDE' },
]
</script>

<style scoped>
.rail {
  display: flex;
  align-items: center;
  gap: 28px;
  height: var(--chrome-h);
  padding: 0 var(--gutter);
  border-bottom: 1px solid var(--line);
  background: var(--paper-hi);
}
.brand {
  display: grid;
  gap: 1px;
}
.mark {
  font-family: var(--display);
  font-size: 22px;
  letter-spacing: 0.06em;
}
.mark i {
  color: var(--accent);
  font-style: normal;
}
.tag {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--muted);
}
.tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.tab {
  display: grid;
  gap: 1px;
  padding: 8px 18px;
  text-decoration: none;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  transition: color 0.2s var(--ease), border-color 0.2s var(--ease);
}
.tab span {
  font-family: var(--mono);
  font-size: 9px;
  opacity: 0.6;
}
.tab b {
  font-size: 13px;
  color: var(--ink);
}
.tab i {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.16em;
  font-style: normal;
  opacity: 0.5;
}
.tab:hover {
  color: var(--accent);
}
.tab.is-active {
  border-bottom-color: var(--accent);
}
.tab.is-active b {
  color: var(--accent);
}
</style>
