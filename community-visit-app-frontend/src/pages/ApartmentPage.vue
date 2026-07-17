<template>
  <!-- 必须指定宽高 -->
    <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import {onBeforeUnmount, onMounted, ref} from "vue";

const chartRef = ref(null)
let myChart = null

// 初始化图表
const initChart = () => {
    myChart = echarts.init(chartRef.value)
    const option = {
        title: { text: 'Vue3 ECharts 示例' },
        xAxis: { type: 'category', data: ['周一', '周二', '周三'] },
        yAxis: { type: 'value' },
        series: [{ data: [120, 200, 150], type: 'bar' }]
    }
    myChart.setOption(option)
}

// 窗口自适应重绘
const resizeChart = () => {
    myChart?.resize()
}

onMounted(() => {
    initChart()
    window.addEventListener('resize', resizeChart)
})

// 销毁实例，防止内存泄漏
onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeChart)
    myChart?.dispose()
})
</script>

<style scoped>

</style>