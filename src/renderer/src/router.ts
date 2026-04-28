import { createRouter, createMemoryHistory } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('./views/Dashboard.vue') },
    { path: '/plans', name: 'plans', component: () => import('./views/PlanList.vue') },
    { path: '/plans/:planId', name: 'plan-detail', component: () => import('./views/PlanDetail.vue') },
    { path: '/test/:planId/:itemId', name: 'test-session', component: () => import('./views/TestSession.vue') },
    { path: '/bugs', name: 'bugs', component: () => import('./views/BugList.vue') },
    { path: '/bugs/:bugId', name: 'bug-detail', component: () => import('./views/BugDetail.vue') }
  ]
})

export default router
