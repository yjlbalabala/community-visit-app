/** 住户状态 */
export type HouseholdStatus = 'red' | 'yellow' | 'green'

/** 层级节点类型：街道 / 责任区 / 小区 / 单元 */
export type NodeType = 'street' | 'zone' | 'community' | 'unit'

/** 人口统计摘要（每个层级节点都维护一份，与后端统计字段对齐） */
export interface PopulationSummary {
  /** 户数 */
  householdCount: number
  /** 常住人口 */
  permanentPop: number
  /** 流动人口 */
  floatingPop: number
  /** 寄住人口 */
  stayPop: number
}

/** 层级节点（街道/责任区/小区/单元 统一结构，与后端 NodeVO 对齐） */
export interface TreeNode {
  id: string
  parentId: string | null
  nodeType: NodeType
  name: string
  /** 子节点数量（责任区数 / 小区数 / 单元数 / 户数） */
  childCount: number
  summary: PopulationSummary
}

/** 住户信息 — 与后端 HouseholdDTO 对齐 */
export interface Household {
  /** 所属单元 id */
  unitId: string
  roomNo: string
  floor: number
  door: number
  status: HouseholdStatus
  landlord: string
  phone: string
  userType: string
  houseType: string
  /** 居住人数（用于人口统计） */
  memberCount: number
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
