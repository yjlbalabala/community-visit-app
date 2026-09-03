import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import StreetPage from '@/pages/StreetPage.vue'
import ZonePage from '@/pages/ZonePage.vue'
import CommunityPage from '@/pages/CommunityPage.vue'
import UnitPage from '@/pages/UnitPage.vue'
import TodosPage from '@/pages/TodosPage.vue'
import LogsPage from '@/pages/LogsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'street',
          component: StreetPage
        },
        {
          path: 'zone/:zoneId',
          name: 'zone',
          component: ZonePage
        },
        {
          path: 'community/:communityId',
          name: 'community',
          component: CommunityPage
        },
        {
          path: 'unit/:unitId',
          name: 'unit',
          component: UnitPage
        },
        {
          path: 'todos',
          name: 'todos',
          component: TodosPage
        },
        {
          path: 'logs',
          name: 'logs',
          component: LogsPage
        }
      ]
    }
  ]
})

export default router
