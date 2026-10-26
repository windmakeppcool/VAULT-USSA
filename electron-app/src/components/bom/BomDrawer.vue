<template>
  <aside v-if="open" class="drawer">
    <header>
      <b>打印清单</b>
      <button @click="$emit('update:open', false)">×</button>
    </header>
    <p>清单功能待接入</p>
  </aside>
</template>

<script setup lang="ts">
// Task 11 会替换为完整清单抽屉，此处仅作最小占位以打通界面
defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 384px;
  background: var(--paper-hi, #f4efe2);
  border-left: 1px solid var(--line, #c3bba8);
  z-index: 70;
  padding: 18px;
}
</style>
