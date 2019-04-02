import Source from './Source'
import { DOMParser } from 'xmldom'
import * as ToGeoJSON from '@tmcw/togeojson'
import GDALSource from './GDALSource'
import fs from 'fs'
import path from 'path'

export default class KMLSource extends Source {
  async initialize () {
    const string = fs.readFileSync(this.filePath, 'utf8')
    const kml = new DOMParser().parseFromString(string)
    const converted = ToGeoJSON.kml(kml)
    let originalFileDir = path.dirname(this.filePath)
    this.name = path.basename(this.filePath, path.extname(this.filePath))
    let fileName = this.name + '.geojson'
    let filePath = this.sourceCacheFolder.dir(this.sourceId).file(fileName).path()
    let fullFile = path.join(filePath, fileName)
    this.filePath = fullFile

    let styleSources = {}
    styleSources[this.name] = {
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
        // {
        //   'id': 'fill-style',
        //   'type': 'fill',
        //   'source': this.name,
        //   'source-layer': this.name,
        //   'filter': ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
        //   'paint': {
        //     'fill-color': '#ff0000',
        //     'fill-opacity': 1
        //   }
        // },
        // {
        //   'id': 'line-style',
        //   'type': 'line',
        //   'source': this.name,
        //   'source-layer': this.name,
        //   'filter': ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        //   'paint': {
        //     'line-width': 1,
        //     'line-color': '#ff0000'
        //   }
        // }
        // ,
        // {
        //   'id': 'point-style',
        //   'type': 'circle',
        //   'source': this.name,
        //   'source-layer': this.name,
        //   'filter': ['match', ['geometry-type'], ['Point'], true, false],
        //   'paint': {
        //     'circle-color': this.style.fillColor,
        //     'circle-stroke-color': this.style.color,
        //     'circle-opacity': this.style.fillOpacity,
        //     'circle-stroke-width': this.style.weight,
        //     'circle-radius': this.style.weight
        //   }
        // }
      ]
    }

    let images = []
    let styleHashes = {}

    converted.features.forEach((feature, index) => {
      // console.log('feature', feature)
      if (!feature.properties.styleHash) {
        // console.log('feature without stylehash', feature)
        feature.properties.styleHash = '-' + index
      } else {
        // console.log('feature with stylehash', feature)
      }
      if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
        let styleId = feature.properties.styleHash + '-line'
        if (!styleHashes[styleId]) {
          styleHashes[styleId] = true
          style.layers.push({
            'id': styleId,
            'type': 'line',
            'source': this.name,
            'source-layer': this.name,
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
            'source': this.name,
            'source-layer': this.name,
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
            'source': this.name,
            'source-layer': this.name,
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
            'source': this.name,
            'source-layer': this.name,
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
              'source': this.name,
              'source-layer': this.name,
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
    console.log('I am going to set the style', style)

    let convertedString = JSON.stringify(converted)
    fs.writeFileSync(this.filePath, convertedString)

    console.log('creating the gdal source')
    this.gdalSource = new GDALSource(fullFile, this.sourceId)
    this.gdalSource.images = images
    this.gdalSource.mbStyle = style
  }

  async retrieveLayers () {
    return this.gdalSource.retrieveLayers()
  }
}
