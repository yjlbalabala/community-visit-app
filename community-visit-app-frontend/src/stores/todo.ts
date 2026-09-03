import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchScopeTodos, type TodoItem, type TodoScope } from '@/api/todo'

export const useTodoStore = defineStore('todo', () => {
  const items = ref<TodoItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 按范围加载待办（责任区/小区/单元） */
  async function load(scope: TodoScope) {
    loading.value = true
    error.value = null
    try {
      items.value = await fetchScopeTodos(scope)
    } catch (e: any) {
      const msg = e?.message || '加载待办事项失败'
      error.value = msg
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load }
})
