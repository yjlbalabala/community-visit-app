import type { HouseType, NodeType } from '@/types'
import apiClient from './client'
import {
  fetchMockZones,
  fetchMockCommunities,
  fetchMockUnits,
  getUnitHouseholds
} from './mockData'
import { effectiveIsVisitDue, effectiveExpectedVisitTime } from '@/utils/visitRule'

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
  /** 是否已到需走访时间（预计走访 - 提前天数 <= 今天） */
  due: boolean
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

/** 获取某范围（责任区/小区/单元）内全部住户的走访信息（含是否待走访） */
export async function fetchScopeTodos(scope: TodoScope): Promise<TodoItem[]> {
  if (!USE_MOCK) {
    const res: any = await apiClient.get('/visits', { params: { nodeType: scope.nodeType, id: scope.id } })
    return res.data as TodoItem[]
  }
  const items: TodoItem[] = []
  for (const ctx of collectScopeUnits(scope)) {
    const households = getUnitHouseholds(ctx.unit.id)
    for (const h of households) {
      if (h.persons.length === 0) continue
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
        expectedVisitTime: effectiveExpectedVisitTime(h),
        due: effectiveIsVisitDue(h)
      })
    }
  }
  // 待走访优先，其次按预计走访时间升序
  items.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1
    return (a.expectedVisitTime ?? '').localeCompare(b.expectedVisitTime ?? '')
  })
  return items
}





