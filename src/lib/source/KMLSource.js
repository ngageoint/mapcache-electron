import Source from './Source'
import { DOMParser } from 'xmldom'
import * as ToGeoJSON from '@tmcw/togeojson'
import GDALSource from './GDALSource'
import fs from 'fs'
import path from 'path'
import KMLUtilities from '../KMLUtilities'

export default class KMLSource extends Source {
  async initialize () {
    const kmlString = fs.readFileSync(this.filePath, 'utf8').replace(/<\/.*?:/mg, '</').replace(/<.*?:/mg, '<')
    const kml = new DOMParser().parseFromString(kmlString)
    let originalFileDir = path.dirname(this.filePath)
    let parsedKML = await KMLUtilities.parseKML(kml, originalFileDir)
    this.groundOverlays = parsedKML.groundOverlays
    this.gdalSources = []
    let documents = parsedKML.documents
    if (documents.length === 0) {
      // no documents found, let's try the whole document
      documents.push({name: path.basename(this.filePath, path.extname(this.filePath)), xmlDoc: kml})
    }
    documents.forEach((kmlDoc) => {
      const sourceId = Source.createId()
      const name = kmlDoc.name
      const converted = ToGeoJSON.kml(kmlDoc.xmlDoc)
      if (converted.features.length > 0) {
        let styleSources = {}
        styleSources[name] = {
          'type': 'vector',
          'maxzoom': 18,
          'tiles': [
            '{z}-{x}-{y}'
          ]
        }
        let style = {
          'version': 8,
          'name': 'Empty',
          'sources': styleSources,
          'layers': [
          ]
        }
        let images = []
        let styleHashes = {}
        let fileName = name + '.geojson'
        let filePath = this.sourceCacheFolder.dir(sourceId).file(fileName).path()
        let fullFile = path.join(filePath, fileName)

        converted.features.forEach((feature, index) => {
          if (!feature.properties.styleHash) {
            feature.properties.styleHash = '-' + index
          }
          if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
            let styleId = feature.properties.styleHash + '-line'
            if (!styleHashes[styleId]) {
              styleHashes[styleId] = true
              style.layers.push({
                'id': styleId,
                'type': 'line',
                'source': name,
                'source-layer': name,
                'filter': ['match',
                  ['get', 'styleHash'],
                  feature.properties.styleHash,
                  true, false],
                'paint': {
                  'line-width': feature.properties['stroke-width'] || 1,
                  'line-color': feature.properties['stroke'],
                  'line-opacity': feature.properties['stroke-opacity'] || 1
                }
              })
            }
          } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            let styleId = feature.properties.styleHash + '-fill'
            if (!styleHashes[styleId]) {
              styleHashes[styleId] = true

              style.layers.push({
                'id': styleId + '-outline',
                'type': 'line',
                'source': name,
                'source-layer': name,
                'filter': ['match',
                  ['get', 'styleHash'],
                  feature.properties.styleHash,
                  true, false],
                'paint': {
                  'line-width': feature.properties['stroke-width'],
                  'line-color': feature.properties['stroke'],
                  'line-opacity': feature.properties['stroke-opacity']
                }
              })

              style.layers.push({
                'id': styleId,
                'type': 'fill',
                'source': name,
                'source-layer': name,
                'filter': ['match',
                  ['get', 'styleHash'],
                  feature.properties.styleHash,
                  true, false],
                'paint': {
                  'fill-color': feature.properties['fill'],
                  'fill-opacity': feature.properties['fill-opacity'],
                  'fill-outline-color': feature.properties['stroke']
                }
              })
            }
          } else if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
            let styleId = feature.properties.styleHash + '-circle'
            if (!styleHashes[styleId]) {
              styleHashes[styleId] = true
              style.layers.push({
                'id': styleId,
                'type': 'circle',
                'source': name,
                'source-layer': name,
                'filter': ['match',
                  ['get', 'styleHash'],
                  feature.properties.styleHash,
                  true, false],
                'paint': {
                  'circle-color': feature.properties['fill'],
                  'circle-stroke-color': feature.properties['stroke'],
                  'circle-opacity': feature.properties['fill-opacity'] || 0,
                  'circle-stroke-width': feature.properties['stroke-width'],
                  'circle-radius': feature.properties['stroke-width'] || 0
                }
              })
              if (feature.properties.icon) {
                images.push({
                  filePath: path.join(originalFileDir, feature.properties.icon),
                  id: feature.properties.styleHash
                })
                style.layers.push({
                  'id': styleId + '-symbol',
                  'type': 'symbol',
                  'source': name,
                  'source-layer': name,
                  'filter': ['match',
                    ['get', 'styleHash'],
                    feature.properties.styleHash,
                    true, false],
                  'layout': {
                    'icon-image': feature.properties.styleHash,
                    'icon-allow-overlap': true
                  }
                })
              }
            }
          }
        })

        let convertedString = JSON.stringify(converted)
        fs.writeFileSync(fullFile, convertedString)

        let gdalSource = new GDALSource(fullFile, sourceId)
        gdalSource.images = images
        gdalSource.mbStyle = style
        gdalSource.doNotOverwriteMbStyle = true

        this.gdalSources.push(gdalSource)
      }
    })
  }

  async retrieveLayers () {
    let layers = []

    for (let i = 0; i < this.gdalSources.length; i++) {
      let gdalSource = this.gdalSources[i]
      let gdalSourceLayers = await gdalSource.retrieveLayers()
      gdalSourceLayers.forEach((layer) => {
        layers.push(layer)
      })
    }

    this.groundOverlays.forEach((layer) => {
      layers.push(layer)
    })
    return layers
  }
}
