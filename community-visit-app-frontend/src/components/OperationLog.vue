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
        <el-table-column label="住户位置" min-width="260">
          <template #default="{ row }">
            <span>{{ locationText(row) }}</span>
          </template>
        </el-table-column>
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
        <PaginationBar
          :total="logs.length"
          v-model:current-page="currentPage"
          :page-size="pageSize"
          layout="total, prev, pager, next"
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

/** 完整位置：责任区 · 小区 · 单元 · 房号 */
const locationText = (row: OperationLog) =>
  [row.zoneName, row.communityName, row.unitName, row.roomNo].filter(Boolean).join(' · ')

import PaginationBar from '@/components/PaginationBar.vue'

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


