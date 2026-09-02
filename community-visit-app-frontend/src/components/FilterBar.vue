<template>
  <div class="filter-bar">
    <template v-for="f in fields" :key="f.key">
      <el-input
        v-if="f.type === 'input'"
        :model-value="current[f.key] ?? ''"
        :placeholder="f.placeholder"
        clearable
        class="filter-item"
        :style="itemStyle(f)"
        @update:model-value="(v: string) => onChange(f.key, v)"
        @keyup.enter="emit('search')"
      />
      <el-select
        v-else-if="f.type === 'select'"
        :model-value="current[f.key] ?? ''"
        :placeholder="f.placeholder"
        clearable
        class="filter-item"
        :style="itemStyle(f)"
        @update:model-value="(v: string) => onChange(f.key, v)"
      >
        <el-option v-for="opt in f.options" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </template>

    <el-button type="primary" :icon="Search" @click="emit('search')">查询</el-button>
    <el-button @click="handleReset">重置</el-button>
    <div v-if="$slots.default" class="filter-bar__extra">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterField {
  key: string
  type: 'input' | 'select'
  label?: string
  placeholder?: string
  options?: FilterOption[]
  /** 控件宽度（px），默认 input 220 / select 150 */
  width?: number
}

export type FilterCond = Record<string, string | undefined>

const props = defineProps<{
  fields: FilterField[]
  modelValue: FilterCond
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterCond]
  search: []
  reset: []
}>()

const current = computed(() => props.modelValue)

const itemStyle = (f: FilterField) => {
  const w = f.width ?? (f.type === 'input' ? 220 : 150)
  return { width: `${w}px` }
}

const onChange = (key: string, value: string) => {
  const next: FilterCond = { ...props.modelValue }
  if (value === '' || value === undefined) delete next[key]
  else next[key] = value
  emit('update:modelValue', next)
}

const handleReset = () => {
  emit('reset')
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.filter-item {
  max-width: 260px;
}
.filter-bar__extra {
  margin-left: auto;
  display: flex;
  gap: 10px;
}
</style>
