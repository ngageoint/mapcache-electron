import Vue from 'vue'
import App from './views/App.vue'
import router from './router'
import store from './store'
import AsyncComputed from 'vue-async-computed'
import vuetify from './lib/vuetify/vuetify.js' // path to vuetify export
import './styles/app.css'
import 'typeface-roboto/index.css'
import axios from 'axios'
import CanvasUtilites from './lib/util/CanvasUtilities'
import { Context, HtmlCanvasAdapter, SqliteAdapter } from '@ngageoint/geopackage'
import log from 'electron-log'

Object.assign(console, log.functions)
if (window.mapcache.setupGeoPackgeContext) {
  window.mapcache.setupGeoPackgeContext()
}
Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter);
// use BrowserCanvasAdapter in renderer processes
CanvasUtilites.setCreateCanvasFunction((width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
})

axios.defaults.withCredentials = true

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
