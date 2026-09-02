import type { Gender, HouseType, Household, Person, PersonType, TreeNode } from '@/types'

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

/** 按权重取一个值（权重数组累计概率约为 1） */
function pickWeighted<T>(rng: () => number, weights: Array<[T, number]>): T {
  let r = rng()
  for (const [value, w] of weights) {
    if (r < w) return value
    r -= w
  }
  return (weights[weights.length - 1]?.[0] ?? (weights[0]?.[0] as T))
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

// 房屋类别权重：自购房 / 出租房 / 群租房
const HOUSE_TYPE_WEIGHTS: Array<[HouseType, number]> = [
  ['自购房', 0.62], ['出租房', 0.32], ['群租房', 0.06]
]

/** 各房屋类别下居住人数分布（0 = 空户，群租房人数较多） */
const PERSON_COUNT_WEIGHTS: Record<HouseType, Array<[number, number]>> = {
  自购房: [[0, 0.05], [1, 0.12], [2, 0.34], [3, 0.30], [4, 0.13], [5, 0.04], [6, 0.02]],
  出租房: [[0, 0.03], [1, 0.10], [2, 0.31], [3, 0.31], [4, 0.16], [5, 0.05], [6, 0.02], [7, 0.012], [8, 0.005], [9, 0.002], [10, 0.001]],
  群租房: [[5, 0.06], [6, 0.12], [7, 0.16], [8, 0.18], [9, 0.18], [10, 0.14], [11, 0.10], [12, 0.06]]
}

/** 各房屋类别下人员类别分布（与统计口径一致） */
const PERSON_TYPE_WEIGHTS: Record<HouseType, Array<[PersonType, number]>> = {
  自购房: [['常住人口', 0.90], ['寄住人口', 0.07], ['流动人口', 0.03]],
  出租房: [['流动人口', 0.55], ['常住人口', 0.25], ['寄住人口', 0.20]],
  群租房: [['流动人口', 0.60], ['常住人口', 0.20], ['寄住人口', 0.20]]
}

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

const roomNoOf = (floor: number, door: number): string => `${floor}0${door}`

/** 房屋形态（房屋类别 + 居住人数），summary 与完整生成共用同一随机序列 */
function rollShape(unitId: string, idx: number): { houseType: HouseType; personCount: number } {
  const rng = rngFor(`hs:${unitId}:${idx}`)
  const houseType = pickWeighted(rng, HOUSE_TYPE_WEIGHTS)
  const personCount = pickWeighted(rng, PERSON_COUNT_WEIGHTS[houseType])
  return { houseType, personCount }
}

function pickPersonType(unitId: string, idx: number, j: number, houseType: HouseType): PersonType {
  const rng = rngFor(`pt:${unitId}:${idx}:${j}`)
  return pickWeighted(rng, PERSON_TYPE_WEIGHTS[houseType])
}

function genIdCard(unitId: string, idx: number, j: number): string {
  const rng = rngFor(`ic:${unitId}:${idx}:${j}`)
  const year = 1940 + Math.floor(rng() * 73) // 1940-2012
  const month = 1 + Math.floor(rng() * 12)
  const day = 1 + Math.floor(rng() * 28)
  const birth = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
  const seq = String(Math.floor(rng() * 1000)).padStart(3, '0')
  const check = '0123456789X'[Math.floor(rng() * 11)] ?? '0'
  return `320113${birth}${seq}${check}`
}

function genPhone(unitId: string, idx: number, j: number): string {
  const rng = rngFor(`ph:${unitId}:${idx}:${j}`)
  const head = '135789'[Math.floor(rng() * 5)] ?? '1'
  return `1${head}${Array.from({ length: 9 }, () => Math.floor(rng() * 10)).join('')}`
}

function rollPerson(unitId: string, idx: number, j: number, householdId: string, houseType: HouseType): Person {
  const typeRng = rngFor(`pt:${unitId}:${idx}:${j}`)
  const genderRng = rngFor(`g:${unitId}:${idx}:${j}`)
  const nameRng = rngFor(`nm:${unitId}:${idx}:${j}`)
  const surname = surnames[Math.floor(nameRng() * surnames.length)] ?? '王'
  const given = givenNames[Math.floor(nameRng() * givenNames.length)] ?? '伟'
  const personType = pickWeighted(typeRng, PERSON_TYPE_WEIGHTS[houseType])
  const gender: Gender = genderRng() < 0.5 ? '男' : '女'
  return {
    id: `${householdId}-p${j + 1}`,
    householdId,
    name: `${surname}${given}`,
    gender,
    idCard: genIdCard(unitId, idx, j),
    phone: genPhone(unitId, idx, j),
    personType
  }
}

function remarkOf(houseType: HouseType, personCount: number): string {
  if (personCount === 0) return '空户，暂无登记人员'
  const base = houseType === '群租房' ? '群租房，人员较多，重点关注'
    : houseType === '出租房' ? '出租房，需按 3 个月周期走访核实'
    : '自购房，正常居住'
  return personCount > 8 ? `${base}；居住人数超 8，需重点关注` : base
}

function lastVisitOf(unitId: string, idx: number, personCount: number): string {
  if (personCount === 0) return ''
  const rng = rngFor(`lv:${unitId}:${idx}`)
  // 偏近期的天数分布（0-400 天前），保证按走访规则演示时各楼都有合理待办
  const daysAgo = Math.floor(Math.pow(rng(), 2) * 400)
  const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  const hour = 8 + Math.floor(rng() * 11)
  const minute = Math.floor(rng() * 60)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hour)}:${p(minute)}:00`
}

function rollHousehold(unitId: string, idx: number, floors: number, doors: number): Household {
  const { houseType, personCount } = rollShape(unitId, idx)
  const householdId = `${unitId}-hh${idx}`
  const persons: Person[] = []
  for (let j = 0; j < personCount; j++) {
    persons.push(rollPerson(unitId, idx, j, householdId, houseType))
  }
  const floor = Math.floor(idx / doors) + 1
  const door = (idx % doors) + 1
  const first = persons[0]
  return {
    id: householdId,
    unitId,
    roomNo: roomNoOf(floor, door),
    floor,
    door,
    houseType,
    landlord: first?.name ?? '未登记',
    phone: first?.phone ?? '',
    remark: remarkOf(houseType, personCount),
    lastVisitTime: lastVisitOf(unitId, idx, personCount),
    persons
  }
}

/** 仅统计用：返回该户 常住/流动/寄住 人口数（与完整生成一致） */
function rollSummary(unitId: string, idx: number): { permanent: number; floating: number; stay: number } {
  const { houseType, personCount } = rollShape(unitId, idx)
  const sum = { permanent: 0, floating: 0, stay: 0 }
  for (let j = 0; j < personCount; j++) {
    const t = pickPersonType(unitId, idx, j, houseType)
    if (t === '常住人口') sum.permanent++
    else if (t === '流动人口') sum.floating++
    else sum.stay++
  }
  return sum
}

// ─── 层级树构建 ─────────────────────────────────────────────

function emptySummary() {
  return { householdCount: 0, permanentPop: 0, floatingPop: 0, stayPop: 0 }
}

function addSummary(target: ReturnType<typeof emptySummary>, source: ReturnType<typeof emptySummary>) {
  target.householdCount += source.householdCount
  target.permanentPop += source.permanentPop
  target.floatingPop += source.floatingPop
  target.stayPop += source.stayPop
}

function mergeSummary(target: ReturnType<typeof emptySummary>, source: ReturnType<typeof emptySummary>) {
  addSummary(target, source)
}

interface BuiltTree {
  street: TreeNode
  zones: TreeNode[]
  communitiesByZone: Map<string, TreeNode[]>
  unitsByCommunity: Map<string, TreeNode[]>
}

function buildTree(): BuiltTree {
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

        const { floors, doors } = getUnitLayout(unitId)
        const householdCount = floors * doors
        for (let idx = 0; idx < householdCount; idx++) {
          const s = rollSummary(unitId, idx)
          unit.summary.householdCount += 1
          unit.summary.permanentPop += s.permanent
          unit.summary.floatingPop += s.floating
          unit.summary.stayPop += s.stay
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

// ─── 对外暴露的层级 Mock 数据 ──────────────────────────────

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

function cloneHousehold(h: Household): Household {
  return { ...h, persons: h.persons.map(p => ({ ...p })) }
}

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

function findHousehold(unitId: string, householdId: string): Household {
  const h = getUnitHouseholds(unitId).find(x => x.id === householdId)
  if (!h) throw new Error(`未找到住户 ${householdId}`)
  return h
}

export function updateUnitHousehold(unitId: string, householdId: string, data: Partial<Household>): Household {
  const list = getUnitHouseholds(unitId)
  const idx = list.findIndex(h => h.id === householdId)
  if (idx === -1) throw new Error(`未找到住户 ${householdId}`)
  const h = list[idx]!
  list[idx] = { ...h, ...data, persons: h.persons }
  return cloneHousehold(list[idx]!)
}

/** 确认走访完成：更新上次走访时间为当前时间 */
export function confirmUnitVisit(unitId: string, householdId: string): Household {
  const list = getUnitHouseholds(unitId)
  const idx = list.findIndex(h => h.id === householdId)
  if (idx === -1) throw new Error(`未找到住户 ${householdId}`)
  const h = list[idx]!
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
  list[idx] = { ...h, lastVisitTime: ts }
  return cloneHousehold(list[idx]!)
}

/** 新增人员；若该户此前无登记，则自动把房主/电话设为新增人员 */
export function addUnitPerson(unitId: string, householdId: string, person: Omit<Person, 'id' | 'householdId'>): Household {
  const list = getUnitHouseholds(unitId)
  const idx = list.findIndex(h => h.id === householdId)
  if (idx === -1) throw new Error(`未找到住户 ${householdId}`)
  const h = list[idx]!
  const newPerson: Person = {
    ...person,
    id: `${householdId}-p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    householdId
  }
  const persons = [...h.persons, newPerson]
  const landlord = h.persons.length === 0 ? newPerson.name : h.landlord
  const phone = h.persons.length === 0 ? newPerson.phone : h.phone
  list[idx] = { ...h, persons, landlord, phone, remark: remarkOf(h.houseType, persons.length) }
  return cloneHousehold(list[idx]!)
}

