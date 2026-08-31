import type { Household, HouseholdStatus, TreeNode } from '@/types'

// ─── 确定性伪随机（种子可复现，保证刷新后数据稳定） ──────────────

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rngFor = (seed: string): (() => number) => mulberry32(hashString(seed))

/** 按权重取一个值（权重数组需按累计概率升序） */
function pickWeighted<T>(rng: () => number, weights: Array<[T, number]>): T {
  let r = rng()
  for (const [value, w] of weights) {
    if (r < w) return value
    r -= w
  }
  const last = weights[weights.length - 1]
  return last ? last[0] : (weights[0] ? weights[0][0] : (undefined as unknown as T))
}

// ─── 常量池 ────────────────────────────────────────────────

/** 西岗街道 id 与名称 */
export const STREET_ID = 'street-xigang'
export const STREET_NAME = '西岗街道'

/** 西岗街道下辖 12 个责任区 */
const ZONE_NAMES = [
  '万达茂', '广志路', '仙林湖南', '仙林湖北', '孟北', '西花',
  '东阳', '观梅', '听竹', '闻兰', '齐民路', '西岗'
]

const COMMUNITY_SUFFIXES = [
  '家园', '花苑', '华庭', '雅苑', '名邸', '公寓', '花园', '嘉园',
  '丽都', '馨园', '府邸', '和园', '新村', '尚城', '公馆', '别院'
]

const surnames = [
  '张', '李', '王', '赵', '孙', '陈', '刘', '周', '吴', '郑', '马', '胡', '林', '何', '罗', '唐',
  '韩', '曹', '邓', '彭', '杨', '黄', '许', '沈', '姚', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛',
  '叶', '阎', '余', '潘', '戴', '夏', '钟', '汪'
]
const givenNames = [
  '建国', '美华', '大军', '小明', '丽丽', '伟强', '桂英', '文博', '秀兰', '海明',
  '晓东', '艳芬', '志远', '雪琴', '永强', '晓燕', '雪峰', '丽华', '志明', '雅婷'
]

// 状态权重：红 15% / 黄 30% / 绿 55%（红色=需走访，数量适中，避免待办过多）
const STATUS_WEIGHTS: Array<[HouseholdStatus, number]> = [
  ['red', 0.15], ['yellow', 0.3], ['green', 0.55]
]

// 住户性质权重：常住 / 租户（流动）/ 寄住 / 空置
const USER_TYPE_WEIGHTS: Array<[string, number]> = [
  ['常住居民', 0.55], ['租户', 0.3], ['寄住', 0.1], ['空置', 0.05]
]

const HOUSE_TYPE_WEIGHTS: Array<[string, number]> = [
  ['商品房', 0.7], ['公租房', 0.3]
]

// 居住人数权重（1-5 人，加权平均约 3.1，使全街道总人口落在 14~15 万）
const MEMBER_WEIGHTS: Array<[number, number]> = [
  [1, 0.06], [2, 0.26], [3, 0.32], [4, 0.24], [5, 0.12]
]

// ─── 单元内住户的确定性生成 ───────────────────────────────

export interface UnitLayout {
  floors: number
  doors: number
}

/** 每个单元的建筑布局（楼层 × 每层户数），由单元 id 确定性推导 */
export function getUnitLayout(unitId: string): UnitLayout {
  const rng = rngFor(`layout:${unitId}`)
  const floors = 5 + Math.floor(rng() * 6) // 5-10 层
  const doors = 3 + Math.floor(rng() * 2)  // 每层 3-4 户
  return { floors, doors }
}

/** 只做统计所需的三项抽取（与 rollHousehold 前 4 个随机数消费顺序一致） */
function rollSummary(unitId: string, idx: number): { status: HouseholdStatus; userType: string; memberCount: number } {
  const rng = rngFor(`h:${unitId}:${idx}`)
  const status = pickWeighted(rng, STATUS_WEIGHTS)
  const userType = pickWeighted(rng, USER_TYPE_WEIGHTS)
  pickWeighted(rng, HOUSE_TYPE_WEIGHTS) // 消费与完整生成一致的随机数
  const memberCount = userType === '空置' ? 0 : pickWeighted(rng, MEMBER_WEIGHTS)
  return { status, userType, memberCount }
}

