import type { Household, HouseholdStatus } from '@/types'
import apiClient from './client'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ─── Mock 数据（模块级，模拟"数据库"） ──────────────────────

/** 中文姓氏 */
const surnames = ['张', '李', '王', '赵', '孙', '陈', '刘', '周', '吴', '郑', '马', '胡', '林', '何', '罗', '唐', '韩', '曹', '邓', '彭', '杨', '黄', '许', '沈', '姚', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎', '余', '潘', '戴', '夏', '钟', '汪']
const givenNames = ['建国', '美华', '大军', '小明', '丽丽', '伟强', '桂英', '文博', '秀兰', '海明', '晓东', '艳芬', '志远', '雪琴', '永强', '晓燕', '雪峰', '建国2', '丽华', '志明']

// 状态分配：给每层指定主要状态（交替红色密度）
function getStatus(floor: number, door: number): HouseholdStatus {
  // 用不同的分布让红色占比约一半
  const map: Record<number, HouseholdStatus[]> = {
    1: ['red', 'red', 'yellow', 'green'],
    2: ['red', 'red', 'green', 'yellow'],
    3: ['red', 'yellow', 'red', 'green'],
    4: ['green', 'red', 'red', 'yellow'],
    5: ['red', 'red', 'red', 'green'],
    6: ['yellow', 'red', 'green', 'red'],
    7: ['red', 'green', 'red', 'red'],
    8: ['red', 'red', 'yellow', 'red'],
    9: ['green', 'red', 'red', 'yellow'],
    10: ['red', 'yellow', 'red', 'red']
  }
  const row = map[floor] || ['red', 'yellow', 'green', 'red']
  return row[(door - 1) % 4] || 'green'
}

const userTypeOptions = ['常住居民', '常住居民', '常住居民', '租户', '空置']
const houseTypeOptions = ['商品房', '商品房', '商品房', '公租房']

const generateMockData = (): Household[] => {
  const list: Household[] = []
  for (let floor = 1; floor <= 10; floor++) {
    for (let door = 1; door <= 4; door++) {
      const roomNo = `${floor}0${door}`
      const status = getStatus(floor, door)
      const sIdx = (floor - 1) * 4 + (door - 1)
      list.push({
        roomNo,
        floor,
        door,
        status,
        landlord: `${surnames[sIdx % surnames.length]}${givenNames[sIdx % givenNames.length]}`,
        phone: `138${String(floor).padStart(2, '0')}${String(door).padStart(2, '0')}${String(Math.floor(Math.random() * 90 + 10)).padStart(2, '0')}`,
        userType: userTypeOptions[sIdx % userTypeOptions.length] || '常住居民',
        houseType: houseTypeOptions[sIdx % houseTypeOptions.length] || '商品房',
        lastVisitTime: `2026-${String(Math.floor(Math.random() * 6 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')} ${String(Math.floor(Math.random() * 12 + 8)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
        remark: getRemark(status)
      })
    }
  }
  return list
}

const getRemark = (status: HouseholdStatus): string => {
  if (status === 'red') {
    const remarks = [
      '独居老人，需定期走访',
      '家庭情况复杂，需上门走访',
      '家庭纠纷，需重点关注',
      '存在安全隐患，需立即走访',
      '独居老人，健康状况需关注',
      '多次投诉，需上门了解',
      '新入住，信息待核实',
      '疑似群租，需现场查看'
    ]
    return remarks[Math.floor(Math.random() * remarks.length)] || '需走访'
  }
  if (status === 'yellow') {
    return '信息可能过期，需电话核实'
  }
  return '正常居住，无特殊情况'
}

const mockData: Household[] = generateMockData()

// ─── API 函数 ──────────────────────────────────────────────

/** 获取全部住户列表 */
export async function fetchHouseholds(): Promise<Household[]> {
  if (USE_MOCK) {
    return mockData.map(h => ({ ...h }))
  }
  const res: any = await apiClient.get('/households')
  return res.data as Household[]
}

/** 获取单户详情 */
export async function fetchHouseholdByRoomNo(roomNo: string): Promise<Household> {
  if (USE_MOCK) {
    const found = mockData.find(h => h.roomNo === roomNo)
    if (!found) throw new Error(`未找到住户 ${roomNo}`)
    return { ...found }
  }
  const res: any = await apiClient.get(`/households/${roomNo}`)
  return res.data as Household
}

/** 修改住户信息 */
export async function updateHousehold(roomNo: string, data: Partial<Household>): Promise<Household> {
  if (USE_MOCK) {
    const idx = mockData.findIndex(h => h.roomNo === roomNo)
    if (idx === -1) throw new Error(`未找到住户 ${roomNo}`)
    mockData[idx] = { ...mockData[idx], ...data }
    return { ...mockData[idx] }
  }
  const res: any = await apiClient.put(`/households/${roomNo}`, data)
  return res.data as Household
}
