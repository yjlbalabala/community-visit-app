import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TodoTask } from '@/types'
import { listAllTasks, listZoneTasks, activeItemCountForZone } from '@/api/todoTask'

export const useTodoTaskStore = defineStore('todoTask', () => {
  /** 管理员视角：全部发布任务 */
  const adminTasks = ref<TodoTask[]>([])
  /** 普通用户视角：辖区接收的任务 */
  const zoneTasks = ref<TodoTask[]>([])
  /** 导航角标：辖区未处理任务（按户） */
  const badgeCount = ref(0)
  const loading = ref(false)

  async function refreshAdmin() {
    loading.value = true
    try {
      adminTasks.value = await listAllTasks()
    } finally {
      loading.value = false
    }
  }

  async function refreshZone(zoneId: string) {
    loading.value = true
    try {
      zoneTasks.value = await listZoneTasks(zoneId)
    } finally {
      loading.value = false
    }
  }

  async function refreshBadge(zoneId: string) {
    badgeCount.value = await activeItemCountForZone(zoneId)
  }

  return { adminTasks, zoneTasks, badgeCount, loading, refreshAdmin, refreshZone, refreshBadge }
})
