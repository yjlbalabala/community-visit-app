<template>
    <div class="house-grid-container">
        <!-- 必须给容器确定宽高，否则ECharts无法初始化 -->
        <div ref="chartRef" class="echarts-box"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

export interface HouseItem {
    roomNo: string
    floor: number
    door: number
    status: 'red' | 'yellow' | 'green'
    landlord: string
    phone: string
    userType: string
    houseType: string
    lastVisitTime: string
    remark: string
}

const statusColorMap: Record<HouseItem['status'], string> = {
    red: '#F53F3F',
    yellow: '#FFAA00',
    green: '#00B42A'
}

const houseList = ref<HouseItem[]>([])

const initHouseData = () => {
    const list: HouseItem[] = []
    for (let floor = 1; floor <= 5; floor++) {
        for (let door = 1; door <= 4; door++) {
            const roomNo = `${floor}0${door}`
            const statusArr: HouseItem['status'][] = ['red', 'yellow', 'green']
            const randomStatus = statusArr[Math.floor(Math.random() * 3)]
            list.push({
                roomNo,
                floor,
                door,
                status: randomStatus,
                landlord: `房东${roomNo}`,
                phone: `138${Math.floor(10000000 + Math.random() * 90000000)}`,
                userType: '常住居民',
                houseType: '商品房',
                lastVisitTime: '2026-06-20 09:30:00',
                remark: '日常居住，无特殊情况'
            })
        }
    }
    houseList.value = list
}

// 销毁旧实例，防止重复初始化
const disposeChart = () => {
    if (chartInstance) {
        chartInstance.dispose()
        chartInstance = null
    }
}

const renderChart = () => {
    if (!chartInstance) return
    const data = houseList.value

    const cellWidth = 80
    const cellHeight = 60
    const gapX = 12
    const gapY = 16

    const option: echarts.EChartsOption = {
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                const d = params.data as HouseItem
                const statusText = d.status === 'red' ? '紧急上门走访' : d.status === 'yellow' ? '电话核实' : '无人居住'
                return `
          <div>房号：${d.roomNo}</div>
          <div>房东：${d.landlord}</div>
          <div>状态：${statusText}</div>
          <div>上次走访：${d.lastVisitTime}</div>
        `
            }
        },
        xAxis: { show: false, min: 0, max: 1000 },
        yAxis: { show: false, min: 0, max: 800 },
        grid: { left: 0, top: 0, right: 0, bottom: 0 },
        series: [
            {
                name: '楼栋户型网格',
                type: 'custom',
                renderItem: (params, api) => {
                    // 通过 dataIndex 直接从闭包中的 data 获取对象，避免 api.value(0) 拿不到数据
                    const item = data[params.dataIndex]
                    if (!item) return null
                    const { floor, door } = item

                    const x = (door - 1) * (cellWidth + gapX)
                    const y = (floor - 1) * (cellHeight + gapY)

                    return {
                        type: 'rect',
                        shape: {
                            x,
                            y,
                            width: cellWidth,
                            height: cellHeight
                        },
                        style: api.style({
                            fill: statusColorMap[item.status],
                            stroke: '#fff',
                            lineWidth: 2
                        }),
                        textContent: {
                            type: 'text',
                            style: {
                                text: item.roomNo,
                                fill: '#fff',
                                fontSize: 16,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                textVerticalAlign: 'middle'
                            }
                        }
                    }
                },
                data
            }
        ]
    }

    chartInstance.setOption(option, true)
}

// 初始化实例：强制等待DOM挂载完毕
const initChart = async () => {
    // 多次nextTick确保DOM渲染完成
    await nextTick()
    await nextTick()

    if (!chartRef.value) {
        console.error('ECharts容器DOM不存在，初始化终止')
        return
    }

    // 先销毁旧实例
    disposeChart()

    // 新建实例
    chartInstance = echarts.init(chartRef.value)
    if (!chartInstance) {
        console.log('ECharts实例初始化失败')
    } else {
        console.log('ECharts实例初始化成功')
    }
    renderChart()

    // 窗口resize — 存到模块级变量，保证卸载时能正确移除
    resizeHandler = () => {
        chartInstance?.resize()
    }
    window.addEventListener('resize', resizeHandler)

    // 点击事件
    chartInstance.on('click', '楼栋户型网格', (params) => {
        const data = params.data as HouseItem
        console.log('选中房源', data)
    })
}

// 监听数据变化重绘
watch(houseList, () => {
    nextTick(() => renderChart())
}, { deep: true })

onMounted(async () => {
    initHouseData()
    await initChart()
})

// 组件卸载销毁实例，避免内存泄漏
onBeforeUnmount(() => {
    disposeChart()
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler)
        resizeHandler = null
    }
})
</script>

<style scoped>
.house-grid-container {
    width: 100%;
    height: 100%;
}
/* 关键：必须写死宽高，ECharts没有尺寸无法初始化 */
.echarts-box {
    width: 100%;
    height: 450px;
    background-color: #f7f8fa;
    padding: 20px;
    border-radius: 10px;
    box-sizing: border-box;
}
</style>