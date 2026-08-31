import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { NodeType, TreeNode } from '@/types'
import { STREET_ID, fetchZones, fetchCommunities, fetchUnits, fetchNodePath } from '@/api/hierarchy'

export const useHierarchyStore = defineStore('hierarchy', () => {
  /** 当前层级的子节点（责任区/小区/单元） */
  const nodes = ref<TreeNode[]>([])
  /** 面包屑路径：街道 → … → 当前节点 */
  const path = ref<TreeNode[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 当前节点（路径最后一项） */
  const currentNode = computed(() => path.value[path.value.length - 1] ?? null)

  /** 进入某一层级：加载该层子节点 + 面包屑路径 */
  async function enterLevel(nodeType: NodeType, id?: string) {
    loading.value = true
    error.value = null
    try {
      if (nodeType === 'street') {
        nodes.value = await fetchZones()
        path.value = await fetchNodePath(STREET_ID)
      } else if (nodeType === 'zone' && id) {
        nodes.value = await fetchCommunities(id)
        path.value = await fetchNodePath(id)
      } else if (nodeType === 'community' && id) {
        nodes.value = await fetchUnits(id)
        path.value = await fetchNodePath(id)
      } else if (nodeType === 'unit' && id) {
        nodes.value = []
        path.value = await fetchNodePath(id)
      }
    } catch (e: any) {
      const msg = e?.message || '加载层级数据失败'
      error.value = msg
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  return { nodes, path, loading, error, currentNode, enterLevel }
})
