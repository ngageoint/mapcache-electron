import {
  GeoPackageAPI,
  FeatureColumn,
  GeometryColumns,
  BoundingBox,
  GeoPackageDataType,
  FeatureTableStyles,
  GeometryType,
  GeoPackage,
  GeometryData,
  MediaTable,
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import keys from 'lodash/keys'
import isObject from 'lodash/isObject'
import reproject from 'reproject'
import wkx from 'wkx'
import bbox from '@turf/bbox'
import moment from 'moment'
import {
  performSafeGeoPackageOperation,
  projectGeometryTo4326,
  getQueryBoundingBoxForCoordinateAndZoom,
  _calculateTrueExtentForFeatureTable
} from './GeoPackageCommon'
import {_addMediaAttachment} from './GeoPackageMediaUtilities'
import {
  _addOrSetStyleForFeature, _clearStylingForFeature
} from './GeoPackageStyleUtilities'

/**
 * Links a feature row to a media row
 * @param gp
 * @param baseTableName
 * @param baseId
 * @param relatedTableName
 * @param relatedId
 * @returns {number}
 */
function _linkFeatureRowToMediaRow (gp, baseTableName, baseId, relatedTableName, relatedId) {
  const rte = gp.relatedTablesExtension
  const mappingTableName = baseTableName + '_' + relatedTableName
  const relationship = rte
    .getRelationshipBuilder()
    .setBaseTableName(baseTableName)
    .setRelatedTableName(relatedTableName)
    .setRelationType(MediaTable.RELATION_TYPE)
    .setMappingTableName(mappingTableName)
  rte.addRelationship(relationship)
  const userMappingDao = rte.getMappingDao(mappingTableName)
  const userMappingRow = userMappingDao.newRow()
  userMappingRow.baseId = baseId
  userMappingRow.relatedId = relatedId
  return userMappingDao.create(userMappingRow)
}

/**
 * Update feature geometry
 * @param gp
 * @param tableName
 * @param featureGeoJson
 * @param updateBoundingBox
 */
function _updateFeatureGeometry (gp, tableName, featureGeoJson, updateBoundingBox = true) {
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  const featureRow = featureDao.queryForId(featureGeoJson.id)
  const geometryData = new GeometryData()
  geometryData.setSrsId(srs.srs_id)
  let feature = cloneDeep(featureGeoJson)
  if (!(srs.organization === 'EPSG' && srs.organization_coordsys_id === 4326)) {
    feature = reproject.reproject(feature, 'EPSG:4326', featureDao.projection)
  }

  const featureGeometry = typeof feature.geometry === 'string' ? JSON.parse(feature.geometry) : feature.geometry
  if (featureGeometry !== null) {
    const geometry = wkx.Geometry.parseGeoJSON(featureGeometry)
    geometryData.setGeometry(geometry)
  } else {
    const temp = wkx.Geometry.parse('POINT EMPTY')
    geometryData.setGeometry(temp)
  }
  featureRow.geometry = geometryData
  featureDao.update(featureRow)
  if (updateBoundingBox) {
    _updateBoundingBoxForFeatureTable(gp, tableName)
  }
}

/**
 * Updates a feature's geometry to the geojson passed in (id must be in the feature)
 * @param filePath
 * @param tableName
 * @param featureGeoJson
 * @param updateBoundingBox
 * @returns {Promise<any>}
 */
async function updateFeatureGeometry (filePath, tableName, featureGeoJson, updateBoundingBox = true) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _updateFeatureGeometry(gp, tableName, featureGeoJson, updateBoundingBox)
  })
}

/**
 * Adds a feature to a feature table and updates the extent listed in the contents, if necessary
 * @param gp
 * @param featureDao
 * @param tableName
 * @param feature
 * @param updateBoundingBox
 * @param datesUpdated
 */
