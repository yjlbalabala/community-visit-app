<template>
  <div class="logs-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <span class="card-title">📝 操作记录</span>
          <el-tag v-if="zoneTag" type="primary" size="small" effect="plain">当前辖区：{{ zoneTag }}</el-tag>
        </div>
      </template>
      <OperationLogPanel :logs="visibleLogs" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOperationLogStore } from '@/stores/operationLog'
import { useAuthStore } from '@/stores/auth'
import { fetchNodePath } from '@/api/hierarchy'
import type { OperationLog } from '@/types'
import OperationLogPanel from '@/components/OperationLog.vue'

const opLogStore = useOperationLogStore()
const authStore = useAuthStore()

const zoneTag = ref('')

onMounted(async () => {
  await opLogStore.loadLogs()
  // 普通用户：只显示自己管辖责任区内的操作记录
  if (!authStore.isAdmin && authStore.userZoneId) {
    const path = await fetchNodePath(authStore.userZoneId)
    zoneTag.value = path[path.length - 1]?.name ?? ''
  }
})

const visibleLogs = computed<OperationLog[]>(() => {
  if (authStore.isAdmin) return opLogStore.logs
  return opLogStore.logs.filter(l => !!l.zoneName && l.zoneName === zoneTag.value)
})
</script>

<style scoped>
.logs-page {
  min-height: 600px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-weight: 600;
}
</style>

