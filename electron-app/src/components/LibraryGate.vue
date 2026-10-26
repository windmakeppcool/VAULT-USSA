<template>
  <div class="gate">
    <div class="card">
      <span class="kicker">LOCAL STL LIBRARY</span>
      <h1>选择 STL 模型库</h1>
      <p>请选择包含 <code>01. DRAWERS</code>、<code>02. SUSTAINERS</code>、<code>03. MODIFICATIONS</code> 三个目录的根文件夹。路径会被记住，下次启动自动加载。</p>

      <ul v-if="library.missing.length" class="missing">
        <li v-for="dir in library.missing" :key="dir">缺少 <code>{{ dir }}</code></li>
      </ul>

      <p v-if="library.root && !library.valid" class="warn">
        当前路径 <code>{{ library.root }}</code> 不完整，请重新选择。
      </p>

      <button class="pick" @click="library.choose()">选择目录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLibraryStore } from '@/stores/library'

const library = useLibraryStore()
</script>

<style scoped>
.gate {
  display: grid;
  place-items: center;
  height: 100vh;
  background: var(--paper);
}
.card {
  width: min(560px, 88vw);
  padding: 36px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--accent);
}
h1 {
  margin: 8px 0 12px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: 0.03em;
}
p {
  margin: 0 0 14px;
  line-height: 1.7;
  color: var(--muted);
}
code {
  font-family: var(--mono);
  font-size: 11px;
  padding: 1px 5px;
  background: var(--paper-dim);
  border-radius: 2px;
}
.missing {
  margin: 0 0 14px;
  padding-left: 18px;
  color: var(--accent);
  font-size: 12px;
}
.warn {
  color: var(--accent);
}
.pick {
  margin-top: 6px;
  padding: 10px 26px;
  font-size: 13px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.pick:hover {
  background: var(--accent);
}
</style>