function _addFeatureToFeatureTable (gp, featureDao, tableName, feature, updateBoundingBox = true, datesUpdated = false) {
  if (!datesUpdated) {
    featureDao.table.getUserColumns().getColumns().forEach(column => {
      if (column.dataType === GeoPackageDataType.DATE || column.dataType === GeoPackageDataType.DATETIME) {
        if (!isNil(feature.properties[column.getName()]) && !isEmpty(feature.properties[column.getName()])) {
          feature.properties[column.getName()] = moment.utc(feature.properties[column.getName()]).toDate()
        } else {
          delete feature.properties[column.getName()]
        }
      }
    })
  }
  const rowId = gp.addGeoJSONFeatureToGeoPackageWithFeatureDaoAndSrs(feature, featureDao, featureDao.srs, true)
  _addOrSetStyleForFeature(gp, feature, rowId, tableName)
  if (updateBoundingBox) {
    _updateBoundingBoxForFeatureTable(gp, tableName)
  }
  return rowId
}

/**
 * Adds a feature to the feature table and updates the extent listed in the contents, if necessary
 * @param filePath
 * @param tableName
 * @param feature
 * @returns {Promise<any>}
 */
function addFeatureToFeatureTable (filePath, tableName, feature) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    const featureDao = gp.getFeatureDao(tableName)
    return _addFeatureToFeatureTable(gp, featureDao, tableName, feature)
  })
}

/**
 * Gets columns for a feature table using the feature collection provided
 * @param featureCollection
 * @returns {{columns: Array, id: {name: string}, geom: {name: string}}}
 */
function getLayerColumns (featureCollection) {
  let properties = {}
  featureCollection.features.forEach(feature => {
    addFeatureProperties(feature, properties)
  })
  let columns = []
  Object.keys(properties).forEach(key => {
    let prop = properties[key]
    if (prop.name.toLowerCase() !== 'id') {
      let c = {
        dataType: !isNil(prop.type) ? prop.type : 'TEXT',
        name: prop.name,
        notNull: false,
        defaultValue: null
      }
      columns.push(c)
    }
  })
  return {
    columns: columns,
    geom: {
      name: 'geometry'
    },
    id: {
      name: 'id'
    }
  }
}

/**
 * Creates a feature table and adds the contents of the feature collection to that table
 * @param gp
 * @param tableName
 * @param featureCollection
 * @param addFeatures
 * @param fields
 * @returns {Promise<void>}
 */
async function _createFeatureTable (gp, tableName, featureCollection, addFeatures = false, fields = null) {
  if (isNil(fields)) {
    // iterate over the feature collection and cleanup any objects that are not dates, strings, numbers or booleans (these are our only supported types)
    featureCollection.features.forEach(feature => {
      Object.keys(feature.properties).forEach(key => {
        let type = typeof feature.properties[key]
        if (feature.properties[key] !== undefined && feature.properties[key] !== null && type !== 'undefined') {
          if (type === 'object') {
            if (!(feature.properties[key] instanceof Date)) {
              feature.properties[key] = JSON.stringify(feature.properties[key])
            }
          }
        }
      })
    })
  }
  let layerColumns = isNil(fields) ? getLayerColumns(featureCollection) : {
    columns: fields,
    geom: {
      name: 'geometry'
    },
    id: {
      name: 'id'
    }
  }
  let geometryColumns = new GeometryColumns()
  geometryColumns.table_name = tableName
  geometryColumns.column_name = layerColumns.geom.name
  geometryColumns.geometry_type_name = GeometryType.nameFromType(GeometryType.GEOMETRY)
  geometryColumns.z = 0
  geometryColumns.m = 0
  let columns = []
  columns.push(FeatureColumn.createPrimaryKeyColumn(0, layerColumns.id.name))
  columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, GeometryType.GEOMETRY, false, null))
  let columnCount = 2
  for (const column of layerColumns.columns) {
    if (column.name !== layerColumns.id.name && column.name !== layerColumns.geom.name) {
      columns.push(FeatureColumn.createColumn(columnCount++, column.name, GeoPackageDataType.fromName(column.dataType), column.notNull, column.defaultValue))
    }
  }
  let extent = bbox(featureCollection)
  let bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])
  gp.createFeatureTable(tableName, geometryColumns, columns, bb, 4326)
  const featureDao = gp.getFeatureDao(tableName)
  if (addFeatures) {
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i]
      const attachment = feature.attachment
      delete feature.attachment
      const rowId = _addFeatureToFeatureTable(gp, featureDao, tableName, feature)
      if (attachment != null) {
        await _addMediaAttachment(gp, tableName, rowId, attachment)
      }
    }
  }
  await _indexFeatureTable(gp, tableName)
}

