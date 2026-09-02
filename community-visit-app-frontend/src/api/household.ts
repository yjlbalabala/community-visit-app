import type { Household, Person } from '@/types'
import apiClient from './client'
import {
  getUnitHouseholds,
  updateUnitHousehold,
  confirmUnitVisit,
  addUnitPerson,
  updateUnitPerson,
  removeUnitPerson
} from './mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 获取某单元下全部住户（深拷贝，避免与 mock 缓存共享引用） */
export async function fetchHouseholds(unitId: string): Promise<Household[]> {
  if (USE_MOCK) {
    return getUnitHouseholds(unitId).map(h => ({ ...h, persons: h.persons.map(p => ({ ...p })) }))
  }
  const res: any = await apiClient.get(`/units/${unitId}/households`)
  return res.data as Household[]
}

/** 修改住户（房屋类别/房主/电话/情况说明等） */
export async function updateHousehold(unitId: string, householdId: string, data: Partial<Household>): Promise<Household> {
  if (USE_MOCK) return updateUnitHousehold(unitId, householdId, data)
  const res: any = await apiClient.put(`/households/${householdId}`, data)
  return res.data as Household
}

/** 确认走访完成：更新上次走访时间为当前时间 */
export async function confirmVisit(unitId: string, householdId: string): Promise<Household> {
  if (USE_MOCK) return confirmUnitVisit(unitId, householdId)
  const res: any = await apiClient.post(`/households/${householdId}/visit`, { visitedAt: new Date().toISOString() })
  return res.data as Household
}

/** 新增人员 */
export async function addPerson(unitId: string, householdId: string, person: Omit<Person, 'id' | 'householdId'>): Promise<Household> {
  if (USE_MOCK) return addUnitPerson(unitId, householdId, person)
  const res: any = await apiClient.post(`/households/${householdId}/persons`, person)
  return res.data as Household
}

/** 修改人员 */
export async function updatePerson(unitId: string, householdId: string, personId: string, data: Partial<Person>): Promise<Household> {
  if (USE_MOCK) return updateUnitPerson(unitId, householdId, personId, data)
  const res: any = await apiClient.put(`/households/${householdId}/persons/${personId}`, data)
  return res.data as Household
}

/** 删除人员 */
export async function removePerson(unitId: string, householdId: string, personId: string): Promise<Household> {
  if (USE_MOCK) return removeUnitPerson(unitId, householdId, personId)
  const res: any = await apiClient.delete(`/households/${householdId}/persons/${personId}`)
  return res.data as Household
}
