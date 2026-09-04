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
        <span class="nav-icon">📋</span>
        <span class="nav-text">待办事项</span>
        <span v-if="badge > 0 && !authStore.isAdmin" class="nav-badge">{{ badge > 99 ? '99+' : badge }}</span>
      </el-menu-item>
      <el-menu-item index="/visits">
        <span class="nav-icon">📋</span><span>走访信息</span>
      </el-menu-item>
      <el-menu-item index="/stats">
        <span class="nav-icon">📊</span><span>统计信息</span>
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
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTodoTaskStore } from '@/stores/todoTask'

const route = useRoute()
const authStore = useAuthStore()
const todoTaskStore = useTodoTaskStore()

const badge = computed(() => todoTaskStore.badgeCount)

async function refreshBadge() {
  if (!authStore.isAdmin && authStore.userZoneId) {
    await todoTaskStore.refreshBadge(authStore.userZoneId)
  }
}

onMounted(refreshBadge)
watch(() => route.path, refreshBadge)

/** 层级页面统一高亮「小区走访登记」，/visits、/logs 等各自高亮 */
const activeMenu = computed(() => {
  if (route.path.startsWith('/todos')) return '/todos'
  if (route.path.startsWith('/visits')) return '/visits'
  if (route.path.startsWith('/logs')) return '/logs'
  if (route.path.startsWith('/users')) return '/users'
  if (route.path.startsWith('/stats')) return '/stats'
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
.nav-text {
  flex: 1;
}
.nav-badge {
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  border-radius: 9px;
  background: #f56c6c;
  color: #fff;
  font-size: 12px;
  text-align: center;
  padding: 0 5px;
}
</style>








