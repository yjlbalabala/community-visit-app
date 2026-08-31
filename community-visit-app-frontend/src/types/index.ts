/** 住户状态 */
export type HouseholdStatus = 'red' | 'yellow' | 'green'

/** 住户信息 — 与后端 HouseholdDTO 对齐 */
export interface Household {
  roomNo: string
  floor: number
  door: number
  status: HouseholdStatus
  landlord: string
  phone: string
  userType: string
  houseType: string
  lastVisitTime: string
  remark: string
}

/** 操作类别 */
export type OperationType = '变更信息' | '确认走访'

/** 操作记录 — 与后端 OperationLog 对齐 */
export interface OperationLog {
  id: string
  roomNo: string
  operationType: OperationType
  /** JSON 字符串：变更前后的字段对比 */
  changesDetail: string
  operatedAt: string
}

/** 统一 API 响应 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
