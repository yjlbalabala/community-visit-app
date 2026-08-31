import type { OperationLog, OperationType } from '@/types'
import apiClient from './client'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ─── Mock 存储 ─────────────────────────────────────────────
const mockLogs: OperationLog[] = []

/** 获取全部操作记录（最新在前） */
export async function fetchOperationLogs(): Promise<OperationLog[]> {
  if (USE_MOCK) {
    return [...mockLogs].reverse()
  }
  const res: any = await apiClient.get('/operation-logs')
  return res.data as OperationLog[]
}

/** 新增操作记录 */
export async function addOperationLog(
  roomNo: string,
  operationType: OperationType,
  changesDetail: string
): Promise<OperationLog> {
  const entry: OperationLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roomNo,
    operationType,
    changesDetail,
    operatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  }

  if (USE_MOCK) {
    mockLogs.push(entry)
    return { ...entry }
  }
  const res: any = await apiClient.post('/operation-logs', entry)
  return res.data as OperationLog
}