export function updateUnitPerson(unitId: string, householdId: string, personId: string, data: Partial<Person>): Household {
  const list = getUnitHouseholds(unitId)
  const idx = list.findIndex(h => h.id === householdId)
  if (idx === -1) throw new Error(`未找到住户 ${householdId}`)
  const h = list[idx]!
  const pi = h.persons.findIndex(p => p.id === personId)
  if (pi === -1) throw new Error(`未找到人员 ${personId}`)
  const persons = h.persons.map(p => (p.id === personId ? { ...p, ...data } : p))
  list[idx] = { ...h, persons }
  return cloneHousehold(list[idx]!)
}

export function removeUnitPerson(unitId: string, householdId: string, personId: string): Household {
  const list = getUnitHouseholds(unitId)
  const idx = list.findIndex(h => h.id === householdId)
  if (idx === -1) throw new Error(`未找到住户 ${householdId}`)
  const h = list[idx]!
  const persons = h.persons.filter(p => p.id !== personId)

  let landlord = h.landlord
  let phone = h.phone
  if (persons.length === 0) {
    // 人员清空 → 空户
    landlord = '未登记'
    phone = ''
  } else if (landlord === '未登记' || !persons.some(p => p.name === landlord)) {
    // 房主被删除或未登记 → 由首位人员接管房主/电话
    const first = persons[0]!
    landlord = first.name
    phone = first.phone
  }

  list[idx] = { ...h, persons, landlord, phone, remark: remarkOf(h.houseType, persons.length) }
  return cloneHousehold(list[idx]!)
}




