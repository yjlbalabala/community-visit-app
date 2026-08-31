<template>
  <div class="log-panel">
    <div class="panel-title">📝 操作记录</div>

    <template v-if="pagedLogs.length > 0">
      <el-table
        :data="pagedLogs"
        size="small"
        stripe
        class="log-table"
      >
        <el-table-column prop="operatedAt" label="操作时间" width="170" />
        <el-table-column prop="roomNo" label="房号" width="80" />
        <el-table-column prop="operationType" label="操作类别" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.operationType === '变更信息' ? 'warning' : 'success'"
              size="small"
            >
              {{ row.operationType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="changesDetail" label="变更详情" min-width="200">
          <template #default="{ row }">
            <span v-if="row.changesDetail">{{ row.changesDetail }}</span>
            <span v-else style="color: #909399">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-box" v-if="logs.length > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="logs.length"
          layout="total, prev, pager, next"
          background
          small
        />
      </div>
    </template>

    <el-empty
      v-else
      description="暂无操作记录"
      :image-size="60"
      class="empty-box"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OperationLog } from '@/types'

const props = defineProps<{
  logs: OperationLog[]
}>()

const currentPage = ref(1)
const pageSize = 10

const pagedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return props.logs.slice(start, start + pageSize)
})
</script>

<style scoped>
.log-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

.empty-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-table {
  flex: 1;
}

.pagination-box {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
