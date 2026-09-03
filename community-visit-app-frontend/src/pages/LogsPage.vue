<template>
  <div class="logs-page">
    <el-card shadow="hover">
      <OperationLog :logs="opLogStore.logs" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useOperationLogStore } from '@/stores/operationLog'
import OperationLog from '@/components/OperationLog.vue'

const opLogStore = useOperationLogStore()

onMounted(() => {
  opLogStore.loadLogs()
})
</script>

<style scoped>
.logs-page {
  min-height: 600px;
}
</style>
