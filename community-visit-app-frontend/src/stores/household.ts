import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Household } from '@/types'
import { fetchHouseholds, updateHousehold } from '@/api/household'

export const useHouseholdStore = defineStore('household', () => {
  // ─── State ─────────────────────────────────────────────
  const list = ref<Household[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 已确认完成的待办（房号集合），不修改住户数据，只标记待办已处理 */
  const completedTodos = ref<Set<string>>(new Set())

  // ─── Getters ───────────────────────────────────────────

  /** 待办事项：status === 'red' 且未被确认完成的住户 */
  const todoList = computed(() =>
    list.value.filter(h => h.status === 'red' && !completedTodos.value.has(h.roomNo))
  )

  /** 按房号查找住户 */
  const findByRoomNo = (roomNo: string) => list.value.find(h => h.roomNo === roomNo)

  // ─── Actions ───────────────────────────────────────────

  /** 加载全部住户 */
  async function loadList() {
    loading.value = true
    error.value = null
    try {
      list.value = await fetchHouseholds()
    } catch (e: any) {
      const msg = e?.message || '加载住户数据失败'
      error.value = msg
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  /** 修改住户信息 */
  async function edit(roomNo: string, data: Partial<Household>) {
    loading.value = true
    error.value = null
    try {
      const updated = await updateHousehold(roomNo, data)
      // 本地同步更新
      const idx = list.value.findIndex(h => h.roomNo === roomNo)
      if (idx !== -1) list.value[idx] = updated
      // 变更信息后，该待办重新激活（如果状态仍为 red）
      completedTodos.value.delete(roomNo)
      ElMessage.success(`住户 ${roomNo} 信息修改成功`)
      return updated
    } catch (e: any) {
      const msg = e?.message || '修改住户信息失败'
      error.value = msg
      ElMessage.error(msg)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 确认待办完成（不修改住户数据，仅标记已处理） */
  function markTodoDone(roomNo: string) {
    completedTodos.value.add(roomNo)
  }

  return { list, loading, error, completedTodos, todoList, findByRoomNo, loadList, edit, markTodoDone }
})
