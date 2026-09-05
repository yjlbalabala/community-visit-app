<template>
  <div class="tasks-page">
    <el-card shadow="hover" class="tasks-card">
      <template #header>
        <div class="page-header">
          <span class="card-title">📋 待办事项</span>
          <div class="header-right">
            <span v-if="!authStore.isAdmin" class="card-sub">辖区：{{ authStore.currentUser?.zoneId ? zoneName : '' }} · 待走访 {{ activeCount }} 户</span>
            <el-button v-if="authStore.isAdmin" type="primary" :icon="Plus" @click="publishVisible = true">发布走访任务</el-button>
          </div>
        </div>
      </template>

      <!-- 管理员：我发布的记录 -->
      <template v-if="authStore.isAdmin">
        <el-table :data="todoTaskStore.adminTasks" row-key="id" stripe border>
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="task-items">
                <table class="mini-table">
                  <thead><tr><th>住户</th><th>房屋</th><th>房主/人数</th><th>上次走访</th><th>状态</th><th>处理时间</th></tr></thead>
                  <tbody>
                    <tr v-for="it in row.items" :key="it.itemId">
                      <td>
  <HouseLocationLink :zone-name="it.zoneName" :community-name="it.communityName" :unit-name="it.unitName" :room-no="it.roomNo" :unit-id="it.unitId" />
