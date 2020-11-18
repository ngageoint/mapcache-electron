import gdal from 'gdal'
import path from 'path'
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import AsyncComputed from 'vue-async-computed'
import vuetify from './vuetify.js' // path to vuetify export
import './styles/app.css'
import 'typeface-roboto/index.css'

/*
 * The gdal library, when packaged for production is unable to find the GDAL_DATA directory. To work around this
 * the gdal library is unpacked and the GDAL_DATA field is then set to the app.asar.unpacked location.
 */
if (process.env.NODE_ENV === 'production') {
  const location = path.join(__dirname, '..', 'app.asar.unpacked', 'node_modules', 'gdal', 'deps', 'libgdal', 'gdal', 'data')
  gdal.config.set('GDAL_DATA', location)
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
