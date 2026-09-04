<template>
  <div class="todos-page">
    <el-card shadow="hover" class="todos-card">
      <template #header>
        <div class="page-header">
          <span class="card-title">📋 待办事项</span>
          <span class="card-sub">{{ scopeText }} · 共 {{ todoStore.items.length }} 条</span>
        </div>
      </template>

      <!-- 范围筛选：责任区 → 小区 → 单元 -->
      <div class="scope-bar">
        <span class="scope-label">查看范围：</span>
        <el-tag v-if="zoneLocked" type="primary" size="small" effect="plain">当前辖区：{{ scopeZoneName }}</el-tag>
        <el-select v-model="zoneId" placeholder="选择责任区" class="scope-select" :disabled="zoneLocked" @change="handleZoneChange">
          <el-option v-for="z in zonesOptions" :key="z.id" :label="z.name" :value="z.id" />
        </el-select>
        <el-select
          v-model="communityId"
          placeholder="全部小区"
          clearable
          class="scope-select"
          :disabled="!zoneId"
          @change="handleCommunityChange"
        >
          <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select
          v-model="unitId"
          placeholder="全部单元"
          clearable
          class="scope-select"
          :disabled="!communityId"
          @change="reload"
        >
          <el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
        <el-button :icon="Refresh" @click="reload">刷新</el-button>
      </div>

      <div v-loading="todoStore.loading" class="todos-body">
        <el-empty
          v-if="!todoStore.loading && pagedItems.length === 0"
          description="该范围内暂无到期待办"
          :image-size="80"
        />
        <template v-else>
          <el-table :data="pagedItems" stripe border class="todos-table">
            <el-table-column label="范围（点击查看该户）" min-width="230">
              <template #default="{ row }">
                <div class="cell-loc clickable" @click="viewHousehold(row)" title="点击进入该户单元格视图">
                  <span class="loc-link">{{ row.zoneName }} · {{ row.communityName }} · {{ row.unitName }}</span>
                  <el-tag type="danger" size="small">{{ row.roomNo }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="房屋类别" width="100">
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
                <b style="color:#f56c6c">{{ row.expectedVisitTime || '—' }}</b>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="情况说明" min-width="180" show-overflow-tooltip />
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <el-button link type="info" size="small" @click.stop="viewHousehold(row)">查看</el-button>
                <el-button link type="primary" size="small" @click="handleEdit(row)">变更信息</el-button>
                <el-button link type="success" size="small" @click="handleConfirm(row)">确认走访</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row" v-if="todoStore.items.length > pageSize">
            <PaginationBar
              :total="todoStore.items.length"
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
import { Refresh } from '@element-plus/icons-vue'
import type { HouseType, Household, TreeNode } from '@/types'
import { STREET_ID, fetchZones, fetchCommunities, fetchUnits, fetchNodePath } from '@/api/hierarchy'
import { fetchHousehold, updateHousehold, confirmVisit } from '@/api/household'
import type { TodoItem } from '@/api/todo'
import { useTodoStore } from '@/stores/todo'
import { useAuthStore } from '@/stores/auth'
import { useOperationLogStore } from '@/stores/operationLog'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import PaginationBar from '@/components/PaginationBar.vue'
import HouseEditDialog from '@/components/HouseEditDialog.vue'

const todoStore = useTodoStore()
const opLogStore = useOperationLogStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

/** 普通用户：责任区锁定为自己管辖的区 */
const zoneLocked = computed(() => !authStore.isAdmin && !!authStore.userZoneId)
const zonesOptions = computed(() => (zoneLocked.value && authStore.userZoneId ? zones.value.filter(z => z.id === authStore.userZoneId) : zones.value))

// ─── 范围状态 ─────────────────────────────────────────
const zones = ref<TreeNode[]>([])
const communities = ref<TreeNode[]>([])
const units = ref<TreeNode[]>([])
const zoneId = ref('')
const communityId = ref('')
const unitId = ref('')

const currentPage = ref(1)
const pageSize = ref(10)

const scope = computed<{ nodeType: 'street' | 'zone' | 'community' | 'unit'; id: string }>(() => {
  if (unitId.value) return { nodeType: 'unit', id: unitId.value }
  if (communityId.value) return { nodeType: 'community', id: communityId.value }
  if (zoneId.value) return { nodeType: 'zone', id: zoneId.value }
  return { nodeType: 'street', id: STREET_ID }
})

const scopeZoneName = computed(() => zones.value.find(x => x.id === zoneId.value)?.name ?? '')

const scopeText = computed(() => {
  const z = zones.value.find(x => x.id === zoneId.value)?.name
  const c = communities.value.find(x => x.id === communityId.value)?.name
  const u = units.value.find(x => x.id === unitId.value)?.name
  return [z, c, u].filter(Boolean).join(' · ') || '西岗街道'
})

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return todoStore.items.slice(start, start + pageSize.value)
})

const houseTag = (t: HouseType) => HOUSE_TAG_MAP[t] || 'info'

// ─── 加载与刷新 ───────────────────────────────────────
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

const handleCommunityChange = async (id: string) => {
  communityId.value = id ?? ''
  unitId.value = ''
  units.value = communityId.value ? await fetchUnits(communityId.value) : []
  await reload()
}

onMounted(async () => {
  zones.value = await fetchZones()

  // 从单元页「查看待办」进入：预选到该单元范围（对管理员与辖区内的普通用户都生效）
  const qUnitId = typeof route.query.unitId === 'string' ? route.query.unitId : ''
  if (qUnitId) {
    const path = await fetchNodePath(qUnitId)
    const zone = path.find(n => n.nodeType === 'zone')
    const community = path.find(n => n.nodeType === 'community')
    const unit = path.find(n => n.nodeType === 'unit')
    const zoneOk = authStore.isAdmin || (!!authStore.userZoneId && !!zone && zone.id === authStore.userZoneId)
    if (zoneOk && zone) {
      zoneId.value = zone.id
      communities.value = await fetchCommunities(zone.id)
      if (community) {
        communityId.value = community.id
        units.value = await fetchUnits(community.id)
      }
      if (unit) unitId.value = unit.id
      await reload()
      return
    }
  }

  // 普通用户：责任区锁定为自己管辖的区
  if (zoneLocked.value && authStore.userZoneId) {
    const mine = authStore.userZoneId
    zoneId.value = mine
    communities.value = await fetchCommunities(mine)
    await reload()
    return
  }

  if (zones.value[0]) {
    await handleZoneChange(zones.value[0].id)
  } else {
    await reload()
  }
})

/** 跳转到该户所在单元的单元格视图（自动定位该户） */
const viewHousehold = (item: TodoItem) => {
  router.push({ path: `/unit/${item.unitId}`, query: { roomNo: item.roomNo } })
}

// ─── 处理待办 ─────────────────────────────────────────
const editDialogVisible = ref(false)
const editingHousehold = ref<Household | null>(null)
const editingItem = ref<TodoItem | null>(null)

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

  // 仅变更住户信息，不重置走访时间：待办仍保留，须「确认走访」成功后才移除
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
.todos-card {
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
.scope-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.scope-label {
  color: #606266;
  font-weight: 500;
}
.scope-select {
  width: 200px;
}
.todos-body {
  min-height: 320px;
}
.todos-table {
  width: 100%;
}
.cell-loc {
  display: flex;
  align-items: center;
  gap: 8px;
}
.clickable {
  cursor: pointer;
}
.loc-link:hover {
  color: #409eff;
  text-decoration: underline;
}
.pagination-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>






