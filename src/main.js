import Vue from 'vue'
import App from './views/App.vue'
import router from './router'
import AsyncComputed from 'vue-async-computed'
import vuetify from './lib/vue/vuetify/vuetify.js' // path to vuetify export
import './styles/app.css'
import 'typeface-roboto/index.css'
// import axios from 'axios'
import { setCreateCanvasFunction } from './lib/util/canvas/CanvasUtilities'
import createMapCachePersistedStateWrapper from './lib/vue/vuex/MapCachePersistedStateWrapper'
import createMapCacheSharedMutationsWrapper from './lib/vue/vuex/MapCacheSharedMutationsWrapper'
import Vuex from 'vuex'
import modules from './store/modules'
import { ObserveVisibility } from 'vue-observe-visibility'
Vue.directive('observe-visibility', ObserveVisibility)

Object.assign(console, window.log)

Vue.use(Vuex)

if (window.mapcache.setupGeoPackgeContext) {
  window.mapcache.setupGeoPackgeContext()
}

let store
try {
  store = new Vuex.Store({
    modules,
    plugins: [
      createMapCachePersistedStateWrapper(),
      createMapCacheSharedMutationsWrapper(),
    ],
    strict: true
  })

  // eslint-disable-next-line no-unused-vars
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('Failed to setup store. Exiting.')
}

// use BrowserCanvasAdapter in renderer processes
setCreateCanvasFunction((width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
})

// axios.defaults.withCredentials = true

Vue.use(AsyncComputed)

Vue.config.productionTip = false

Vue.config.ignoredElements = [
  /^x-/
]

/* eslint-disable no-new */
new Vue({
  vuetify,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
