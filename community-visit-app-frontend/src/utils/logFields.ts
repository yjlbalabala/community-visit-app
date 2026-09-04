/** 变更信息等记录中的字段名 → 中文标签 */
const FIELD_LABELS: Record<string, string> = {
  houseType: '房屋类别',
  landlord: '房主',
  phone: '电话',
  remark: '情况说明',
  lastVisitTime: '上次走访时间',
  name: '姓名',
  gender: '性别',
  idCard: '身份证号码',
  personType: '人员类别'
}

export function labelOfField(key: string): string {
  return FIELD_LABELS[key] ?? key
}

/** 生成"字段：旧值 → 新值"列表（字段名中文化） */
export function diffLines(changes: Array<{ key: string; from: string; to: string }>): string {
  return changes.map(x => `${labelOfField(x.key)}：${x.from || '—'} → ${x.to}`).join('；')
}
