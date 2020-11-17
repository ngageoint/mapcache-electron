import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import '@mdi/font/css/materialdesignicons.css'

Vue.use(Vuetify)

const opts = {
  icons: {
    iconfont: 'mdi'
  },
  theme: {
    themes: {
      light: {
        main: '#326482',
        main_active_background: '#ffffff',
        main_active_text: '#326482',
        primary: '#326482',
        accent: '#37A5AC',
        secondary: '#089247',
        warning: '#FF1744',
        neutral: '#808285',
        detail: '#696969',
        detailbg: '#f5f5f5',
        hover: '#f5f5f5',
        background: '#ffffff',
        scroll_thumb: '#808285',
        scroll_track: '#f5f5f5'
      },
      dark: {
        main: '#192F43',
        main_active_background: '#1e1e1e',
        main_active_text: '#f5f5f5',
        primary: '#4e9cca',
        accent: '#45ced7',
        secondary: '#76C043',
        warning: '#FF8A80',
        neutral: '#414042',
        detail: '#808285',
        detailbg: '#2b2b2b',
        hover: '#414042',
        background: '#2b2b2b',
        scroll_thumb: '#f5f5f5',
        scroll_track: '#414042'
      }
    },
    options: {
      customProperties: true
    }
  }
}

export default new Vuetify(opts)
