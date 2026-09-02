<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="person ? '编辑人员' : '新增人员'"
    width="520px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form
      ref="formRef"
      :model="form"
      label-width="96px"
      :rules="rules"
      v-if="household"
    >
      <el-form-item label="房号">
        <el-input :model-value="household.roomNo" disabled />
      </el-form-item>

      <el-form-item label="住户姓名" prop="name">
        <el-input v-model="form.name" placeholder="请输入姓名" maxlength="20" />
      </el-form-item>

      <el-form-item label="住户性别" prop="gender">
        <el-radio-group v-model="form.gender">
          <el-radio value="男">男</el-radio>
          <el-radio value="女">女</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="身份证号码" prop="idCard">
        <el-input v-model="form.idCard" placeholder="请输入 18 位身份证号" maxlength="18" />
      </el-form-item>

      <el-form-item label="手机号码" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号码" maxlength="11" />
      </el-form-item>

      <el-form-item label="人员类别" prop="personType">
        <el-select v-model="form.personType" style="width: 100%">
          <el-option label="常住人口" value="常住人口" />
          <el-option label="寄住人口" value="寄住人口" />
          <el-option label="流动人口" value="流动人口" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Gender, Household, Person, PersonType } from '@/types'

const props = defineProps<{
  visible: boolean
  household: Household | null
  person: Person | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [person: Person]
}>()

const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  gender: '男' as Gender,
  idCard: '',
  phone: '',
  personType: '常住人口' as PersonType
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入住户姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  idCard: [
    { required: true, message: '请输入身份证号码', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的 18 位身份证号', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  personType: [{ required: true, message: '请选择人员类别', trigger: 'change' }]
}

watch(() => props.visible, (v) => {
  if (v) {
    const p = props.person
    form.name = p?.name ?? ''
    form.gender = p?.gender ?? '男'
    form.idCard = p?.idCard ?? ''
    form.phone = p?.phone ?? ''
    form.personType = p?.personType ?? '常住人口'
  }
})

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !props.household) return
  const base = {
    name: form.name,
    gender: form.gender,
    idCard: form.idCard,
    phone: form.phone,
    personType: form.personType
  }
  if (props.person) {
    emit('save', { ...props.person, ...base })
  } else {
    emit('save', { ...base, id: '', householdId: props.household.id } as Person)
  }
  emit('update:visible', false)
}
</script>