/**
 * Creates a feature table
 * @param filePath
 * @param tableName
 * @param featureCollection
 * @returns {Promise<any>}
 */
async function createFeatureTable (filePath, tableName, featureCollection) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _createFeatureTable(gp, tableName, featureCollection, true)
  }, true)
}

/**
 * Indexes a feature table
 * @param gp
 * @param tableName
 * @param force
 * @returns {Promise<void>}
 */
async function _indexFeatureTable (gp, tableName, force = false) {
  const featureDao = gp.getFeatureDao(tableName)
  const fti = featureDao.featureTableIndex
  if (fti) {
    await fti.indexWithForce(force)
  }
}

/**
 * Indexes a feature table
 * @param filePath
 * @param tableName
 * @param force
 * @returns {Promise<any>}
 */
async function indexFeatureTable (filePath, tableName, force = false) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _indexFeatureTable(gp, tableName, force)
  }, true)
}

/**
 * Adds feature properties to a properties object
 * @param feature
 * @param currentProperties
 */
function addFeatureProperties (feature, currentProperties) {
  if (feature.properties.geometry) {
    feature.properties.geometry_property = feature.properties.geometry
    delete feature.properties.geometry
  }

  if (feature.id) {
    if (!currentProperties['_feature_id']) {
      currentProperties['_feature_id'] = currentProperties['_feature_id'] || {
        name: '_feature_id',
        type: GeoPackageDataType.nameFromType(GeoPackageDataType.INTEGER)
      }
    }
  }

  Object.keys(feature.properties).forEach(key => {
    if (!currentProperties[key]) {
      currentProperties[key] = currentProperties[key] || {
        name: key
      }
      // TODO: do a better job of checking if property is date and also provide mechanism for converting into Date object before it goes to geopackage API
      let type = typeof feature.properties[key]
      if (feature.properties[key] !== undefined && feature.properties[key] !== null && type !== 'undefined') {
        if (type === 'object') {
          if (feature.properties[key] instanceof Date) {
            type = 'Date'
          }
        }
        switch (type) {
          case 'Date':
            type = 'DATETIME'
            break
          case 'number':
            type = 'DOUBLE'
            break
          case 'string':
            type = 'TEXT'
            break
          case 'boolean':
            type = 'BOOLEAN'
            break
        }
        currentProperties[key] = {
          name: key,
          type: type
        }
      }
    }
  })
}

/**
 * Gets the feature ids for the features in a feature table
 * @param gp
 * @param tableName
 * @returns {Array}
 */
function _getFeatureIds (gp, tableName) {
  let featureIds = []
  let featureDao = gp.getFeatureDao(tableName)
  const idColumn = featureDao.table.getIdColumn().getName()
  featureDao.queryForAll().forEach(f => {
    featureIds.push(f[idColumn])
  })
  return featureIds
}

/**
 * Gets the feature ids from the features in a feature table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getFeatureIds (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureIds(gp, tableName)
  })
}

/**
 * Gets the ids for the point and multi point geometry type features
 * @param gp
 * @param tableName
 * @returns {Array}
 */
function _getPointAndMultiPointFeatureIds (gp, tableName) {
  let featureIds = []
  let featureDao = gp.getFeatureDao(tableName)
  const idColumn = featureDao.table.getIdColumn().getName()
  featureDao.queryForAll().forEach(f => {
    const featureRow = featureDao.getRow(f)
    const geometryType = GeometryType.fromName(featureRow.geometry.toGeoJSON().type.toUpperCase())
    if (geometryType === GeometryType.POINT || geometryType === GeometryType.MULTIPOINT) {
      featureIds.push(f[idColumn])
    }
  })
  return featureIds
}

/**
 * Gets the ids for the point and multi point geometry type features
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getPointAndMultiPointFeatureIds (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getPointAndMultiPointFeatureIds(gp, tableName)
  })
}

/**
 * Renames a geopackage table column
 * @param gp
 * @param tableName
 * @param columnName
 * @param newColumnName
 */
