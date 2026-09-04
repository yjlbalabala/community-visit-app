import type { HouseType } from '@/types'

/**
 * 走访规则（可配置常量，后端将来做成配置表）
 *  - 出租房 / 群租房：距上次走访 3 个月
 *  - 自购房：距上次走访 12 个月
 *  - 到期前 15 天系统生成待办提醒
 */
export const VISIT_INTERVAL_DAYS: Record<HouseType, number> = {
  自购房: 365,
  出租房: 90,
  群租房: 90
}

export const VISIT_ADVANCE_DAYS = 15

/** 解析 'YYYY-MM-DD HH:mm:ss'（本地时间） */
export function parseDateTime(s: string): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s)
  if (!m) return null
  return new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    m[4] ? Number(m[4]) : 0,
    m[5] ? Number(m[5]) : 0,
    m[6] ? Number(m[6]) : 0
  )
}

export function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 预计走访时间 = 上次走访时间 + 间隔；从未走访则视为立即需要走访 */
export function expectedVisitTime(h: { houseType: HouseType; lastVisitTime: string }): string | null {
  const last = parseDateTime(h.lastVisitTime)
  if (!last) return null
  const exp = new Date(last.getTime() + VISIT_INTERVAL_DAYS[h.houseType] * 24 * 3600 * 1000)
  return formatDateTime(exp)
}

/** 距预计走访还有多少天（>0 未到期，<=0 已到期） */
export function daysUntilExpected(h: { houseType: HouseType; lastVisitTime: string }): number | null {
  const exp = expectedVisitTime(h)
  if (!exp) return null
  return Math.ceil((parseDateTime(exp)!.getTime() - Date.now()) / (24 * 3600 * 1000))
}

/** 是否已到需提醒走访的时间（预计走访 - 提前天数 <= 今天；从未走访 = 需走访） */
export function isVisitDue(h: { houseType: HouseType; lastVisitTime: string }): boolean {
  if (!h.lastVisitTime) return true
  const exp = expectedVisitTime(h)
  if (!exp) return false
  const dueAt = parseDateTime(exp)!.getTime() - VISIT_ADVANCE_DAYS * 24 * 3600 * 1000
  return Date.now() >= dueAt
}

/** 支持覆盖字段的住户（含走访任务产生的字段） */
export type OverridableVisit = {
  houseType: HouseType
  lastVisitTime: string
  adminVisitTime?: string
  expiredBaseVisitTime?: string
}

/**
 * 生效的预计走访时间：
 * 1) 有管理员下发的未处理任务 → 取任务指定时间 T；
 * 2) 任务已过期 → 以指定时间 T 为基点按类别间隔顺延；
 * 3) 否则按规则（上次走访 + 类别间隔）。
 */
export function effectiveExpectedVisitTime(h: OverridableVisit): string | null {
  if (h.adminVisitTime) return h.adminVisitTime
  if (h.expiredBaseVisitTime) {
    const base = parseDateTime(h.expiredBaseVisitTime)
    if (base) {
      const exp = new Date(base.getTime() + VISIT_INTERVAL_DAYS[h.houseType] * 24 * 3600 * 1000)
      return formatDateTime(exp)
    }
  }
  return expectedVisitTime(h)
}

/** 基于生效预计走访时间判断是否需走访 */
export function effectiveIsVisitDue(h: OverridableVisit): boolean {
  if (!h.lastVisitTime) return true
  const exp = effectiveExpectedVisitTime(h)
  if (!exp) return false
  const dueAt = parseDateTime(exp)!.getTime() - VISIT_ADVANCE_DAYS * 24 * 3600 * 1000
  return Date.now() >= dueAt
}

