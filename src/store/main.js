import { createStore } from 'vuex'
import { createPersistedState, createSharedMutations } from '../lib/vue/vuex-electron/main.js'
import modules from './modules'

export default new createStore({
  modules,
  plugins: [
    createPersistedState({ throttle: 100 }),
    createSharedMutations()
  ],
  strict: true
})
