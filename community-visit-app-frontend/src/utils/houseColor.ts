import type { HouseType, Household } from '@/types'

/** 房屋类别 → 单元格颜色（绿=自购房 / 黄=出租房 / 红=群租房） */
export const HOUSE_COLOR_MAP: Record<HouseType, string> = {
  自购房: '#00B42A',
  出租房: '#FFAA00',
  群租房: '#F53F3F'
}

/** 房屋类别 → el-tag type */
export const HOUSE_TAG_MAP: Record<HouseType, 'success' | 'warning' | 'danger'> = {
  自购房: 'success',
  出租房: 'warning',
  群租房: 'danger'
}

/** 住户显示颜色：居住人数 > 8 强制红色（优先于房屋类别色） */
export function householdColor(h: Household): string {
  return h.persons.length > 8 ? HOUSE_COLOR_MAP.群租房 : HOUSE_COLOR_MAP[h.houseType]
}
