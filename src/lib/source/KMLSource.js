import Source from './Source'
import { DOMParser } from 'xmldom'
import URLUtilities  from '../URLUtilities'
import * as ToGeoJSON from '@ccaldwell/togeojson'
import fs from 'fs'
import path from 'path'
import KMLUtilities from '../KMLUtilities'
import VectorStyleUtilities from '../VectorStyleUtilities'
import { imageSize } from 'image-size'
import _ from 'lodash'
import axios from 'axios'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import UniqueIDUtilities from '../UniqueIDUtilities'
import { GeometryType } from '@ngageoint/geopackage'
import FileUtilities from '../FileUtilities'

export default class KMLSource extends Source {
  async initialize () {
    const kml = new DOMParser().parseFromString(fs.readFileSync(this.filePath, 'utf8'), 'text/xml')
    let originalFileDir = path.dirname(this.filePath)
    let parsedKML = await KMLUtilities.parseKML(kml, originalFileDir, this.sourceCacheFolder)
    this.geotiffs = parsedKML.geotiffs
    this.vectorLayers = []
    let documents = parsedKML.documents
    if (documents.length === 0) {
      // no documents found, let's try the whole document
      documents.push({name: path.basename(this.filePath, path.extname(this.filePath)), xmlDoc: kml})
    }
    for (let kmlDoc of documents) {
      const name = kmlDoc.name
      const featureCollection = ToGeoJSON.kml(kmlDoc.xmlDoc)
      if (featureCollection.features.length > 0) {
        for (let feature of featureCollection.features) {
          if (_.isNil(feature.id)) {
            feature.id = UniqueIDUtilities.createUniqueID()
          }
        }
        const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
        let fileName = name + '.gpkg'
        let filePath = path.join(sourceDirectory, fileName)
        let style = await this.generateStyleForKML(featureCollection.features, originalFileDir, this.sourceCacheFolder)
        await GeoPackageUtilities.buildGeoPackage(filePath, name, featureCollection, style)
        this.vectorLayers.push(new VectorLayer({
          geopackageFilePath: filePath,
          sourceDirectory: sourceDirectory,
          sourceId: sourceId,
          sourceLayerName: name,
          sourceType: 'KML'
        }))
      }
    }
  }

  getStyleFromFeature (feature) {
    let style = null
    // check if feature contains style properties
    if (_.keys(feature.properties).map(key => key.toLowerCase()).findIndex(key => key === 'stroke' || key === 'stroke-width' || key === 'stroke-opacity' || key === 'fill' || key === 'fill-opacity') !== -1) {
      style = {
        width: 1,
        color: '#000000',
        opacity: 1.0,
        fillColor: '#000000',
        fillOpacity: 1.0,
        name: 'KML Style'
      }
      const geometryType = GeometryType.fromName(feature.geometry.type.toUpperCase())
      if (geometryType === GeometryType.LINESTRING || geometryType === GeometryType.MULTILINESTRING) {
        style.width = feature.properties['stroke-width']
        style.color = feature.properties['stroke']
        style.opacity = feature.properties['stroke-opacity']
      } else if (geometryType === GeometryType.POLYGON || geometryType === GeometryType.MULTIPOLYGON || geometryType === GeometryType.GEOMETRYCOLLECTION) {
        style.width = feature.properties['stroke-width']
        style.color = feature.properties['stroke']
        style.opacity = feature.properties['stroke-opacity']
        style.fillColor = feature.properties['fill']
        style.fillOpacity = feature.properties['fill-opacity']
      } else if (geometryType === GeometryType.POINT || geometryType === GeometryType.MULTIPOINT) {
        style.width = feature.properties['stroke-width']
        style.color = feature.properties['stroke']
        style.opacity = feature.properties['stroke-opacity']
      } else {
        style = null
      }
    }
    return style
  }

