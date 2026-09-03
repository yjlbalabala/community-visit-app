<template>
  <div class="unit-page">
    <el-card shadow="hover" class="chart-card">
      <template #header>
        <div class="level-header">
          <span class="card-title">🏘️ {{ unitName }} · 住户可视化</span>
          <span class="card-sub">
            {{ householdStore.list.length }} 户 ·
            待走访 {{ householdStore.todoList.length }} 条
            <el-button link type="primary" size="small" @click="goTodos">查看待办 →</el-button>
          </span>
        </div>
      </template>
      <div ref="chartRef" class="echarts-box"></div>
    </el-card>

    <!-- 房屋详情抽屉 -->
    <HouseDetailDrawer
      v-model:visible="drawerVisible"
      :household="selectedHousehold"
      @edit="handleDrawerEdit"
      @confirm-visit="handleDrawerConfirm"
      @view-persons="handleViewPersons"
    />

    <!-- 人员管理弹窗 -->
    <PersonListDialog
      v-model:visible="personListVisible"
      :household="selectedHousehold"
      :location-label="personLocationLabel"
      @person-save="handlePersonSave"
      @person-remove="handlePersonRemove"
    />

    <!-- 编辑对话框 -->
    <HouseEditDialog
      v-model:visible="dialogVisible"
      :household="editingHousehold"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import type { Household, Person } from '@/types'
import { useHouseholdStore } from '@/stores/household'
import { useOperationLogStore } from '@/stores/operationLog'
import { useHierarchyStore } from '@/stores/hierarchy'
import { householdColor } from '@/utils/houseColor'
import HouseDetailDrawer from '@/components/HouseDetailDrawer.vue'
import HouseEditDialog from '@/components/HouseEditDialog.vue'
import PersonListDialog from '@/components/PersonListDialog.vue'

// ─── 路由 & Stores ───────────────────────────────────────
const route = useRoute()
const router = useRouter()

const householdStore = useHouseholdStore()
const opLogStore = useOperationLogStore()
const hierarchyStore = useHierarchyStore()

const unitName = computed(() => hierarchyStore.currentNode?.name ?? '单元')

/** 当前单元在街道下的完整位置（责任区/小区/单元名） */
const locOf = () => {
  const p = hierarchyStore.path
  return {
    zoneName: p.find(n => n.nodeType === 'zone')?.name,
    communityName: p.find(n => n.nodeType === 'community')?.name,
    unitName: p.find(n => n.nodeType === 'unit')?.name
  }
}

/** 人员弹窗定位文案：责任区 · 小区 · 楼栋 · 房号 */
const personLocationLabel = computed(() => {
  const names = hierarchyStore.path.slice(1).map(n => n.name)
  const room = selectedHousehold.value?.roomNo
  return [...names, room].filter(Boolean).join(' · ')
})

/** 查看待办 → 进入当前单元范围内的待办 */
const goTodos = () => {
  const uid = route.params.unitId as string
  router.push({ path: '/todos', query: { unitId: uid } })
}

// ─── ECharts ───────────────────────────────────────────
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

const renderChart = () => {
  if (!chartInstance) return
  const data = householdStore.list
  if (data.length === 0) return

  const cellWidth = 76
  const cellHeight = 34
  const gapX = 12
  const gapY = 6

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data as Household
        const over = d.persons.length > 8 ? '（超 8 人）' : ''
        return `
          <div><b>${d.roomNo}</b><span style="color:#f56c6c;">${over}</span></div>
          <div>房屋类别：${d.houseType}</div>
          <div>居住人数：${d.persons.length} 人</div>
          <div>房主：${d.landlord}</div>
          <div>电话：${d.phone || '—'}</div>
          <div>上次走访：${d.lastVisitTime || '从未走访'}</div>
        `
      }
    },
    xAxis: { show: false, min: 0, max: 1000 },
    yAxis: { show: false, min: 0, max: 800 },
    grid: { left: 0, top: 0, right: 0, bottom: 0 },
    series: [{
      type: 'custom',
      renderItem: (_params, _api) => {
        const item = data[_params.dataIndex]
        if (!item) return null
        const { floor, door } = item

        const x = (door - 1) * (cellWidth + gapX)
        const y = (floor - 1) * (cellHeight + gapY)

        return {
          type: 'group',
          children: [
            {
              type: 'rect',
              shape: { x, y, width: cellWidth, height: cellHeight },
              style: {
                fill: householdColor(item),
                stroke: '#fff',
                lineWidth: 2
              }
            },
            {
              type: 'text',
              style: {
                x: x + cellWidth / 2,
                y: y + cellHeight / 2,
                text: item.roomNo,
                fill: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
                textVerticalAlign: 'middle'
              }
            }
          ]
        } as any
      },
      data
    }]
  }

  chartInstance.setOption(option, true)
}