function _renameGeoPackageFeatureTableColumn (gp, tableName, columnName, newColumnName) {
  const featureDao = gp.getFeatureDao(tableName)
  featureDao.renameColumn(columnName, newColumnName)
}

/**
 * Renames a geopackage table column
 * @param filePath
 * @param tableName
 * @param columnName
 * @param newColumnName
 * @returns {Promise<any>}
 */
async function renameGeoPackageFeatureTableColumn (filePath, tableName, columnName, newColumnName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _renameGeoPackageFeatureTableColumn(gp, tableName, columnName, newColumnName)
  })
}

/**
 * Deletes a table column from the geopackage
 * @param gp
 * @param tableName
 * @param columnName
 */
function _deleteGeoPackageFeatureTableColumn (gp, tableName, columnName) {
  const featureDao = gp.getFeatureDao(tableName)
  featureDao.dropColumn(columnName)
}

/**
 * Deletes a table column from the geopackage
 * @param filePath
 * @param tableName
 * @param columnName
 * @returns {Promise<any>}
 */
async function deleteGeoPackageFeatureTableColumn (filePath, tableName, columnName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteGeoPackageFeatureTableColumn(gp, tableName, columnName)
  })
}

/**
 * Adds a table column to the geopackage
 * @param gp
 * @param tableName
 * @param columnName
 * @param columnType
 */
function _addGeoPackageFeatureTableColumn (gp, tableName, columnName, columnType) {
  const featureDao = gp.getFeatureDao(tableName)
  featureDao.addColumn(new FeatureColumn(featureDao.table.getUserColumns().columnCount(), columnName, columnType))
}

/**
 * Adds a table column to the geopackage
 * @param filePath
 * @param tableName
 * @param columnName
 * @param columnType
 * @returns {Promise<any>}
 */
async function addGeoPackageFeatureTableColumn (filePath, tableName, columnName, columnType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _addGeoPackageFeatureTableColumn(gp, tableName, columnName, columnType)
  })
}

/**
 * Adds a table column to the geopackage
 * @param gp
 * @param tableName
 * @param columns
 */
function _addGeoPackageFeatureTableColumns (gp, tableName, columns = []) {
  const featureDao = gp.getFeatureDao(tableName)
  columns.forEach(column => {
    featureDao.addColumn(new FeatureColumn(featureDao.table.getUserColumns().columnCount(), column.name, column.dataType))
  })
}

/**
 * Adds a table column to the geopackage
 * @param filePath
 * @param tableName
 * @param columns
 * @returns {Promise<any>}
 */
async function addGeoPackageFeatureTableColumns (filePath, tableName, columns = []) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _addGeoPackageFeatureTableColumns(gp, tableName, columns)
  })
}

/**
 * Gets a feature style row
 * @param gp
 * @param tableName
 * @param featureId
 * @param geometryType
 * @returns {StyleRow}
 */
function _getFeatureStyleRow (gp, tableName, featureId, geometryType) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  return featureTableStyles.getFeatureStyleExtension().getStyle(tableName, featureId, geometryType, false)
}

/**
 * Updates a feature row
 * @param gp
 * @param tableName
 * @param featureRow
 */
function _updateFeatureRow (gp, tableName, featureRow) {
  const featureDao = gp.getFeatureDao(tableName)
  return featureDao.update(featureRow)
}

/**
 * Updates a feature row
 * @param filePath
 * @param tableName
 * @param featureRow
 * @returns {Promise<any>}
 */
async function updateFeatureRow (filePath, tableName, featureRow) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _updateFeatureRow(gp, tableName, featureRow)
  })
}

/**
 * Deletes a feature row
 * @param gp
 * @param tableName
 * @param featureRowId
 */
function _deleteFeatureRow (gp, tableName, featureRowId) {
  gp.getFeatureDao(tableName).deleteById(featureRowId)
  try {
    _clearStylingForFeature(gp, tableName, featureRowId)
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-empty
  }
  _updateBoundingBoxForFeatureTable(gp, tableName)
}

/**
 * Delets a feature row
 * @param filePath
 * @param tableName
 * @param featureRowId
 * @returns {Promise<any>}
 */
