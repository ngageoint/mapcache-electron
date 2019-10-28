// import {circle, polygonToLine, polygon} from '@turf/turf'
export default class VectorStyleUtilities {
  static generateColor () {
    return ('#' + Math.floor(Math.random() * 16777215).toString(16)).padEnd(7, '0').toUpperCase()
  }

  static getDefaultIcon () {
    return {
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=',
      width: 25,
      height: 41,
      anchor_u: 0.5,
      anchor_v: 1.0,
      name: 'Default Icon'
    }
  }

  static defaultLeafletStyle () {
    return {
      default: {
        icons: {
          'Point': -1
        },
        styles: {
          'Point': -1,
          'LineString': -2,
          'Polygon': -3
        },
        iconOrStyle: {
          'Point': 'icon',
          'Polygon': 'style',
          'LineString': 'style'
        }
      },
      features: {},
      styleRowMap: {
        '-1': {
          color: '#3388FF',
          opacity: 1.0,
          width: 2.0,
          name: 'Default Point Style'
        },
        '-2': {
          color: '#3388FF',
          opacity: 1.0,
          width: 3.0,
          name: 'Default LineString Style'
        },
        '-3': {
          color: '#3388FF',
          opacity: 1.0,
          fillColor: '#3388FF',
          fillOpacity: 0.2,
          width: 3.0,
          name: 'Default Polygon Style'
        }
      },
      iconRowMap: {
        '-1': VectorStyleUtilities.getDefaultIcon()
      },
      maxFeatures: 100
    }
  }

  static randomStyle () {
    return {
      color: VectorStyleUtilities.generateColor(),
      opacity: 1.0,
      fillColor: VectorStyleUtilities.generateColor(),
      fillOpacity: 0.2,
      width: 3.0,
      name: 'New Style'
    }
  }

  static defaultRandomColorStyle () {
    return {
      default: {
        icons: {
          'Point': -1
        },
        styles: {
          'Point': -1,
          'LineString': -2,
          'Polygon': -3
        },
        iconOrStyle: {
          'Point': 'icon',
          'Polygon': 'style',
          'LineString': 'style'
        }
      },
      features: {},
      styleRowMap: {
        '-1': {
          color: VectorStyleUtilities.generateColor(),
          opacity: 1.0,
          width: 2.0,
          name: 'Default Point Style'
        },
        '-2': {
          color: VectorStyleUtilities.generateColor(),
          opacity: 1.0,
          width: 3.0,
          name: 'Default LineString Style'
        },
        '-3': {
          color: VectorStyleUtilities.generateColor(),
          opacity: 1.0,
          fillColor: VectorStyleUtilities.generateColor(),
          fillOpacity: 0.2,
          width: 3.0,
          name: 'Default Polygon Style'
        }
      },
      iconRowMap: {
        '-1': VectorStyleUtilities.getDefaultIcon()
      },
      maxFeatures: 100
    }
  }

  static hashCode (obj) {
    const str = JSON.stringify(obj)
    let hash = 0
    if (str.length === 0) return hash
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }
}
