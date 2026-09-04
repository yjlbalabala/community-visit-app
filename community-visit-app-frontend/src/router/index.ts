import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fetchNodePath } from '@/api/hierarchy'
import MainLayout from '@/layouts/MainLayout.vue'
import LoginPage from '@/pages/LoginPage.vue'
import StreetPage from '@/pages/StreetPage.vue'
import ZonePage from '@/pages/ZonePage.vue'
import CommunityPage from '@/pages/CommunityPage.vue'
import UnitPage from '@/pages/UnitPage.vue'
import TodosPage from '@/pages/TodosPage.vue'
import LogsPage from '@/pages/LogsPage.vue'
import UsersPage from '@/pages/UsersPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { public: true }
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'street', component: StreetPage },
        { path: 'zone/:zoneId', name: 'zone', component: ZonePage },
        { path: 'community/:communityId', name: 'community', component: CommunityPage },
        { path: 'unit/:unitId', name: 'unit', component: UnitPage },
        { path: 'todos', name: 'todos', component: TodosPage },
        { path: 'logs', name: 'logs', component: LogsPage },
        { path: 'users', name: 'users', component: UsersPage, meta: { adminOnly: true } }
      ]
    }
  ]
})

/** 普通用户是否允许访问某个节点（责任区/小区/单元/街道） */
async function zoneAllowed(nodeType: string, id: string, myZoneId: string): Promise<boolean> {
  if (nodeType === 'zone') return id === myZoneId
  if (nodeType === 'street') return false // 街道总览只有管理员可见
  const path = await fetchNodePath(id)
  const zone = path.find(n => n.nodeType === 'zone')
  return !!zone && zone.id === myZoneId
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 未登录 → 登录页
  if (!auth.isLoggedIn) {
    if (to.meta.public) return true
    return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.public) return '/'

  // 管理员专属页面
  if (to.meta.adminOnly && !auth.isAdmin) return '/'

  // 普通用户：只能访问自己管辖责任区的内容
  if (!auth.isAdmin && auth.userZoneId) {
    if (to.name === 'street') return { path: `/zone/${auth.userZoneId}` }
    if (to.name === 'zone' || to.name === 'community' || to.name === 'unit') {
      const id = String(to.params.zoneId ?? to.params.communityId ?? to.params.unitId ?? '')
      if (id && !(await zoneAllowed(to.name as string, id, auth.userZoneId))) {
        return { path: `/zone/${auth.userZoneId}` }
      }
    }
  }
  return true
})

export default router
