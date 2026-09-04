import type { NodeType } from '@/types'
import apiClient from './client'
import { fetchMockZones, fetchMockCommunities, fetchMockUnits, getUnitHouseholds } from './mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 统计范围：责任区 / 小区 / 单元 */
export interface AreaScope {
  nodeType: NodeType
  id: string
}

/** 某区域的人口与房屋统计（按住户当前数据实时聚合） */
export interface AreaStats {
  /** 户数 */
  householdCount: number
  /** 总人口 */
  totalPop: number
  permanentPop: number
  floatingPop: number
  stayPop: number
  /** 房屋类别户数 */
  selfOwned: number
  rental: number
  groupRental: number
}

interface UnitCtx {
  zoneId: string
  communityId: string
  unitId: string
}

function collectScopeUnits(scope: AreaScope): UnitCtx[] {
  const out: UnitCtx[] = []
  for (const z of fetchMockZones()) {
    if (scope.nodeType === 'zone' && z.id !== scope.id) continue
    for (const c of fetchMockCommunities(z.id)) {
      if (scope.nodeType === 'community' && c.id !== scope.id) continue
      for (const u of fetchMockUnits(c.id)) {
        if (scope.nodeType === 'unit' && u.id !== scope.id) continue
        out.push({ zoneId: z.id, communityId: c.id, unitId: u.id })
      }
    }
  }
  return out
}

function emptyStats(): AreaStats {
  return {
    householdCount: 0, totalPop: 0,
    permanentPop: 0, floatingPop: 0, stayPop: 0,
    selfOwned: 0, rental: 0, groupRental: 0
  }
}

/** 获取某区域人口与房屋统计 */
export async function fetchAreaStats(scope: AreaScope): Promise<AreaStats> {
  if (!USE_MOCK) {
    const res: any = await apiClient.get('/stats', { params: { nodeType: scope.nodeType, id: scope.id } })
    return res.data as AreaStats
  }
  const stats = emptyStats()
  for (const ctx of collectScopeUnits(scope)) {
    for (const h of getUnitHouseholds(ctx.unitId)) {
      stats.householdCount += 1
      if (h.houseType === '自购房') stats.selfOwned += 1
      else if (h.houseType === '出租房') stats.rental += 1
      else stats.groupRental += 1
      for (const p of h.persons) {
        stats.totalPop += 1
        if (p.personType === '常住人口') stats.permanentPop += 1
        else if (p.personType === '流动人口') stats.floatingPop += 1
        else stats.stayPop += 1
      }
    }
  }
  return stats
}
