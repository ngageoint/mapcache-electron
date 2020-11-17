import Vue from 'vue'
import VueRouter from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import Worker from '../views/Worker/Worker.vue'
import Project from '../views/Project/Project.vue'

Vue.use(VueRouter)

export default new VueRouter({
  mode: 'hash',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage
    },
    {
      path: '/worker',
      name: 'Worker',
      component: Worker
    },
    {
      path: '/project',
      name: 'Project',
      component: Project
    }
  ]
})
