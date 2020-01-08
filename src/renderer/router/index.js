import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/worker',
      name: 'worker-page',
      component: require('@/components/Worker/Worker').default
    },
    {
      path: '/project',
      name: 'project-page',
      component: require('@/components/Project/Project').default
    },
    {
      path: '/',
      name: 'landing-page',
      component: require('@/components/LandingPage').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