async function deleteFeatureRow (filePath, tableName, featureRowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteFeatureRow(gp, tableName, featureRowId)
  })
}

/**
 * Gets the bounding box for a feature's geometry
 * @param gp
 * @param tableName
 * @param featureRowId
 * @returns {null}
 */
function _getBoundingBoxForFeature (gp, tableName, featureRowId) {
  let extent = null
  const featureDao = gp.getFeatureDao(tableName)
  const featureRow = featureDao.queryForId(featureRowId)
  if (featureRow) {
    const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, featureDao.srs)
    extent = bbox(feature)
  }
  return extent
}

/**
 * Gets the bounding box for a feature's geometry
 * @param filePath
 * @param tableName
 * @param featureRowId
 * @returns {Promise<any>}
 */
async function getBoundingBoxForFeature (filePath, tableName, featureRowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getBoundingBoxForFeature(gp, tableName, featureRowId)
  })
}

/**
 * Updates the bounding box for a feature table to match the actual contents of the table
 * @param gp
 * @param tableName
 */
function _updateBoundingBoxForFeatureTable (gp, tableName) {
  const contentsDao = gp.contentsDao
  const contents = contentsDao.queryForId(tableName)
  const extent = _calculateTrueExtentForFeatureTable(gp, tableName)
  if (extent != null) {
    contents.min_x = extent[0]
    contents.min_y = extent[1]
    contents.max_x = extent[2]
    contents.max_y = extent[3]
  } else {
    contents.min_x = -180.0
    contents.min_y = -90.0
    contents.max_x = 180.0
    contents.max_y = 90.0
  }
  contentsDao.update(contents)
}

/**
 * Updates the bounding box for a feature table to match the actual contents of the table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function updateBoundingBoxForFeatureTable (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _updateBoundingBoxForFeatureTable(gp, tableName)
  })
}

/**
 * Gets the feature count in a bounding box
 * @param gp
 * @param tableName
 * @param boundingBox
 * @returns {number}
 */
function _getFeatureCountInBoundingBox (gp, tableName, boundingBox) {
  return gp.getFeatureDao(tableName).countInBoundingBox(new BoundingBox(boundingBox[0], boundingBox[2], boundingBox[1], boundingBox[3]), 'EPSG:4326')
}

/**
 * Gets the feature count in a bounding box
 * @param filePath
 * @param tableName
 * @param boundingBox
 * @returns {Promise<any>}
 */
async function getFeatureCountInBoundingBox (filePath, tableName, boundingBox) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureCountInBoundingBox(gp, tableName, boundingBox)
  })
}

/**
 * Gets all features in a table as geojson
 * @param gp
 * @param tableName
 * @returns {any[]}
 */
function _getAllFeaturesAsGeoJSON (gp, tableName) {
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  let each = featureDao.queryForEach()
  const features = []
  for (let row of each) {
    if (!isNil(row)) {
      const featureRow = featureDao.getRow(row)
      const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
      feature.type = 'Feature'
      features.push(feature)
    }
  }
  return features
}

/**
 * Gets all features in a table as geojson
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getAllFeaturesAsGeoJSON (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getAllFeaturesAsGeoJSON(gp, tableName)
  })
}

/**
 * Gets all features in a table
 * @param gp
 * @param tableName
 * @param srsId
 * @param boundingBox
 * @returns {any[]}
 */
function _getAllFeatureRowsIn4326 (gp, tableName, srsId, boundingBox) {
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  const projectionNeeded = srs.organization.toUpperCase() + ':' + srs.srs_id !== 'EPSG:4326'
  let each
  if (!isNil(boundingBox) && !isNil(featureDao.featureTableIndex) && featureDao.isIndexed()) {
    each = featureDao.featureTableIndex.queryWithBoundingBox(boundingBox, 'EPSG:4326')
  } else {
    each = featureDao.queryForEach()
  }
  const featureRows = []
  for (let row of each) {
    if (!isNil(row)) {
      const featureRow = featureDao.getRow(row)
      if (projectionNeeded) {
        featureRow.geometry.setGeometry(projectGeometryTo4326(featureRow.geometry, srs))
      }
      featureRows.push(featureRow)
    }
  }
  return featureRows
}

