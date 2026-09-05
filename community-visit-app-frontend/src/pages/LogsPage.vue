<template>
  <div class="logs-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <span class="card-title">📝 操作记录</span>
          <el-tag v-if="zoneTag" type="primary" size="small" effect="plain">当前辖区：{{ zoneTag }}</el-tag>
        </div>
      </template>

      <!-- 筛选：时间段 / 操作类型 / 区域 -->
      <div class="filter-row">
        <span class="filter-label">筛选条件：</span>
        <span class="cond-item">
          <span class="cond-name">操作时间</span>
          <TimeRangeSelect v-model="timeRange" start-placeholder="开始日期" end-placeholder="结束日期" width="240px" />
        </span>
        <span class="cond-item">
          <span class="cond-name">操作类型</span>
          <el-select v-model="opType" placeholder="全部类型" clearable class="type-select" @change="onCondChange">
            <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </span>
        <el-button :icon="RefreshLeft" @click="resetCond">重置条件</el-button>
      </div>

      <div class="filter-row scope-row">
        <span class="filter-label">查看范围：</span>
        <el-tag v-if="zoneLocked" type="primary" size="small" effect="plain">当前辖区：{{ currentZoneName }}</el-tag>
        <el-select v-model="zoneId" placeholder="全部责任区" clearable class="scope-select" :disabled="zoneLocked" @change="handleZoneChange">
          <el-option v-for="z in zonesOptions" :key="z.id" :label="z.name" :value="z.id" />
        </el-select>
        <el-select v-model="communityId" placeholder="全部小区" clearable class="scope-select" :disabled="!zoneId" @change="handleCommunityChange">
          <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="unitId" placeholder="全部单元" clearable class="scope-select" :disabled="!communityId" @change="onCondChange">
          <el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </div>

      <div class="summary">共 {{ visibleLogs.length }} 条操作记录 </div>
      <OperationLogPanel :logs="visibleLogs" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RefreshLeft } from '@element-plus/icons-vue'
import { useOperationLogStore } from '@/stores/operationLog'
import { useAuthStore } from '@/stores/auth'
import { fetchZones, fetchCommunities, fetchUnits, fetchNodePath } from '@/api/hierarchy'
import type { OperationLog, TreeNode } from '@/types'
import TimeRangeSelect, { type DateRange } from '@/components/TimeRangeSelect.vue'
import OperationLogPanel from '@/components/OperationLog.vue'

const opLogStore = useOperationLogStore()
const authStore = useAuthStore()

const zones = ref<TreeNode[]>([])
const communities = ref<TreeNode[]>([])
const units = ref<TreeNode[]>([])
const zoneId = ref('')
const communityId = ref('')
const unitId = ref('')

const timeRange = ref<DateRange>(null)
const opType = ref('')
const zoneTag = ref('')

const typeOptions = ['变更信息', '确认走访', '用户管理', '待办事项']

const zoneLocked = computed(() => !authStore.isAdmin && !!authStore.userZoneId)
const zonesOptions = computed(() => (zoneLocked.value && authStore.userZoneId ? zones.value.filter(z => z.id === authStore.userZoneId) : zones.value))
const currentZoneName = computed(() => zones.value.find(z => z.id === zoneId.value)?.name ?? zoneTag.value)

const inRange = (dateStr: string | undefined, range: DateRange): boolean => {
  if (!range || !dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= range[0] && d <= range[1]
}

const visibleLogs = computed<OperationLog[]>(() => {
  const zName = zoneLocked.value ? zoneTag.value : (currentZoneName.value || '')
  const cName = communities.value.find(x => x.id === communityId.value)?.name ?? ''
  const uName = units.value.find(x => x.id === unitId.value)?.name ?? ''
  return opLogStore.logs.filter(l => {
    if (zoneLocked.value && (!l.zoneName || l.zoneName !== zoneTag.value)) return false
    if (!zoneLocked.value && zName && l.zoneName !== zName) return false
    if (cName && l.communityName !== cName) return false
    if (uName && l.unitName !== uName) return false
    if (opType.value && l.operationType !== opType.value) return false
    if (timeRange.value && !inRange(l.operatedAt, timeRange.value)) return false
    return true
  })
})

const onCondChange = () => { /* 条件驱动 computed 实时过滤 */ }
const resetCond = () => {
  timeRange.value = null
  opType.value = ''
}

const handleZoneChange = async (id: string) => {
  zoneId.value = id ?? ''
  communityId.value = ''
  unitId.value = ''
  communities.value = zoneId.value ? await fetchCommunities(zoneId.value) : []
  units.value = []
}

const handleCommunityChange = async (id: string) => {
  communityId.value = id ?? ''
  unitId.value = ''
  units.value = communityId.value ? await fetchUnits(communityId.value) : []
}

onMounted(async () => {
  zones.value = await fetchZones()
  await opLogStore.loadLogs()
  if (!authStore.isAdmin && authStore.userZoneId) {
    const path = await fetchNodePath(authStore.userZoneId)
    zoneTag.value = path[path.length - 1]?.name ?? ''
    zoneId.value = authStore.userZoneId
    communities.value = await fetchCommunities(authStore.userZoneId)
  }
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
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
.scope-row {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}
.filter-label {
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
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
.type-select {
  width: 140px;
}
.scope-select {
  width: 180px;
}
.summary {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
}
</style>

