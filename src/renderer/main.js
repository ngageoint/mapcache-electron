import Vue from 'vue'
// import axios from 'axios'

import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Verte from 'verte'

import App from './App'
import router from './router'
import store from '../store'

Vue.use(require('vue-electron'))

// Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

Vue.config.ignoredElements = [
  /^x-/
]

library.add(fas)
library.add(far)
Vue.component('font-awesome-icon', FontAwesomeIcon)

// register component globally
Vue.component('verte', Verte)

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
