import Vue from 'vue'
import VueRouter from 'vue-router'

const LandingPageLoader = () => import('../views/LandingPage/LandingPage.vue')
const ProjectLoader = () => import('../views/Project/Project.vue')
const WorkerLoader = () => import('../views/Worker/Worker.vue')
const FeatureTableLoader = () => import('../views/FeatureTable/FeatureTableWindow.vue')
const ReleaseNotes = () => import('../views/Documentation/ReleaseNotes.vue')

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
    },
    {
      path: '/feature_table/:id',
      name: 'FeatureTable',
      component: FeatureTableLoader,
    },
    {
      path: '/release_notes',
      name: 'ReleaseNotes',
      component: ReleaseNotes,
    }
  ]
})

export default router
