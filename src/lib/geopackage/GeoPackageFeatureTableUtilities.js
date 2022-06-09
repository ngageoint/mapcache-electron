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
  SqliteQueryBuilder,
  FeatureTableReader,
  UserRow
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import keys from 'lodash/keys'
import isObject from 'lodash/isObject'
import reproject from 'reproject'
import wkx from 'wkx'
import bbox from '@turf/bbox'
import distance from '@turf/distance'
import pointToLineDistance from '@turf/point-to-line-distance'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import polygonToLine from '@turf/polygon-to-line'
import moment from 'moment'
import {
  performSafeGeoPackageOperation,
  projectGeometryTo4326,
  getQueryBoundingBoxForCoordinateAndZoom,
  _calculateTrueExtentForFeatureTable
} from './GeoPackageCommon'
import {
  _addMedia,
  _addMediaAttachment,
  _getMediaAttachmentsCounts,
  _linkMediaToFeature
} from './GeoPackageMediaUtilities'
import {
  _addOrSetStyleForFeature,
  _clearStylingForFeature,
  _getFeatureIcon,
  _getFeatureStyle,
  _getStyleAssignmentForFeatures,
  _setFeatureIcon,
  _setFeatureStyle,
} from './GeoPackageStyleUtilities'
import orderBy from 'lodash/orderBy'
import { getMediaTableName } from '../util/media/MediaUtilities'
import {
  EPSG,
  COLON_DELIMITER,
  WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_CODE
} from '../projection/ProjectionConstants'

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
  if (!(srs.organization === EPSG && srs.organization_coordsys_id === WORLD_GEODETIC_SYSTEM_CODE)) {
    feature = reproject.reproject(feature, WORLD_GEODETIC_SYSTEM, featureDao.projection)
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
  const extent = featureCollection != null && featureCollection.features.length > 0 ? bbox(featureCollection) : [-180, -90, 180, 90]
  const bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])
  gp.createFeatureTable(tableName, geometryColumns, columns, bb, WORLD_GEODETIC_SYSTEM_CODE)
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

      // object correction
      if (isObject(feature.properties[key])) {
        feature.properties[key] = JSON.stringify(feature.properties[key])
      }

      // date correction
      const dataType = featureDao.table.columns.getColumn(key).getDataType()
      if (dataType === GeoPackageDataType.DATE || dataType === GeoPackageDataType.DATETIME) {
        if (!isNil(feature.properties[key]) && !isEmpty(feature.properties[key])) {
          feature.properties[key] = moment.utc(feature.properties[key]).toDate()
        } else {
          delete feature.properties[key]
        }
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
 * @return {Promise<{adjustBatchSize: function, addMediaAttachment: function, setFeatureIcon: function, addField: function, setFeatureStyle: function, processBatch: function, addFeature: (function(*=): number), addStyle: (function(*): number), done: (function(): {extent: [(number|*), (number|*), (number|*), (number|*)], count: *}), addIcon: (function(*): number)}>}
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
  gp.createFeatureTable(tableName, geometryColumns, columns, undefined, WORLD_GEODETIC_SYSTEM_CODE)
  await _indexFeatureTable(gp, tableName)
  const featureDao = gp.getFeatureDao(tableName)
  const srs = featureDao.srs;
  let iconMappingDao
  let styleMappingDao
  let tableIconMappingDao
  let tableStyleMappingDao
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
  tableIconMappingDao = featureTableStyles.getTableIconMappingDao()
  tableStyleMappingDao = featureTableStyles.getTableStyleMappingDao()
  const featureContentsId = featureTableStyles.getFeatureStyleExtension().contentsIdExtension.getOrCreateIdByTableName(tableName).id
  styleDao = featureTableStyles.getStyleDao()
  iconDao = featureTableStyles.getIconDao()
  featureStyleExtension = featureTableStyles.getFeatureStyleExtension()

  const addStyle = (style) => {
    let featureStyleRow
    if (style instanceof UserRow) {
      style.resetId()
      featureStyleRow = style
    } else {
      featureStyleRow = styleDao.newRow()
      featureStyleRow.setColor(style.color, style.opacity)
      featureStyleRow.setFillColor(style.fillColor, style.fillOpacity)
      featureStyleRow.setWidth(style.width)
      featureStyleRow.setName(style.name)
    }
    return featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(featureStyleRow)
  }

  const addIcon = (icon) => {
    let featureIconRow
    if (icon instanceof UserRow) {
      icon.resetId()
      featureIconRow = icon
    } else {
      featureIconRow = iconDao.newRow()
      featureIconRow.data = icon.data
      featureIconRow.contentType = icon.contentType
      featureIconRow.width = icon.width
      featureIconRow.height = icon.height
      featureIconRow.anchorU = icon.anchorU
      featureIconRow.anchorV = icon.anchorV
      featureIconRow.name = icon.name
    }
    return featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(featureIconRow)
  }

  const addField = (field) => {
    if (definedColumnNames[field.name.toLowerCase()] == null) {
      definedColumnNames[field.name.toLowerCase()] = true
      const column = new FeatureColumn(featureDao.table.columns.columnCount(), field.name, field.dataType, field.max, field.notNull, field.defaultValue)
      column.unique = field.unique
      if (field.constraints != null) {
        column.constraints = field.constraints
      }
      column.min = field.min
      featureDao.addColumn(column)
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

  // setup a media table for this feature table
  const mediaTableName = getMediaTableName()
  const rte = gp.relatedTablesExtension
  if (!gp.connection.isTableExists(mediaTableName)) {
    const mediaTable = MediaTable.create(mediaTableName)
    rte.createRelatedTable(mediaTable)
  }
  const mediaDao = rte.getMediaDao(mediaTableName)

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
      const featureRow = featureDao.newRow()
      featureRow.id = args[0]
      const mediaRow = mediaDao.newRow()
      mediaRow.id = args[1]
      _linkMediaToFeature(gp, featureDao, featureRow, mediaRow)
    }
  }

  const setFeatureStyle = (featureRowId, geometryType, styleRowId) => {
    styleQueue.push([featureRowId, styleRowId, geometryType])
  }

  const setFeatureIcon = (featureRowId, geometryType, iconRowId) => {
    iconQueue.push([featureRowId, iconRowId, geometryType])
  }

  const setTableStyle = (styleId, geometryType) => {
    featureTableStyles.getFeatureStyleExtension().insertStyleMapping(tableStyleMappingDao, featureContentsId, styleId, GeometryType.fromName(geometryType))
  }

  const setTableIcon = (iconId, geometryType) => {
    featureTableStyles.getFeatureStyleExtension().insertStyleMapping(tableIconMappingDao, featureContentsId, iconId, GeometryType.fromName(geometryType))
  }

  const addMediaAttachment = (featureRowId, attachment) => {
    attachmentQueue.push([featureRowId, (typeof attachment === 'number' ? attachment : _addMedia(gp, mediaDao, attachment))])
  }

  const processBatch = () => {
    // batch insert features
    const emptyPoint = wkx.Geometry.parse('POINT EMPTY')
    const reprojectionNeeded = !(srs.organization === EPSG && srs.organization_coordsys_id === WORLD_GEODETIC_SYSTEM_CODE)
    const insertSql = SqliteQueryBuilder.buildInsert('\'' + featureDao.gpkgTableName + '\'', featureRow)
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
          feature = reproject.reproject(feature, WORLD_GEODETIC_SYSTEM, featureDao.projection)
        }
        const featureGeometry = feature.geometry
        geometryData.setGeometry(featureGeometry ? wkx.Geometry.parseGeoJSON(featureGeometry) : emptyPoint)
        featureRow.geometry = geometryData
        for (const propertyKey in feature.properties) {
          if (Object.prototype.hasOwnProperty.call(feature.properties, propertyKey)) {
            try {
              featureRow.setValueWithColumnName(propertyKey, feature.properties[propertyKey])
              // eslint-disable-next-line no-unused-vars, no-empty
            } catch (e) {
            }
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

      // object correction
      if (isObject(feature.properties[key])) {
        feature.properties[key] = JSON.stringify(feature.properties[key])
      }

      // date correction
      const dataType = featureDao.table.columns.getColumn(key).getDataType()
      if (dataType === GeoPackageDataType.DATETIME || dataType === GeoPackageDataType.DATE) {
        if (feature.properties[key] == null) {
          delete feature.properties[key]
        } else {
          try {
            feature.properties[key] = moment.utc(feature.properties[key]).toDate()
            // eslint-disable-next-line no-unused-vars
          } catch (e) {
            delete feature.properties[key]
          }
        }
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

  return {
    adjustBatchSize,
    addFeature,
    addField,
    addMediaAttachment,
    addStyle,
    setFeatureStyle,
    setFeatureIcon,
    addIcon,
    setTableStyle,
    setTableIcon,
    processBatch,
    done
  }
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
  let type = null
  const featureDao = gp.getFeatureDao(tableName)
  const featureRow = featureDao.queryForId(featureRowId)
  if (featureRow) {
    const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, featureDao.srs)
    if (feature.geometry != null) {
      extent = bbox(feature)
      type = feature.geometry.type
    }
  }
  return { extent, type }
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
  return gp.getFeatureDao(tableName).countInBoundingBox(new BoundingBox(boundingBox[0], boundingBox[2], boundingBox[1], boundingBox[3]), WORLD_GEODETIC_SYSTEM)
}

function _getWhereClause (featureDao, search) {
  let whereClause
  if (search != null && search.length > 0) {
    const columnNames = featureDao._table.getUserColumns()._columnNames
    whereClause = ''
    for (let i = 0; i < columnNames.length; i++) {
      const column = featureDao._table.getColumnWithColumnName(columnNames[i])
      if (column.isPrimaryKey() || featureDao._table.getGeometryColumnName() === columnNames[i]) {
        continue
      }
      const columnType = column.getDataType()
      if (columnType === GeoPackageDataType.TEXT) {
        whereClause += ((whereClause.length > 0 ? ' or `' : ' `') + columnNames[i] + '` LIKE \'%' + search + '%\'')
      } else if (columnType === GeoPackageDataType.BOOLEAN) {
        if (search.toLowerCase().trim() === '1' || search.toLowerCase().trim() === 't' || search.toLowerCase().trim() === 'tr' || search.toLowerCase().trim() === 'tru' || search.toLowerCase().trim() === 'true') {
          whereClause += ((whereClause.length > 0 ? ' or `' : ' `') + columnNames[i] + '` = 1')
        } else if (search.toLowerCase().trim() === '0' || search.toLowerCase().trim() === 'f' || search.toLowerCase().trim() === 'fa' || search.toLowerCase().trim() === 'fal' || search.toLowerCase().trim() === 'fals' || search.toLowerCase().trim() === 'false') {
          whereClause += ((whereClause.length > 0 ? ' or `' : ' `') + columnNames[i] + '` = 0')
        }
      } else if (!isNaN(search.trim()) &&
        (columnType === GeoPackageDataType.REAL ||
          columnType === GeoPackageDataType.FLOAT ||
          columnType === GeoPackageDataType.DOUBLE)) {
        whereClause += ((whereClause.length > 0 ? ' or `' : ' `') + columnNames[i] + '` = ' + Number.parseFloat(search.trim()))
      } else if (!isNaN(search.trim()) && search.indexOf('.') === -1 &&
        (columnType === GeoPackageDataType.MEDIUMINT ||
          columnType === GeoPackageDataType.SMALLINT ||
          columnType === GeoPackageDataType.INTEGER ||
          columnType === GeoPackageDataType.INT ||
          columnType === GeoPackageDataType.TINYINT)) {
        whereClause += ((whereClause.length > 0 ? ' or `' : ' `') + columnNames[i] + '` = ' + Number.parseInt(search.trim()))
      }
    }
  }
  return whereClause
}

/**
 * Gets the feature count
 * @param gp
 * @param tableName
 * @param search
 * @returns {number}
 */
function _getFeatureCount (gp, tableName, search) {
  let count = 0
  if (gp.connection.tableExists(tableName)) {
    const featureDao = gp.getFeatureDao(tableName)
    const whereClause = _getWhereClause(featureDao, search)
    if (whereClause != null) {
      const query = SqliteQueryBuilder.buildCount('\'' + tableName + '\'', whereClause)
      count = featureDao.connection.get(query).count
    } else {
      count = featureDao.count()
    }
  }
  return count
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
 * @param search
 * @returns {Promise<any>}
 */
async function getFeatureCount (filePath, tableName, search) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureCount(gp, tableName, search)
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
 * @param search
 * @return {{features: *[], styleAssignments: {}, mediaCounts: {}}}
 * @private
 */
function _getFeatureTablePage (gp, tableName, page, pageSize, sortBy = undefined, desc = false, search = '') {
  let result = {
    features: null, styleAssignments: null, mediaCounts: null
  }
  if (gp.connection.tableExists(tableName)) {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    const offset = page * pageSize
    let whereClause = _getWhereClause(featureDao, search)

    const query = SqliteQueryBuilder.buildQuery(false, "'" + featureDao.gpkgTableName + "'", undefined, whereClause, undefined, undefined, undefined, sortBy ? '"' + sortBy + '"' + (desc ? ' DESC NULLS LAST' : ' ASC NULLS LAST') : undefined, pageSize, offset)
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
    const featureIdAndGeometryTypes = features.filter(f => f.geometry != null).map(f => {
      return { id: f.id, geometryType: f.geometry.type }
    })
    const styleAssignments = _getStyleAssignmentForFeatures(gp, tableName, featureIdAndGeometryTypes)
    const mediaCounts = _getMediaAttachmentsCounts(gp, tableName, featureIds)
    result = { features, styleAssignments, mediaCounts }
  }


  return result
}

/**
 *
 * @param filePath
 * @param tableName
 * @param page
 * @param pageSize
 * @param sortBy
 * @param desc
 * @param search
 * @return {Promise<{{features: *[], styleAssignments: {}, mediaCounts: {}}}>}
 */
async function getFeatureTablePage (filePath, tableName, page, pageSize, sortBy, desc, search) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureTablePage(gp, tableName, page, pageSize, sortBy, desc, search)
  })
}

