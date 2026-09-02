<template>
  <el-pagination
    class="pagination-bar"
    :total="total"
    :current-page="currentPage"
    :page-size="pageSize"
    :page-sizes="pageSizes"
    :layout="layout"
    :background="background"
    :small="small"
    @current-change="(v: number) => emit('update:currentPage', v)"
    @size-change="(v: number) => emit('update:pageSize', v)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  total: number
  currentPage: number
  pageSize: number
  /** 可选每页条数选项；不传则不显示尺寸切换 */
  pageSizes?: number[]
  layout?: string
  background?: boolean
  small?: boolean
}>(), {
  pageSizes: undefined,
  background: true,
  small: false
})

const emit = defineEmits<{
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
}>()

const layout = computed(() => props.layout ?? (props.pageSizes ? 'total, sizes, prev, pager, next, jumper' : 'total, prev, pager, next'))
</script>

<style scoped>
.pagination-bar {
  justify-content: flex-end;
}
</style>
