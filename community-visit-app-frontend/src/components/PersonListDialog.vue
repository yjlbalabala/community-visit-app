<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="`👥 人员管理 · ${locationLabel || (household?.roomNo ?? '')}`"
    width="78%"
    top="6vh"
    :close-on-click-modal="false"
    class="person-list-dialog"
  >
    <div v-if="household" class="dialog-body">
      <!-- 定位与统计 -->
      <div class="context-bar">
        <span class="context-item">房屋类别：
          <el-tag :type="HOUSE_TAG_MAP[household.houseType]" size="small">{{ household.houseType }}</el-tag>
        </span>
        <span class="context-item">居住人数：<b>{{ household.persons.length }}</b> 人</span>
        <span class="context-item">房主：{{ household.landlord }}</span>
        <span v-if="household.persons.length > 8" class="context-item over-tip">⚠️ 超 8 人，需重点关注</span>
      </div>

      <!-- 检索 + 新增 -->
      <FilterBar
        :fields="filterFields"
        v-model="cond"
        class="filter-row"
        @search="onSearch"
        @reset="onReset"
      >
        <el-button type="primary" :icon="Plus" @click="openPersonDialog()">新增人员</el-button>
      </FilterBar>

      <!-- 人员表格 -->
      <el-table
        :data="paged"
        border
        stripe
        class="person-table"
        :header-cell-style="{ background: '#f5f7fa', color: '#303133' }"
      >
        <el-table-column type="index" label="#" width="52" />
        <el-table-column prop="name" label="住户姓名" min-width="110">
          <template #default="{ row }">
            <b>{{ row.name }}</b>
          </template>
        </el-table-column>
        <el-table-column label="住户性别" width="96">
          <template #default="{ row }">
            <span :style="{ color: genderStyle(row.gender)?.color, fontWeight: 500 }">
              {{ genderStyle(row.gender)?.symbol }} {{ row.gender }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="人员类别" width="110">
          <template #default="{ row }">
            <el-tag :type="personTag(row.personType)" size="small">
              {{ row.personType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号码" min-width="130" />
        <el-table-column prop="idCard" label="身份证号码" min-width="190" />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openPersonDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="total === 0" description="没有符合条件的登记人员" />

      <!-- 分页 -->
      <div class="pagination-row">
        <PaginationBar
          :total="total"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </div>

    <el-empty v-else description="未选择住户" />

    <PersonEditDialog
      v-model:visible="personDialogVisible"
      :household="household"
      :person="editingPerson"
      @save="handlePersonSave"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { Gender, Household, Person, PersonType } from '@/types'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import { PERSON_TYPE_TAG_MAP, GENDER_STYLE_MAP } from '@/utils/personStyle'
import { usePagedFilter, type FilterCond } from '@/composables/usePagedFilter'
import FilterBar, { type FilterField } from '@/components/FilterBar.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import PersonEditDialog from '@/components/PersonEditDialog.vue'

const props = defineProps<{
  visible: boolean
  household: Household | null
  /** 定位文案，如「万达茂 · 万达茂家园 · 9号楼 · 601」 */
  locationLabel?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'person-save': [householdId: string, person: Person]
  'person-remove': [householdId: string, personId: string]
}>()

const personTag = (t: PersonType) => PERSON_TYPE_TAG_MAP[t] ?? 'info'
const genderStyle = (g: Gender) => GENDER_STYLE_MAP[g]

const filterFields: FilterField[] = [
  { key: 'keyword', type: 'input', placeholder: '姓名 / 身份证 / 手机号' },
  {
    key: 'personType',
    type: 'select',
    placeholder: '人员类别',
    options: [
      { label: '常住人口', value: '常住人口' },
      { label: '寄住人口', value: '寄住人口' },
      { label: '流动人口', value: '流动人口' }
    ]
  },
  {
    key: 'gender',
    type: 'select',
    placeholder: '性别',
    options: [{ label: '男', value: '男' }, { label: '女', value: '女' }]
  }
]

const cond = ref<FilterCond>({})

const persons = computed(() => props.household?.persons ?? [])

const { paged, total, currentPage, pageSize } = usePagedFilter<Person>({
  source: () => persons.value,
  cond,
  filter: (p, c) => {
    const kw = c.keyword?.trim().toLowerCase()
    if (kw && !(p.name.toLowerCase().includes(kw) || p.phone.includes(kw) || p.idCard.toLowerCase().includes(kw))) {
      return false
    }
    if (c.personType && p.personType !== c.personType) return false
    if (c.gender && p.gender !== c.gender) return false
    return true
  }
})

// ─── 人员 增删改查 ─────────────────────────────────────
const personDialogVisible = ref(false)
const editingPerson = ref<Person | null>(null)

watch(() => props.visible, (v) => {
  if (v) {
    cond.value = {}
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

const handleRemove = (person: Person) => {
  if (!props.household) return
  ElMessageBox.confirm(`确认删除人员「${person.name}」？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    emit('person-remove', props.household!.id, person.id)
  }).catch(() => {})
}

const onSearch = () => { /* cond 变化已由 usePagedFilter 复位到第 1 页 */ }
const onReset = () => { cond.value = {} }
</script>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.context-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #606266;
  font-size: 14px;
}
.context-item b {
  color: #303133;
}
.over-tip {
  color: #f56c6c;
  font-weight: 500;
}
.filter-row {
  margin-bottom: 2px;
}
.person-table {
  width: 100%;
}
.pagination-row {
  display: flex;
  justify-content: flex-end;
}
</style>