function _getFeatureViewData (gp, tableName, featureId) {
  let featureData = {
    feature: null,
    attachments: [],
    style: {},
    columns: null
  }
  if (gp.connection.tableExists(tableName)) {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    const featureRow = featureDao.queryForId(featureId)
    if (featureRow != null) {
      const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
      feature.type = 'Feature'
      feature.id = featureRow.id
      featureData.feature = feature
      const geometryType = feature.geometry != null ? GeometryType.fromName(feature.geometry.type.toUpperCase()) : null
      const featureStyleExtension = new FeatureTableStyles(gp, tableName).getFeatureStyleExtension()
      const icon = featureStyleExtension.getIcon(tableName, featureId, geometryType, false)
      const style = featureStyleExtension.getStyle(tableName, featureId, geometryType, false)
      const tableIcon = featureStyleExtension.getTableIcon(tableName, geometryType)
      const tableStyle = featureStyleExtension.getTableStyle(tableName, geometryType)
      if (icon != null) {
        featureData.style.icon = {
          url: 'data:' + icon.contentType + ';base64,' + icon.data.toString('base64')
        }
      } else if (style != null) {
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
      } else if (tableIcon != null) {
        featureData.style.icon = {
          url: 'data:' + tableIcon.contentType + ';base64,' + tableIcon.data.toString('base64')
        }
      } else if (tableStyle != null) {
        featureData.style.style = {
          id: tableStyle.id,
          name: tableStyle.getName(),
          description: tableStyle.getDescription(),
          color: tableStyle.getHexColor(),
          opacity: tableStyle.getOpacity(),
          fillColor: tableStyle.getFillHexColor(),
          fillOpacity: tableStyle.getFillOpacityOrDefault(),
          width: tableStyle.getWidth()
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

      featureData.geometryTypeCode = geometryType
      featureData.columns = _getFeatureColumns(gp, tableName)._columns
      const properties = isNil(feature) ? {} : cloneDeep(feature.properties)
      const columnObjects = featureData.columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id').map((column) => {
        return getEditableColumnObject(column, properties)
      })
      featureData.editableColumns = orderBy(columnObjects, ['lowerCaseName'], ['asc'])
    }
  }
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
 * Determines the distance from a geojson feature to a coordinate in meters
 * @param coordinate
 * @param feature
 * @returns {{distance: number, isContained: boolean}}
 */
function getDistanceToCoordinateInMeters (coordinate, feature) {
  let distanceInMeters = Number.MAX_SAFE_INTEGER
  let isContained = false
  if (feature.geometry != null) {
    switch (feature.geometry.type) {
      case 'Point':
        distanceInMeters = distance([feature.geometry.coordinates[0], feature.geometry.coordinates[1]], coordinate, { units: 'kilometers' }) * 1000.0
        break
      case 'LineString':
        distanceInMeters = pointToLineDistance(coordinate, feature, { units: 'kilometers' }) * 1000.0
        break
      case 'MultiPoint':
        // eslint-disable-next-line no-case-declarations
        const internalPointFeature = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: []
          }
        }
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          internalPointFeature.geometry.coordinates = feature.geometry.coordinates[i]
          distanceInMeters = Math.min(distanceInMeters, getDistanceToCoordinateInMeters(coordinate, internalPointFeature).distance)
        }
        break
      case 'MultiLineString':
        // eslint-disable-next-line no-case-declarations
        const internalLineStringFeature = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          internalLineStringFeature.geometry.coordinates = feature.geometry.coordinates[i]
          distanceInMeters = Math.min(distanceInMeters, getDistanceToCoordinateInMeters(coordinate, internalLineStringFeature).distance)
        }
        break
      case 'GeometryCollection':
        for (let i = 0; i < feature.geometry.geometries.length; i++) {
          const internalDistance = getDistanceToCoordinateInMeters(coordinate, {
            type: 'Feature',
            properties: {},
            geometry: feature.geometry.geometries[i]
          })
          distanceInMeters = Math.min(distanceInMeters, internalDistance.distance)
          isContained = isContained || internalDistance.isContained
        }
        break
      case 'Polygon':
        isContained = booleanPointInPolygon(coordinate, feature)
        distanceInMeters = getDistanceToCoordinateInMeters(coordinate, polygonToLine(feature)).distance
        break
      case 'MultiPolygon':
        // eslint-disable-next-line no-case-declarations
        const internalPolygonFeature = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: []
          }
        }
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          internalPolygonFeature.geometry.coordinates = feature.geometry.coordinates[i]
          const distanceResult = getDistanceToCoordinateInMeters(coordinate, internalPolygonFeature)
          distanceInMeters = Math.min(distanceInMeters, distanceResult.distance)
          isContained = isContained || distanceResult.isContained
        }
        break
      default:
        break
    }
  }
  return { distance: distanceInMeters, isContained }
}

