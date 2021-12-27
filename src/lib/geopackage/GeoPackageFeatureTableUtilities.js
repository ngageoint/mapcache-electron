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
  ProjectionConstants,
  SqliteQueryBuilder,
  FeatureTableReader,
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
import {_addMediaAttachment, _getMediaAttachmentsCounts} from './GeoPackageMediaUtilities'
import {
  _addOrSetStyleForFeature,
  _clearStylingForFeature,
  _getStyleAssignmentForFeatures,
} from './GeoPackageStyleUtilities'
import orderBy from 'lodash/orderBy'

const MINIMUM_BATCH_SIZE = 10
const DEFAULT_BATCH_SIZE = 1000
const MAXIMUM_BATCH_SIZE = 10000

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
 * @param updateStyle
 */
function _addFeatureToFeatureTable (gp, featureDao, tableName, feature, updateBoundingBox = true, datesUpdated = false, updateStyle = true) {
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
  if (updateStyle) {
    _addOrSetStyleForFeature(gp, feature, rowId, tableName)
  }
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
  featureCollection.features.forEach(feature => addFeatureProperties(feature, properties))
  let columns = []
  keys(properties).forEach(key => {
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

const ID_PROPERTY = '_feature_id'
const GEOMETRY_PROPERTY = 'geometry_property'

/**
 * Converts a GeoJSON FeatureCollection to a GeoPackage Feature Table
 * @param gp
 * @param tableName
 * @param featureCollection
 * @returns {Promise<void>}
 */
async function _createFeatureTable (gp, tableName, featureCollection) {
  // create basic 4326 feature table
  let geometryColumns = new GeometryColumns()
  geometryColumns.table_name = tableName
  geometryColumns.column_name = 'geometry'
  geometryColumns.geometry_type_name = GeometryType.nameFromType(GeometryType.GEOMETRY)
  geometryColumns.z = 0
  geometryColumns.m = 0
  const definedColumnNames = {
    id: true,
    geometry: true
  }
  const columns = []
  columns.push(FeatureColumn.createPrimaryKeyColumn(0, 'id'))
  columns.push(FeatureColumn.createGeometryColumn(1, 'geometry', GeometryType.GEOMETRY, false, null))
  const extent = bbox(featureCollection)
  const bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])
  gp.createFeatureTable(tableName, geometryColumns, columns, bb, 4326)
  const featureDao = gp.getFeatureDao(tableName)

  // add feature style extension
  const featureTableStyles = new FeatureTableStyles(gp, tableName)
  featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
  featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
  featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
  featureTableStyles.createTableStyleRelationship()
  featureTableStyles.createTableIconRelationship()
  featureTableStyles.createStyleRelationship()
  featureTableStyles.createIconRelationship()

  let iterator = featureCollection.features
  for (let feature of iterator) {
    // handle geometry property
    if (feature.properties.geometry) {
      if (!definedColumnNames[GEOMETRY_PROPERTY]) {
        definedColumnNames[GEOMETRY_PROPERTY] = true
        featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), GEOMETRY_PROPERTY, getDataTypeForValue(feature.properties.geometry)))
      }
      feature.properties.geometry_property = feature.properties.geometry
      delete feature.properties.geometry
    }

    // handle id property
    if (feature.id || feature.properties.id) {
      if (!definedColumnNames[ID_PROPERTY]) {
        definedColumnNames[ID_PROPERTY] = true
        featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), ID_PROPERTY, GeoPackageDataType.TEXT))
      }
      feature.properties[ID_PROPERTY] = feature.id || feature.properties.id
      delete feature.id
      delete feature.properties.id
    }

    // iterate over feature's property and add any new ones
    keys(feature.properties).forEach(key => {
      // does the property exist
      if (!definedColumnNames[key.toLowerCase()]) {
        definedColumnNames[key.toLowerCase()] = true
        featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), key, getDataTypeForValue(feature.properties[key])))
      }

      // date correction
      if (featureDao.table.columns.getColumn(key).getDataType() === GeoPackageDataType.DATETIME) {
        if (!isNil(feature.properties[key]) && !isEmpty(feature.properties[key])) {
          feature.properties[key] = moment.utc(feature.properties[key]).toDate()
        } else {
          delete feature.properties[key]
        }
      }

      // object correction
      if (isObject(feature.properties[key])) {
        feature.properties[key] = JSON.stringify(feature.properties[key])
      }
    })

    const featureRowId = gp.addGeoJSONFeatureToGeoPackageWithFeatureDaoAndSrs(feature, featureDao, featureDao.srs, true)
    _addOrSetStyleForFeature(gp, feature, featureRowId, tableName)
    if (feature.attachment != null) {
      await _addMediaAttachment(gp, tableName, featureRowId, feature.attachment)
    }
  }
  await _indexFeatureTable(gp, tableName)
}

