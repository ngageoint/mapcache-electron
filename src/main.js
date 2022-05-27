import Vue from 'vue'
import App from './views/App.vue'
import router from './router'
import AsyncComputed from 'vue-async-computed'
import vuetify from './lib/vue/vuetify/vuetify.js' // path to vuetify export
import './styles/app.css'
import 'typeface-roboto/index.css'
import { setCreateCanvasFunction } from './lib/util/canvas/CanvasUtilities'
import createMapCachePersistedStateWrapper from './lib/vue/vuex/MapCachePersistedStateWrapper'
import createMapCacheSharedMutationsWrapper from './lib/vue/vuex/MapCacheSharedMutationsWrapper'
import Vuex from 'vuex'
import modules from './store/modules'
import { ObserveVisibility } from 'vue-observe-visibility'

Vue.directive('observe-visibility', ObserveVisibility)

Object.assign(console, window.log)

Vue.use(Vuex)

let createStore = () => {
  return new Vuex.Store({
    modules,
    plugins: [
      createMapCachePersistedStateWrapper({ throttle: 100 }),
      createMapCacheSharedMutationsWrapper(),
    ],
    strict: true
  })
}

let store = undefined
if (window.mapcache != null) {
  if (window.mapcache.setupGeoPackageContext != null) {
    window.mapcache.setupGeoPackageContext()
  }

  if (window.mapcache.createStorage != null) {
    let storeAttempts = 0
    while (store == null && storeAttempts < 3) {
      try {
        store = createStore()
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        storeAttempts++
      }
    }

    if (store == null) {
      // eslint-disable-next-line no-console
      console.error('Unable to create vuex store. Exiting.')
      process.exit(0)
    }
  }

  // use BrowserCanvasAdapter in renderer processes
  setCreateCanvasFunction((width, height) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  })
}

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