  async generateStyleForKML (features, originalFileDir, cacheFolder) {
    let layerStyle = {
      features: {},
      styleRowMap: {},
      iconRowMap: {}
    }
    let fileIcons = {}
    let iconNumber = 1
    for (let feature of features) {
      const id = feature.id
      let featureStyle = null
      let featureIcon = null
      if (feature.properties.icon) {
        let iconFile = path.join(originalFileDir, feature.properties.icon)
        let cachedIconFile = path.join(cacheFolder, feature.properties.icon)
        if (_.isNil(fileIcons[iconFile])) {
          // it is a url, go try to get the image..
          if (feature.properties.icon.startsWith('http')) {
            const writer = fs.createWriteStream(cachedIconFile)
            await new Promise((resolve) => {
              return axios({
                method: 'get',
                url: feature.properties.icon,
                responseType: 'arraybuffer'
              })
              .then(response => {
                URLUtilities.bufferToStream(Buffer.from(response.data)).pipe(writer)
                writer.on('finish', () => {
                  writer.close()
                  resolve()
                })
              })
              .catch(err => {
                fs.unlinkSync(iconFile)
                // eslint-disable-next-line no-console
                console.error(err)
                resolve()
              })
            })
            iconFile = cachedIconFile
          }

          if (fs.existsSync(iconFile)) {
            try {
              let image = imageSize(iconFile)
              let dataUrl = 'data:image/' + path.extname(iconFile).substring(1) + ';base64,' + fs.readFileSync(iconFile).toString('base64')
              fileIcons[iconFile] = {
                url: dataUrl,
                contentType: 'image/' + path.extname(iconFile).substring(1),
                data: fs.readFileSync(iconFile),
                width: image.width,
                height: image.height,
                anchor_x: image.width / 2.0,
                anchor_y: image.height / 2.0,
                anchorSelection: 6, // anchored to center
                name: 'Icon #' + iconNumber
              }
            } catch (exception) {
              // eslint-disable-next-line no-console
              console.error(exception)
              // eslint-disable-next-line no-console
              fileIcons[iconFile] = VectorStyleUtilities.getDefaultIcon('Default Icon')
            }
          } else {
            fileIcons[iconFile] = VectorStyleUtilities.getDefaultIcon('Default Icon')
          }
          iconNumber++
        }
        let icon = fileIcons[iconFile]
        let iconHash = VectorStyleUtilities.hashCode(icon)
        if (_.isNil(layerStyle.iconRowMap[iconHash])) {
          layerStyle.iconRowMap[iconHash] = icon
        }
        featureIcon = iconHash
      } else {
        let style = this.getStyleFromFeature(feature)
        if (!_.isNil(style)) {
          let styleHash = VectorStyleUtilities.hashCode(style)
          if (_.isNil(layerStyle.styleRowMap[styleHash])) {
            layerStyle.styleRowMap[styleHash] = style
          }
          featureStyle = styleHash
        }
      }
      if (!_.isNil(featureIcon) || !_.isNil(featureStyle)) {
        layerStyle.features[id] = {
          icon: featureIcon,
          style: featureStyle
        }
      }
      delete feature.properties['icon']
      delete feature.properties['styleMapHash']
      delete feature.properties['styleHash']
      delete feature.properties['styleUrl']
      delete feature.properties['stroke']
      delete feature.properties['stroke-opacity']
      delete feature.properties['stroke-width']
      delete feature.properties['fill']
      delete feature.properties['fill-opacity']
    }
    if (_.isEmpty(layerStyle.features) && _.isEmpty(layerStyle.styleRowMap) && _.isEmpty(layerStyle.iconRowMap)) {
      layerStyle = null
    }
    return layerStyle
  }

  async retrieveLayers () {
    let layers = []
    for (let i = 0; i < this.vectorLayers.length; i++) {
      layers.push(this.vectorLayers[i])
    }
    this.geotiffs.forEach((layer) => {
      layers.push(layer)
    })
    return layers
  }
}
