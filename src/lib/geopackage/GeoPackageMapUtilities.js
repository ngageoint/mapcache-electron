import { performSafeGeoPackageOperation } from './GeoPackageCommon'
import {_getFeatureColumns, _countOfFeaturesAt} from './GeoPackageFeatureTableUtilities'

function getFeaturesForTablesAtLatLngZoom (name, id, geopackagePath, tables, latlng, zoom, isGeoPackage = true) {
  return performSafeGeoPackageOperation(geopackagePath, (gp) => {
    const geopackageTables = []
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i]
      const featureCount = _countOfFeaturesAt(gp, [tableName], latlng, zoom)
      if (featureCount > 0) {
        const tableId = isGeoPackage ? id + '_' + tableName : id
        const table = {
          id: tableId,
          tabName: isGeoPackage ? name + ': ' + tableName : name,
          tableName: tableName,
          columns: _getFeatureColumns(gp, tableName),
          featureCount: featureCount,
          path: geopackagePath,
          latlng: latlng,
          zoom: zoom
        }
        if (isGeoPackage) {
          table.geopackageId = id
        } else {
          table.sourceId = id
        }
        geopackageTables.push(table)
      }
    }
    return geopackageTables
  })
}

export {
  getFeaturesForTablesAtLatLngZoom
}
