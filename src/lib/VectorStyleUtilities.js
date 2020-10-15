import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

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
      data: fs.readFileSync(path.join(__dirname, '..', 'renderer', 'assets', 'map-marker.png'))
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
