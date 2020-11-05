import Vue from 'vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import AsyncComputed from 'vue-async-computed'
import vuetify from './vuetify.js' // path to vuetify export
import '../styles/app.css'

import App from './App'
import router from './router'
import store from '../store'

Vue.use(AsyncComputed)
Vue.use(require('vue-electron'))

Vue.config.productionTip = false

Vue.config.ignoredElements = [
  /^x-/
]

library.add(fas)
library.add(far)
Vue.component('font-awesome-icon', FontAwesomeIcon)

/* eslint-disable no-new */
new Vue({
  vuetify,
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
