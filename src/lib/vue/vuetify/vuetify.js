import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import 'vuetify/dist/vuetify.min.css'
import MapFilterOnSvg from '../../../views/Nominatim/MapFilterOnSvg'
import MapFilterOffSvg from '../../../views/Nominatim/MapFilterOffSvg'
import GeoPackageSvg from '../../../views/Common/Svg/GeoPackageSvg'
import GeoPackagePlusSvg from '../../../views/Common/Svg/GeoPackagePlusSvg'

Vue.use(Vuetify)

const opts = {
  icons: {
    iconfont: 'mdiSvg',
    values: {
      mapFilterOn: { // name of our custom icon
        component: MapFilterOnSvg, // our custom component
        props: { // pass props to your component if needed
          name: 'mapFilterOn',
        }
      },
      mapFilterOff: { // name of our custom icon
        component: MapFilterOffSvg, // our custom component
        props: { // pass props to your component if needed
          name: 'mapFilterOff',
        }
      },
      geoPackage: { // name of our custom icon
        component: GeoPackageSvg, // our custom component
        props: { // pass props to your component if needed
          name: 'geoPackage',
        }
      },
      geoPackagePlus: { // name of our custom icon
        component: GeoPackagePlusSvg, // our custom component
        props: { // pass props to your component if needed
          name: 'geoPackagePlus',
        }
      }
    },
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
        text: '#1e1e1e',
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
        background: '#1e1e1e',
        text: '#f5f5f5',
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