/**
 * Determines the minimum distance a feature must be from the cursor (in meters)
 * @param latitude
 * @param zoom
 * @returns {number}
 */
function determineMinDistanceBasedOnZoom (latitude, zoom) {
  const EARTH_RADIUS_METERS = 6378137.0
  return Math.abs(Math.PI * 2.0 * EARTH_RADIUS_METERS * Math.cos(latitude) / Math.pow(2.0, zoom + 8)) * 10
}

/**
 * Get closest feature among the given layers
 * How this works:
 * 1. look at each feature and determine distance from that feature (for lines/polygons it is the distance to the closest line part)
 * 2. if nothing is close enough (a minimum designated distance based on the zoom level, then we look at any polygon that the point is contained in
 * 2a. if multiple polygons exist, we take the one with the smallest area (not perfect, but works well enough
 * @param layers
 * @param latlng
 * @param zoom
 * @returns {Promise<{feature: null, distance: number, layer: null}>}
 * @private
 */
async function _getClosestFeature (layers, latlng, zoom) {
  let closestFeature = null
  let closestDistance = Number.MAX_SAFE_INTEGER
  let closestLayer = null
  let minDistanceAway = determineMinDistanceBasedOnZoom(latlng.lat, zoom)

  for (let lId = 0; lId < layers.length; lId++) {
    const layer = layers[lId]
    await performSafeGeoPackageOperation(layer.path, (gp) => {
      const featureDao = gp.getFeatureDao(layer.tableName)
      if (featureDao.featureTableIndex != null && featureDao.featureTableIndex.isIndexed()) {
        const srs = featureDao.srs
        const envelope = getQueryBoundingBoxForCoordinateAndZoom(latlng, zoom).projectBoundingBox(WORLD_GEODETIC_SYSTEM, featureDao.projection).buildEnvelope()
        const index = featureDao.featureTableIndex.rtreeIndexed ? featureDao.featureTableIndex.rtreeIndexDao : featureDao.featureTableIndex.geometryIndexDao
        const geomEnvelope = index._generateGeometryEnvelopeQuery(envelope)
        const query = SqliteQueryBuilder.buildQuery(false, "'" + index.gpkgTableName + "'", geomEnvelope.tableNameArr, geomEnvelope.where, geomEnvelope.join, undefined, undefined, '"' + featureDao._table.getPkColumnName() + '" DESC', 25)
        const rows = featureDao.connection.all(query, geomEnvelope.whereArgs)
        const coordinate = [latlng.lng, latlng.lat]
        for (let i = 0; i < rows.length; i++) {
          const featureRow = featureDao.getRow(rows[i])
          const featureId = featureRow.id
          const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
          feature.type = 'Feature'
          feature.id = featureId

          const distanceResult = getDistanceToCoordinateInMeters(coordinate, feature)
          if ((distanceResult.distance <= minDistanceAway || distanceResult.isContained) && (closestFeature == null || distanceResult.distance < closestDistance)) {
            closestFeature = feature
            closestDistance = distanceResult.distance
            closestLayer = layer
          }
        }
      }
    })
  }

  return {
    feature: closestFeature,
    distance: closestDistance,
    layer: closestLayer
  }
}

