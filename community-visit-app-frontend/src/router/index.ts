import { createRouter, createWebHistory } from 'vue-router'
import HouseGridPage from '@/pages/HouseGridPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HouseGridPage
    }
  ]
})

export default router
