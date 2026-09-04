<template>
  <aside class="system-nav">
    <el-menu
      :default-active="activeMenu"
      router
      class="nav-menu"
    >
      <el-menu-item index="/">
        <span class="nav-icon">🏘️</span><span>小区走访登记</span>
      </el-menu-item>
      <el-menu-item index="/todos">
        <span class="nav-icon">📋</span><span>待办事项</span>
      </el-menu-item>
      <el-menu-item index="/logs">
        <span class="nav-icon">📝</span><span>操作记录</span>
      </el-menu-item>
      <el-menu-item v-if="authStore.isAdmin" index="/users">
        <span class="nav-icon">👥</span><span>用户管理</span>
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

/** 层级页面统一高亮「小区走访登记」，/todos、/logs 各自高亮 */
const activeMenu = computed(() => {
  if (route.path.startsWith('/todos')) return '/todos'
  if (route.path.startsWith('/logs')) return '/logs'
  if (route.path.startsWith('/users')) return '/users'
  return '/'
})
</script>

<style scoped>
.system-nav {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}
.nav-menu {
  border-right: none;
}
.nav-icon {
  margin-right: 8px;
}
</style>


