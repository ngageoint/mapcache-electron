import { DOMParser } from 'xmldom'
import * as ToGeoJSON from '@ccaldwell/togeojson'
import fs from 'fs'
import path from 'path'
import { imageSize } from 'image-size'
import keys from 'lodash/keys'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import axios from 'axios'
import { GeometryType } from '@ngageoint/geopackage'
import Source from './Source'
import VectorLayer from './layer/vector/VectorLayer'
import UniqueIDUtilities from '../util/UniqueIDUtilities'
import GeoPackageFeatureTableUtilities from '../geopackage/GeoPackageFeatureTableUtilities'
import KMLUtilities from '../util/KMLUtilities'
import VectorStyleUtilities from '../util/VectorStyleUtilities'
import URLUtilities  from '../util/URLUtilities'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'
import FileUtilities from "../util/FileUtilities";

export default class KMLSource extends Source {
  static getStyleFromFeature (feature) {
    let style = null
    // check if feature contains style properties
    if (keys(feature.properties).map(key => key.toLowerCase()).findIndex(key => key === 'stroke' || key === 'stroke-width' || key === 'stroke-opacity' || key === 'fill' || key === 'fill-opacity') !== -1) {
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
        // if the files are on the file system, they may be relative paths
        let iconFile = path.join(originalFileDir, feature.properties.icon)
        let cachedIconFile = path.join(cacheFolder, feature.properties.icon)
        if (isNil(fileIcons[iconFile])) {
          // it is a url, go try to get the image..
          if (feature.properties.icon.startsWith('http')) {
            iconFile = path.join(originalFileDir, path.basename(feature.properties.icon))
            cachedIconFile = path.join(cacheFolder, path.basename(feature.properties.icon))
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
        if (isNil(layerStyle.iconRowMap[iconHash])) {
          layerStyle.iconRowMap[iconHash] = icon
        }
        featureIcon = iconHash
      } else {
        let style = KMLSource.getStyleFromFeature(feature)
        if (!isNil(style)) {
          let styleHash = VectorStyleUtilities.hashCode(style)
          if (isNil(layerStyle.styleRowMap[styleHash])) {
            layerStyle.styleRowMap[styleHash] = style
          }
          featureStyle = styleHash
        }
      }
      if (!isNil(featureIcon) || !isNil(featureStyle)) {
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
    if (isEmpty(layerStyle.features) && isEmpty(layerStyle.styleRowMap) && isEmpty(layerStyle.iconRowMap)) {
      layerStyle = null
    }
    return layerStyle
  }

  async retrieveLayers () {
    const layers = []
    const kml = new DOMParser().parseFromString(fs.readFileSync(this.filePath, 'utf8'), 'text/xml')
    let originalFileDir = path.dirname(this.filePath)
    let parsedKML = await KMLUtilities.parseKML(kml, originalFileDir, this.sourceCacheFolder, () => {
      const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory(this.directory)
      return { layerId: sourceId, layerDirectory: sourceDirectory}
    })
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
          if (isNil(feature.id)) {
            feature.id = UniqueIDUtilities.createUniqueID()
          }
        }
        const { layerId, layerDirectory } = this.createLayerDirectory()
        let fileName = name + '.gpkg'
        let filePath = path.join(layerDirectory, fileName)
        let style = await this.generateStyleForKML(featureCollection.features, originalFileDir, this.sourceCacheFolder)
        await GeoPackageFeatureTableUtilities.buildGeoPackage(filePath, name, featureCollection, style)
        const extent = await GeoPackageCommon.getGeoPackageExtent(filePath, name)
        layers.push(new VectorLayer({
          id: layerId,
          sourceDirectory: layerDirectory,
          geopackageFilePath: filePath,
          sourceLayerName: name,
          sourceType: 'KML',
          count: featureCollection.features.length,
          extent: extent
        }))
      }
    }
    parsedKML.geotiffs.forEach((layer) => {
      layers.push(layer)
    })
    return layers
  }
}