/**
 * Create a feature table by streaming in features
 * Returns two functions, addFeature and done. Use addFeature to pass each feature to be added to the table, call done when you are finished.
 * Done also returns the number of features added and extent of the data in the table
 * @param gp
 * @param tableName
 * @return {Promise<{adjustBatchSize: adjustBatchSize, addMediaAttachment: addMediaAttachment, setFeatureIcon: setFeatureIcon, addField: addField, setFeatureStyle: setFeatureStyle, addFeature: (function(*=): number), addStyle: (function(*): number), done: (function(): {extent: [(number|*), (number|*), (number|*), (number|*)], count: *}), addIcon: (function(*): number)}>}
 * @private
 */
async function _createFeatureTableWithFeatureStream (gp, tableName) {
  let geometryColumns = new GeometryColumns()
  geometryColumns.table_name = tableName
  geometryColumns.column_name = 'geometry'
  geometryColumns.geometry_type_name = GeometryType.nameFromType(GeometryType.GEOMETRY)
  geometryColumns.z = 0
  geometryColumns.m = 0
  const definedColumnNames = {
    id: true,
    geometry: true
  }
  const columns = []
  columns.push(FeatureColumn.createPrimaryKeyColumn(0, 'id'))
  columns.push(FeatureColumn.createGeometryColumn(1, 'geometry', GeometryType.GEOMETRY, false, null))
  gp.createFeatureTable(tableName, geometryColumns, columns, undefined, 4326)
  await _indexFeatureTable(gp, tableName)
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs;
  let iconMappingDao
  let styleMappingDao
  let styleDao
  let iconDao
  let featureStyleExtension
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
  featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
  featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
  featureTableStyles.createTableStyleRelationship()
  featureTableStyles.createTableIconRelationship()
  featureTableStyles.createStyleRelationship()
  featureTableStyles.createIconRelationship()
  iconMappingDao = featureTableStyles.getIconMappingDao()
  styleMappingDao = featureTableStyles.getStyleMappingDao()
  styleDao = featureTableStyles.getStyleDao()
  iconDao = featureTableStyles.getIconDao()
  featureStyleExtension = featureTableStyles.getFeatureStyleExtension()

  const addStyle = (style) => {
    const featureStyleRow = styleDao.newRow()
    featureStyleRow.setColor(style.color, style.opacity)
    featureStyleRow.setFillColor(style.fillColor, style.fillOpacity)
    featureStyleRow.setWidth(style.width)
    featureStyleRow.setName(style.name)
    return featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(featureStyleRow)
  }

  const addIcon = (icon) => {
    const featureIconRow = iconDao.newRow()
    featureIconRow.data = icon.data
    featureIconRow.contentType = icon.contentType
    featureIconRow.width = icon.width
    featureIconRow.height = icon.height
    featureIconRow.anchorU = icon.anchorU
    featureIconRow.anchorV = icon.anchorV
    featureIconRow.name = icon.name
    return featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(featureIconRow)
  }

  const addField = (field) => {
    if (definedColumnNames[field.name.toLowerCase()] == null) {
      definedColumnNames[field.name.toLowerCase()] = true
      featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), field.name, GeoPackageDataType.fromName(field.dataType), undefined, field.notNull, field.defaultValue))
    }
  }

  let batchSize = DEFAULT_BATCH_SIZE

  const adjustBatchSize = (featuresToInsert) => {
    let n = 0
    while (Math.pow(10, n) < featuresToInsert) {
      n++
    }
    if (n > 0) {
      n--
    }
    batchSize = Math.min(MAXIMUM_BATCH_SIZE, Math.max(MINIMUM_BATCH_SIZE, Math.pow(10, n) / 100))
  }

  let batch = []
  let featureIndex = 1

  let styleQueue = []
  let iconQueue = []
  let attachmentQueue = []
  let featureRow = featureDao.newRow()
  let geometryData = new GeometryData()
  geometryData.setSrsId(srs.srs_id)

  const handleQueuedStylesAndAttachments = () => {
    while (styleQueue.length > 0) {
      const args = styleQueue.shift()
      featureStyleExtension.insertStyleMapping(styleMappingDao, args[0], args[1], GeometryType.fromName(args[2].toUpperCase()))
    }
    while (iconQueue.length > 0) {
      const args = iconQueue.shift()
      featureStyleExtension.insertStyleMapping(iconMappingDao, args[0], args[1], GeometryType.fromName(args[2].toUpperCase()))
    }
    while (attachmentQueue.length > 0) {
      const args = attachmentQueue.shift()
      _addMediaAttachment(gp, tableName, args[0], args[1])
    }
  }

  const setFeatureStyle = (featureRowId, geometryType, styleRowId) => {
    styleQueue.push([featureRowId, styleRowId, geometryType])
  }

  const setFeatureIcon = (featureRowId, geometryType, iconRowId) => {
    iconQueue.push([featureRowId, iconRowId, geometryType])
  }

  const addMediaAttachment = (featureRowId, attachment) => {
    attachmentQueue.push([featureRowId, attachment])
  }

  const processBatch = () => {
    // batch insert features
    const emptyPoint = wkx.Geometry.parse('POINT EMPTY')
    const reprojectionNeeded = !(srs.organization === ProjectionConstants.EPSG && srs.organization_coordsys_id === ProjectionConstants.EPSG_CODE_4326)
    const insertSql = SqliteQueryBuilder.buildInsert("'" + featureDao.gpkgTableName + "'", featureRow)
    featureRow = featureDao.newRow()
    featureDao.connection.transaction(() => {
      // builds the insert sql statement
      const insertStatement = featureDao.connection.adapter.prepareStatement(insertSql)

      // determine if indexing is needed
      let fti = featureDao.featureTableIndex
      let tableIndex = fti.tableIndex

      while (batch.length > 0) {
        let feature = batch.shift()
        featureRow.resetId()
        if (reprojectionNeeded) {
          feature = reproject.reproject(feature, ProjectionConstants.EPSG_4326, featureDao.projection)
        }
        const featureGeometry = feature.geometry
        geometryData.setGeometry(featureGeometry ? wkx.Geometry.parseGeoJSON(featureGeometry) : emptyPoint)
        featureRow.geometry = geometryData
        for (const propertyKey in feature.properties) {
          if (Object.prototype.hasOwnProperty.call(feature.properties, propertyKey)) {
            featureRow.setValueWithColumnName(propertyKey, feature.properties[propertyKey])
          }
        }
        // bind this feature's data to the insert statement and insert into the table
        const id = featureDao.connection.adapter.bindAndInsert(insertStatement, SqliteQueryBuilder.buildUpdateOrInsertObject(featureRow))

        // after inserting, unset the values
        for (const propertyKey in feature.properties) {
          if (Object.prototype.hasOwnProperty.call(feature.properties, propertyKey)) {
            featureRow.values[propertyKey] = undefined;
          }
        }

        // if table index exists, be sure to index the row (note, rtree will run using a trigger)
        if (tableIndex != null) {
          fti.indexRow(tableIndex, id, geometryData)
        }
      }
      if (tableIndex != null) {
        fti.updateLastIndexed(tableIndex)
      }

      // close the prepared statement
      featureDao.connection.adapter.closeStatement(insertStatement)
    })
    handleQueuedStylesAndAttachments()
  }

  const addFeature = (feature) => {
    // handle geometry property
    if (feature.properties.geometry) {
      if (!definedColumnNames[GEOMETRY_PROPERTY]) {
        definedColumnNames[GEOMETRY_PROPERTY] = true
        featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), GEOMETRY_PROPERTY, getDataTypeForValue(feature.properties.geometry)))
      }
      feature.properties.geometry_property = feature.properties.geometry
      delete feature.properties.geometry
    }

    // handle id property
    if (feature.id || feature.properties.id) {
      if (!definedColumnNames[ID_PROPERTY]) {
        definedColumnNames[ID_PROPERTY] = true
        featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), ID_PROPERTY, GeoPackageDataType.TEXT))
      }
      feature.properties[ID_PROPERTY] = feature.id || feature.properties.id
      delete feature.id
      delete feature.properties.id
    }

    // iterate over feature's property and add any new ones
    keys(feature.properties).forEach(key => {
      // add missing fields
      if (!definedColumnNames[key.toLowerCase()]) {
        definedColumnNames[key.toLowerCase()] = true
        featureDao.addColumn(new FeatureColumn(featureDao.table.columns.columnCount(), key, getDataTypeForValue(feature.properties[key])))
      }

      // date correction
      if (featureDao.table.columns.getColumn(key).getDataType() === GeoPackageDataType.DATETIME) {
        if (!isNil(feature.properties[key]) && !isEmpty(feature.properties[key])) {
          feature.properties[key] = moment.utc(feature.properties[key]).toDate()
        } else {
          delete feature.properties[key]
        }
      }

      // object correction
      if (isObject(feature.properties[key])) {
        feature.properties[key] = JSON.stringify(feature.properties[key])
      }
    })

    // push feature onto the batch
    batch.push(feature)

    // reached batch limit, execute a batch insert
    if (batch.length >= batchSize) {
      processBatch()
    }

    return featureIndex++
  }

  const done = async () => {
    if (batch.length > 0) {
      processBatch()
    }
    // await _indexFeatureTable(gp, tableName)
    const contents = _updateBoundingBoxForFeatureTable(gp, tableName)
    const extent = [contents.min_x, contents.min_y, contents.max_x, contents.max_y]
    return {
      extent,
      count: featureDao.count()
    }
  }

  return { adjustBatchSize, addFeature, addField, addMediaAttachment, addStyle, setFeatureStyle, setFeatureIcon, addIcon, done }
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
    return _createFeatureTable(gp, tableName, featureCollection)
  }, true)
}

