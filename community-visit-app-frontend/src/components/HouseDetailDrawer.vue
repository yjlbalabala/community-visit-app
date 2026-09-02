<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="房屋详情"
    size="460px"
    direction="rtl"
  >
    <div v-if="household" class="drawer-body">
      <!-- 房屋基本信息 -->
      <el-descriptions :column="1" border class="house-info">
        <el-descriptions-item label="房号">
          <b>{{ household.roomNo }}</b>
          <el-tag v-if="household.persons.length > 8" type="danger" size="small" class="over-tag">
            超 8 人
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="房屋类别">
          <el-tag :type="houseTagType" size="small">{{ household.houseType }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="居住人数">{{ household.persons.length }} 人</el-descriptions-item>
        <el-descriptions-item label="房主">{{ household.landlord }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ household.phone || '—' }}</el-descriptions-item>
        <el-descriptions-item label="上次走访时间">{{ household.lastVisitTime || '从未走访' }}</el-descriptions-item>
        <el-descriptions-item label="预计走访时间">{{ expectedTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="情况说明">{{ household.remark }}</el-descriptions-item>
      </el-descriptions>

      <!-- 快捷操作 -->
      <div class="drawer-actions">
        <el-button type="primary" :icon="User" @click="$emit('view-persons', household)">
          详细信息（查看人员）
        </el-button>
        <el-button :icon="Edit" @click="$emit('edit', household)">
          编辑房屋信息
        </el-button>
      </div>
    </div>

    <el-empty v-else description="请选择一户人家" />
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Edit, User } from '@element-plus/icons-vue'
import type { Household } from '@/types'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import { expectedVisitTime } from '@/utils/visitRule'

const props = defineProps<{
  visible: boolean
  household: Household | null
}>()

defineEmits<{
  'update:visible': [value: boolean]
  edit: [household: Household]
  'view-persons': [household: Household]
}>()

const houseTagType = computed(() => (props.household ? HOUSE_TAG_MAP[props.household.houseType] : 'info'))
const expectedTime = computed(() => (props.household ? expectedVisitTime(props.household) : null))
</script>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.house-info :deep(.el-descriptions__label) {
  width: 108px;
}
.over-tag {
  margin-left: 8px;
}
.drawer-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
