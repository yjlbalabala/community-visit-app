<template>
  <el-date-picker
    type="daterange"
    :model-value="modelValue"
    value-format="YYYY-MM-DD"
    range-separator="~"
    :start-placeholder="startPlaceholder"
    :end-placeholder="endPlaceholder"
    :shortcuts="shortcutList"
    clearable
    :style="{ width: width }"
    @update:model-value="(v: [string, string] | null) => emit('update:modelValue', v)"
  />
</template>

<script setup lang="ts">
/** 时间范围值：['YYYY-MM-DD', 'YYYY-MM-DD'] 或 null（清除） */
export type DateRange = [string, string] | null

const props = withDefaults(defineProps<{
  modelValue: DateRange
  startPlaceholder?: string
  endPlaceholder?: string
  width?: string
  /** 是否显示快捷选项 */
  presets?: boolean
}>(), {
  startPlaceholder: '开始日期',
  endPlaceholder: '结束日期',
  width: '260px',
  presets: true
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
}>()

/** 快捷时间段（近 7/30/90 天） */
const shortcutList = props.presets
  ? [
      { text: '近 7 天', value: () => [new Date(Date.now() - 6 * 24 * 3600 * 1000), new Date()] },
      { text: '近 30 天', value: () => [new Date(Date.now() - 29 * 24 * 3600 * 1000), new Date()] },
      { text: '近 90 天', value: () => [new Date(Date.now() - 89 * 24 * 3600 * 1000), new Date()] }
    ]
  : []
</script>
