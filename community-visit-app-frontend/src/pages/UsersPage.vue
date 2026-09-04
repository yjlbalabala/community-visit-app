<template>
  <div class="users-page">
    <el-card shadow="hover">
      <template #header>
        <div class="page-header">
          <span class="card-title">👥 用户管理</span>
          <el-button type="primary" :icon="Plus" @click="openDialog()">新增用户</el-button>
        </div>
      </template>

      <el-table :data="users" stripe border>
        <el-table-column prop="username" label="账号" width="140" />
        <el-table-column label="姓名 / 电话" min-width="180">
          <template #default="{ row }">
            <div>{{ row.name || '—' }}</div>
            <div style="color:#909399;font-size:12px;">{{ row.phone || '未补充' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ row.role === 'admin' ? '管理员' : '责任区用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="管辖责任区" min-width="150">
          <template #default="{ row }">
            {{ zoneName(row.zoneId) || '全部（管理员）' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" :disabled="row.id === 'u-admin'" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑用户 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑用户' : '新增用户'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" label-width="96px" :rules="rules">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" :disabled="!!editing" />
        </el-form-item>
        <el-form-item :label="editing ? '重置密码' : '密码'" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="editing ? '留空则不修改密码' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio value="user">责任区用户</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.role === 'user'" label="管辖责任区" prop="zoneId">
          <el-select v-model="form.zoneId" placeholder="选择一个责任区（一个区只能一人管辖）" style="width:100%">
            <el-option v-for="z in availableZones" :key="z.id" :label="z.name" :value="z.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="可后补：用户姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" placeholder="可后补：联系电话" maxlength="11" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Role, TreeNode, User } from '@/types'
import { fetchZones } from '@/api/hierarchy'
import { fetchUsers, createUser, updateUser, deleteUser } from '@/api/auth'
import { useOperationLogStore } from '@/stores/operationLog'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const opLogStore = useOperationLogStore()

const zones = ref<TreeNode[]>([])
const users = ref<User[]>([])

const dialogVisible = ref(false)
const editing = ref<User | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  username: '',
  password: '',
  role: 'user' as Role,
  zoneId: '',
  name: '',
  phone: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: false, validator: (_r, v, cb) => {
    if (!editing.value && !v) cb(new Error('请输入密码'))
    else cb()
  }, trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  zoneId: [{ required: true, message: '请选择管辖责任区', trigger: 'change' }],
  phone: [{ pattern: /^$|^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}

const zoneName = (id: string | null) => zones.value.find(z => z.id === id)?.name ?? ''

/** 可选责任区：排除已分配给其它普通用户的区（一个区只能一人管辖） */
const availableZones = computed(() => {
  const taken = users.value
    .filter(u => u.role === 'user' && u.id !== editing.value?.id && u.zoneId)
    .map(u => u.zoneId)
  return zones.value.filter(z => !taken.includes(z.id))
})

const loadAll = async () => {
  users.value = await fetchUsers()
}

const openDialog = (user?: User) => {
  editing.value = user ?? null
  form.username = user?.username ?? ''
  form.password = ''
  form.role = user?.role ?? 'user'
  form.zoneId = user?.zoneId ?? ''
  form.name = user?.name ?? ''
  form.phone = user?.phone ?? ''
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const payload = {
    username: form.username,
    password: form.password,
    role: form.role,
    zoneId: form.role === 'user' ? form.zoneId : null,
    name: form.name,
    phone: form.phone
  }
  try {
    if (editing.value) {
      await updateUser(editing.value.id, payload)
      await opLogStore.addLog({
        roomNo: '',
        operationType: '用户管理',
        changesDetail: `修改用户「${payload.username}」`
      })
      ElMessage.success('用户已更新')
    } else {
      await createUser(payload)
      await opLogStore.addLog({
        roomNo: '',
        operationType: '用户管理',
        changesDetail: `创建用户「${payload.username}」（角色：${payload.role === 'admin' ? '管理员' : zoneName(payload.zoneId) || '责任区'}）`
      })
      ElMessage.success('用户已创建')
    }
    dialogVisible.value = false
    await loadAll()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

const handleDelete = async (user: User) => {
  ElMessageBox.confirm(`确认删除用户「${user.username}」？`, '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await deleteUser(user.id)
      await opLogStore.addLog({
        roomNo: '',
        operationType: '用户管理',
        changesDetail: `删除用户「${user.username}」`
      })
      ElMessage.success('用户已删除')
      await loadAll()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(async () => {
  zones.value = await fetchZones()
  await loadAll()
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-weight: 600;
}
</style>
