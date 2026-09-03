import type { OperationLog, OperationType } from '@/types'
import apiClient from './client'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ─── Mock 存储（localStorage 持久化，刷新不丢） ──────────────
const STORAGE_KEY = 'cva_operation_logs'
const MAX_KEPT = 200

function loadPersisted(): OperationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OperationLog[]) : []
  } catch {
    return []
  }
}
function savePersisted(list: OperationLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_KEPT)))
  } catch {
    /* 忽略存储异常 */
  }
}

let mockLogs: OperationLog[] = loadPersisted()

/** 获取全部操作记录（最新在前） */
export async function fetchOperationLogs(): Promise<OperationLog[]> {
  if (USE_MOCK) {
    return [...mockLogs].reverse()
  }
  const res: any = await apiClient.get('/operation-logs')
  return res.data as OperationLog[]
}

/** 新增操作记录入参（含完整位置） */
export interface OperationLogInput {
  roomNo: string
  operationType: OperationType
  changesDetail: string
  zoneName?: string
  communityName?: string
  unitName?: string
}

/** 新增操作记录 */
export async function addOperationLog(input: OperationLogInput): Promise<OperationLog> {
  const entry: OperationLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roomNo: input.roomNo,
    operationType: input.operationType,
    changesDetail: input.changesDetail,
    zoneName: input.zoneName,
    communityName: input.communityName,
    unitName: input.unitName,
    operatedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  }

  if (USE_MOCK) {
    mockLogs.push(entry)
    savePersisted(mockLogs)
    return { ...entry }
  }
  const res: any = await apiClient.post('/operation-logs', entry)
  return res.data as OperationLog
}


