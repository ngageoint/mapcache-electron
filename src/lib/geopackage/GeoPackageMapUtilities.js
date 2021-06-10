import isEmpty from 'lodash/isEmpty'
import { performSafeGeoPackageOperation } from './GeoPackageCommon'
import { _queryForFeaturesAt, _getFeatureColumns } from './GeoPackageFeatureTableUtilities'
import { _getStyleAssignmentForFeatures } from './GeoPackageStyleUtilities'
import { _getMediaAttachmentsCounts } from './GeoPackageMediaUtilities'

function getFeaturesForTablesAtLatLngZoom (name, id, geopackagePath, tables, latlng, zoom, isGeoPackage = true) {
  return performSafeGeoPackageOperation(geopackagePath, (gp) => {
    const geopackageTables = []
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i]
      const features = _queryForFeaturesAt(gp, tableName, latlng, zoom)
      if (!isEmpty(features)) {
        const tableId = isGeoPackage ? id + '_' + tableName : id
        const table = {
          id: tableId,
          tabName: isGeoPackage ? name + ': ' + tableName : name,
          tableName: tableName,
          columns: _getFeatureColumns(gp, tableName),
          features: features,
          featureStyleAssignments: _getStyleAssignmentForFeatures(gp, tableName),
          featureAttachmentCounts: _getMediaAttachmentsCounts(gp, tableName)
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
