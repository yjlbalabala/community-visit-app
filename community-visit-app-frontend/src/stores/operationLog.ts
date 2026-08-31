import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { OperationLog, OperationType } from '@/types'
import { fetchOperationLogs, addOperationLog } from '@/api/operationLog'

export const useOperationLogStore = defineStore('operationLog', () => {
  const logs = ref<OperationLog[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 加载全部操作记录 */
  async function loadLogs() {
    loading.value = true
    error.value = null
    try {
      logs.value = await fetchOperationLogs()
    } catch (e: any) {
      const msg = e?.message || '加载操作记录失败'
      error.value = msg
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  /** 新增操作记录 */
  async function addLog(roomNo: string, operationType: OperationType, changesDetail: string) {
    loading.value = true
    error.value = null
    try {
      const entry = await addOperationLog(roomNo, operationType, changesDetail)
      logs.value.unshift(entry)
      ElMessage.success(`${operationType}操作记录已保存`)
    } catch (e: any) {
      const msg = e?.message || '添加操作记录失败'
      error.value = msg
      ElMessage.error(msg)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { logs, loading, error, loadLogs, addLog }
})
