import { ref, computed, watch, type Ref } from 'vue'

export type FilterCond = Record<string, string | undefined>

export interface UsePagedFilterOptions<T> {
  /** 数据源（每次求值取最新列表，例如 () => household.persons） */
  source: () => T[]
  /** 过滤条件；条件变化时自动回到第 1 页 */
  cond?: Ref<FilterCond>
  /** 过滤函数（keyword/类别等） */
  filter?: (item: T, cond: FilterCond) => boolean
  /** 默认每页条数 */
  pageSize?: number
}

/**
 * 通用「过滤 + 分页」组合式函数：
 * 数据先在内存过滤分页；后端就绪后把 source 换成接口数据即可，组件层不变。
 */
export function usePagedFilter<T>(options: UsePagedFilterOptions<T>) {
  const currentPage = ref(1)
  const pageSize = ref(options.pageSize ?? 10)

  const filtered = computed(() => {
    const list = options.source()
    if (options.filter && options.cond) {
      return list.filter(item => options.filter!(item, options.cond!.value))
    }
    return list
  })

  const total = computed(() => filtered.value.length)

  const paged = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filtered.value.slice(start, start + pageSize.value)
  })

  // 条件 / 每页条数变化 → 回到第 1 页
  if (options.cond) {
    watch(options.cond, () => { currentPage.value = 1 })
  }
  watch(pageSize, () => { currentPage.value = 1 })

  // 删除导致页数不足时自动回退
  watch(total, () => {
    const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value))
    if (currentPage.value > maxPage) currentPage.value = maxPage
  })

  return { paged, total, currentPage, pageSize }
}
