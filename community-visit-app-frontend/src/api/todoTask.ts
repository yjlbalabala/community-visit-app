import type { TodoTask, TodoTaskItem } from '@/types'
import { getUnitHouseholds } from './mockData'
import { addOperationLog } from './operationLog'
import { expectedVisitTime, effectiveExpectedVisitTime, parseDateTime, VISIT_INTERVAL_DAYS } from '@/utils/visitRule'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const TASKS_KEY = 'cva_visit_tasks'

function loadTasks(): TodoTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    return raw ? (JSON.parse(raw) as TodoTask[]) : []
  } catch {
    return []
  }
}
function saveTasks(list: TodoTask[]) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(list))
  } catch { /* 忽略 */ }
}

let tasks: TodoTask[] = loadTasks()

const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const tsOf = (s: string) => parseDateTime(s)?.getTime() ?? NaN

/** 写一条"待办事项"类操作记录 */
async function logTaskOp(opts: { zoneName?: string; communityName?: string; unitName?: string; roomNo?: string; detail: string }) {
  if (!USE_MOCK) return
  await addOperationLog({
    roomNo: opts.roomNo ?? '',
    operationType: '待办事项',
    changesDetail: opts.detail,
    zoneName: opts.zoneName,
    communityName: opts.communityName,
    unitName: opts.unitName
  })
}

/** 是否有该户未处理的走访任务 */
function hasActiveItemFor(householdId: string): boolean {
  return tasks.some(t => t.items.some(i => i.householdId === householdId && i.status === 'active'))
}

export interface PublishTaskInput {
  assigneeUsername: string
  zoneId: string
  zoneName: string
  communityId: string
  communityName: string
  unitId: string
  unitName: string
  householdIds: string[]
  scheduledVisitTime: string
  remark: string
}

