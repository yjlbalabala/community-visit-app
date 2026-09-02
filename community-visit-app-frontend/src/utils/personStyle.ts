import type { Gender, PersonType } from '@/types'

/** 人员类别 → el-tag type（常住/流动/寄住 视觉区分） */
export const PERSON_TYPE_TAG_MAP: Record<PersonType, 'success' | 'warning' | 'info'> = {
  常住人口: 'success',
  流动人口: 'warning',
  寄住人口: 'info'
}

/** 性别 → 展示符号与颜色（男蓝 / 女粉） */
export const GENDER_STYLE_MAP: Record<Gender, { symbol: string; color: string }> = {
  男: { symbol: '♂', color: '#409eff' },
  女: { symbol: '♀', color: '#f56c6c' }
}
