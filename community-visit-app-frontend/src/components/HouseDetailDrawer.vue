<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="房屋详情"
    size="500px"
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

      <!-- 详细信息（人员）手风琴 -->
      <el-collapse v-model="collapseActive" accordion class="detail-collapse">
        <el-collapse-item name="persons">
          <template #title>
            <span>👥 详细信息（该户人员 {{ household.persons.length }} 人）</span>
          </template>

          <div v-if="!personsVisible" class="person-hint">
            <el-button type="primary" plain @click="personsVisible = true">
              详细信息
            </el-button>
            <span class="person-hint__text">点击查看该户全部人员信息</span>
          </div>

          <template v-else>
            <div class="person-toolbar">
              <el-button size="small" type="primary" :icon="Plus" @click="openPersonDialog()">
                新增人员
              </el-button>
            </div>

            <el-empty
              v-if="household.persons.length === 0"
              description="该户暂无登记人员"
              :image-size="50"
            />
            <el-table
              v-else
              :data="household.persons"
              size="small"
              border
              max-height="320"
            >
              <el-table-column prop="name" label="姓名" width="88" />
              <el-table-column prop="gender" label="性别" width="54" />
              <el-table-column prop="personType" label="人员类别" width="90" />
              <el-table-column prop="phone" label="手机号" width="120" />
              <el-table-column prop="idCard" label="身份证号" min-width="176" />
              <el-table-column label="操作" width="118" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openPersonDialog(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="handleRemovePerson(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-collapse-item>
      </el-collapse>

      <div class="drawer-actions">
        <el-button type="primary" :icon="Edit" @click="$emit('edit', household)">
          编辑房屋信息
        </el-button>
      </div>
    </div>

    <el-empty v-else description="请选择一户人家" />

    <PersonEditDialog
      v-model:visible="personDialogVisible"
      :household="household"
      :person="editingPerson"
      @save="handlePersonSave"
    />
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import type { Household, Person } from '@/types'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import { expectedVisitTime } from '@/utils/visitRule'
import PersonEditDialog from '@/components/PersonEditDialog.vue'

const props = defineProps<{
  visible: boolean
  household: Household | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  edit: [household: Household]
  'person-save': [householdId: string, person: Person]
  'person-remove': [householdId: string, personId: string]
}>()

const houseTagType = computed(() => (props.household ? HOUSE_TAG_MAP[props.household.houseType] : 'info'))
const expectedTime = computed(() => (props.household ? expectedVisitTime(props.household) : null))

// ─── 手风琴 & 人员 ──────────────────────────────────────
const collapseActive = ref<string[]>([])
const personsVisible = ref(false)

const personDialogVisible = ref(false)
const editingPerson = ref<Person | null>(null)

watch(() => props.visible, (v) => {
  if (v) {
    personsVisible.value = false
    editingPerson.value = null
    personDialogVisible.value = false
  }
})

const openPersonDialog = (person?: Person) => {
  editingPerson.value = person ?? null
  personDialogVisible.value = true
}

const handlePersonSave = (person: Person) => {
  if (!props.household) return
  emit('person-save', props.household.id, person)
}

const handleRemovePerson = (person: Person) => {
  if (!props.household) return
  ElMessageBox.confirm(`确认删除人员「${person.name}」？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    emit('person-remove', props.household!.id, person.id)
  }).catch(() => {})
}
</script>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.house-info :deep(.el-descriptions__label) {
  width: 108px;
}
.over-tag {
  margin-left: 8px;
}
.detail-collapse {
  border-top: 1px solid #ebeef5;
}
.person-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.person-hint__text {
  color: #909399;
  font-size: 13px;
}
.person-toolbar {
  margin-bottom: 8px;
  text-align: right;
}
.drawer-actions {
  margin-top: 8px;
  text-align: center;
}
</style>