const initChart = async () => {
  await nextTick()
  await nextTick()

  if (!chartRef.value) {
    console.error('ECharts 容器 DOM 不存在')
    return
  }

  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)

  renderChart()

  resizeHandler = () => chartInstance?.resize()
  window.addEventListener('resize', resizeHandler)

  // 点击事件：打开房屋详情抽屉
  chartInstance.on('click', (params: any) => {
    if (params.data && params.data.id) {
      openDrawer(params.data as Household)
    }
  })
}

// 数据变化 → 重绘
watch(() => householdStore.list, () => {
  nextTick(() => renderChart())
}, { deep: true })

// ─── 抽屉 & 编辑对话框 ──────────────────────────────────
const drawerVisible = ref(false)
const personListVisible = ref(false)
const dialogVisible = ref(false)
const selectedHousehold = ref<Household | null>(null)
const editingHousehold = ref<Household | null>(null)

const openDrawer = (h: Household) => {
  selectedHousehold.value = h
  drawerVisible.value = true
}

/** 从抽屉打开「详细信息」→ 大号人员管理弹窗 */
const handleViewPersons = (h: Household) => {
  selectedHousehold.value = h
  personListVisible.value = true
}

/** 抽屉/人员操作后，若抽屉仍打开则同步最新对象 */
const syncSelected = (updated: Household) => {
  if (drawerVisible.value && selectedHousehold.value?.id === updated.id) {
    selectedHousehold.value = updated
  }
}

const handleDrawerEdit = (h: Household) => {
  drawerVisible.value = false
  editingHousehold.value = h
  dialogVisible.value = true
}

const handleDrawerConfirm = async (h: Household) => {
  const updated = await householdStore.confirmVisit(h.id)
  syncSelected(updated)
  await opLogStore.addLog({
    roomNo: h.roomNo,
    operationType: '确认走访',
    changesDetail: '确认走访完成，住户信息未变更',
    ...locOf()
  })
}

const diffText = (oldH: Household, data: Partial<Household>): string => {
  const changed: string[] = []
  const keys: (keyof Household)[] = ['houseType', 'landlord', 'phone', 'remark']
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== oldH[key]) {
      changed.push(`${key}: ${oldH[key] || '—'} → ${data[key]}`)
    }
  }
  return changed.length > 0 ? changed.join('；') : '无字段变更'
}

const handleSave = async (householdId: string, data: Partial<Household>) => {
  const old = householdStore.findByHouseholdId(householdId)
  if (!old) return
  const changed = diffText(old, data)

  const updated = await householdStore.updateHousehold(householdId, data)
  syncSelected(updated)
  await opLogStore.addLog({
    roomNo: old.roomNo,
    operationType: '变更信息',
    changesDetail: changed.length > 0 ? changed : '无字段变更',
    ...locOf()
  })
}

// ─── 人员 增删改查 ─────────────────────────────────────
const handlePersonSave = async (householdId: string, person: Person) => {
  const updated = person.id
    ? await householdStore.updatePerson(householdId, person)
    : await householdStore.addPerson(householdId, {
        name: person.name,
        gender: person.gender,
        idCard: person.idCard,
        phone: person.phone,
        personType: person.personType
      })
  syncSelected(updated)
}

const handlePersonRemove = async (householdId: string, personId: string) => {
  const updated = await householdStore.removePerson(householdId, personId)
  syncSelected(updated)
}

// ─── 生命周期 ──────────────────────────────────────────
const openRoomDrawer = (roomNo: string) => {
  const h = householdStore.findByRoomNo(roomNo)
  if (h) openDrawer(h)
}

/** 进入某单元并加载该单元住户（roomNo 存在时自动打开该户详情） */
const enterUnit = async (uid: string, roomNo?: string) => {
  await hierarchyStore.enterLevel('unit', uid)
  await householdStore.loadList(uid)
  await initChart()
  if (roomNo) openRoomDrawer(roomNo)
}

onMounted(() => {
  enterUnit(route.params.unitId as string, route.query.roomNo as string | undefined)
})

// 单元或定位房号变化时（如同一页面内 /unit/A?room=1 → /unit/B?room=2）重新加载
watch(
  () => [route.params.unitId, route.query.roomNo],
  () => {
    enterUnit(route.params.unitId as string, route.query.roomNo as string | undefined)
  }
)

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})
</script>

<style scoped>
.unit-page {
  min-height: 600px;
}
.chart-card {
  display: flex;
  flex-direction: column;
}
.chart-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-title {
  font-weight: 600;
}
.card-sub {
  color: #909399;
  font-size: 13px;
}
.level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.echarts-box {
  width: 100%;
  height: 540px;
}
</style>