</td>
                      <td>{{ it.houseType }}</td>
                      <td>{{ it.landlord }}（{{ it.personsCount }} 人）</td>
                      <td>{{ it.lastVisitTime || '—' }}</td>
                      <td><el-tag :type="itemTag(it.status)" size="small">{{ itemStatusText(it.status) }}</el-tag></td>
                      <td>{{ it.visitedAt || it.expiredAt || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="assigneeUsername" label="接收用户" width="110" />
          <el-table-column prop="zoneName" label="责任区" width="120" />
          <el-table-column label="户数" width="120">
            <template #default="{ row }">
              {{ activeNumOf(row) }} 进行中 / {{ row.items.length }} 户
            </template>
          </el-table-column>
          <el-table-column prop="scheduledVisitTime" label="指定走访时间" width="170" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="taskTag(taskStatus(row))" size="small">{{ taskStatusText(taskStatus(row)) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="说明" min-width="140" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="发布时间" width="170" />
        </el-table>
        <el-empty v-if="todoTaskStore.adminTasks.length === 0" description="暂无发布的走访任务" :image-size="70" />
      </template>

      <!-- 普通用户：我接收的任务 -->
      <template v-else>
        <el-table :data="activeItems" row-key="itemId" stripe border v-loading="todoTaskStore.loading">
          <el-table-column label="住户（点击查看）" min-width="250">
            <template #default="{ row }">
              <div class="cell-click" @click="viewHousehold(row)">
                <el-tag type="danger" size="small">待走访</el-tag>
                <HouseLocationLink :zone-name="row.zoneName" :community-name="row.communityName" :unit-name="row.unitName" :room-no="row.roomNo" :unit-id="row.unitId" />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="房屋类别" width="92">
            <template #default="{ row }">
              <el-tag :type="houseTagOf(row.houseType)" size="small">{{ row.houseType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="房主 / 人数" width="130">
            <template #default="{ row }">{{ row.landlord }}（{{ row.personsCount }} 人）</template>
          </el-table-column>
          <el-table-column label="上次走访" width="160">
            <template #default="{ row }">{{ row.lastVisitTime || '从未走访' }}</template>
          </el-table-column>
          <el-table-column label="指定走访时间" width="170">
            <template #default="{ row }">
              <b style="color:#f56c6c">{{ row.taskScheduledVisitTime }}</b>
            </template>
          </el-table-column>
          <el-table-column prop="taskRemark" label="说明" min-width="120" show-overflow-tooltip />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="info" size="small" @click="viewHousehold(row)">详情</el-button>
              <el-button link type="success" size="small" @click="handleConfirm(row)">确认走访</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="activeItems.length === 0" description="暂无待处理的走访任务" :image-size="70" />
      </template>
    </el-card>

    <PublishTaskDialog v-model:visible="publishVisible" @published="afterPublish" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import type { HouseType, TodoTask, TodoTaskItem, TaskItemStatus } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useTodoTaskStore } from '@/stores/todoTask'
import { useOperationLogStore } from '@/stores/operationLog'
import { fetchZones } from '@/api/hierarchy'
import { confirmVisit } from '@/api/household'
import { completeActiveTaskForHousehold, taskStatus } from '@/api/todoTask'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import PublishTaskDialog from '@/components/PublishTaskDialog.vue'
import HouseLocationLink from '@/components/HouseLocationLink.vue'

const authStore = useAuthStore()
const todoTaskStore = useTodoTaskStore()
const opLogStore = useOperationLogStore()
const router = useRouter()

const publishVisible = ref(false)
const zoneName = ref('')

type RowItem = TodoTaskItem & { taskScheduledVisitTime: string; taskRemark: string }

const activeItems = computed<RowItem[]>(() => {
  const out: RowItem[] = []
  for (const t of todoTaskStore.zoneTasks) {
    for (const it of t.items) {
      if (it.status === 'active') {
        out.push({ ...it, taskScheduledVisitTime: t.scheduledVisitTime, taskRemark: t.remark })
      }
    }
  }
  return out
})
const activeCount = computed(() => activeItems.value.length)

const houseTagOf = (t: HouseType) => HOUSE_TAG_MAP[t] || 'info'
const activeNumOf = (t: TodoTask) => t.items.filter(i => i.status === 'active').length
const itemStatusText = (s: TaskItemStatus) => (s === 'active' ? '待走访' : s === 'done' ? '已完成' : '未走访')
const itemTag = (s: TaskItemStatus) => (s === 'active' ? 'primary' : s === 'done' ? 'success' : 'danger')
const taskStatusText = (s: string) => (s === 'active' ? '进行中' : s === 'done' ? '已完成' : '已过期')
const taskTag = (s: string) => (s === 'active' ? 'primary' : s === 'done' ? 'success' : 'danger')

const viewHousehold = (row: RowItem) => {
  router.push({ path: `/unit/${row.unitId}`, query: { roomNo: row.roomNo } })
}

const handleConfirm = async (row: RowItem) => {
  const updated = await confirmVisit(row.unitId, row.householdId)
  await completeActiveTaskForHousehold(row.householdId, updated.lastVisitTime)
  await opLogStore.addLog({
    roomNo: row.roomNo,
    operationType: '确认走访',
    changesDetail: '确认走访完成，住户信息未变更',
    zoneName: row.zoneName,
    communityName: row.communityName,
    unitName: row.unitName,
    unitId: row.unitId
  })
  await refresh()
}

const afterPublish = async () => {
  await refresh()
}

const refresh = async () => {
  if (authStore.isAdmin) {
    await todoTaskStore.refreshAdmin()
  } else if (authStore.userZoneId) {
    await todoTaskStore.refreshZone(authStore.userZoneId)
    await todoTaskStore.refreshBadge(authStore.userZoneId)
  }
}

onMounted(async () => {
  if (!authStore.isAdmin && authStore.userZoneId) {
    const path = await fetchZones()
    zoneName.value = path.find(z => z.id === authStore.userZoneId)?.name ?? ''
  }
  await refresh()
})
</script>

<style scoped>
.tasks-card {
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
.card-sub {
  color: #909399;
  font-size: 13px;
}
.task-items {
  padding: 6px 18px;
}
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.mini-table th, .mini-table td {
  border: 1px solid #ebeef5;
  padding: 6px 8px;
  text-align: left;
}
.mini-table th {
  background: #f5f7fa;
  font-weight: 500;
}
.cell-click {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

</style>



