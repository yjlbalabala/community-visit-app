<template>
  <div class="unit-shell">
    <div class="unit-body">
      <!-- 左侧导航 -->
      <SideNav v-model:active="activeTab" />

      <!-- 中间内容区 -->
      <main class="content-area">
        <!-- 住户可视化 -->
        <div v-show="activeTab === 'chart'" class="tab-content chart-tab">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="level-header">
                <span class="card-title">🏘️ {{ unitName }} · 住户可视化</span>
                <span class="card-sub">{{ householdStore.list.length }} 户</span>
              </div>
            </template>
            <div ref="chartRef" class="echarts-box"></div>
          </el-card>
        </div>

        <!-- 待办事项 -->
        <div v-show="activeTab === 'todos'" class="tab-content">
          <TodoPanel
            :todo-list="householdStore.todoList"
            @edit="handleTodoEdit"
            @confirm="handleTodoConfirm"
          />
        </div>

        <!-- 操作记录 -->
        <div v-show="activeTab === 'logs'" class="tab-content">
          <OperationLog :logs="opLogStore.logs" />
        </div>
      </main>
    </div>

    <!-- 房屋详情抽屉 -->
    <HouseDetailDrawer
      v-model:visible="drawerVisible"
      :household="selectedHousehold"
      @edit="handleDrawerEdit"
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
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import type { Household, Person } from '@/types'
import { useHouseholdStore } from '@/stores/household'
import { useOperationLogStore } from '@/stores/operationLog'
import { useHierarchyStore } from '@/stores/hierarchy'
import { householdColor } from '@/utils/houseColor'
import type { NavTab } from '@/components/SideNav.vue'
import SideNav from '@/components/SideNav.vue'
import TodoPanel from '@/components/TodoPanel.vue'
import OperationLog from '@/components/OperationLog.vue'
import HouseDetailDrawer from '@/components/HouseDetailDrawer.vue'
import HouseEditDialog from '@/components/HouseEditDialog.vue'

// ─── 路由 & Stores ───────────────────────────────────────
const route = useRoute()
const unitId = route.params.unitId as string

const householdStore = useHouseholdStore()
const opLogStore = useOperationLogStore()
const hierarchyStore = useHierarchyStore()

const unitName = computed(() => hierarchyStore.currentNode?.name ?? '单元')

// ─── 导航 ──────────────────────────────────────────────
const activeTab = ref<NavTab>('chart')

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

// 切换到可视化 tab 时需要 resize，因为容器可能从 display:none 变为可见
watch(activeTab, (tab) => {
  if (tab === 'chart') {
    nextTick(() => {
      if (chartInstance) chartInstance.resize()
    })
  }
})

// 数据变化 → 重绘
watch(() => householdStore.list, () => {
  nextTick(() => renderChart())
}, { deep: true })

// ─── 抽屉 & 编辑对话框 ──────────────────────────────────
const drawerVisible = ref(false)
const dialogVisible = ref(false)
const selectedHousehold = ref<Household | null>(null)
const editingHousehold = ref<Household | null>(null)
/** 编辑入口来源：todo=变更信息(记一次走访) / drawer=房屋编辑(不重置走访) */
const editSource = ref<'todo' | 'drawer'>('drawer')

const openDrawer = (h: Household) => {
  selectedHousehold.value = h
  drawerVisible.value = true
}

/** 抽屉内人员增删改后，若抽屉仍打开则同步最新对象 */
const syncSelected = (updated: Household) => {
  if (drawerVisible.value && selectedHousehold.value?.id === updated.id) {
    selectedHousehold.value = updated
  }
}

const handleDrawerEdit = (h: Household) => {
  drawerVisible.value = false
  editSource.value = 'drawer'
  editingHousehold.value = h
  dialogVisible.value = true
}

const handleTodoEdit = (h: Household) => {
  editSource.value = 'todo'
  editingHousehold.value = h
  dialogVisible.value = true
}

const handleTodoConfirm = async (h: Household) => {
  const updated = await householdStore.confirmVisit(h.id)
  syncSelected(updated)
  await opLogStore.addLog(
    h.roomNo,
    '确认走访',
    `确认走访完成，住户信息未变更`
  )
}

const diffText = (oldH: Household, data: Partial<Household>): string => {
  const changed: string[] = []
  const keys: (keyof Household)[] = ['houseType', 'landlord', 'phone', 'remark', 'lastVisitTime']
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

  // 从待办「变更信息」进入时视为完成一次走访，重置走访时间
  const finalData = editSource.value === 'todo'
    ? { ...data, lastVisitTime: new Date().toLocaleString('zh-CN', { hour12: false }) }
    : data

  const updated = await householdStore.updateHousehold(householdId, finalData)
  syncSelected(updated)
  await opLogStore.addLog(
    old.roomNo,
    '变更信息',
    changed.length > 0 ? changed : '无字段变更'
  )
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
onMounted(async () => {
  await hierarchyStore.enterLevel('unit', unitId)
  await householdStore.loadList(unitId)
  await opLogStore.loadLogs()
  await initChart()
})

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
.unit-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
}
.unit-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.content-area {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}
.tab-content {
  height: 100%;
}
.chart-tab {
  display: flex;
  flex-direction: column;
}
.chart-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.chart-card :deep(.el-card__body) {
  flex: 1;
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
  height: 440px;
}
</style>

