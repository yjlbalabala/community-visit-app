import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Household, Person } from '@/types'
import {
  fetchHouseholds,
  updateHousehold as apiUpdateHousehold,
  confirmVisit as apiConfirmVisit,
  addPerson as apiAddPerson,
  updatePerson as apiUpdatePerson,
  removePerson as apiRemovePerson
} from '@/api/household'
import { isVisitDue, expectedVisitTime } from '@/utils/visitRule'

export const useHouseholdStore = defineStore('household', () => {
  // ─── State ─────────────────────────────────────────────
  const list = ref<Household[]>([])
  const currentUnitId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Getters ───────────────────────────────────────────

  /** 待办事项：按走访规则到期（且非空户）的住户，按预计走访时间升序 */
  const todoList = computed(() =>
    list.value
      .filter(h => h.persons.length > 0 && isVisitDue(h))
      .sort((a, b) => {
        const ea = expectedVisitTime(a) ?? ''
        const eb = expectedVisitTime(b) ?? ''
        return ea < eb ? -1 : ea > eb ? 1 : 0
      })
  )

  const findByRoomNo = (roomNo: string) => list.value.find(h => h.roomNo === roomNo)
  const findByHouseholdId = (id: string) => list.value.find(h => h.id === id)

  // ─── Helpers ───────────────────────────────────────────

  function replaceInList(updated: Household) {
    const idx = list.value.findIndex(h => h.id === updated.id)
    if (idx !== -1) list.value[idx] = updated
    else list.value.push(updated)
  }

  // ─── Actions ───────────────────────────────────────────

  /** 加载某单元下全部住户 */
  async function loadList(unitId: string) {
    currentUnitId.value = unitId
    loading.value = true
    error.value = null
    try {
      list.value = await fetchHouseholds(unitId)
    } catch (e: any) {
      const msg = e?.message || '加载住户数据失败'
      error.value = msg
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  /** 修改住户信息 */
  async function updateHousehold(householdId: string, data: Partial<Household>) {
    const unitId = currentUnitId.value
    if (!unitId) throw new Error('未指定单元，无法修改住户信息')
    loading.value = true
    error.value = null
    try {
      const updated = await apiUpdateHousehold(unitId, householdId, data)
      replaceInList(updated)
      ElMessage.success(`住户 ${updated.roomNo} 信息修改成功`)
      return updated
    } catch (e: any) {
      const msg = e?.message || '修改住户信息失败'
      error.value = msg
      ElMessage.error(msg)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 确认走访完成（不修改住户信息，仅记录走访时间） */
  async function confirmVisit(householdId: string) {
    const unitId = currentUnitId.value
    if (!unitId) throw new Error('未指定单元')
    loading.value = true
    error.value = null
    try {
      const updated = await apiConfirmVisit(unitId, householdId)
      replaceInList(updated)
      ElMessage.success(`住户 ${updated.roomNo} 走访已确认`)
      return updated
    } catch (e: any) {
      const msg = e?.message || '确认走访失败'
      error.value = msg
      ElMessage.error(msg)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 新增人员 */
  async function addPerson(householdId: string, person: Omit<Person, 'id' | 'householdId'>) {
    const unitId = currentUnitId.value
    if (!unitId) throw new Error('未指定单元')
    try {
      const updated = await apiAddPerson(unitId, householdId, person)
      replaceInList(updated)
      ElMessage.success('人员新增成功')
      return updated
    } catch (e: any) {
      const msg = e?.message || '新增人员失败'
      ElMessage.error(msg)
      throw e
    }
  }

  /** 修改人员 */
  async function updatePerson(householdId: string, person: Person) {
    const unitId = currentUnitId.value
    if (!unitId) throw new Error('未指定单元')
    try {
      const updated = await apiUpdatePerson(unitId, householdId, person.id, person)
      replaceInList(updated)
      ElMessage.success('人员信息修改成功')
      return updated
    } catch (e: any) {
      const msg = e?.message || '修改人员失败'
      ElMessage.error(msg)
      throw e
    }
  }

  /** 删除人员 */
  async function removePerson(householdId: string, personId: string) {
    const unitId = currentUnitId.value
    if (!unitId) throw new Error('未指定单元')
    try {
      const updated = await apiRemovePerson(unitId, householdId, personId)
      replaceInList(updated)
      ElMessage.success('人员已删除')
      return updated
    } catch (e: any) {
      const msg = e?.message || '删除人员失败'
      ElMessage.error(msg)
      throw e
    }
  }

  return {
    list, currentUnitId, loading, error,
    todoList, findByRoomNo, findByHouseholdId,
    loadList, updateHousehold, confirmVisit,
    addPerson, updatePerson, removePerson
  }
})
