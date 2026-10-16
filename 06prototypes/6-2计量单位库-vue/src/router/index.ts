import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/unit/list' },
  {
    path: '/unit/list',
    name: 'UnitList',
    component: () => import('@/modules/unit/views/UnitListView.vue'),
    meta: { title: '计量单位库' },
  },
  {
    path: '/unit/create',
    name: 'UnitCreate',
    component: () => import('@/modules/unit/views/UnitFormView.vue'),
    meta: { title: '新增计量单位' },
  },
  {
    path: '/unit/edit/:id',
    name: 'UnitEdit',
    component: () => import('@/modules/unit/views/UnitFormView.vue'),
    meta: { title: '编辑计量单位' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? '计量单位库'
  document.title = `${title} · 产品碳足迹核算系统`
})

export default router
