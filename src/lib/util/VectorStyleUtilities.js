import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import FileUtilities from './FileUtilities'

export default class VectorStyleUtilities {
  static generateColor () {
    return ('#' + crypto.randomBytes(32).toString('hex').slice(0, 6)).toUpperCase()
  }

  static getDefaultIcon (iconName = 'New Icon') {
    return {
      width: 25,
      height: 41,
      anchorU: 0.5,
      anchorV: 1.0,
      name: iconName,
      description: '',
      contentType: 'image/png',
      // eslint-disable-next-line no-undef
      data: fs.readFileSync(path.join(FileUtilities.getExtraResourcesDirectory(), 'map-marker.png'))
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

  static leafletStyle () {
    return {
      color: '#3388FF',
      opacity: 1.0,
      fillColor: '#3388FF',
      fillOpacity: 0.2,
      width: 3.0
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
