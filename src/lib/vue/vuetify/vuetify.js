// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import "@mdi/font/css/materialdesignicons.css"
import * as labs from 'vuetify/labs/components'


import MapFilterOnSvg from '../../../renderer/src/views/Nominatim/MapFilterOnSvg.vue'
import MapFilterOffSvg from '../../../renderer/src/views/Nominatim/MapFilterOffSvg.vue'

const light = {
  dark: false,
  colors: {
    main: '#326482',
    primary: '#326482',
    accent: '#37A5AC',
    secondary: '#089247',
    warning: '#FF1744',
    neutral: '#808285',
    hover: '#f5f5f5',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    detail: '#696969',
    detailbg: '#f5f5f5',
    main_active_background: '#ffffff',
    main_active_text: '#326482',
    scroll_thumb: '#808285',
    scroll_track: '#f5f5f5',
    dark_background: '#f5f5f5'
  }
}

const dark = {
  dark: true,
  colors: {
    main: '#192F43',
    primary: '#4e9cca',
    accent: '#45ced7',
    secondary: '#76C043',
    warning: '#FF8A80',
    neutral: '#414042',
    hover: '#414042',
    background: '#1e1e1e',
    surface: '#1e1e1e',
    detail: '#808285',
    detailbg: '#2b2b2b',
    main_active_background: '#1e1e1e',
    main_active_text: '#f5f5f5',
    scroll_thumb: '#f5f5f5',
    scroll_track: '#414042',
    dark_background: '#f5f5f5'
  }
}

export default createVuetify({
  components: {
    ...components,
    ...labs,
  },
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases: {
      ...aliases,
      mapFilterOn: MapFilterOnSvg,
      mapFilterOff: MapFilterOffSvg
    },
    sets: {
      mdi,
    }
  },
  theme: {
    defaultTheme: 'light',
    variations: {
      colors: ['main', 'primary'],
      lighten: 2,
      darken: 2,
    },
    themes: {
      light: light,
      dark: dark
    }
  }
})
