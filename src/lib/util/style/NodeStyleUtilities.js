import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getExtraResourcesDirectory } from '../file/FileUtilities'
import { hashCode } from './CommonStyleUtilities'

function generateColor () {
  return ('#' + crypto.randomBytes(32).toString('hex').slice(0, 6)).toUpperCase()
}

function getDefaultIcon (iconName = 'New Icon', description = '') {
  return {
    width: 25,
    height: 41,
    anchorU: 0.5,
    anchorV: 1.0,
    name: iconName,
    description: description,
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(path.join(getExtraResourcesDirectory(), 'map-marker.png'))
  }
}

function getOverpassDefaultStyle (featureCollection) {
  let layerStyle = {
    features: {},
    styleRowMap: {},
    iconRowMap: {}
  }

  const nodeIcon = {
    width: 18,
    height: 18,
    anchorU: 0.5,
    anchorV: 0.5,
    name: 'Overpass Node',
    description: '',
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(path.join(getExtraResourcesDirectory(), 'overpass_node.png'))
  }
  let nodeIconHash = hashCode(nodeIcon)
  layerStyle.iconRowMap[nodeIconHash] = nodeIcon
  const wayIcon = {
    width: 18,
    height: 18,
    anchorU: 0.5,
    anchorV: 0.5,
    name: 'Overpass Way',
    description: '',
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(path.join(getExtraResourcesDirectory(), 'overpass_way.png'))
  }
  let wayIconHash = hashCode(wayIcon)
  layerStyle.iconRowMap[wayIconHash] = wayIcon
  const relationIcon = {
    width: 18,
    height: 18,
    anchorU: 0.5,
    anchorV: 0.5,
    name: 'Overpass Relation',
    description: '',
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(path.join(getExtraResourcesDirectory(), 'overpass_relation.png'))
  }
  let relationIconHash = hashCode(relationIcon)
  layerStyle.iconRowMap[relationIconHash] = relationIcon

  const nodeStyle = {
    width: 8,
    color: '#0033ff',
    opacity: 1.0,
    fillColor: '#ffcc00',
    fillOpacity: 0.5,
    name: 'Overpass Node'
  }
  const nodeStyleHash = hashCode(nodeStyle)
  layerStyle.styleRowMap[nodeStyleHash] = nodeStyle

  const wayStyle = {
    width: 2,
    color: '#0033ff',
    opacity: 1.0,
    fillColor: '#ffcc00',
    fillOpacity: 0.5,
    name: 'Overpass Way'
  }
  const wayStyleHash = hashCode(wayStyle)
  layerStyle.styleRowMap[wayStyleHash] = wayStyle

  const relationStyle = {
    width: 2,
    color: '#dd00ff',
    opacity: 1.0,
    fillColor: '#ffcc00',
    fillOpacity: 0.5,
    name: 'Overpass Relation'
  }
  const relationStyleHash = hashCode(relationStyle)
  layerStyle.styleRowMap[relationStyleHash] = relationStyle

  const getHashesForFeature = (feature) => {
    const hashes = {
      icon: null,
      style: null
    }
    const type = feature.id.split('/')[0]
    switch (type) {
      case 'node':
        if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
          hashes.icon = nodeIconHash
        } else {
          hashes.style = nodeStyleHash
        }
        break
      case 'way':
        if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
          hashes.icon = wayIconHash
        } else {
          hashes.style = wayStyleHash
        }
        break
      case 'relation':
        if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
          hashes.icon = relationIconHash
        } else {
          hashes.style = relationStyleHash
        }
        break
      default:
        break
    }
    return hashes
  }

  featureCollection.features.forEach(feature => {
    layerStyle.features[feature.id] = getHashesForFeature(feature)
  })

  return layerStyle
}

export {
  getOverpassDefaultStyle,
  getDefaultIcon,
  generateColor
}