async function getClosestFeature (layers, latlng, zoom) {
  return _getClosestFeature(layers, latlng, zoom)
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
  const envelope = getQueryBoundingBoxForCoordinateAndZoom(latlng, zoom).projectBoundingBox(WORLD_GEODETIC_SYSTEM, featureDao.projection).buildEnvelope()
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
  const featureIdAndGeometryTypes = features.filter(f => f.geometry != null).map(f => {
    return { id: f.id, geometryType: f.geometry.type }
  })
  const styleAssignments = _getStyleAssignmentForFeatures(gp, tableName, featureIdAndGeometryTypes)
  const mediaCounts = _getMediaAttachmentsCounts(gp, tableName, featureIds)
  return { features, styleAssignments, mediaCounts }
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
  const projectionNeeded = srs.organization.toUpperCase() + COLON_DELIMITER + srs.srs_id !== WORLD_GEODETIC_SYSTEM
  let each
  if (!isNil(boundingBox) && !isNil(featureDao.featureTableIndex) && featureDao.isIndexed()) {
    each = featureDao.featureTableIndex.queryWithBoundingBox(boundingBox, WORLD_GEODETIC_SYSTEM)
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
      count += featureDao.countInBoundingBox(getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom), WORLD_GEODETIC_SYSTEM)
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

// TODO: verify this is working by creating two feature tables, each with two rows with similar constraints, but have one be named
function constraintsEqual (constraintsA, constraintsB) {
  let equal = true

  if (!isNil(constraintsA) && !isNil(constraintsB)) {
    const allAConstraints = constraintsA.all()
    const allBConstraints = constraintsB.all()
    if (allAConstraints.length === allBConstraints.length) {
      equal = allAConstraints.filter(constraint => !isNil(allBConstraints.find(c => c.sql === constraint.sql))).length === allAConstraints.length
    }
  } else if (constraintsA === constraintsB) {
    equal = true
  }
  return equal
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
  return { mergedColumns, nameChanges }
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
 * Get all forms for this Feature table
 * @param gp
 * @param tableName
 * @returns {*[]}
 * @private
 */
function _getForms (gp, tableName) {
  const forms = []
  const rte = gp.relatedTablesExtension
  const extendedRelations = rte.getRelationships(tableName)
  extendedRelations.forEach(relation => {
    if (relation.relation_name === 'attributes' && relation.related_table_name !== 'nga_style') {
      const attributeDao = gp.getAttributeDao(relation.related_table_name)
      forms.push({
        name: relation.related_table_name,
        columns: attributeDao.table.getUserColumns().getColumns().map(column => {
          const dataColumn = gp.dataColumnsDao.getDataColumns(relation.related_table_name, column.name)
          column.displayName = dataColumn && dataColumn.name ? dataColumn.name : column.name
          return column
        })
      })
    } else if (relation.relation_name === 'simple_attributes') {
      const simpleAttributesDao = gp.getSimpleAttributesDao(relation.related_table_name)
      forms.push({
        name: relation.related_table_name,
        columns: simpleAttributesDao.table.getUserColumns().getColumns().map(column => {
          const dataColumn = gp.dataColumnsDao.getDataColumns(relation.related_table_name, column.name)
          column.displayName = dataColumn && dataColumn.name ? dataColumn.name : column.name
          return column
        })
      })
    }
  })
  return forms
}

/**
 * Gets any related attribute table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getForms (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getForms(gp, tableName)
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
      columnObject.rules.push(v => v != null || (column.name.toLowerCase() + ' is required'))
    }
    if (column.max) {
      if (column.dataType === GeoPackageDataType.TEXT) {
        columnObject.rules.push(v => v == null || v.length < column.max || (column.name.toLowerCase() + ' exceeds the max length of ' + column.max))
      } else {
        columnObject.rules.push(v => v < column.max || (column.name.toLowerCase() + ' exceeds the max of ' + column.max))
      }
    }
    if (column.min) {
      columnObject.rules.push(v => v < column.min || (column.name.toLowerCase() + ' is below the min of ' + column.min))
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
 * @param updateGeometry
 * @return {Promise<*>}
 */
async function saveGeoPackageEditedFeature (filePath, tableName, featureId, editableColumns, updatedGeometry, updateGeometry = false) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    const featureRow = featureDao.queryForId(featureId)
    const style = _getFeatureStyle(gp, tableName, featureId)
    const icon = _getFeatureIcon(gp, tableName, featureId)

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

    if (updateGeometry) {
      if (updatedGeometry != null) {
        const geometryData = new GeometryData()
        geometryData.setSrsId(srs.srs_id)
        let feature = { type: 'Feature', properties: {}, geometry: updatedGeometry }
        if (!(srs.organization === EPSG && srs.organization_coordsys_id === WORLD_GEODETIC_SYSTEM_CODE)) {
          feature = reproject.reproject(feature, WORLD_GEODETIC_SYSTEM, featureDao.projection)
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

      } else if (updatedGeometry === null) {
        featureRow.geometry = null
      }
    }
    let result = featureDao.update(featureRow)
    _updateBoundingBoxForFeatureTable(gp, tableName)
    if (style != null) {
      _setFeatureStyle(gp, tableName, featureRow.id, style.id)
    }
    if (icon != null) {
      _setFeatureIcon(gp, tableName, featureRow.id, icon.id)
    }
    return result
  })
}