function getRemark(status: HouseholdStatus, rng: () => number): string {
  if (status === 'red') {
    const remarks = [
      '独居老人，需定期走访', '家庭情况复杂，需上门走访', '家庭纠纷，需重点关注',
      '存在安全隐患，需立即走访', '独居老人，健康状况需关注', '多次投诉，需上门了解',
      '新入住，信息待核实', '疑似群租，需现场查看'
    ]
    return remarks[Math.floor(rng() * remarks.length)] ?? '需走访'
  }
  if (status === 'yellow') return '信息可能过期，需电话核实'
  return '正常居住，无特殊情况'
}

/** 生成某单元下的一户（idx 从 0 开始，按楼层×门牌顺序排列） */
function rollHousehold(unitId: string, idx: number, floors: number, doors: number): Household {
  const rng = rngFor(`h:${unitId}:${idx}`)
  const status = pickWeighted(rng, STATUS_WEIGHTS)
  const userType = pickWeighted(rng, USER_TYPE_WEIGHTS)
  const houseType = pickWeighted(rng, HOUSE_TYPE_WEIGHTS)
  const memberCount = userType === '空置' ? 0 : pickWeighted(rng, MEMBER_WEIGHTS)

  const floor = Math.floor(idx / doors) + 1
  const door = (idx % doors) + 1
  const roomNo = `${floor}0${door}`

  const surname = surnames[Math.floor(rng() * surnames.length)] ?? '王'
  const given = givenNames[Math.floor(rng() * givenNames.length)] ?? '伟'
  const phone = `13${String(8 + Math.floor(rng() * 2))}${Array.from({ length: 8 }, () => Math.floor(rng() * 10)).join('')}`
  const lastVisitTime =
    `2026-${String(1 + Math.floor(rng() * 8)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}` +
    ` ${String(8 + Math.floor(rng() * 12)).padStart(2, '0')}:${String(Math.floor(rng() * 60)).padStart(2, '0')}:00`

  return {
    unitId,
    roomNo,
    floor,
    door,
    status,
    landlord: `${surname}${given}`,
    phone,
    userType,
    houseType,
    memberCount,
    lastVisitTime,
    remark: getRemark(status, rng)
  }
}

// ─── 层级树构建 ─────────────────────────────────────────────

function emptySummary() {
  return { householdCount: 0, permanentPop: 0, floatingPop: 0, stayPop: 0 }
}

function addPop(summary: ReturnType<typeof emptySummary>, userType: string, memberCount: number) {
  if (userType === '常住居民') summary.permanentPop += memberCount
  else if (userType === '租户') summary.floatingPop += memberCount
  else if (userType === '寄住') summary.stayPop += memberCount
}

function mergeSummary(target: ReturnType<typeof emptySummary>, source: ReturnType<typeof emptySummary>) {
  target.householdCount += source.householdCount
  target.permanentPop += source.permanentPop
  target.floatingPop += source.floatingPop
  target.stayPop += source.stayPop
}

interface BuiltTree {
  street: TreeNode
  zones: TreeNode[]
  communitiesByZone: Map<string, TreeNode[]>
  unitsByCommunity: Map<string, TreeNode[]>
}