/**
 * Indexes a feature table
 * @param gp
 * @param tableName
 * @param force
 * @param progress
 * @returns {Promise<void>}
 */
async function _indexFeatureTable (gp, tableName, force = false, progress) {
  const featureDao = gp.getFeatureDao(tableName)
  const fti = featureDao.featureTableIndex
  if (fti) {
    await fti.indexWithForce(force, progress)
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
 * Retruns the GeoPackageDataType
 * @param value
 * @return {GeoPackageDataType}
 */
function getDataTypeForValue (value) {
  let type
  switch (typeof value) {
    case 'number':
      type = GeoPackageDataType.DOUBLE
      break
    case 'boolean':
      type = GeoPackageDataType.BOOLEAN
      break
    case 'object':
      if (value != null && value instanceof Date) {
        type = GeoPackageDataType.DATETIME
      } else {
        type = GeoPackageDataType.TEXT
      }
      break
    default:
      type = GeoPackageDataType.TEXT
      break
  }
  return type
}

/**
 * Adds feature properties to a properties object
 * @param feature
 * @param currentProperties
 */
function addFeatureProperties (feature, currentProperties) {
  // geometry column is used for the feature's geometry, migrate this property
  if (feature.properties.geometry) {
    feature.properties.geometry_property = feature.properties.geometry
    delete feature.properties.geometry
  }

  // save the feature's original id
  if (feature.id && currentProperties['_feature_id'] == null) {
    currentProperties['_feature_id'] = {
      name: '_feature_id',
      type: GeoPackageDataType.nameFromType(GeoPackageDataType.INTEGER)
    }
    feature.properties['_feature_id'] = feature.id
  }

  keys(feature.properties).filter(key => currentProperties[key] == null).forEach(key => {
    let type = typeof feature.properties[key]
    switch (type) {
      case 'number':
        type = 'DOUBLE'
        break
      case 'boolean':
        type = 'BOOLEAN'
        break
      case 'object':
        if (feature.properties[key] != null && feature.properties[key] instanceof Date) {
          type = 'DATETIME'
        } else {
          type = 'TEXT'
        }
        break
      default:
        type = 'TEXT'
        break
    }
    currentProperties[key] = {
      name: key,
      type: type
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
 * @param featureRowIds
 * @return number
 */
function _deleteFeatureRows (gp, tableName, featureRowIds) {
  let numberDeleted = 0
  for (let i = 0; i < featureRowIds.length; i++) {
    const featureRowId = featureRowIds[i]
    try {
      _clearStylingForFeature(gp, tableName, featureRowId)
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    try {
      numberDeleted += gp.getFeatureDao(tableName).deleteById(featureRowId)
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
  }
  _updateBoundingBoxForFeatureTable(gp, tableName)
  return numberDeleted
}

/**
 * Deletes a feature row
 * @param gp
 * @param tableName
 * @param featureRowId
 * @return number
 */
function _deleteFeatureRow (gp, tableName, featureRowId) {
  const numberDeleted = gp.getFeatureDao(tableName).deleteById(featureRowId)
  try {
    _clearStylingForFeature(gp, tableName, featureRowId)
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-empty
  }
  _updateBoundingBoxForFeatureTable(gp, tableName)
  return numberDeleted
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
 * Deletes feature rows
 * @param filePath
 * @param tableName
 * @param featureRowIds
 * @returns {Promise<any>}
 */
async function deleteFeatureRows (filePath, tableName, featureRowIds) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteFeatureRows(gp, tableName, featureRowIds)
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
  return contents
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
 * Gets the feature count
 * @param gp
 * @param tableName
 * @returns {number}
 */
function _getFeatureCount (gp, tableName) {
  return gp.getFeatureDao(tableName).count()
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
 * Gets the feature count
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getFeatureCount (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureCount(gp, tableName)
  })
}

/**
 * Gets table page features
 * @param gp
 * @param tableName
 * @param page
 * @param pageSize
 * @param sortBy
 * @param desc
 * @return {{features: *[], styleAssignments: {}, mediaCounts: {}}}
 * @private
 */
function _getFeatureTablePage (gp, tableName, page, pageSize, sortBy = undefined, desc = false) {
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  const offset = page * pageSize
  const query = SqliteQueryBuilder.buildQuery(false, "'" + featureDao.gpkgTableName + "'", undefined, undefined, undefined, undefined, undefined, sortBy ? '"' + sortBy + '"' + (desc ? ' DESC NULLS LAST' : ' ASC NULLS LAST') : undefined, pageSize, offset)
  let each = featureDao.connection.each(query)
  const features = []
  for (let row of each) {
    if (!isNil(row)) {
      const featureRow = featureDao.getRow(row)
      const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
      feature.type = 'Feature'
      feature.id = featureRow.id
      features.push(feature)
    }
  }

  const featureIds = features.map(f => f.id)
  const featureIdAndGeometryTypes = features.map(f => {
    return {id: f.id, geometryType: f.geometry.type}
  })
  const styleAssignments = _getStyleAssignmentForFeatures(gp, tableName, featureIdAndGeometryTypes)
  const mediaCounts = _getMediaAttachmentsCounts(gp, tableName, featureIds)

  return {features, styleAssignments, mediaCounts}
}

/**
 *
 * @param filePath
 * @param tableName
 * @param page
 * @param pageSize
 * @param sortBy
 * @param desc
 * @return {Promise<{{features: *[], styleAssignments: {}, mediaCounts: {}}}>}
 */
async function getFeatureTablePage (filePath, tableName, page, pageSize, sortBy, desc) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureTablePage(gp, tableName, page, pageSize, sortBy, desc)
  })
}

function _getFeatureViewData (gp, tableName, featureId) {
  let featureData = {
    feature: null,
    attachments: [],
    style: {},
    columns: null
  }
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  const featureRow = featureDao.queryForId(featureId)
  const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
  feature.type = 'Feature'
  feature.id = featureRow.id
  featureData.feature = feature
  const featureStyleExtension = new FeatureTableStyles(gp, tableName).getFeatureStyleExtension()
  const icon = featureStyleExtension.getIcon(tableName, featureId, GeometryType.fromName(feature.geometry.type.toUpperCase()), false)
  const style = featureStyleExtension.getStyle(tableName, featureId, GeometryType.fromName(feature.geometry.type.toUpperCase()), false)
  if (style != null) {
    featureData.style.style = {
      id: style.id,
      name: style.getName(),
      description: style.getDescription(),
      color: style.getHexColor(),
      opacity: style.getOpacity(),
      fillColor: style.getFillHexColor(),
      fillOpacity: style.getFillOpacityOrDefault(),
      width: style.getWidth()
    }
  } else if (icon != null) {
    featureData.style.icon = {
      url: 'data:' + icon.contentType + ';base64,' + icon.data.toString('base64')
    }
  } else {
    featureData.style.style = {
      id: Number.MAX_SAFE_INTEGER,
      name: 'Default',
      description: null,
      color: '#000000',
      opacity: 1.0,
      fillColor: '#000000',
      fillOpacity: 0.3,
      width: 3.0
    }
  }

  featureData.geometryTypeCode = GeometryType.fromName(feature.geometry.type.toUpperCase())
  featureData.columns = _getFeatureColumns(gp, tableName)._columns
  const properties = isNil(feature) ? {} : cloneDeep(feature.properties)
  const columnObjects = featureData.columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id').map((column) => {
    return getEditableColumnObject(column, properties)
  })
  featureData.editableColumns = orderBy(columnObjects, ['lowerCaseName'], ['asc'])
  return featureData
}

async function getFeatureViewData (filePath, tableName, featureId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureViewData(gp, tableName, featureId)
  })
}

/**
 * Checks if a value would be unique
 * @param gp
 * @param tableName
 * @param column
 * @param value
 * @return {boolean}
 * @private
 */
function _checkUnique (gp, tableName, column, value) {
  const featureDao = gp.getFeatureDao(tableName)
  const results = featureDao.queryForAllEq(column, value)
  return results == null || results.length === 0
}

async function checkUnique (filePath, tableName, column, value) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _checkUnique(gp, tableName, column, value)
  })
}

