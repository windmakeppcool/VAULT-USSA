<template>
  <section class="studio">
    <header>
      <span class="kicker">COLOR STUDIO / 耗材配色</span>
      <h3>三维配色</h3>
    </header>

    <label class="field">
      <span>方案 <em>SCHEME</em></span>
      <select :value="color.activePreset" @change="onPreset">
        <option v-for="(preset, id) in presets" :key="id" :value="id">{{ preset.name }}</option>
        <option v-if="color.activePreset === 'custom'" value="custom">自定义</option>
      </select>
    </label>

    <div class="brush">
      <span>画笔 <em>BRUSH</em></span>
      <div class="swatches">
        <button
          v-for="sw in color.swatches"
          :key="sw.hex"
          class="swatch"
          :class="{ 'is-active': color.brushColor === sw.hex }"
          :style="{ background: sw.hex }"
          :title="`${sw.name} ${sw.hex}`"
          :aria-label="`${sw.name} ${sw.hex}`"
          @click="color.brushColor = sw.hex"
        />
      </div>
      <label class="custom">
        自定义<input v-model="color.brushColor" type="color" />
      </label>
    </div>

    <div class="part-list">
      <span class="label">部位 <em>PARTS</em></span>
      <button
        v-for="key in partKeys"
        :key="key"
        class="part-row"
        @click="color.setColor(key, color.brushColor)"
      >
        <i :style="{ background: color.colorFor(key) }" />
        <span>{{ key }}</span>
        <code>{{ color.colorFor(key) }}</code>
      </button>
    </div>

    <p class="hint">点击部位即可用当前画笔色覆盖。色值为屏幕参考，实际以耗材色卡为准。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useColorStore } from '@/stores/color'
import { VAULT_PALETTES } from '@/data/palettes'

const color = useColorStore()
const presets = computed(() => VAULT_PALETTES.presets)
// 部位键来自配色预设，随方案切换而更新
const partKeys = computed(() => Object.keys(color.colors))

function onPreset(event: Event): void {
  const id = (event.target as HTMLSelectElement).value
  if (id !== 'custom') color.applyPreset(id)
}
</script>

<style scoped>
.studio {
  padding: 18px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h3 {
  margin: 6px 0 14px;
  font-family: var(--display);
  font-size: 20px;
}
.field {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}
.field > span,
.brush > span,
.label {
  font-size: 11px;
  color: var(--muted);
}
.field em,
.brush em,
.label em {
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
}
.brush {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.swatch.is-active {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
}
.custom input {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
}
.part-list {
  display: grid;
  gap: 1px;
  margin-bottom: 12px;
}
.part-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: var(--paper);
  border: none;
  border-radius: 2px;
  text-align: left;
}
.part-row:hover {
  background: var(--paper-dim);
}
.part-row i {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--line-soft);
}
.part-row span {
  flex: 1;
  font-size: 11px;
}
.part-row code {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
.hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted);
}
</style>
