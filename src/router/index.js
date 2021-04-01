import Vue from 'vue'
import VueRouter from 'vue-router'

const LandingPageLoader = () => import('../views/LandingPage/LandingPage.vue')
const ProjectLoader = () => import('../views/Project/Project.vue')
const WorkerLoader = () => import('../views/Worker/Worker.vue')

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'hash',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/project/:id',
      name: 'Project',
      component: ProjectLoader
    },
    {
      path: '/worker',
      name: 'Worker',
      component: WorkerLoader
    },
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPageLoader,
    }
  ]
})

export default router