/**
 * Allows for the streaming of features by returning functions for adding features and notifying completion.
 * addFeature takes a GeoJSON feature and will add it to the table.
 * done will signal to close the geopackage and return the stats from the streaming, extent of data in table and count of rows in table.
 * @param fileName
 * @param tableName
 * @return {Promise<{adjustBatchSize: function, addMediaAttachment: function, setFeatureIcon: function, addField: function, setFeatureStyle: function, setTableStyle: function, setTableIcon: function, processBatch: function, addFeature: (function(*=): number), addStyle: (function(*): number), done: (function(): *), addIcon: (function(*): number)}>}
 */
async function streamingGeoPackageBuild (fileName, tableName) {
  // create the geopackage
  let gp = await GeoPackageAPI.create(fileName)

  let {
    adjustBatchSize,
    addFeature,
    addField,
    addMediaAttachment,
    addStyle,
    addIcon,
    setFeatureStyle,
    setFeatureIcon,
    setTableStyle,
    setTableIcon,
    processBatch,
    done
  } = await _createFeatureTableWithFeatureStream(gp, tableName)

  return {
    adjustBatchSize: adjustBatchSize,
    addFeature: addFeature,
    addField: addField,
    addMediaAttachment: addMediaAttachment,
    addStyle: addStyle,
    addIcon: addIcon,
    setFeatureStyle: setFeatureStyle,
    setFeatureIcon: setFeatureIcon,
    setTableStyle: setTableStyle,
    setTableIcon: setTableIcon,
    processBatch: processBatch,
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
  getClosestFeature,
  getFeatureViewData,
  checkUnique,
  _addGeoPackageFeatureTableColumns,
  constraintsEqual,
  _createFeatureTableWithFeatureStream,
  getForms
}
