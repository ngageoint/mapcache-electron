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
import FileUtilities from '../util/FileUtilities'

export default class KMLSource extends Source {

  /**
   * Determines the style from a kml feature's properties
   * @param feature
   * @returns {null}
   */
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

  /**
   * Generates the icons and styles for a kml doc's features
   * @param features
   * @param kmlDir
   * @param tmpDir
   * @returns {Promise<{features: {}, styleRowMap: {}, iconRowMap: {}}>}
   */
  async generateStyleForKML (features, kmlDir, tmpDir) {
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
        let iconFile = path.join(kmlDir, feature.properties.icon)
        let cachedIconFile = path.join(tmpDir, feature.properties.icon)
        if (isNil(fileIcons[iconFile])) {
          // it is a url, go try to get the image..
          if (feature.properties.icon.startsWith('http')) {
            iconFile = path.join(kmlDir, path.basename(feature.properties.icon))
            cachedIconFile = path.join(tmpDir, path.basename(feature.properties.icon))
            const writer = fs.createWriteStream(cachedIconFile)
            await new Promise((resolve) => {
              return axios({
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
              .catch(() => {
                fs.unlinkSync(iconFile)
                // eslint-disable-next-line no-console
                console.error('Failed to retrieve remote icon file')
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
              // eslint-disable-next-line no-unused-vars
            } catch (exception) {
              // eslint-disable-next-line no-console
              console.error('Failed to generate icon.')
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

  /**
   * Retrieves all of the layers belonging to this source
   * @returns {Promise<*[]>}
   */
  async retrieveLayers () {
    let layers = []
    // setup tmp directory
    const tmpDir = path.join(this.directory, 'tmp')
    FileUtilities.createDirectory(tmpDir)
    // get kml string, note this could get rather large depending on the file
    const kml = new DOMParser().parseFromString(fs.readFileSync(this.filePath, 'utf8'), 'text/xml')
    // the base directory for the kml content
    let kmlDirectory = path.dirname(this.filePath)
    // parse kml will break up kml into vector layers for each document and geotiff layers for each ground overlay
    let { documents, geotiffs } = await KMLUtilities.parseKML(kml, kmlDirectory, tmpDir, () => {
      return { layerId: UniqueIDUtilities.createUniqueID(), layerDirectory: FileUtilities.createNextAvailableLayerDirectory(this.directory), sourceDirectory: this.directory}
    })

    // if no document was found, the document is the whole kml
    if (documents.length === 0) {
      // no documents found, let's try the whole document
      documents.push({name: path.basename(this.filePath, path.extname(this.filePath)), xmlDoc: kml})
    }

    // create a vector layer for each document
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
        let style = await this.generateStyleForKML(featureCollection.features, kmlDirectory, tmpDir)
        await GeoPackageFeatureTableUtilities.buildGeoPackage(filePath, name, featureCollection, style)
        const extent = await GeoPackageCommon.getGeoPackageExtent(filePath, name)
        layers.push(new VectorLayer({
          id: layerId,
          directory: layerDirectory,
          sourceDirectory: this.directory,
          geopackageFilePath: filePath,
          sourceLayerName: name,
          sourceType: 'KML',
          count: featureCollection.features.length,
          extent: extent
        }))
      }
    }

    // add GeoTIFF layers to layers list
    layers = layers.concat(geotiffs)

    // clean up
    FileUtilities.rmDir(tmpDir)

    return layers
  }
}
