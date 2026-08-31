import type { TreeNode } from '@/types'
import apiClient from './client'
import { STREET_ID, fetchMockZones, fetchMockCommunities, fetchMockUnits, findMockPath } from './mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export { STREET_ID }

/** 获取街道下全部责任区 */
export async function fetchZones(): Promise<TreeNode[]> {
  if (USE_MOCK) return fetchMockZones()
  const res: any = await apiClient.get('/zones')
  return res.data as TreeNode[]
}

/** 获取责任区下全部小区 */
export async function fetchCommunities(zoneId: string): Promise<TreeNode[]> {
  if (USE_MOCK) return fetchMockCommunities(zoneId)
  const res: any = await apiClient.get(`/zones/${zoneId}/communities`)
  return res.data as TreeNode[]
}

/** 获取小区下全部单元 */
export async function fetchUnits(communityId: string): Promise<TreeNode[]> {
  if (USE_MOCK) return fetchMockUnits(communityId)
  const res: any = await apiClient.get(`/communities/${communityId}/units`)
  return res.data as TreeNode[]
}

/** 获取某个节点到街道的完整路径（面包屑用，街道在前） */
export async function fetchNodePath(nodeId: string): Promise<TreeNode[]> {
  if (USE_MOCK) return findMockPath(nodeId)
  const res: any = await apiClient.get(`/nodes/${nodeId}/path`)
  return res.data as TreeNode[]
}
