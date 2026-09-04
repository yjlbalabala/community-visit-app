<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="📮 发布走访任务"
    width="72%"
    top="5vh"
    :close-on-click-modal="false"
  >
    <div class="pub-body" v-loading="loading">
      <!-- 第 1 步：选择接收用户（普通用户，含其管辖责任区） -->
      <div class="step-title">1. 选择接收用户</div>
      <el-select v-model="userId" placeholder="选择责任区用户" style="width: 260px" @change="handleUserChange">
        <el-option v-for="u in zoneUsers" :key="u.id" :label="`${u.username}（${zoneNameOf(u.zoneId) || '未设置区'}）`" :value="u.id" />
      </el-select>
      <el-tag v-if="currentUserZoneName" type="primary" effect="plain" class="zone-tag">辖区：{{ currentUserZoneName }}</el-tag>

      <!-- 第 2 步：选择单元并勾选住户 -->
      <div class="step-title">2. 选择小区 / 单元</div>
      <div class="scope-row">
        <el-select v-model="communityId" placeholder="选择小区" style="width: 220px" :disabled="!userId" @change="handleCommunityChange">
          <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="unitId" placeholder="选择单元" style="width: 220px" :disabled="!communityId" @change="loadHouseholds">
          <el-option v-for="u in units" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </div>

      <!-- 第 3 步：勾选住户（一个单元内可多选） -->
      <template v-if="unitId">
        <div class="step-title">3. 勾选住户（可多选）</div>
        <el-table ref="hhTableRef" :data="households" size="small" border max-height="280" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="42" />
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="person-sub">
                <span v-if="row.persons.length === 0" style="color:#909399">该户暂无登记人员</span>
                <el-tag v-for="p in row.persons" :key="p.id" size="small" class="person-tag">
                  {{ p.name }}（{{ p.personType }}）
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="roomNo" label="房号" width="76" />
          <el-table-column label="房屋类别" width="90">
            <template #default="{ row }">
              <el-tag :type="houseTagOf(row.houseType)" size="small">{{ row.houseType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="房主 / 人数" width="120">
            <template #default="{ row }">{{ row.landlord }}（{{ row.persons.length }} 人）</template>
          </el-table-column>
          <el-table-column label="上次走访" width="150">
            <template #default="{ row }">{{ row.lastVisitTime || '从未走访' }}</template>
          </el-table-column>
          <el-table-column label="预计走访" width="150">
            <template #default="{ row }">{{ effectiveExpectedVisitTime(row) || '—' }}</template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 第 4 步：走访时间与说明 -->
      <template v-if="selected.length > 0">
        <div class="step-title">4. 指定走访时间与说明</div>
        <div class="time-row">
          <el-date-picker
            v-model="scheduledVisitTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="指定走访时间（须在今天之后）"
            :disabled-date="disabledDate"
            style="width: 300px"
          />
          <span class="hint">已选 {{ selected.length }} 户：{{ selected.map(h => h.roomNo).join('、') }}</span>
        </div>
        <el-input v-model="remark" type="textarea" :rows="2" placeholder="情况说明（可为空）" maxlength="200" show-word-limit />
      </template>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="publishing" :disabled="!canPublish" @click="handlePublish">
        发布
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { Household, HouseType, TreeNode, User } from '@/types'
import { fetchUsers } from '@/api/auth'
import { fetchZones, fetchCommunities, fetchUnits } from '@/api/hierarchy'
import { fetchHouseholds } from '@/api/household'
import { publishTask } from '@/api/todoTask'
import { HOUSE_TAG_MAP } from '@/utils/houseColor'
import { effectiveExpectedVisitTime } from '@/utils/visitRule'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  published: []
}>()

const zones = ref<TreeNode[]>([])
const zoneUsers = ref<User[]>([])
const userId = ref('')
const communities = ref<TreeNode[]>([])
const units = ref<TreeNode[]>([])
const communityId = ref('')
const unitId = ref('')
const households = ref<Household[]>([])
const selected = ref<Household[]>([])
const scheduledVisitTime = ref('')
const remark = ref('')
const loading = ref(false)
const publishing = ref(false)

const currentUser = computed(() => zoneUsers.value.find(u => u.id === userId.value) ?? null)
const currentUserZoneName = computed(() => zoneNameOf(currentUser.value?.zoneId ?? null))
const canPublish = computed(() => !!userId.value && selected.value.length > 0 && !!scheduledVisitTime.value)

const zoneNameOf = (id: string | null) => zones.value.find(z => z.id === id)?.name ?? ''
const houseTagOf = (t: HouseType) => HOUSE_TAG_MAP[t] || 'info'

const disabledDate = (d: Date) => d.getTime() < Date.now() - 24 * 3600 * 1000

const handleUserChange = async () => {
  communityId.value = ''
  unitId.value = ''
  communities.value = []
  units.value = []
  households.value = []
  selected.value = []
  if (currentUser.value?.zoneId) {
    communities.value = await fetchCommunities(currentUser.value.zoneId)
  }
}

const handleCommunityChange = async (id: string) => {
  communityId.value = id
  unitId.value = ''
  units.value = id ? await fetchUnits(id) : []
  households.value = []
  selected.value = []
}

const loadHouseholds = async (id: string) => {
  unitId.value = id
  selected.value = []
  households.value = id ? await fetchHouseholds(id) : []
}

const onSelectionChange = (rows: Household[]) => {
  selected.value = rows
}

const handlePublish = async () => {
  const user = currentUser.value
  if (!user || !unitId.value) return
  const community = communities.value.find(c => c.id === communityId.value)
  const unit = units.value.find(u => u.id === unitId.value)
  if (!community || !unit) return
  publishing.value = true
  try {
    await publishTask({
      assigneeUsername: user.username,
      zoneId: user.zoneId ?? '',
      zoneName: currentUserZoneName.value,
      communityId: community.id,
      communityName: community.name,
      unitId: unit.id,
      unitName: unit.name,
      householdIds: selected.value.map(h => h.id),
      scheduledVisitTime: scheduledVisitTime.value,
      remark: remark.value
    })
    ElMessage.success('走访任务已发布')
    emit('published')
    // 重置
    userId.value = ''
    communityId.value = ''
    unitId.value = ''
    communities.value = []
    units.value = []
    households.value = []
    selected.value = []
    scheduledVisitTime.value = ''
    remark.value = ''
    emit('update:visible', false)
  } catch (e: any) {
    ElMessage.error(e?.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  zones.value = await fetchZones()
  zoneUsers.value = (await fetchUsers()).filter(u => u.role === 'user')
})
</script>

<style scoped>
.pub-body {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step-title {
  font-weight: 600;
  color: #303133;
}
.scope-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.zone-tag {
  margin-left: 10px;
}
.person-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
}
.time-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hint {
  color: #909399;
  font-size: 13px;
}
</style>