/** 管理员下发走访任务（同一单元内一户或多户） */
export async function publishTask(input: PublishTaskInput): Promise<TodoTask> {
  if (!USE_MOCK) {
    // 真实后端：POST /visit-tasks
    return { id: '', zoneId: input.zoneId, zoneName: input.zoneName, assigneeUsername: input.assigneeUsername, scheduledVisitTime: input.scheduledVisitTime, remark: input.remark, createdAt: '', items: [] }
  }
  const T = tsOf(input.scheduledVisitTime)
  if (!Number.isFinite(T)) throw new Error('请选择合法的走访时间')
  if (T < tsOf(nowStr().slice(0, 10) + ' 00:00:00')) throw new Error('走访时间不能早于今天')

  const households = getUnitHouseholds(input.unitId)
  const selected = households.filter(h => input.householdIds.includes(h.id))
  if (selected.length === 0) throw new Error('请至少选择一户人家')

  for (const h of selected) {
    if (h.lastVisitTime && T <= tsOf(h.lastVisitTime)) {
      throw new Error(`户 ${h.roomNo} 的走访时间需晚于其上次走访时间`)
    }
    if (hasActiveItemFor(h.id)) {
      throw new Error(`户 ${h.roomNo} 已有未处理的走访任务`)
    }
  }

  const taskId = `vt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const items: TodoTaskItem[] = selected.map(h => ({
    itemId: `${taskId}-i${h.id.slice(-6)}`,
    taskId,
    householdId: h.id,
    unitId: input.unitId,
    zoneId: input.zoneId,
    communityId: input.communityId,
    zoneName: input.zoneName,
    communityName: input.communityName,
    unitName: input.unitName,
    roomNo: h.roomNo,
    houseType: h.houseType,
    landlord: h.landlord,
    personsCount: h.persons.length,
    lastVisitTime: h.lastVisitTime,
    expectedVisitTime: expectedVisitTime(h),
    status: 'active'
  }))

  const task: TodoTask = {
    id: taskId,
    zoneId: input.zoneId,
    zoneName: input.zoneName,
    assigneeUsername: input.assigneeUsername,
    scheduledVisitTime: input.scheduledVisitTime,
    remark: input.remark,
    createdAt: nowStr(),
    items
  }
  tasks.push(task)
  saveTasks(tasks)

  // 覆盖住户的"预计下次走访时间"= 管理员指定时间 T
  for (const h of selected) {
    h.adminVisitTime = input.scheduledVisitTime
  }

  const rooms = selected.map(h => h.roomNo).join('、')
  await logTaskOp({
    zoneName: input.zoneName,
    communityName: input.communityName,
    unitName: input.unitName,
    roomNo: selected[0]?.roomNo,
    detail: `发布走访任务给「${input.assigneeUsername}」（${input.zoneName}·${input.communityName}·${input.unitName}）：户 ${rooms}，走访时间 ${input.scheduledVisitTime}${input.remark ? `，说明：${input.remark}` : ''}`
  })
  return task
}

/** 过期处理：T 已过且未确认走访 → 未走访（自动执行） */
export async function processExpiredTasks(): Promise<number> {
  if (!USE_MOCK) return 0
  const now = Date.now()
  let changed = 0
  for (const task of tasks) {
    for (const item of task.items) {
      if (item.status !== 'active') continue
      if (now <= tsOf(task.scheduledVisitTime)) continue
      item.status = 'expired'
      item.expiredAt = nowStr()
      changed++
      // 住户：上次走访时间不变；下次走访以 T 为基点按类别间隔顺延
      const h = getUnitHouseholds(item.unitId).find(x => x.id === item.householdId)
      if (h) {
        h.adminVisitTime = undefined
        h.expiredBaseVisitTime = task.scheduledVisitTime
      }
      await logTaskOp({
        zoneName: item.zoneName,
        communityName: item.communityName,
        unitName: item.unitName,
        roomNo: item.roomNo,
        detail: `走访任务未走访（过期）：户 ${item.roomNo}（${[item.zoneName, item.communityName, item.unitName].filter(Boolean).join('·')}）未在指定时间 ${task.scheduledVisitTime} 前确认走访；下次走访时间已顺延`
      })
    }
  }
  if (changed > 0) saveTasks(tasks)
  return changed
}

/** 管理员：全部任务（已先执行过期处理），按创建时间倒序 */
export async function listAllTasks(): Promise<TodoTask[]> {
  await processExpiredTasks()
  return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(t => JSON.parse(JSON.stringify(t)))
}

/** 某责任区用户：接收的任务 */
export async function listZoneTasks(zoneId: string): Promise<TodoTask[]> {
  await processExpiredTasks()
  return tasks
    .filter(t => t.zoneId === zoneId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(t => JSON.parse(JSON.stringify(t)))
}

/** 某责任区用户待办角标数（未处理任务按户计数） */
export async function activeItemCountForZone(zoneId: string): Promise<number> {
  await processExpiredTasks()
  return tasks.reduce((sum, t) => sum + (t.zoneId === zoneId ? t.items.filter(i => i.status === 'active').length : 0), 0)
}

/** 确认走访成功后调用：将该户未处理的走访任务标记完成 */
export async function completeActiveTaskForHousehold(householdId: string, visitedAt: string): Promise<boolean> {
  if (!USE_MOCK) return false
  let found = false
  for (const task of tasks) {
    for (const item of task.items) {
      if (item.householdId === householdId && item.status === 'active') {
        item.status = 'done'
        item.visitedAt = visitedAt
        found = true
        await logTaskOp({
          zoneName: item.zoneName,
          communityName: item.communityName,
          unitName: item.unitName,
          roomNo: item.roomNo,
          detail: `走访任务成功走访：户 ${item.roomNo} 于 ${visitedAt} 确认走访`
        })
      }
    }
  }
  if (found) saveTasks(tasks)
  return found
}

/** 任务内某户明细的快照路径辅助（供展示定位用） */
export function itemLocation(item: TodoTaskItem): string {
  return [item.zoneName, item.communityName, item.unitName, item.roomNo].filter(Boolean).join(' · ')
}

/** 任务状态汇总（active=进行中 / expired=已过期 / done=全部完成） */
export function taskStatus(task: TodoTask): 'active' | 'expired' | 'done' {
  const hasActive = task.items.some(i => i.status === 'active')
  const hasExpired = task.items.some(i => i.status === 'expired')
  if (hasActive) return 'active'
  if (hasExpired) return 'expired'
  return 'done'
}

export { VISIT_INTERVAL_DAYS }