/**
 * Get the feature on top
 * @param gp
 * @param tableName
 * @param latlng
 * @param zoom
 * @return {Promise<null>}
 */
async function _getTopFeature (gp, tableName, latlng, zoom) {
  let feature = null
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  const envelope = getQueryBoundingBoxForCoordinateAndZoom(latlng, zoom).projectBoundingBox('EPSG:4326', featureDao.projection).buildEnvelope()
  const index = featureDao.featureTableIndex.rtreeIndexed ? featureDao.featureTableIndex.rtreeIndexDao : featureDao.featureTableIndex.geometryIndexDao
  const geomEnvelope = index._generateGeometryEnvelopeQuery(envelope)
  const query = SqliteQueryBuilder.buildQuery(false, "'" + index.gpkgTableName + "'", geomEnvelope.tableNameArr, geomEnvelope.where, geomEnvelope.join, undefined, undefined, '"' + featureDao._table.getPkColumnName() + '" DESC')
  const row = featureDao.connection.get(query, geomEnvelope.whereArgs)
  if (!isNil(row)) {
    feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureDao.getRow(row), srs)
    feature.type = 'Feature'
    feature.id = row.id
  }
  return feature
}

async function getTopFeature (filePath, tableName, latlng, zoom) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTopFeature(gp, tableName, latlng, zoom)
  })
}