function buildTree(): BuiltTree {
  const nodeMap = new Map<string, TreeNode>()
  const zones: TreeNode[] = []
  const communitiesByZone = new Map<string, TreeNode[]>()
  const unitsByCommunity = new Map<string, TreeNode[]>()

  const street: TreeNode = {
    id: STREET_ID,
    parentId: null,
    nodeType: 'street',
    name: STREET_NAME,
    childCount: ZONE_NAMES.length,
    summary: emptySummary()
  }
  nodeMap.set(street.id, street)

  ZONE_NAMES.forEach((zoneName, zi) => {
    const zoneId = `zone-${zi}`
    const zone: TreeNode = {
      id: zoneId,
      parentId: STREET_ID,
      nodeType: 'zone',
      name: zoneName,
      childCount: 0,
      summary: emptySummary()
    }
    nodeMap.set(zone.id, zone)

    const zoneRng = rngFor(`zone:${zoneId}`)
    const communityCount = 6 + Math.floor(zoneRng() * 6) // 6-11 个小区
    const communities: TreeNode[] = []

    for (let ci = 0; ci < communityCount; ci++) {
      const commId = `${zoneId}-c${ci}`
      const suffix = COMMUNITY_SUFFIXES[ci % COMMUNITY_SUFFIXES.length] ?? '家园'
      const comm: TreeNode = {
        id: commId,
        parentId: zoneId,
        nodeType: 'community',
        name: `${zoneName}${suffix}`,
        childCount: 0,
        summary: emptySummary()
      }
      nodeMap.set(comm.id, comm)

      const commRng = rngFor(`community:${commId}`)
      const unitCount = 14 + Math.floor(commRng() * 11) // 14-24 个单元
      const units: TreeNode[] = []

      for (let ui = 0; ui < unitCount; ui++) {
        const unitId = `${commId}-u${ui}`
        const unit: TreeNode = {
          id: unitId,
          parentId: commId,
          nodeType: 'unit',
          name: `${ui + 1}号楼`,
          childCount: 0,
          summary: emptySummary()
        }
        nodeMap.set(unit.id, unit)

        const { floors, doors } = getUnitLayout(unitId)
        const householdCount = floors * doors
        for (let idx = 0; idx < householdCount; idx++) {
          const s = rollSummary(unitId, idx)
          unit.summary.householdCount += 1
          addPop(unit.summary, s.userType, s.memberCount)
        }
        unit.childCount = unit.summary.householdCount

        units.push(unit)
        mergeSummary(comm.summary, unit.summary)
        comm.childCount += 1
      }

      unitsByCommunity.set(commId, units)
      communities.push(comm)
      communitiesByZone.set(zoneId, communities)
      mergeSummary(zone.summary, comm.summary)
      zone.childCount += 1
    }

    zones.push(zone)
    mergeSummary(street.summary, zone.summary)
  })

  return { street, zones, communitiesByZone, unitsByCommunity }
}

// ─── 对外暴露的 Mock 数据 ──────────────────────────────────

const tree = buildTree()
const nodeMap = new Map<string, TreeNode>()
{
  nodeMap.set(tree.street.id, tree.street)
  for (const z of tree.zones) {
    nodeMap.set(z.id, z)
    for (const c of tree.communitiesByZone.get(z.id) ?? []) {
      nodeMap.set(c.id, c)
      for (const u of tree.unitsByCommunity.get(c.id) ?? []) nodeMap.set(u.id, u)
    }
  }
}

export function fetchMockZones(): TreeNode[] {
  return tree.zones.map(n => ({ ...n }))
}

export function fetchMockCommunities(zoneId: string): TreeNode[] {
  return (tree.communitiesByZone.get(zoneId) ?? []).map(n => ({ ...n }))
}

export function fetchMockUnits(communityId: string): TreeNode[] {
  return (tree.unitsByCommunity.get(communityId) ?? []).map(n => ({ ...n }))
}

export function findMockNode(id: string): TreeNode | undefined {
  const n = nodeMap.get(id)
  return n ? { ...n } : undefined
}

/** 返回 id 节点到街道的完整路径（街道在前） */
export function findMockPath(id: string): TreeNode[] {
  const path: TreeNode[] = []
  let cur: TreeNode | undefined = nodeMap.get(id)
  while (cur) {
    path.unshift({ ...cur })
    cur = cur.parentId ? nodeMap.get(cur.parentId) : undefined
  }
  return path
}

// ─── 单元住户的读取与修改（内存缓存，模拟数据库） ────────────

const householdCache = new Map<string, Household[]>()

export function getUnitHouseholds(unitId: string): Household[] {
  let list = householdCache.get(unitId)
  if (!list) {
    const { floors, doors } = getUnitLayout(unitId)
    const count = floors * doors
    list = Array.from({ length: count }, (_, idx) => rollHousehold(unitId, idx, floors, doors))
    householdCache.set(unitId, list)
  }
  return list
}

export function updateUnitHousehold(unitId: string, roomNo: string, data: Partial<Household>): Household {
  const list = getUnitHouseholds(unitId)
  const idx = list.findIndex(h => h.roomNo === roomNo)
  if (idx === -1) throw new Error(`未找到住户 ${roomNo}`)
  list[idx] = { ...list[idx], ...data } as Household
  return { ...list[idx] }
}





