import Source from './Source'
import axios from 'axios'
import _ from 'lodash'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import { GeoPackageDataType } from '@ngageoint/geopackage'
import VectorLayer from './layer/vector/VectorLayer'
import { arcgisToGeoJSON } from '@esri/arcgis-to-geojson-utils'
import FileUtilities from '../FileUtilities'
import URLUtilities from '../URLUtilities'

export default class ArcGISFeatureServiceSource extends Source {
  async retrieveLayers () {
    const geopackageLayers = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    let fields = []
    for (const layer of this.layers) {
      let content = await this.getContent(layer)
      if (content.error) {
        // eslint-disable-next-line no-console
        console.error(content.error)
        throw content.error
      } else {
        featureCollection.features = featureCollection.features.concat(content.features)
        // only add new fields
        fields = fields.concat(content.fields.filter(f => fields.findIndex(field => field.name.toLowerCase() === f.name.toLowerCase()) === -1))
      }
    }
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(sourceDirectory, fileName)
    await GeoPackageUtilities.buildGeoPackage(filePath, this.sourceName, featureCollection, null, fields)
    const extent = GeoPackageUtilities.getGeoPackageExtent(filePath, this.sourceName)
    geopackageLayers.push(new VectorLayer({
      id: sourceId,
      name: this.sourceName,
      geopackageFilePath: filePath,
      sourceFilePath: this.filePath,
      sourceDirectory: sourceDirectory,
      sourceId: sourceId,
      sourceLayerName: this.sourceName,
      sourceType: 'ArcGIS FS',
      extent: extent
    }))
    return geopackageLayers
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
      if (!_.isNil(queryParams['token'])) {
        url = url + '&token=' + queryParams['token']
      }
      axios({
        method: 'get',
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
