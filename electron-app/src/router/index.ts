import { createRouter, createWebHashHistory } from 'vue-router'
import BuildView from '@/views/BuildView.vue'

// app:// 协议下 history 回退不可靠，统一使用 hash 路由
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/build' },
    { path: '/build', name: 'build', component: BuildView },
    { path: '/catalog', name: 'catalog', component: () => import('@/views/CatalogView.vue') },
    { path: '/templates', name: 'templates', component: () => import('@/views/TemplatesView.vue') },
    { path: '/guide', name: 'guide', component: () => import('@/views/GuideView.vue') },
  ],
})
