<template>
  <div class="app-shell">
    <HeaderBar />
    <BreadcrumbNav :path="hierarchyStore.path" />
    <main class="content-area">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import HeaderBar from '@/components/HeaderBar.vue'
import BreadcrumbNav from '@/components/BreadcrumbNav.vue'
import { useHierarchyStore } from '@/stores/hierarchy'

const hierarchyStore = useHierarchyStore()
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
