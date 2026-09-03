import type { HouseType, NodeType } from '@/types'
import apiClient from './client'
import {
  fetchMockZones,
  fetchMockCommunities,
  fetchMockUnits,
  getUnitHouseholds
} from './mockData'
import { isVisitDue, expectedVisitTime } from '@/utils/visitRule'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface TodoScope {
  /** street / zone / community / unit */
  nodeType: NodeType
  id: string
}

/** 待办条目（精确到单元 + 房号） */
export interface TodoItem {
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
  phone: string
  personsCount: number
  remark: string
  lastVisitTime: string
  expectedVisitTime: string | null
}

interface UnitCtx {
  zone: { id: string; name: string }
  community: { id: string; name: string }
  unit: { id: string; name: string }
}

function collectScopeUnits(scope: TodoScope): UnitCtx[] {
  const out: UnitCtx[] = []
  for (const z of fetchMockZones()) {
    if (scope.nodeType === 'zone' && z.id !== scope.id) continue
    for (const c of fetchMockCommunities(z.id)) {
      if (scope.nodeType === 'community' && c.id !== scope.id) continue
      for (const u of fetchMockUnits(c.id)) {
        if (scope.nodeType === 'unit' && u.id !== scope.id) continue
        out.push({
          zone: { id: z.id, name: z.name },
          community: { id: c.id, name: c.name },
          unit: { id: u.id, name: u.name }
        })
      }
    }
  }
  return out
}

/** 获取某范围（责任区/小区/单元/全街道）内到期待办的住户 */
export async function fetchScopeTodos(scope: TodoScope): Promise<TodoItem[]> {
  if (!USE_MOCK) {
    const res: any = await apiClient.get('/todos', { params: { nodeType: scope.nodeType, id: scope.id } })
    return res.data as TodoItem[]
  }
  const items: TodoItem[] = []
  for (const ctx of collectScopeUnits(scope)) {
    const households = getUnitHouseholds(ctx.unit.id)
    for (const h of households) {
      if (h.persons.length === 0 || !isVisitDue(h)) continue
      items.push({
        householdId: h.id,
        unitId: ctx.unit.id,
        zoneId: ctx.zone.id,
        communityId: ctx.community.id,
        zoneName: ctx.zone.name,
        communityName: ctx.community.name,
        unitName: ctx.unit.name,
        roomNo: h.roomNo,
        houseType: h.houseType,
        landlord: h.landlord,
        phone: h.phone,
        personsCount: h.persons.length,
        remark: h.remark,
        lastVisitTime: h.lastVisitTime,
        expectedVisitTime: expectedVisitTime(h)
      })
    }
  }
  items.sort((a, b) => (a.expectedVisitTime ?? '').localeCompare(b.expectedVisitTime ?? ''))
  return items
}


