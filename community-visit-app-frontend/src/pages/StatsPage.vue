<template>
  <div class="stats-page">
    <el-card shadow="hover" v-loading="loading">
      <template #header>
        <div class="page-header">
          <span class="card-title">📊 统计信息</span>
          <span class="card-sub">{{ scopeText }}</span>
        </div>
      </template>

      <!-- 范围选择：责任区 → 小区 → 单元 -->
      <div class="scope-bar">
        <span class="scope-label">统计范围：</span>
        <el-tag v-if="zoneLocked" type="primary" size="small" effect="plain">当前辖区：{{ currentZoneName }}</el-tag>
        <el-select v-model="zoneId" :placeholder="zoneLocked ? '选择责任区' : '西岗街道（全部）'" clearable class="scope-select" :disabled="zoneLocked" @change="handleZoneChange">
          <el-option v-for="z in zonesOptions" :key="z.id" :label="z.name" :value="z.id" />
        </el-select>
        <el-select v-model="communityId" placeholder="全部小区" clearable class="scope-select" :disabled="!zoneId" @change="handleScopeChange">
          <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="unitId" placeholder="全部单元" clearable class="scope-select" :disabled="!communityId" @change="reload">
          <el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </div>

      <!-- 指标卡 -->
      <div class="cards-row" v-if="stats">
        <div class="card-item person">
          <div class="card-label">总人口</div>
          <div class="card-value">{{ stats.totalPop.toLocaleString() }}<span class="unit">人</span></div>
        </div>
        <div class="card-item permanent">
          <div class="card-label">常住人口</div>
          <div class="card-value">{{ stats.permanentPop.toLocaleString() }}<span class="unit">人</span></div>
        </div>
        <div class="card-item floating">
          <div class="card-label">流动人口</div>
          <div class="card-value">{{ stats.floatingPop.toLocaleString() }}<span class="unit">人</span></div>
        </div>
        <div class="card-item stay">
          <div class="card-label">寄住人口</div>
          <div class="card-value">{{ stats.stayPop.toLocaleString() }}<span class="unit">人</span></div>
        </div>
        <div class="card-item neutral">
          <div class="card-label">户数</div>
          <div class="card-value">{{ stats.householdCount.toLocaleString() }}<span class="unit">户</span></div>
        </div>
        <div class="card-item self">
          <div class="card-label">自购房</div>
          <div class="card-value">{{ stats.selfOwned.toLocaleString() }}<span class="unit">户</span></div>
        </div>
        <div class="card-item rent">
          <div class="card-label">出租房</div>
          <div class="card-value">{{ stats.rental.toLocaleString() }}<span class="unit">户</span></div>
        </div>
        <div class="card-item group">
          <div class="card-label">群租房</div>
          <div class="card-value">{{ stats.groupRental.toLocaleString() }}<span class="unit">户</span></div>
        </div>
      </div>

      <el-empty v-if="stats && stats.householdCount === 0" description="该范围内暂无住户数据" :image-size="60" />
      <!-- 图表 -->
      <div class="charts-row" v-show="stats && stats.householdCount > 0">
        <div class="chart-box">
          <div class="chart-title">👥 人员类别构成</div>
          <div ref="personChartRef" class="chart-canvas"></div>
        </div>
        <div class="chart-box">
          <div class="chart-title">🏠 房屋类别构成（{{ stats?.householdCount.toLocaleString() ?? 0 }} 户）</div>
          <div ref="houseChartRef" class="chart-canvas"></div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useRoute } from 'vue-router'
import type { TreeNode } from '@/types'
import { fetchZones, fetchCommunities, fetchUnits, STREET_ID } from '@/api/hierarchy'
import { fetchAreaStats, type AreaScope, type AreaStats } from '@/api/stats'
import { useAuthStore } from '@/stores/auth'
import { HOUSE_COLOR_MAP } from '@/utils/houseColor'

const authStore = useAuthStore()
const route = useRoute()

const zones = ref<TreeNode[]>([])
const communities = ref<TreeNode[]>([])
const units = ref<TreeNode[]>([])
const zoneId = ref('')
const communityId = ref('')
const unitId = ref('')
const stats = ref<AreaStats | null>(null)
const loading = ref(false)

const zoneLocked = computed(() => !authStore.isAdmin && !!authStore.userZoneId)
const zonesOptions = computed(() => (zoneLocked.value && authStore.userZoneId ? zones.value.filter(z => z.id === authStore.userZoneId) : zones.value))
const currentZoneName = computed(() => zones.value.find(z => z.id === zoneId.value)?.name ?? '')
const scopeText = computed(() => {
  const c = communities.value.find(x => x.id === communityId.value)?.name
  const u = units.value.find(x => x.id === unitId.value)?.name
  return [currentZoneName.value || '西岗街道（全部责任区）', c, u].filter(Boolean).join(' · ')
})

// ─── 图表 ─────────────────────────────────────────────
const personChartRef = ref<HTMLDivElement | null>(null)
const houseChartRef = ref<HTMLDivElement | null>(null)
let personChart: echarts.ECharts | null = null
let houseChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

const PERSON_COLORS = { 常住人口: '#00B42A', 流动人口: '#FFAA00', 寄住人口: '#722ED1' }

