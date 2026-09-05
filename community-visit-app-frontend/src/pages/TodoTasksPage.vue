<template>
  <div class="tasks-page">
    <el-card shadow="hover" class="tasks-card">
      <template #header>
        <div class="page-header">
          <span class="card-title">📋 待办事项</span>
          <div class="header-right">
            <span v-if="!authStore.isAdmin" class="card-sub">辖区：{{ authStore.currentUser?.zoneId ? zoneName : '' }} · 待走访 {{ userAllActive }} 户</span>
            <el-button v-if="authStore.isAdmin" type="primary" :icon="Plus" @click="publishVisible = true">发布走访任务</el-button>
          </div>
        </div>
      </template>

      <!-- 管理员：我发布的记录 -->
      <template v-if="authStore.isAdmin">
        <!-- 筛选：接收用户 / 责任区 / 状态 / 说明关键词 / 发布时间段 -->
        <div class="filter-row">
          <span class="filter-label">筛选条件：</span>
          <el-input v-model="adminAssignee" placeholder="接收用户（账号/姓名）" clearable class="filter-input" />
          <el-select v-model="adminZoneId" placeholder="全部责任区" clearable class="filter-select">
            <el-option v-for="z in zones" :key="z.id" :label="z.name" :value="z.id" />
          </el-select>
          <el-select v-model="adminStatus" placeholder="全部状态" clearable class="status-select">
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="done" />
            <el-option label="已过期" value="expired" />
          </el-select>
          <el-input v-model="adminRemark" placeholder="说明关键词" clearable class="filter-input" />
          <span class="cond-item">
            <span class="cond-name">发布时间</span>
            <TimeRangeSelect v-model="adminTimeRange" start-placeholder="开始日期" end-placeholder="结束日期" width="240px" />
          </span>
          <el-button :icon="RefreshLeft" @click="resetAdminCond">重置条件</el-button>
        </div>
        <div class="summary">共 {{ filteredAdminTasks.length }} 条发布记录</div>
        <el-table :data="filteredAdminTasks" row-key="id" stripe border>
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
        <el-empty v-if="filteredAdminTasks.length === 0" description="没有符合条件的发布记录" :image-size="70" />
      </template>

      <!-- 普通用户：我接收的任务 -->
      <template v-else>
        <!-- 筛选：关键词 / 房屋类别 / 状态 / 发布时间段 -->
        <div class="filter-row">
          <span class="filter-label">筛选条件：</span>
          <el-input v-model="userKeyword" placeholder="房号 / 房主 / 小区 / 单元 / 说明" clearable class="filter-input" />
          <el-select v-model="userHouseType" placeholder="全部房屋类别" clearable class="house-filter-select">
            <el-option label="自购房" value="自购房" />
            <el-option label="出租房" value="出租房" />
            <el-option label="群租房" value="群租房" />
          </el-select>
          <el-select v-model="userStatus" placeholder="全部状态" clearable class="status-select">
            <el-option label="待走访" value="active" />
            <el-option label="已完成" value="done" />
            <el-option label="未走访" value="expired" />
          </el-select>
          <span class="cond-item">
            <span class="cond-name">发布时间</span>
            <TimeRangeSelect v-model="userTimeRange" start-placeholder="开始日期" end-placeholder="结束日期" width="240px" />
          </span>
          <el-button :icon="RefreshLeft" @click="resetUserCond">重置条件</el-button>
        </div>
        <div class="summary">共 {{ filteredUserItems.length }} 条 · 其中待走访 {{ userFilteredActive }} 条</div>

        <el-table :data="filteredUserItems" row-key="itemId" stripe border v-loading="todoTaskStore.loading">
          <el-table-column label="住户（点击查看）" min-width="250">
            <template #default="{ row }">
              <div class="cell-loc">
                <el-tag :type="itemTag(row.status)" size="small">{{ itemStatusText(row.status) }}</el-tag>
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
          <el-table-column label="上次走访" width="150">
            <template #default="{ row }">{{ row.lastVisitTime || '从未走访' }}</template>
          </el-table-column>
          <el-table-column label="指定走访时间" width="160">
            <template #default="{ row }">
              <b :style="{ color: row.status === 'active' ? '#f56c6c' : '#303133' }">{{ row.taskScheduledVisitTime }}</b>
            </template>
          </el-table-column>
          <el-table-column label="处理时间" width="160">
            <template #default="{ row }">{{ row.visitedAt || row.expiredAt || '—' }}</template>
          </el-table-column>
          <el-table-column prop="taskRemark" label="说明" min-width="110" show-overflow-tooltip />
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="info" size="small" @click="viewHousehold(row)">详情</el-button>
              <el-button v-if="row.status === 'active'" link type="success" size="small" @click="handleConfirm(row)">确认走访</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="filteredUserItems.length === 0" description="没有符合条件的走访任务" :image-size="70" />
      </template>
    </el-card>

    <PublishTaskDialog v-model:visible="publishVisible" @published="afterPublish" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, RefreshLeft } from '@element-plus/icons-vue'
