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
  esriFieldTypeSmallInteger: 'TINYINT',
  esriFieldTypeInteger: 'INTEGER',
  esriFieldTypeSingle: 'REAL',
  esriFieldTypeDouble: 'DOUBLE',
  esriFieldTypeString: 'TEXT',
  esriFieldTypeDate: 'DATETIME',
  esriFieldTypeOID: 'INTEGER',
  esriFieldTypeGeometry: null,
  esriFieldTypeBlob: 'BLOB',
  esriFieldTypeRaster: null,
  esriFieldTypeGUID: 'TEXT',
  esriFieldTypeGlobalID: 'TEXT',
  esriFieldTypeXML: 'TEXT'
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
