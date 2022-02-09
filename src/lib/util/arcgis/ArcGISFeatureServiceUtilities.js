import { arcgisToGeoJSON } from '@terraformer/arcgis'

/**
 * Converts an esri json layer into a geojson feature collection
 * @param esriLayer
 * @returns {{features, type: string}}
 */
function getFeatureCollectionForLayer (esriLayer) {
  return {
    type: 'FeatureCollection',
    features: esriLayer.features.map(esriFeature => {
      return {
        properties: esriFeature.attributes,
        geometry: arcgisToGeoJSON(esriFeature.geometry)
      }
    }).filter(f => f != null && f.geometry != null && f.geometry.coordinates != null)
  }
}

const esriToGeoPackageDataTypeMap = {
  esriFieldTypeSmallInteger: 1,
  esriFieldTypeInteger: 5,
  esriFieldTypeSingle: 8,
  esriFieldTypeDouble: 7,
  esriFieldTypeString: 9,
  esriFieldTypeDate: 12,
  esriFieldTypeOID: 5,
  esriFieldTypeGeometry: null,
  esriFieldTypeBlob: 10,
  esriFieldTypeRaster: null,
  esriFieldTypeGUID: 9,
  esriFieldTypeGlobalID: 9,
  esriFieldTypeXML: 9
}

/**
 * Converts the esri field types to geopackage data types
 * @param esriLayer
 * @returns {{notNull: boolean, defaultValue: *, name: *, type: *}[]}
 */
function getGeoPackageColumnsForLayer (esriLayer) {
  return esriLayer.fields.map(field => {
    return {
      name: field.name,
      dataType: esriToGeoPackageDataTypeMap[field.type],
      defaultValue: field.defaultValue,
      notNull: false
    }
  }).filter(field => field.dataType != null)
}

export {
  getFeatureCollectionForLayer,
  getGeoPackageColumnsForLayer
}
