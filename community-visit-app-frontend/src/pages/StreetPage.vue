<template>
  <div class="level-page">
    <el-card shadow="hover" class="level-card">
      <template #header>
        <div class="level-header">
          <span class="card-title">🏘️ 西岗街道 · 责任区总览</span>
          <span class="card-sub">{{ nodes.length }} 个责任区</span>
        </div>
      </template>
      <LevelGridChart
        :nodes="nodes"
        child-label="小区"
        :loading="loading"
        @select="goZone"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { TreeNode } from '@/types'
import { useHierarchyStore } from '@/stores/hierarchy'
import LevelGridChart from '@/components/LevelGridChart.vue'

const router = useRouter()
const hierarchyStore = useHierarchyStore()

const nodes = computed(() => hierarchyStore.nodes)
const loading = computed(() => hierarchyStore.loading)

onMounted(() => {
  hierarchyStore.enterLevel('street')
})

const goZone = (node: TreeNode) => {
  router.push(`/zone/${node.id}`)
}
</script>

<style scoped>
.level-page {
  height: 100%;
}
.level-card {
  height: 100%;
  min-height: 660px;
  display: flex;
  flex-direction: column;
}
.level-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 560px;
}
.level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-weight: 600;
}
.card-sub {
  color: #909399;
  font-size: 13px;
}
</style>

