import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getExtraResourcesDirectory } from './FileUtilities'

function generateColor () {
  return ('#' + crypto.randomBytes(32).toString('hex').slice(0, 6)).toUpperCase()
}

function getDefaultIcon (iconName = 'New Icon') {
  return {
    width: 25,
    height: 41,
    anchorU: 0.5,
    anchorV: 1.0,
    name: iconName,
    description: '',
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(path.join(getExtraResourcesDirectory(), 'map-marker.png'))
  }
}

function randomStyle () {
  return {
    color: generateColor(),
    opacity: 1.0,
    fillColor: generateColor(),
    fillOpacity: 0.2,
    width: 3.0,
    name: 'New Style'
  }
}

function leafletStyle () {
  return {
    color: '#3388FF',
    opacity: 1.0,
    fillColor: '#3388FF',
    fillOpacity: 0.2,
    width: 3.0
  }
}

function hashCode (obj) {
  const str = JSON.stringify(obj)
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export {
  generateColor,
  getDefaultIcon,
  randomStyle,
  leafletStyle,
  hashCode
}
