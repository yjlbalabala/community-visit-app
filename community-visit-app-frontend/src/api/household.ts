import type { Household } from '@/types'
import apiClient from './client'
import { getUnitHouseholds, updateUnitHousehold } from './mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 获取某单元下全部住户 */
export async function fetchHouseholds(unitId: string): Promise<Household[]> {
  if (USE_MOCK) return getUnitHouseholds(unitId).map(h => ({ ...h }))
  const res: any = await apiClient.get(`/units/${unitId}/households`)
  return res.data as Household[]
}

/** 修改某单元下某户住户信息 */
export async function updateHousehold(unitId: string, roomNo: string, data: Partial<Household>): Promise<Household> {
  if (USE_MOCK) return updateUnitHousehold(unitId, roomNo, data)
  const res: any = await apiClient.put(`/units/${unitId}/households/${roomNo}`, data)
  return res.data as Household
}
