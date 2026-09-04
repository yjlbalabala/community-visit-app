import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { login as apiLogin } from '@/api/auth'

const SESSION_KEY = 'cva_current_user'

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(loadSession())

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  /** 普通用户的管辖责任区 id（管理员为空） */
  const userZoneId = computed(() => currentUser.value?.role === 'user' ? currentUser.value?.zoneId ?? null : null)

  function saveSession() {
    try {
      if (currentUser.value) localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser.value))
      else localStorage.removeItem(SESSION_KEY)
    } catch { /* 忽略 */ }
  }

  async function login(username: string, password: string) {
    const user = await apiLogin(username, password)
    currentUser.value = user
    saveSession()
    return user
  }

  function logout() {
    currentUser.value = null
    saveSession()
  }

  return { currentUser, isLoggedIn, isAdmin, userZoneId, login, logout }
})