/**
 * Gets table page features with respect to features in the bounding box (latlng + zoom)
 * @param gp
 * @param tableName
 * @param page
 * @param pageSize
 * @param latlng
 * @param zoom
 * @param sortBy
 * @param desc
 * @return {{features: *[], styleAssignments: {}, mediaCounts: {}}}
 * @private
 */
function _getFeatureTablePageAtLatLngZoom (gp, tableName, page, pageSize, latlng, zoom, sortBy, desc) {
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs
  const offset = page * pageSize
  const envelope = getQueryBoundingBoxForCoordinateAndZoom(latlng, zoom).projectBoundingBox('EPSG:4326', featureDao.projection).buildEnvelope()
  const index = featureDao.featureTableIndex.rtreeIndexed ? featureDao.featureTableIndex.rtreeIndexDao : featureDao.featureTableIndex.geometryIndexDao
  const geomEnvelope = index._generateGeometryEnvelopeQuery(envelope)
  const query = SqliteQueryBuilder.buildQuery(false, "'" + index.gpkgTableName + "'", geomEnvelope.tableNameArr, geomEnvelope.where, geomEnvelope.join, undefined, undefined, sortBy ? '"' + sortBy + '"' + (desc ? ' DESC NULLS LAST' : ' ASC NULLS LAST') : undefined, pageSize, offset)
  const each = featureDao.connection.each(query, geomEnvelope.whereArgs)
  const features = []
  for (let row of each) {
    if (!isNil(row)) {
      const featureRow = featureDao.getRow(row)
      const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
      feature.type = 'Feature'
      feature.id = featureRow.id
      features.push(feature)
    }
  }
  const featureIds = features.map(f => f.id)
  const featureIdAndGeometryTypes = features.map(f => {
    return {id: f.id, geometryType: f.geometry.type}
  })
  const styleAssignments = _getStyleAssignmentForFeatures(gp, tableName, featureIdAndGeometryTypes)
  const mediaCounts = _getMediaAttachmentsCounts(gp, tableName, featureIds)
  return {features, styleAssignments, mediaCounts}
}