const renderCharts = (s: AreaStats) => {
  if (!personChart || !houseChart) return

  personChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}：{c} 人（{d}%）' },
    legend: { bottom: 0, icon: 'circle' },
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', formatter: '{b}\n{c} 人' } },
      data: [
        { name: '常住人口', value: s.permanentPop, itemStyle: { color: PERSON_COLORS.常住人口 } },
        { name: '流动人口', value: s.floatingPop, itemStyle: { color: PERSON_COLORS.流动人口 } },
        { name: '寄住人口', value: s.stayPop, itemStyle: { color: PERSON_COLORS.寄住人口 } }
      ]
    }],
    graphic: [{
      type: 'text',
      left: 'center',
      top: '38%',
      style: { text: `${s.totalPop.toLocaleString()}`, fontSize: 26, fontWeight: 700, fill: '#303133' }
    }, {
      type: 'text',
      left: 'center',
      top: '52%',
      style: { text: '总人口（人）', fontSize: 12, fill: '#909399' }
    }]
  }, true)

  const houseData = [
    { name: '自购房', value: s.selfOwned, itemStyle: { color: HOUSE_COLOR_MAP.自购房 } },
    { name: '出租房', value: s.rental, itemStyle: { color: HOUSE_COLOR_MAP.出租房 } },
    { name: '群租房', value: s.groupRental, itemStyle: { color: HOUSE_COLOR_MAP.群租房 } }
  ]
  houseChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps: any) => `${ps[0].name}：${ps[0].value} 户` },
    grid: { left: 10, right: 10, top: 24, bottom: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: houseData.map(d => d.name),
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisTick: { show: false },
      axisLabel: { color: '#606266', fontSize: 13 }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#ebeef5' } }, axisLabel: { color: '#909399' } },
    series: [{
      type: 'bar',
      barWidth: 46,
      data: houseData,
      label: { show: true, position: 'top', color: '#303133', fontWeight: 600 },
      itemStyle: { borderRadius: [6, 6, 0, 0] }
    }]
  }, true)
}

let resizeBound = false
/** 首次有可见容器时再初始化图表（避免隐藏容器宽度为 0） */
const ensureCharts = () => {
  if (personChartRef.value && !personChart) personChart = echarts.init(personChartRef.value)
  if (houseChartRef.value && !houseChart) houseChart = echarts.init(houseChartRef.value)
  if (!resizeBound) {
    resizeBound = true
    resizeHandler = () => {
      personChart?.resize()
      houseChart?.resize()
    }
    window.addEventListener('resize', resizeHandler)
  }
}

// ─── 加载 ─────────────────────────────────────────────
const scope = computed<AreaScope | null>(() => {
  if (unitId.value) return { nodeType: 'unit', id: unitId.value }
  if (communityId.value) return { nodeType: 'community', id: communityId.value }
  if (zoneId.value) return { nodeType: 'zone', id: zoneId.value }
  return { nodeType: 'street', id: STREET_ID }
})

const reload = async () => {
  if (!scope.value) return
  loading.value = true
  try {
    stats.value = await fetchAreaStats(scope.value)
    await nextTick()
    if (stats.value && stats.value.householdCount > 0) {
      ensureCharts()
      renderCharts(stats.value)
    }
  } finally {
    loading.value = false
  }
}

watch(zoneId, async (id) => {
  if (!id) {
    communityId.value = ''
    unitId.value = ''
    communities.value = []
    units.value = []
    await reload()
  }
})

const handleZoneChange = async (id: string) => {
  if (!id) return // 清空已由 watch(zoneId) 处理（回到全街道）
  zoneId.value = id
  communityId.value = ''
  unitId.value = ''
  communities.value = await fetchCommunities(id)
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

  // 管理员：支持 ?zoneId=&communityId=&unitId= 直达范围（普通用户忽略并锁定辖区）
  if (!zoneLocked.value) {
    const qZone = typeof route.query.zoneId === 'string' ? route.query.zoneId : ''
    const qCommunity = typeof route.query.communityId === 'string' ? route.query.communityId : ''
    const qUnit = typeof route.query.unitId === 'string' ? route.query.unitId : ''
    if (qZone) {
      zoneId.value = qZone
      communities.value = await fetchCommunities(qZone)
      if (qCommunity) {
        communityId.value = qCommunity
        units.value = await fetchUnits(qCommunity)
      }
      if (qUnit) unitId.value = qUnit
      await reload()
      return
    }
  }

  if (zoneLocked.value && authStore.userZoneId) {
    await handleZoneChange(authStore.userZoneId)
  } else {
    // 管理员：默认全街道（所有责任区）总体
    await reload()
  }
})

onBeforeUnmount(() => {
  personChart?.dispose()
  houseChart?.dispose()
  personChart = null
  houseChart = null
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})
</script>

<style scoped>
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
.cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.card-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 14px;
  border-left: 4px solid #909399;
}
.card-item.person { border-left-color: #165dff; }
.card-item.permanent { border-left-color: #00b42a; }
.card-item.floating { border-left-color: #ffaa00; }
.card-item.stay { border-left-color: #722ed1; }
.card-item.neutral { border-left-color: #909399; }
.card-item.self { border-left-color: #00b42a; }
.card-item.rent { border-left-color: #ffaa00; }
.card-item.group { border-left-color: #f53f3f; }
.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}
.card-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}
.card-value .unit {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart-box {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 8px 4px;
}
.chart-title {
  text-align: center;
  color: #303133;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}
.chart-canvas {
  width: 100%;
  height: 320px;
}
@media (max-width: 900px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>






