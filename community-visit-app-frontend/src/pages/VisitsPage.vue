<template>
  <div class="visits-page">
    <el-card shadow="hover" class="visits-card">
      <template #header>
        <div class="page-header">
          <span class="card-title">📋 走访信息</span>
          <span class="card-sub">
            {{ scopeText }} · 共 {{ total }} 户，其中待走访 <b style="color:#f56c6c">{{ dueCount }}</b> 户
          </span>
        </div>
      </template>

      <!-- 范围筛选：责任区 → 小区 → 单元 -->
      <div class="filter-row">
        <span class="filter-label">查看范围：</span>
        <el-tag v-if="zoneLocked" type="primary" size="small" effect="plain">当前辖区：{{ scopeZoneName }}</el-tag>
        <el-select v-model="zoneId" placeholder="选择责任区" class="filter-select" :disabled="zoneLocked" @change="handleZoneChange">
          <el-option v-for="z in zonesOptions" :key="z.id" :label="z.name" :value="z.id" />
        </el-select>
        <el-select v-model="communityId" placeholder="全部小区" clearable class="filter-select" :disabled="!zoneId" @change="handleScopeChange">
          <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="unitId" placeholder="全部单元" clearable class="filter-select" :disabled="!communityId" @change="reload">
          <el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </div>

      <!-- 条件筛选：上次走访/预计走访时间段 + 房屋类别 -->
      <div class="filter-row cond-row">
        <span class="filter-label">筛选条件：</span>
        <span class="cond-item">
          <span class="cond-name">上次走访</span>
          <TimeRangeSelect v-model="lastRange" start-placeholder="开始日期" end-placeholder="结束日期" width="240px" />
        </span>
        <span class="cond-item">
          <span class="cond-name">预计走访</span>
          <TimeRangeSelect v-model="expectedRange" start-placeholder="开始日期" end-placeholder="结束日期" width="240px" />
        </span>
        <span class="cond-item">
          <span class="cond-name">房屋类别</span>
          <el-select v-model="houseType" placeholder="全部类别" clearable class="house-select" @change="onCondChange">
            <el-option label="自购房" value="自购房" />
            <el-option label="出租房" value="出租房" />
            <el-option label="群租房" value="群租房" />
          </el-select>
        </span>
        <el-button :icon="RefreshLeft" @click="resetCond">重置条件</el-button>
      </div>

      <div v-loading="todoStore.loading" class="table-body">
        <el-empty v-if="!todoStore.loading && filteredItems.length === 0" description="该范围内没有符合条件的走访信息" :image-size="80" />
        <template v-else>
          <el-table :data="pagedItems" stripe border class="visit-table">
            <el-table-column label="住户（点击查看）" min-width="240">
              <template #default="{ row }">
                <div class="cell-loc clickable" @click="viewHousehold(row)" title="进入该户单元格视图">
                  <el-tag v-if="row.due" type="danger" size="small" class="due-tag">待走访</el-tag>
                  <span class="loc-link">{{ row.zoneName }} · {{ row.communityName }} · {{ row.unitName }}</span>
                  <span class="room-no">{{ row.roomNo }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="房屋类别" width="92">
              <template #default="{ row }">
                <el-tag :type="houseTag(row.houseType)" size="small">{{ row.houseType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="房主 / 人数" width="150">
              <template #default="{ row }">
                <div>{{ row.landlord }}（{{ row.personsCount }} 人）</div>
              </template>
            </el-table-column>
            <el-table-column label="上次走访" width="160">
              <template #default="{ row }">{{ row.lastVisitTime || '从未走访' }}</template>
            </el-table-column>
            <el-table-column label="预计走访" width="160">
              <template #default="{ row }">
                <b :style="{ color: row.due ? '#f56c6c' : '#303133' }">{{ row.expectedVisitTime || '—' }}</b>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="情况说明" min-width="160" show-overflow-tooltip />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="info" size="small" @click.stop="viewHousehold(row)">查看</el-button>
                <el-button link type="primary" size="small" @click="handleEdit(row)">变更信息</el-button>
                <el-button link type="success" size="small" @click="handleConfirm(row)">确认走访</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row" v-if="filteredItems.length > pageSize">
            <PaginationBar
              :total="filteredItems.length"
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50]"
            />
          </div>
        </template>
      </div>
    </el-card>

    <HouseEditDialog
      v-model:visible="editDialogVisible"
      :household="editingHousehold"
      @save="handleEditSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshLeft } from '@element-plus/icons-vue'
import type { HouseType, Household, TreeNode } from '@/types'
import { STREET_ID, fetchZones, fetchCommunities, fetchUnits, fetchNodePath } from '@/api/hierarchy'
import { fetchHousehold, updateHousehold, confirmVisit } from '@/api/household'
import type { TodoItem } from '@/api/todo'
import { useTodoStore } from '@/stores/todo'
import { useOperationLogStore } from '@/stores/operationLog'
import { useAuthStore } from '@/stores/auth'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import PaginationBar from '@/components/PaginationBar.vue'
import TimeRangeSelect, { type DateRange } from '@/components/TimeRangeSelect.vue'
import HouseEditDialog from '@/components/HouseEditDialog.vue'

const todoStore = useTodoStore()
const opLogStore = useOperationLogStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const zones = ref<TreeNode[]>([])
const communities = ref<TreeNode[]>([])
const units = ref<TreeNode[]>([])
const zoneId = ref('')
const communityId = ref('')
const unitId = ref('')

// 筛选条件
const lastRange = ref<DateRange>(null)
const expectedRange = ref<DateRange>(null)
const houseType = ref('')

const currentPage = ref(1)
const pageSize = ref(10)

// ─── 角色/辖区 ────────────────────────────────────────
const zoneLocked = computed(() => !authStore.isAdmin && !!authStore.userZoneId)
const zonesOptions = computed(() => (zoneLocked.value && authStore.userZoneId ? zones.value.filter(z => z.id === authStore.userZoneId) : zones.value))
const scopeZoneName = computed(() => zones.value.find(x => x.id === zoneId.value)?.name ?? '')
const scopeText = computed(() => {
  const c = communities.value.find(x => x.id === communityId.value)?.name
  const u = units.value.find(x => x.id === unitId.value)?.name
  return [scopeZoneName.value, c, u].filter(Boolean).join(' · ') || '西岗街道'
})

const scope = computed<{ nodeType: 'street' | 'zone' | 'community' | 'unit'; id: string }>(() => {
  if (unitId.value) return { nodeType: 'unit', id: unitId.value }
  if (communityId.value) return { nodeType: 'community', id: communityId.value }
  if (zoneId.value) return { nodeType: 'zone', id: zoneId.value }
  return { nodeType: 'street', id: STREET_ID }
})

const houseTag = (t: HouseType) => HOUSE_TAG_MAP[t] || 'info'

// ─── 过滤 + 分页 ──────────────────────────────────────
const inRange = (dateStr: string | null | undefined, range: DateRange): boolean => {
  if (!range || !dateStr) return false
  const d = dateStr.slice(0, 10)
  return d >= range[0] && d <= range[1]
}

const filteredItems = computed(() => {
  const list = todoStore.items
  return list.filter(item => {
    if (houseType.value && item.houseType !== houseType.value) return false
    if (lastRange.value && !inRange(item.lastVisitTime, lastRange.value)) return false
    if (expectedRange.value && !inRange(item.expectedVisitTime, expectedRange.value)) return false
    return true
  })
})

const total = computed(() => filteredItems.value.length)
const dueCount = computed(() => filteredItems.value.filter(i => i.due).length)

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

const onCondChange = () => { currentPage.value = 1 }
const resetCond = () => {
  lastRange.value = null
  expectedRange.value = null
  houseType.value = ''
  currentPage.value = 1
}

// ─── 加载 ─────────────────────────────────────────────
const reload = async () => {
  currentPage.value = 1
  await todoStore.load(scope.value)
}

const handleZoneChange = async (id: string) => {
  zoneId.value = id
  communityId.value = ''
  unitId.value = ''
  communities.value = id ? await fetchCommunities(id) : []
  units.value = []
  await reload()
}

const handleScopeChange = async (id: string) => {
  communityId.value = id ?? ''
  unitId.value = ''
  units.value = communityId.value ? await fetchUnits(communityId.value) : []
  await reload()
}

onMounted(async () => {
  zones.value = await fetchZones()

  // 普通用户：责任区锁定为自己管辖的区
  if (zoneLocked.value && authStore.userZoneId) {
    zoneId.value = authStore.userZoneId
    communities.value = await fetchCommunities(authStore.userZoneId)
    await reload()
    return
  }

  // 从单元页「走访信息」进入：预选到该单元范围
  const qUnitId = typeof route.query.unitId === 'string' ? route.query.unitId : ''
  if (qUnitId) {
    const path = await fetchNodePath(qUnitId)
    const zone = path.find(n => n.nodeType === 'zone')
    const community = path.find(n => n.nodeType === 'community')
    const unit = path.find(n => n.nodeType === 'unit')
    if (zone) {
      zoneId.value = zone.id
      communities.value = await fetchCommunities(zone.id)
    }
    if (community) {
      communityId.value = community.id
      units.value = await fetchUnits(community.id)
    }
    if (unit) unitId.value = unit.id
    await reload()
    return
  }

  if (zones.value[0]) {
    await handleZoneChange(zones.value[0].id)
  } else {
    await reload()
  }
})

// ─── 查看/处理 ────────────────────────────────────────
const viewHousehold = (item: TodoItem) => {
  router.push({ path: `/unit/${item.unitId}`, query: { roomNo: item.roomNo } })
}

const handleConfirm = async (item: TodoItem) => {
  await confirmVisit(item.unitId, item.householdId)
  await opLogStore.addLog({
    roomNo: item.roomNo,
    operationType: '确认走访',
    changesDetail: '确认走访完成，住户信息未变更',
    zoneName: item.zoneName,
    communityName: item.communityName,
    unitName: item.unitName
  })
  await reload()
}

const editDialogVisible = ref(false)
const editingHousehold = ref<Household | null>(null)
const editingItem = ref<TodoItem | null>(null)

const handleEdit = async (item: TodoItem) => {
  editingItem.value = item
  editingHousehold.value = await fetchHousehold(item.unitId, item.householdId)
  editDialogVisible.value = true
}

const handleEditSave = async (householdId: string, data: Partial<Household>) => {
  const item = editingItem.value
  if (!item) return
  const old = editingHousehold.value
  if (!old) return

  const changed: string[] = []
  const keys: (keyof Household)[] = ['houseType', 'landlord', 'phone', 'remark']
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== old[key]) {
      changed.push(`${key}: ${old[key] || '—'} → ${data[key]}`)
    }
  }

  // 仅变更住户信息，不重置走访时间；待走访须「确认走访」成功后才移除
  await updateHousehold(item.unitId, householdId, data)
  await opLogStore.addLog({
    roomNo: item.roomNo,
    operationType: '变更信息',
    changesDetail: changed.length > 0 ? changed.join('；') : '无字段变更',
    zoneName: item.zoneName,
    communityName: item.communityName,
    unitName: item.unitName
  })
  editDialogVisible.value = false
  await reload()
}
</script>

<style scoped>
.visits-card {
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
  margin-bottom: 12px;
}
.cond-row {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}
.filter-label {
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}
.filter-select {
  width: 180px;
}
.house-select {
  width: 130px;
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
.table-body {
  min-height: 300px;
}
.visit-table {
  width: 100%;
}
.cell-loc {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.clickable {
  cursor: pointer;
}
.loc-link:hover {
  color: #409eff;
  text-decoration: underline;
}
.due-tag {
  flex-shrink: 0;
}
.room-no {
  font-weight: 600;
}
.pagination-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