/**
 * Gets all features in a table
 * @param filePath
 * @param tableName
 * @param srsId
 * @param boundingBox
 * @returns {Promise<any>}
 */
async function getAllFeatureRowsIn4326 (filePath, tableName, srsId, boundingBox) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getAllFeatureRowsIn4326(gp, tableName, srsId, boundingBox)
  })
}

/**
 * Gets all features in a table
 * @param gp
 * @param tableName
 * @returns {any[]}
 */
function _getAllFeatureRows (gp, tableName) {
  const featureDao = gp.getFeatureDao(tableName)
  const each = featureDao.queryForEach()
  const featureRows = []
  for (let row of each) {
    if (!isNil(row)) {
      featureRows.push(featureDao.getRow(row))
    }
  }
  return featureRows
}

/**
 * Gets all features in a table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getAllFeatureRows (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getAllFeatureRows(gp, tableName)
  })
}

/**
 * Gets feature in table
 * @param gp
 * @param tableName
 * @param id
 * @returns {FeatureRow}
 */
function _getFeatureRow (gp, tableName, id) {
  const featureDao = gp.getFeatureDao(tableName)
  return featureDao.queryForId(id)
}

/**
 * Gets features in table
 * @param filePath
 * @param tableName
 * @param id
 * @returns {Promise<any>}
 */
async function getFeatureRow (filePath, tableName, id) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureRow(gp, tableName, id)
  })
}

/**
 * Qeuries for features at a coordinate with a buffer based on zoom level
 * @param gp
 * @param tableName
 * @param coordinate
 * @param zoom
 * @returns {Object}
 */
function _queryForFeaturesAt (gp, tableName, coordinate, zoom) {
  let features
  if (gp.getFeatureDao(tableName).isIndexed()) {
    features = gp.queryForGeoJSONFeaturesInTable(tableName, getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom)).filter(feature => !isNil(feature))
  }
  return features
}

/**
 * Queries for features at a coordinate with a buffer based on zoom level
 * @param filePath
 * @param tableName
 * @param coordinate
 * @param zoom
 * @returns {Promise<any>}
 */
async function queryForFeaturesAt (filePath, tableName, coordinate, zoom) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _queryForFeaturesAt(gp, tableName, coordinate, zoom)
  })
}

/**
 * Gets the count for the features near a coordinate based on zoom
 * @param gp
 * @param tableNames
 * @param coordinate
 * @param zoom
 * @returns {number}
 */
function _countOfFeaturesAt (gp, tableNames, coordinate, zoom) {
  let count = 0
  for (let i = 0; i < tableNames.length; i++) {
    const tableName = tableNames[i]
    const featureDao = gp.getFeatureDao(tableName)
    if (featureDao.isIndexed()) {
      count += featureDao.countInBoundingBox(getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom), 'EPSG:4326')
    }
  }
  return count
}

/**
 * Gets the count for the features near a coordinate based on zoom
 * @param filePath
 * @param tableNames
 * @param coordinate
 * @param zoom
 * @returns {Promise<any>}
 */
async function countOfFeaturesAt (filePath, tableNames, coordinate, zoom) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _countOfFeaturesAt(gp, tableNames, coordinate, zoom)
  })
}

/**
 * merges feature columns from several tables to be used in a new table
 * will create new column if data type is different
 * will update column
 * @param mergedColumns
 * @param featureColumns
 */
