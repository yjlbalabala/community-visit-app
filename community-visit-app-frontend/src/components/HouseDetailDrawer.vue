<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="房屋详情"
    size="400px"
    direction="rtl"
  >
    <template v-if="household">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="房号">{{ household.roomNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="房东">{{ household.landlord }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ household.phone }}</el-descriptions-item>
        <el-descriptions-item label="住户性质">{{ household.userType }}</el-descriptions-item>
        <el-descriptions-item label="住房类别">{{ household.houseType }}</el-descriptions-item>
        <el-descriptions-item label="上次走访时间">{{ household.lastVisitTime }}</el-descriptions-item>
        <el-descriptions-item label="情况说明">{{ household.remark }}</el-descriptions-item>
      </el-descriptions>

      <div class="drawer-actions">
        <el-button type="primary" @click="$emit('edit', household)" :icon="Edit">
          编辑信息
        </el-button>
      </div>
    </template>

    <template v-else>
      <el-empty description="请选择一户人家" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Edit } from '@element-plus/icons-vue'
import type { Household } from '@/types'

const props = defineProps<{
  visible: boolean
  household: Household | null
}>()

defineEmits<{
  'update:visible': [value: boolean]
  edit: [household: Household]
}>()

const statusText = computed(() => {
  const map: Record<string, string> = { red: '需上门走访', yellow: '需电话核实', green: '无需走访' }
  return props.household ? map[props.household.status] || '' : ''
})

const statusTagType = computed(() => {
  const map: Record<string, string> = { red: 'danger', yellow: 'warning', green: 'success' }
  return props.household ? map[props.household.status] || 'info' : 'info'
})
</script>

<style scoped>
.drawer-actions {
  margin-top: 24px;
  text-align: center;
}
</style>
