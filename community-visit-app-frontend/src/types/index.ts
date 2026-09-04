/** 房屋类别（户级，决定单元格颜色） */
export type HouseType = '自购房' | '出租房' | '群租房'

/** 人员类别（统计口径：常住 / 寄住 / 流动） */
export type PersonType = '常住人口' | '寄住人口' | '流动人口'

/** 性别 */
export type Gender = '男' | '女'

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

/** 住户内的人员（一户可多人，与后端 Person 表对齐） */
export interface Person {
  id: string
  householdId: string
  /** 住户姓名 */
  name: string
  /** 住户性别 */
  gender: Gender
  /** 身份证号码（18 位，全局唯一标识） */
  idCard: string
  /** 手机号码 */
  phone: string
  /** 人员类别 */
  personType: PersonType
}

/** 住户信息 — 与后端 HouseholdDTO 对齐 */
export interface Household {
  id: string
  /** 所属单元 id */
  unitId: string
  roomNo: string
  floor: number
  door: number
  /** 房屋类别：自购房 / 出租房 / 群租房（决定单元格颜色） */
  houseType: HouseType
  /** 房主（默认取首位人员） */
  landlord: string
  /** 联系电话 */
  phone: string
  /** 情况说明 / 走访备注 */
  remark: string
  /** 上次走访时间（空串 = 从未走访） */
  lastVisitTime: string
  /** 管理员下发的走访任务指定时间（有效时覆盖规则计算的下次走访时间） */
  adminVisitTime?: string
  /** 走访任务过期后，以管理员指定时间为基点顺延得到的下次走访基准（有效时覆盖规则计算） */
  expiredBaseVisitTime?: string
  /** 该户全部人员 */
  persons: Person[]
}

/** 角色：管理员 / 普通用户（一个普通用户只管辖一个责任区） */
export type Role = 'admin' | 'user'

/** 系统用户 — 与后端 User 表对齐 */
export interface User {
  id: string
  username: string
  password: string
  role: Role
  /** 姓名（管理员创建后可补充） */
  name: string
  /** 电话（管理员创建后可补充） */
  phone: string
  /** 管辖责任区 id（普通用户必填且全库唯一；管理员为空 = 全部） */
  zoneId: string | null
}

/** 操作类别（含后续用户管理等分类） */
export type OperationType = '变更信息' | '确认走访' | '用户管理' | '待办事项'

/** 操作记录 — 与后端 OperationLog 对齐 */
export interface OperationLog {
  id: string
  roomNo: string
  /** 完整位置：责任区 / 小区 / 单元（可选，旧数据可能为空） */
  zoneName?: string
  communityName?: string
  unitName?: string
  /** 单元 id（用于点击住户位置跳转到单元格视图） */
  unitId?: string
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



// ─── 走访任务（管理员下发 → 责任区用户执行） ────────────────

/** 任务明细状态 */
export type TaskItemStatus = 'active' | 'done' | 'expired'

/** 走访任务中的一户明细（每户独立状态） */
export interface TodoTaskItem {
  itemId: string
  taskId: string
  householdId: string
  unitId: string
  zoneId: string
  communityId: string
  zoneName: string
  communityName: string
  unitName: string
  roomNo: string
  houseType: HouseType
  landlord: string
  personsCount: number
  /** 发布时上次走访时间快照 */
  lastVisitTime: string
  /** 发布时规则计算的下次走访时间快照 */
  expectedVisitTime: string | null
  status: TaskItemStatus
  /** 成功确认走访时间（done） */
  visitedAt?: string
  /** 过期处理时间（expired） */
  expiredAt?: string
}

/** 走访任务（一次下发 = 一个任务，含多户明细） */
export interface TodoTask {
  id: string
  /** 接收的责任区 */
  zoneId: string
  zoneName: string
  /** 接收用户账号名 */
  assigneeUsername: string
  /** 管理员指定的走访时间（截止）T */
  scheduledVisitTime: string
  /** 情况说明（可空） */
  remark: string
  createdAt: string
  items: TodoTaskItem[]
}

