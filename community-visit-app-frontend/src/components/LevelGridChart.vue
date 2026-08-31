<template>
  <div v-loading="loading" class="level-grid-chart">
    <el-empty v-if="!loading && nodes.length === 0" description="暂无数据" />
    <div v-show="nodes.length > 0" ref="chartRef" class="grid-chart-box"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { TreeNode } from '@/types'

const props = withDefaults(defineProps<{
  nodes: TreeNode[]
  /** 子节点名称，如 "小区" / "单元" / "户"，用于卡片副标题与 tooltip */
  childLabel?: string
  loading?: boolean
  /** 网格最大列数 */
  maxCols?: number
}>(), {
  childLabel: '下级',
  loading: false,
  maxCols: 6
})

const emit = defineEmits<{
  select: [node: TreeNode]
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null
let hoverIndex = -1

const baseHue = 205

/** 卡片副标题文案：户用 "26 户"，其它用 "8 个小区" */
const countText = (n: TreeNode): string =>
  props.childLabel === '户' ? `${n.childCount} 户` : `${n.childCount} 个${props.childLabel}`

const renderChart = () => {
  if (!chartInstance || props.nodes.length === 0) return
  const nodes = props.nodes
  const gap = 14
  const cols = Math.min(props.maxCols, Math.max(2, Math.ceil(Math.sqrt(nodes.length))))
  const rows = Math.ceil(nodes.length / cols)
  const width = chartRef.value?.clientWidth ?? 900
  const height = chartRef.value?.clientHeight ?? 560
  const cellW = Math.floor((width - (cols + 1) * gap) / cols)
  const cellH = Math.min(Math.floor(cellW * 0.62), Math.floor((height - (rows + 1) * gap) / rows))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const n = params.data as TreeNode
        const s = n.summary
        const countLine = props.childLabel === '户'
          ? `${n.childCount} 户`
          : `下辖 ${n.childCount} 个${props.childLabel}`
        return [
          `<div style="font-size:14px;font-weight:600;margin-bottom:4px;">${n.name}</div>`,
          `<div style="color:#606266;">${countLine}</div>`,
          `<div style="color:#606266;">户数：${s.householdCount.toLocaleString()} 户</div>`,
          `<div style="color:#606266;">常住人口：${s.permanentPop.toLocaleString()} 人</div>`,
          `<div style="color:#606266;">流动人口：${s.floatingPop.toLocaleString()} 人</div>`,
          `<div style="color:#606266;">寄住人口：${s.stayPop.toLocaleString()} 人</div>`
        ].join('')
      }
    },
    xAxis: { show: false, min: 0, max: width },
    yAxis: { show: false, min: 0, max: height },
    grid: { left: 0, top: 0, right: 0, bottom: 0 },
    series: [{
      type: 'custom',
      renderItem: (params: any, _api: any) => {
        const idx = params.dataIndex as number
        const n = nodes[idx]
        if (!n) return null
        const col = idx % cols
        const row = Math.floor(idx / cols)
        const x = gap + col * (cellW + gap)
        const y = gap + row * (cellH + gap)
        const isHover = idx === hoverIndex
        const hue = baseHue + (idx % 5) * 7
        const fill = new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: `hsl(${hue}, ${isHover ? 78 : 64}%, ${isHover ? 60 : 53}%)` },
          { offset: 1, color: `hsl(${hue + 16}, 72%, ${isHover ? 48 : 42}%)` }
        ])
        return {
          type: 'group',
          children: [
            {
              type: 'rect',
              shape: { x, y, width: cellW, height: cellH, r: 10 },
              style: {
                fill,
                stroke: 'rgba(255,255,255,0.9)',
                lineWidth: 1.5,
                shadowBlur: isHover ? 20 : 8,
                shadowColor: 'rgba(30,80,160,0.35)',
                cursor: 'pointer'
              }
            },
            {
              type: 'text',
              style: {
                x: x + cellW / 2,
                y: y + cellH / 2 - 9,
                text: n.name,
                fill: '#fff',
                fontSize: Math.max(13, Math.min(18, Math.floor(cellW / 7))),
                fontWeight: 'bold',
                textAlign: 'center',
                textVerticalAlign: 'middle'
              }
            },
            {
              type: 'text',
              style: {
                x: x + cellW / 2,
                y: y + cellH / 2 + 15,
                text: countText(n),
                fill: 'rgba(255,255,255,0.88)',
                fontSize: 12,
                textAlign: 'center',
                textVerticalAlign: 'middle'
              }
            }
          ]
        } as any
      },
      data: nodes
    }]
  }

  chartInstance.setOption(option, true)
}

const initChart = async () => {
  await nextTick()
  await nextTick()
  if (!chartRef.value) return

  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)

  renderChart()

  resizeHandler = () => chartInstance?.resize()
  window.addEventListener('resize', resizeHandler)

  // 悬停高亮
  chartInstance.on('mouseover', (params: any) => {
    if (typeof params.dataIndex === 'number' && params.dataIndex !== hoverIndex) {
      hoverIndex = params.dataIndex
      renderChart()
    }
  })
  chartInstance.on('mouseout', () => {
    if (hoverIndex !== -1) {
      hoverIndex = -1
      renderChart()
    }
  })
  // 点击下钻
  chartInstance.on('click', (params: any) => {
    if (params.data && params.data.id) {
      emit('select', params.data as TreeNode)
    }
  })
}

watch(() => props.nodes, () => {
  nextTick(() => renderChart())
}, { deep: true })

onMounted(initChart)

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
.level-grid-chart {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.grid-chart-box {
  width: 100%;
  height: 560px;
}
</style>

