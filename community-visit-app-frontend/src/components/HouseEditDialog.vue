<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="编辑房屋信息"
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

      <el-form-item label="房屋类别" prop="houseType">
        <el-select v-model="form.houseType" style="width: 100%">
          <el-option label="🟢 自购房" value="自购房" />
          <el-option label="🟡 出租房" value="出租房" />
          <el-option label="🔴 群租房" value="群租房" />
        </el-select>
      </el-form-item>

      <el-form-item label="房主" prop="landlord">
        <el-input v-model="form.landlord" placeholder="请输入房主姓名" />
      </el-form-item>

      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入联系电话" />
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
import type { Household, HouseType } from '@/types'

const props = defineProps<{
  visible: boolean
  household: Household | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [householdId: string, data: Partial<Household>]
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)

const form = reactive({
  houseType: '自购房' as HouseType,
  landlord: '',
  phone: '',
  remark: ''
})

const rules: FormRules = {
  houseType: [{ required: true, message: '请选择房屋类别', trigger: 'change' }],
  landlord: [{ required: true, message: '请输入房主姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

// 打开编辑框时回填数据
watch(() => props.household, (h) => {
  if (h) {
    form.houseType = h.houseType
    form.landlord = h.landlord
    form.phone = h.phone
    form.remark = h.remark
  }
}, { immediate: true })

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    emit('save', props.household!.id, { ...form })
    emit('update:visible', false)
  } finally {
    saving.value = false
  }
}
</script>
