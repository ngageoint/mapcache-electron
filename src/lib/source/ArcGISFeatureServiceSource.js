import Source from './Source'
import axios from 'axios'
import isNil from 'lodash/isNil'
import path from 'path'
import { GeoPackageDataType } from '@ngageoint/geopackage'
import VectorLayer from './layer/vector/VectorLayer'
import { arcgisToGeoJSON } from '@esri/arcgis-to-geojson-utils'
import URLUtilities from '../util/URLUtilities'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'
import GeoPackageFeatureTableUtilities from '../geopackage/GeoPackageFeatureTableUtilities'

export default class ArcGISFeatureServiceSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName) {
    super (id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.format = format
  }

  async retrieveLayers () {
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    let fields = []
    for (const layer of this.layers) {
      let content = await this.getContent(layer)
      if (content.error) {
        throw content.error
      } else {
        featureCollection.features = featureCollection.features.concat(content.features)
        // only add new fields
        fields = fields.concat(content.fields.filter(f => fields.findIndex(field => field.name.toLowerCase() === f.name.toLowerCase()) === -1))
      }
    }
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    await GeoPackageFeatureTableUtilities.buildGeoPackage(filePath, this.sourceName, featureCollection, null, fields)
    const extent = await GeoPackageCommon.getGeoPackageExtent(filePath, this.sourceName)
    return [
      new VectorLayer({
        id: layerId,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        name: this.sourceName,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceLayerName: this.sourceName,
        sourceType: 'ArcGIS FS',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }

  esriToGeoPackageDataTypeMap = {
    esriFieldTypeSmallInteger: GeoPackageDataType.TINYINT,
    esriFieldTypeInteger: GeoPackageDataType.INTEGER,
    esriFieldTypeSingle: GeoPackageDataType.REAL,
    esriFieldTypeDouble: GeoPackageDataType.DOUBLE,
    esriFieldTypeString: GeoPackageDataType.STRING,
    esriFieldTypeDate: GeoPackageDataType.DATETIME,
    esriFieldTypeOID: GeoPackageDataType.INTEGER,
    esriFieldTypeGeometry: null,
    esriFieldTypeBlob: GeoPackageDataType.BLOB,
    esriFieldTypeRaster: null,
    esriFieldTypeGUID: GeoPackageDataType.STRING,
    esriFieldTypeGlobalID: GeoPackageDataType.STRING,
    esriFieldTypeXML: GeoPackageDataType.STRING
  }

  getContent (layer) {
    return new Promise( (resolve) => {
      const { baseUrl, queryParams } = URLUtilities.getBaseUrlAndQueryParams(this.filePath)
      let url =
        baseUrl + '/' + layer.id + '/query/?f=json&' +
        'returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=' +
        encodeURIComponent(
          '{"xmin":' +
          -180.0 +
          ',"ymin":' +
          -90.0 +
          ',"xmax":' +
          180.0 +
          ',"ymax":' +
          90.0 +
          ',"spatialReference":{"wkid":4326}}'
        ) +
        '&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*' +
        '&outSR=4326'
      if (!isNil(queryParams['token'])) {
        url = url + '&token=' + queryParams['token']
      }
      axios({
        url: url,
        withCredentials: true
      }).then(response => {
        let esriLayer = response.data
        const featureCollection = {
          type: 'FeatureCollection',
          features: esriLayer.features.map(esriFeature => {
            return {
              properties: esriFeature.attributes,
              geometry: arcgisToGeoJSON(esriFeature.geometry)
            }
          })
        }

        const fields = esriLayer.fields.map(field => {
          return {
            name: field.name,
            type: this.esriToGeoPackageDataTypeMap[field],
            defaultValue: field.defaultValue,
            notNull: false
          }
        }).filter(field => field.type !== null)

        resolve({ features: featureCollection.features.filter(f => f !== undefined), fields: fields })
      }).catch(err => {
        // eslint-disable-next-line no-console
        resolve({ error: err })
      })
    })
  }
}
