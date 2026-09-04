<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">🏘️ 走访登记可视化系统</div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="账号" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>

      <div class="login-hint">
        <div class="hint-title">演示账号</div>
        <div>管理员：admin / 123456（可查看管理所有责任区）</div>
        <div>责任区用户：wangda / 123456（管辖：万达茂）</div>
        <div>责任区用户：guangzhi / 123456（管辖：广志路）</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await authStore.login(form.username.trim(), form.password)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (e: any) {
    ElMessage.error(e?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2d6bb5 0%, #4a90d9 60%, #7fb3e8 100%);
}
.login-card {
  width: 400px;
  background: #fff;
  border-radius: 10px;
  padding: 32px 36px 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
}
.login-title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 24px;
  color: #303133;
  letter-spacing: 2px;
}
.login-btn {
  width: 100%;
}
.login-hint {
  margin-top: 20px;
  padding: 12px 14px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.9;
}
.hint-title {
  font-weight: 600;
  color: #606266;
}
</style>
