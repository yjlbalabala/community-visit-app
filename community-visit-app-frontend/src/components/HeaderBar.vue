<template>
  <header class="header-bar">
    <span class="header-title">走访登记可视化系统</span>
    <div class="header-right" v-if="authStore.isLoggedIn">
      <el-tag :type="authStore.isAdmin ? 'danger' : 'primary'" size="small" effect="plain">
        {{ authStore.isAdmin ? '管理员' : '责任区用户' }}
      </el-tag>
      <span class="user-name">{{ displayName }}</span>
      <el-button link type="primary" @click="handleLogout">退出登录</el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const displayName = computed(() => {
  const u = authStore.currentUser
  return u ? (u.name || u.username) : ''
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.header-bar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}
.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 2px;
}
.header-right {
  position: absolute;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #606266;
}
.user-name {
  font-weight: 500;
}
</style>