/**
 * Gets the feature page
 * @param filePath
 * @param tableName
 * @param page
 * @param pageSize
 * @param latlng
 * @param zoom
 * @param sortBy
 * @param desc
 * @return {Promise<{{features: *[], styleAssignments: {}, mediaCounts: {}}}>}
 */
async function getFeatureTablePageAtLatLngZoom (filePath, tableName, page, pageSize, latlng, zoom, sortBy, desc) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureTablePageAtLatLngZoom(gp, tableName, page, pageSize, latlng, zoom, sortBy, desc)
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
      feature.id = featureRow.id
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
  return new FeatureTableReader(tableName).readFeatureTable(gp).getUserColumns()
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

function getEditableColumnObject (column, properties) {
  const columnObject = {
    name: column.name,
    lowerCaseName: column.name.toLowerCase(),
    dataType: column.dataType,
    index: column.index,
    isUnique: column.unique
  }
  let value = properties[column.name]
  if (value === undefined || value === null) {
    value = column.defaultValue
  }
  if (isNil(properties[column.name]) && column.dataType === GeoPackageDataType.BOOLEAN) {
    value = false
  } else if (column.dataType === GeoPackageDataType.BOOLEAN) {
    value = properties[column.name] === 1 || properties[column.name] === true
  }
  if (column.dataType === GeoPackageDataType.DATETIME) {
    columnObject.showDate = true
    columnObject.showTime = true
    columnObject.dateValue = null
    columnObject.timeValue = null

    if (!isNil(value)) {
      try {
        const dateVal = moment.utc(value)
        value = new Date(value)
        columnObject.dateValue = dateVal.format('YYYY-MM-DD')
        columnObject.timeValue = dateVal.format('hh:mm:ss')
      } catch (e) {
        value = null
      }
    }
  }
  if (column.dataType === GeoPackageDataType.DATE) {
    columnObject.showDate = true
    columnObject.dateValue = null
    if (!isNil(value)) {
      try {
        const dateVal = moment.utc(value)
        value = new Date(value)
        columnObject.dateValue = dateVal.format('YYYY-MM-DD')
      } catch (e) {
        value = null
      }
    }
  }
  columnObject.value = value === undefined ? null : value
  if (!column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
    columnObject.rules = []
    if (column.notNull) {
      columnObject.rules.push(v => !!v || (column.lowerCaseName + ' is required'))
    }
    if (column.max) {
      columnObject.rules.push(v => v < column.max || (column.lowerCaseName + ' exceeds the max of ' + column.max))
    }
    if (column.min) {
      columnObject.rules.push(v => v < column.min || (column.lowerCaseName + ' is below the min of ' + column.min))
    }

    // TODO update this to perform a database check for uniqueness
    // issue, this check is dumb
    // if (column.unique) {
    //   columnObject.rules.push(v => window.mapcache.checkUnique(filePath, tableName, column.name, v) || column.name + ' must be a unique value')
    // }
  }
  return columnObject
}

