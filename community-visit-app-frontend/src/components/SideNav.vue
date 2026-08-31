<template>
  <aside class="side-nav">
    <el-menu
      :default-active="active"
      @select="handleSelect"
      class="nav-menu"
    >
      <el-menu-item index="chart">
        <span>🏘️ 小区可视化</span>
      </el-menu-item>
      <el-menu-item index="todos">
        <span>📋 待办事项</span>
      </el-menu-item>
      <el-menu-item index="logs">
        <span>📝 操作记录</span>
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup lang="ts">
export type NavTab = 'chart' | 'todos' | 'logs'

defineProps<{
  active: NavTab
}>()

const emit = defineEmits<{
  'update:active': [tab: NavTab]
}>()

const handleSelect = (index: string) => {
  emit('update:active', index as NavTab)
}
</script>

<style scoped>
.side-nav {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  height: 100%;
}

.nav-menu {
  border-right: none;
}
</style>

