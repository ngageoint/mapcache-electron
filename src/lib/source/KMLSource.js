import Source from './Source'
import { DOMParser } from 'xmldom'
import * as ToGeoJSON from '@ccaldwell/togeojson'
import fs from 'fs'
import path from 'path'
import KMLUtilities from '../KMLUtilities'
import VectorStyleUtilities from '../VectorStyleUtilities'
import { imageSize } from 'image-size'
import _ from 'lodash'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import UniqueIDUtilities from '../UniqueIDUtilities'
import http from 'http'
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
        let style = await this.generateStyleForKML(featureCollection.features, originalFileDir)
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
    let style = {
      width: 0,
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
    } else if (geometryType === GeometryType.POLYGON || geometryType === GeometryType.MULTIPOLYGON) {
      style.width = feature.properties['stroke-width']
      style.color = feature.properties['stroke']
      style.opacity = feature.properties['stroke-opacity']
      style.fillColor = feature.properties['fill']
      style.fillOpacity = feature.properties['fill-opacity']
    } else if (geometryType === GeometryType.POINT || geometryType === GeometryType.MULTIPOINT) {
      style.width = feature.properties['stroke-width']
      style.color = feature.properties['stroke']
      style.opacity = feature.properties['stroke-opacity']
    }
    return style
  }

  async generateStyleForKML (features, originalFileDir) {
    let layerStyle = VectorStyleUtilities.defaultRandomColorStyle()
    let fileIcons = {}
    let iconNumber = 1
    for (let feature of features) {
      const featureGeometryTypeString = feature.geometry.type.toUpperCase()
      layerStyle.features[feature.id] = {
        icon: layerStyle.default.icons[featureGeometryTypeString],
        style: layerStyle.default.styles[featureGeometryTypeString],
        iconOrStyle: layerStyle.default.iconOrStyle[featureGeometryTypeString]
      }
      if (feature.properties.icon) {
        let iconFile = path.join(originalFileDir, path.basename(feature.properties.icon))
        if (_.isNil(fileIcons[iconFile])) {
          // it is a url, go try to get the image..
          if (feature.properties.icon.startsWith('http')) {
            const file = fs.createWriteStream(iconFile)
            await new Promise((resolve) => {
              http.get(feature.properties.icon, (response) => {
                if (response.statusCode === 200) {
                  response.pipe(file)
                  file.on('finish', () => {
                    file.close()
                    resolve()
                  })
                } else {
                  fs.unlinkSync(iconFile)
                  resolve()
                }
              }).on('error', (err) => {
                fs.unlinkSync(iconFile)
                console.error(err)
                resolve()
              })
            })
          }

          if (fs.existsSync(iconFile)) {
            try {
              let image = imageSize(iconFile)
              let dataUrl = 'data:image/' + path.extname(iconFile).substring(1) + ';base64,' + fs.readFileSync(iconFile).toString('base64')
              fileIcons[iconFile] = {
                url: dataUrl,
                width: image.width,
                height: image.height,
                anchor_x: image.width / 2.0,
                anchor_y: image.height / 2.0,
                anchorSelection: 6, // anchored to center
                name: 'Icon #' + iconNumber
              }
            } catch (exception) {
              console.error(exception)
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
        layerStyle.features[feature.id].icon = iconHash
        layerStyle.features[feature.id].iconOrStyle = 'icon'
      } else {
        let style = this.getStyleFromFeature(feature)
        let styleHash = VectorStyleUtilities.hashCode(style)
        if (_.isNil(layerStyle.styleRowMap[styleHash])) {
          layerStyle.styleRowMap[styleHash] = style
        }
        layerStyle.features[feature.id].style = styleHash
        layerStyle.features[feature.id].iconOrStyle = 'style'
      }
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