function mergeFeatureColumns (mergedColumns, featureColumns) {
  const nameChanges = {}
  featureColumns.setCustom(true)
  // remove pk column
  if (featureColumns.hasPkColumn()) {
    featureColumns.dropColumnWithIndex(featureColumns.getPkColumnIndex())
  }
  // remove feature column
  if (featureColumns.hasGeometryColumn()) {
    featureColumns.dropColumnWithIndex(featureColumns.getGeometryIndex())
  }
  if (isNil(mergedColumns)) {
    mergedColumns = featureColumns
  } else {
    featureColumns.getColumns().forEach(column => {
      const columnName = column.getName()
      if (mergedColumns.hasColumn(columnName)) {
        let mergedColumn = mergedColumns.getColumn(columnName)
        const dataType = mergedColumn.getDataType()
        if (dataType !== column.getDataType()) {
          const newColumnName = (columnName + '_' + GeoPackageDataType.nameFromType(column.getDataType())).toLowerCase()
          if (!mergedColumns.hasColumn(newColumnName)) {
            const columnCopy = column.copy()
            columnCopy.setName(newColumnName)
            columnCopy.resetIndex()
            mergedColumns.addColumn(columnCopy)
          }
          mergedColumn = mergedColumns.getColumn(newColumnName)
          nameChanges[columnName] = newColumnName
        }
        // check if existing column needs more constraints
        if (column.isNotNull() && !mergedColumn.isNotNull()) {
          mergedColumn.setNotNull(true)
        }
        if (column.hasDefaultValue() && !mergedColumn.hasDefaultValue()) {
          mergedColumn.setDefaultValue(column.getDefaultValue())
        }
        if (column.hasMax() && !mergedColumn.hasMax()) {
          mergedColumn.setMax(column.getMax())
        }
      } else {
        column.resetIndex()
        mergedColumns.addColumn(column)
      }
    })
  }
  return {mergedColumns, nameChanges}
}

function _getFeatureColumns (gp, tableName) {
  return gp.getFeatureDao(tableName).table.getUserColumns()
}

/**
 * Gets the feature columns for a table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getFeatureColumns (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureColumns(gp, tableName)
  })
}

/**
 * Check if a feature exists
 * @param gp
 * @param tableName
 * @param featureId
 * @returns {boolean}
 */
function _featureExists (gp, tableName, featureId) {
  let exists = false
  if (gp.getFeatureTables().indexOf(tableName) !== -1) {
    exists = !isNil(gp.getFeatureDao(tableName).queryForId(featureId))
  }
  return exists
}

/**
 * Check if a feature exists
 * @param filePath
 * @param tableName
 * @param featureId
 * @returns {Promise<any>}
 */
async function featureExists (filePath, tableName, featureId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _featureExists(gp, tableName, featureId)
  })
}

/**
 * Writes a geopackage to the filename provided containing a feature table with the feature collection provided.
 * If a style is provided the style extension will be enabled and associated styles/icons will be created
 * @param fileName
 * @param tableName
 * @param featureCollection
 * @param style
 * @param fields
 * @returns {Promise<{error: any}>}
 */
