import Vue from 'vue'
import VueRouter from 'vue-router'
import LandingPage from '../views/LandingPage/LandingPage.vue'
import Worker from '../views/Worker/Worker.vue'
import Project from '../views/Project/Project.vue'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'hash',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/project/:id',
      name: 'Project',
      component: Project
    },
    {
      path: '/worker/:id',
      name: 'Worker',
      component: Worker
    },
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage,
    }
  ]
})

export default router
