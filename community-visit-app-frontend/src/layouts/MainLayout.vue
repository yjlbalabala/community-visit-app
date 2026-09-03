<template>
  <div class="app-shell">
    <HeaderBar />
    <BreadcrumbNav v-if="hierarchyStore.path.length > 0" :path="hierarchyStore.path" />

    <div class="app-body">
      <!-- 全局左侧导航（所有层级常驻） -->
      <SystemNav />
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import HeaderBar from '@/components/HeaderBar.vue'
import BreadcrumbNav from '@/components/BreadcrumbNav.vue'
import SystemNav from '@/components/SystemNav.vue'
import { useHierarchyStore } from '@/stores/hierarchy'

const hierarchyStore = useHierarchyStore()
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  background: #f0f2f5;
}
.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.content-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}
</style>
