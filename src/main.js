import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import AsyncComputed from 'vue-async-computed'
import vuetify from './vuetify.js' // path to vuetify export
import './styles/app.css'
import 'typeface-roboto/index.css'

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