async function getGeoPackageEditableColumnsForFeature (filePath, tableName, feature, columns) {
  if (isNil(columns) || isNil(columns._columns)) {
    return []
  }
  const properties = isNil(feature) ? {} : cloneDeep(feature.properties)
  const columnObjects = columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id').map((column) => {
    return getEditableColumnObject(column, properties)
  })

  return orderBy(columnObjects, ['lowerCaseName'], ['asc'])
}

/**
 * Save feature's edits and geometry changes
 * @param filePath
 * @param tableName
 * @param featureId
 * @param editableColumns
 * @param updatedGeometry
 * @return {Promise<*>}
 */
async function saveGeoPackageEditedFeature (filePath, tableName, featureId, editableColumns, updatedGeometry) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    const featureRow = featureDao.queryForId(featureId)
    editableColumns.forEach(column => {
      let value = column.value
      if (column.dataType === GeoPackageDataType.BOOLEAN) {
        value = (value === 1 || value === true || value === 'true' || value === '1') ? 1 : 0
      }
      if (column.dataType === GeoPackageDataType.DATE) {
        try {
          if (!isEmpty(column.dateValue)) {
            value = new Date(column.dateValue).toISOString().substring(0, 10)
          } else {
            value = null
          }
        } catch (e) {
          value = null
        }
      }
      if (column.dataType === GeoPackageDataType.DATETIME) {
        try {
          const dateString = column.dateValue + ' ' + (isNil(column.timeValue) ? '00:00:00' : column.timeValue)
          if (!isEmpty(dateString)) {
            value = moment.utc(dateString).toISOString()
          } else {
            value = null
          }
        } catch (e) {
          value = null
        }
      }
      featureRow.setValueNoValidationWithIndex(column.index, value)
    })

    if (updatedGeometry != null) {
      const geometryData = new GeometryData()
      geometryData.setSrsId(srs.srs_id)
      let feature = {type: 'Feature', properties: {}, geometry: updatedGeometry}
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
    }
    let result = featureDao.update(featureRow)
    _updateBoundingBoxForFeatureTable(gp, tableName)
    return result
  })
}

