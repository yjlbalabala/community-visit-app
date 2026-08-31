<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="编辑住户信息"
    width="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      label-width="100px"
      :rules="rules"
      v-if="household"
    >
      <el-form-item label="房号">
        <el-input :model-value="household.roomNo" disabled />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="🔴 需上门走访" value="red" />
          <el-option label="🟡 需电话核实" value="yellow" />
          <el-option label="🟢 无需走访" value="green" />
        </el-select>
      </el-form-item>

      <el-form-item label="房东" prop="landlord">
        <el-input v-model="form.landlord" placeholder="请输入房东姓名" />
      </el-form-item>

      <el-form-item label="电话" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入联系电话" />
      </el-form-item>

      <el-form-item label="住户性质" prop="userType">
        <el-select v-model="form.userType" style="width: 100%">
          <el-option label="常住居民" value="常住居民" />
          <el-option label="租户" value="租户" />
          <el-option label="空置" value="空置" />
        </el-select>
      </el-form-item>

      <el-form-item label="住房类别" prop="houseType">
        <el-select v-model="form.houseType" style="width: 100%">
          <el-option label="商品房" value="商品房" />
          <el-option label="公租房" value="公租房" />
        </el-select>
      </el-form-item>

      <el-form-item label="情况说明" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入情况说明"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Household, HouseholdStatus } from '@/types'

const props = defineProps<{
  visible: boolean
  household: Household | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [roomNo: string, data: Partial<Household>]
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)

const form = reactive({
  status: 'green' as HouseholdStatus,
  landlord: '',
  phone: '',
  userType: '常住居民',
  houseType: '商品房',
  remark: ''
})

const rules: FormRules = {
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  landlord: [{ required: true, message: '请输入房东姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  userType: [{ required: true, message: '请选择住户性质', trigger: 'change' }],
  houseType: [{ required: true, message: '请选择住房类别', trigger: 'change' }]
}

// 打开编辑框时回填数据
watch(() => props.household, (h) => {
  if (h) {
    form.status = h.status
    form.landlord = h.landlord
    form.phone = h.phone
    form.userType = h.userType
    form.houseType = h.houseType
    form.remark = h.remark
  }
}, { immediate: true })

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    emit('save', props.household!.roomNo, { ...form })
    emit('update:visible', false)
  } finally {
    saving.value = false
  }
}
</script>