import type { HouseType, TodoTask, TodoTaskItem, TaskItemStatus, TreeNode } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useTodoTaskStore } from '@/stores/todoTask'
import { useOperationLogStore } from '@/stores/operationLog'
import { fetchZones } from '@/api/hierarchy'
import { confirmVisit } from '@/api/household'
import { completeActiveTaskForHousehold, taskStatus } from '@/api/todoTask'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import PublishTaskDialog from '@/components/PublishTaskDialog.vue'
import HouseLocationLink from '@/components/HouseLocationLink.vue'
import TimeRangeSelect, { type DateRange } from '@/components/TimeRangeSelect.vue'

const authStore = useAuthStore()
const todoTaskStore = useTodoTaskStore()
const opLogStore = useOperationLogStore()
const router = useRouter()

const publishVisible = ref(false)
const zoneName = ref('')

// ─── 管理员筛选条件 ────────────────────────────────────
const zones = ref<TreeNode[]>([])
const adminAssignee = ref('')
const adminZoneId = ref('')
const adminStatus = ref('')
const adminRemark = ref('')
const adminTimeRange = ref<DateRange>(null)

const filteredAdminTasks = computed(() => {
  const list = todoTaskStore.adminTasks
  const kwUser = adminAssignee.value.trim().toLowerCase()
  const kwRemark = adminRemark.value.trim().toLowerCase()
  return list.filter(t => {
    if (kwUser && !t.assigneeUsername.toLowerCase().includes(kwUser)) return false
    if (adminZoneId.value && t.zoneId !== adminZoneId.value) return false
    if (adminStatus.value && taskStatus(t) !== adminStatus.value) return false
    if (kwRemark && !(t.remark || '').toLowerCase().includes(kwRemark)) return false
    if (adminTimeRange.value) {
      const d = (t.createdAt || '').slice(0, 10)
      if (!d || d < adminTimeRange.value[0] || d > adminTimeRange.value[1]) return false
    }
    return true
  })
})

const resetAdminCond = () => {
  adminAssignee.value = ''
  adminZoneId.value = ''
  adminStatus.value = ''
  adminRemark.value = ''
  adminTimeRange.value = null
}

type RowItem = TodoTaskItem & { taskScheduledVisitTime: string; taskCreatedAt: string; taskRemark: string }

const allItems = computed<RowItem[]>(() => {
  const out: RowItem[] = []
  for (const t of todoTaskStore.zoneTasks) {
    for (const it of t.items) {
      out.push({ ...it, taskScheduledVisitTime: t.scheduledVisitTime, taskCreatedAt: t.createdAt, taskRemark: t.remark })
    }
  }
  return out
})

/** 全部任务中处于待走访的数量（不受筛选影响，用于头部提示） */
const userAllActive = computed(() => allItems.value.filter(i => i.status === 'active').length)

// ─── 普通用户筛选条件 ────────────────────────────────────
const userKeyword = ref('')
const userHouseType = ref('')
const userStatus = ref('active')
const userTimeRange = ref<DateRange>(null)

const filteredUserItems = computed<RowItem[]>(() => {
  const kw = userKeyword.value.trim().toLowerCase()
  return allItems.value.filter(i => {
    if (userStatus.value && i.status !== userStatus.value) return false
    if (userHouseType.value && i.houseType !== userHouseType.value) return false
    if (kw) {
      const hay = `${i.zoneName} ${i.communityName} ${i.unitName} ${i.roomNo} ${i.landlord} ${i.taskRemark || ''}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    if (userTimeRange.value) {
      const d = (i.taskCreatedAt || '').slice(0, 10)
      if (!d || d < userTimeRange.value[0] || d > userTimeRange.value[1]) return false
    }
    return true
  })
})

const userFilteredActive = computed(() => filteredUserItems.value.filter(i => i.status === 'active').length)

const resetUserCond = () => {
  userKeyword.value = ''
  userHouseType.value = ''
  userStatus.value = ''
  userTimeRange.value = null
}

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
  const allZones = await fetchZones()
  zones.value = allZones
  if (!authStore.isAdmin && authStore.userZoneId) {
    zoneName.value = allZones.find(z => z.id === authStore.userZoneId)?.name ?? ''
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
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}
.filter-label {
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}
.filter-input {
  width: 180px;
}
.filter-select {
  width: 170px;
}
.status-select {
  width: 130px;
}
.house-filter-select {
  width: 150px;
}
.cell-loc {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cond-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cond-name {
  color: #909399;
  font-size: 13px;
  white-space: nowrap;
}
.summary {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
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