/**
 * Allows for the streaming of features by returning functions for adding features and notifying completion.
 * addFeature takes a GeoJSON feature and will add it to the table.
 * done will signal to close the geopackage and return the stats from the streaming, extent of data in table and count of rows in table.
 * @param fileName
 * @param tableName
 * @return {Promise<{adjustBatchSize: adjustBatchSize, addMediaAttachment: addMediaAttachment, setFeatureIcon: setFeatureIcon, addField: addField, setFeatureStyle: setFeatureStyle, addFeature: (function(*=): number), addStyle: (function(*): number), done: (function(): *), addIcon: (function(*): number)}>}
 */
async function streamingGeoPackageBuild (fileName, tableName) {
  // create the geopackage
  let gp = await GeoPackageAPI.create(fileName)

  let {adjustBatchSize, addFeature, addField, addMediaAttachment, addStyle, addIcon, setFeatureStyle, setFeatureIcon, done} = await _createFeatureTableWithFeatureStream(gp, tableName)

  return {
    adjustBatchSize: adjustBatchSize,
    addFeature: addFeature,
    addField: addField,
    addMediaAttachment: addMediaAttachment,
    addStyle: addStyle,
    addIcon: addIcon,
    setFeatureStyle: setFeatureStyle,
    setFeatureIcon: setFeatureIcon,
    done: async () => {
      const result = await done()
      try {
        gp.close()
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close GeoPackage')
      }
      return result
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
  _deleteFeatureRows,
  deleteFeatureRows,
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
  addGeoPackageFeatureTableColumns,
  streamingGeoPackageBuild,
  getFeatureCount,
  getFeatureTablePage,
  getFeatureTablePageAtLatLngZoom,
  getGeoPackageEditableColumnsForFeature,
  saveGeoPackageEditedFeature,
  getEditableColumnObject,
  getTopFeature,
  getFeatureViewData,
  checkUnique
}