async function buildGeoPackage (fileName, tableName, featureCollection, style = null, fields = null) {
  // create the geopackage
  let gp = await GeoPackageAPI.create(fileName)
  try {
    // setup the columns for the feature table
    await _createFeatureTable(gp, tableName, featureCollection, false, fields)

    let featureTableStyles
    if (!isNil(style)) {
      featureTableStyles = new FeatureTableStyles(gp, tableName)
      featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
      featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
      featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
      featureTableStyles.createTableStyleRelationship()
      featureTableStyles.createTableIconRelationship()
      featureTableStyles.createStyleRelationship()
      featureTableStyles.createIconRelationship()
    }

    let icons = {}
    let styles = {}
    let iconIdToIconRowId = {}
    let styleIdToStyleRowId = {}
    let iterator = featureCollection.features

    let featureDao = gp.getFeatureDao(tableName)

    let dateColumns = featureDao.table.getUserColumns().getColumns().filter(column => column.dataType === GeoPackageDataType.DATE || column.dataType === GeoPackageDataType.DATETIME).map(column => column.getName())

    for (let feature of iterator) {
      if (feature.properties) {
        feature.properties.id = undefined
        keys(feature.properties).forEach(key => {
          if (isObject(feature.properties[key])) {
            delete feature.properties[key]
          }

          // date correction
          if (dateColumns.indexOf(key) !== -1) {
            if (!isNil(feature.properties[key]) && !isEmpty(feature.properties[key])) {
              feature.properties[key] = moment.utc(feature.properties[key]).toDate()
            } else {
              delete feature.properties[key]
            }
          }
        })
      }
      let featureRowId = _addFeatureToFeatureTable (gp, featureDao, tableName, feature, null, false, true)
      if (!isNil(style) && !isNil(style.features[feature.id])) {
        const geometryType = GeometryType.fromName(feature.geometry.type.toUpperCase())
        if (!isNil(style.features[feature.id].icon)) {
          let iconId = style.features[feature.id].icon
          let featureIconRow = icons[iconId]
          if (isNil(featureIconRow)) {
            let featureIcon = style.iconRowMap[iconId]
            featureIconRow = featureTableStyles.getIconDao().newRow()
            featureIconRow.data = featureIcon.data
            featureIconRow.contentType = featureIcon.contentType
            featureIconRow.width = featureIcon.width
            featureIconRow.height = featureIcon.height
            featureIconRow.anchorU = featureIcon.anchorU
            featureIconRow.anchorV = featureIcon.anchorV
            featureIconRow.name = featureIcon.name
            let featureIconRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(featureIconRow)
            delete style.iconRowMap[iconId]
            style.iconRowMap[featureIconRowId] = featureIcon
            iconIdToIconRowId[iconId] = featureIconRowId
            icons[iconId] = featureIconRow
          }
          style.features[feature.id].icon = iconIdToIconRowId[iconId]
          featureTableStyles.setIcon(featureRowId, geometryType, featureIconRow)
        } else if (!isNil(style.features[feature.id].style)) {
          let styleId = style.features[feature.id].style
          let featureStyleRow = styles[styleId]
          if (isNil(featureStyleRow)) {
            let featureStyle = style.styleRowMap[styleId]
            featureStyleRow = featureTableStyles.getStyleDao().newRow()
            featureStyleRow.setColor(featureStyle.color, featureStyle.opacity)
            featureStyleRow.setFillColor(featureStyle.fillColor, featureStyle.fillOpacity)
            featureStyleRow.setWidth(featureStyle.width)
            featureStyleRow.setName(featureStyle.name)
            let featureStyleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(featureStyleRow)
            delete style.styleRowMap[styleId]
            style.styleRowMap[featureStyleRowId] = featureStyle
            styleIdToStyleRowId[styleId] = featureStyleRowId
            styles[styleId] = featureStyleRow
          }
          style.features[feature.id].style = styleIdToStyleRowId[styleId]
          featureTableStyles.setStyle(featureRowId, geometryType, featureStyleRow)
        }
      }
    }
    await _indexFeatureTable(gp, tableName)
  } finally {
    try {
      gp.close()
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to close GeoPackage')
    }
  }
}

export {
  _linkFeatureRowToMediaRow,
  _updateFeatureGeometry,
  updateFeatureGeometry,
  _addFeatureToFeatureTable,
  addFeatureToFeatureTable,
  getLayerColumns,
  _createFeatureTable,
  createFeatureTable,
  _indexFeatureTable,
  indexFeatureTable,
  addFeatureProperties,
  _getFeatureIds,
  getFeatureIds,
  _getPointAndMultiPointFeatureIds,
  getPointAndMultiPointFeatureIds,
  _renameGeoPackageFeatureTableColumn,
  renameGeoPackageFeatureTableColumn,
  _deleteGeoPackageFeatureTableColumn,
  deleteGeoPackageFeatureTableColumn,
  _addGeoPackageFeatureTableColumn,
  addGeoPackageFeatureTableColumn,
  _getFeatureStyleRow,
  _updateFeatureRow,
  updateFeatureRow,
  _deleteFeatureRow,
  deleteFeatureRow,
  _getBoundingBoxForFeature,
  getBoundingBoxForFeature,
  _updateBoundingBoxForFeatureTable,
  updateBoundingBoxForFeatureTable,
  _getFeatureCountInBoundingBox,
  getFeatureCountInBoundingBox,
  _getAllFeaturesAsGeoJSON,
  getAllFeaturesAsGeoJSON,
  _getAllFeatureRowsIn4326,
  getAllFeatureRowsIn4326,
  _getAllFeatureRows,
  getAllFeatureRows,
  _getFeatureRow,
  getFeatureRow,
  _queryForFeaturesAt,
  queryForFeaturesAt,
  _countOfFeaturesAt,
  countOfFeaturesAt,
  mergeFeatureColumns,
  _getFeatureColumns,
  getFeatureColumns,
  _featureExists,
  featureExists,
  buildGeoPackage,
  addGeoPackageFeatureTableColumns
}
