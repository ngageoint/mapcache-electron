import Vue from 'vue'
import Vuetify from 'vuetify/lib'
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
        primary: '#326482',
        accent: '#37A5AC',
        secondary: '#089247',
        warning: '#FF1744',
        neutral: '#808285',
        detail: '#696969',
        detailbg: '#f5f5f5',
        hover: '#f5f5f5',
        background: '#ffffff'
      },
      dark: {
        main: '#192F43',
        primary: '#37A5AC',
        accent: '#76C043',
        secondary: '#76C043',
        warning: '#FF8A80',
        neutral: '#414042',
        detail: '#f5f5f5',
        detailbg: '#2b2b2b',
        hover: '#414042',
        background: '#2b2b2b'
      }
    },
    options: {
      customProperties: true
    }
  }
}

export default new Vuetify(opts)
