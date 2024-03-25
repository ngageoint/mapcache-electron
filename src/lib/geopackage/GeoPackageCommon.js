import {
  GeoPackageAPI,
  BoundingBox,
  GeoPackageDataType,
  GeoPackageValidate,
  RTreeIndex,
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import fs from 'fs'
import path from 'path'
import { createUniqueID } from '../util/UniqueIDUtilities'
import { toHumanReadable, getFileSizeInBytes, getLastModifiedDate, exists } from '../util/file/FileUtilities'
import { COLON_DELIMITER, WORLD_GEODETIC_SYSTEM } from '../projection/ProjectionConstants'

/**
 * Runs a function against a geopackage on the file system. This will safely open the geopackage, execute the function and then close the geopackage.
 * @param filePath
 * @param func
 * @param isFuncAsync
 * @returns {Promise<any>}
 */
async function performSafeGeoPackageOperation (filePath, func, isFuncAsync = false) {
  let result
  if (fs.existsSync(filePath)) {
    let gp = await GeoPackageAPI.open(filePath)
    if (!isNil(gp)) {
      try {
        if (isFuncAsync) {
          result = await func(gp)
        } else {
          result = func(gp)
        }
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        result = { error: error }
        // eslint-disable-next-line no-console
        console.error('Failed to perform GeoPackage operation: ' + error)
      }
      try {
        gp.close()
        gp = undefined
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        result = { error: e }
        // eslint-disable-next-line no-console
        console.error('Failed to close GeoPackage')
      }
    } else {
      result = { error: 'File does not exist' }
      // eslint-disable-next-line no-console
      console.error('File does not exist')
    }
  }
  return result
}

/**
 * Gets the bounding box extent for a table
 * @param gp
 * @param tableName
 * @returns {number[]}
 */
function _getBoundingBoxForTable (gp, tableName) {
  let extent
  let bbox
  let srs
  let projection
  const contents = gp.getTableContents(tableName)
  if (!isNil(contents) && !isNil(contents.min_x) && !isNil(contents.min_y) && !isNil(contents.max_x) && !isNil(contents.max_y)) {
    bbox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y)
    srs = gp.spatialReferenceSystemDao.queryForId(contents.srs_id)
    projection = srs.projection
    if (
      srs.definition &&
      srs.definition !== 'undefined' &&
      srs.organization.toUpperCase() + COLON_DELIMITER + srs.organization_coordsys_id !== WORLD_GEODETIC_SYSTEM
    ) {
      bbox = bbox.projectBoundingBox(projection, WORLD_GEODETIC_SYSTEM)
    }
    extent = [bbox.minLongitude, bbox.minLatitude, bbox.maxLongitude, bbox.maxLatitude]
  }

  return extent
}

/**
 * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
 * @param gp
 * @param table
 * @returns {{visible: boolean, indexed: boolean, description: string, styleKey: number, featureCount: number, extent: array}|null}
 */
function _getGeoPackageFeatureTableForApp (gp, table) {
  try {
    const featureDao = gp.getFeatureDao(table)
    const description = gp.getTableContents(table).description
    const rtreeIndex = new RTreeIndex(gp, featureDao)
    const rtreeIndexed = rtreeIndex.hasExtension(
      rtreeIndex.extensionName,
      rtreeIndex.tableName,
      rtreeIndex.columnName
    )
    let extent = _getBoundingBoxForTable(gp, table)
    if (extent == null) {
      extent = _calculateTrueExtentForFeatureTable(gp, table)
    }

    // only track column order for columns that are not the primary key, special _feature_id, and blobs (which includes the geometry column)
    const columnOrder = featureDao._table.getUserColumns()._columns.filter(column => !column.primaryKey && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id').map(column => column.name.toLowerCase())

    return {
      visible: false,
      featureCount: featureDao.count(),
      description: isNil(description) || description.length === 0 ? 'None' : description,
      indexed: rtreeIndexed,
      extent: extent,
      styleKey: 0,
      columnOrder: columnOrder
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Unable to process feature table: ' + table)
    return null
  }
}

function _calculateTrueExtentForFeatureTable (gp, tableName) {
  let extent = undefined
  const featureDao = gp.getFeatureDao(tableName)
  if (featureDao.isIndexed()) {
    if (featureDao.featureTableIndex.rtreeIndexDao != null) {
      const iterator = featureDao.featureTableIndex.rtreeIndexDao.queryForEach()
      let nextRow = iterator.next()
      while (!nextRow.done) {
        if (extent == null) {
          extent = [nextRow.value.minx, nextRow.value.miny, nextRow.value.maxx, nextRow.value.maxy]
        } else {
          extent[0] = Math.min(extent[0], nextRow.value.minx)
          extent[1] = Math.min(extent[1], nextRow.value.miny)
          extent[2] = Math.max(extent[2], nextRow.value.maxx)
          extent[3] = Math.max(extent[3], nextRow.value.maxy)
        }
        nextRow = iterator.next()
      }
    } else if (featureDao.featureTableIndex.geometryIndexDao != null) {
      const iterator = featureDao.featureTableIndex.geometryIndexDao.queryForEach()
      let nextRow = iterator.next()
      while (!nextRow.done) {
        if (extent == null) {
          extent = [nextRow.value.min_x, nextRow.value.min_y, nextRow.value.max_x, nextRow.value.max_y]
        } else {
          extent[0] = Math.min(extent[0], nextRow.value.min_x)
          extent[1] = Math.min(extent[1], nextRow.value.min_y)
          extent[2] = Math.max(extent[2], nextRow.value.max_x)
          extent[3] = Math.max(extent[3], nextRow.value.max_y)
        }
        nextRow = iterator.next()
      }
    }
  }

  if (extent == null) {
    const iterator = featureDao.queryForEach()
    let nextRow = iterator.next()
    while (!nextRow.done) {
      const featureRow = featureDao.getRow(nextRow.value)
      if (extent == null) {
        if (featureRow.geometry.envelope == null) {
          return null
        } else {
          extent = [featureRow.geometry.envelope.minX, featureRow.geometry.envelope.minY, featureRow.geometry.envelope.maxX, featureRow.geometry.envelope.maxY]
        }
      } else {
        extent[0] = Math.min(extent[0], featureRow.geometry.envelope.minX)
        extent[1] = Math.min(extent[1], featureRow.geometry.envelope.minY)
        extent[2] = Math.max(extent[2], featureRow.geometry.envelope.maxX)
        extent[3] = Math.max(extent[3], featureRow.geometry.envelope.maxY)
      }
      nextRow = iterator.next()
    }
  }
  return extent
}

/**
 * Calculates the actual extent of a table based on it's tiles
 * @param gp
 * @param tableName
 * @private
 */
function _calculateTrueExtentForTileTable (gp, tableName) {
  let tableBounds = null
  const tileDao = gp.getTileDao(tableName)
  const minZoom = tileDao.minZoom
  const maxZoom = tileDao.maxZoom
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const bbox = tileDao.getBoundingBoxWithZoomLevel(zoom)
    if (!isNil(bbox)) {
      if (isNil(tableBounds)) {
        tableBounds = bbox
      } else {
        tableBounds.minLongitude = Math.min(tableBounds.minLongitude, bbox.minLongitude)
        tableBounds.maxLongitude = Math.max(tableBounds.maxLongitude, bbox.maxLongitude)
        tableBounds.minLatitude = Math.min(tableBounds.minLatitude, bbox.minLatitude)
        tableBounds.maxLatitude = Math.max(tableBounds.maxLatitude, bbox.maxLatitude)
      }
    }
  }
  if (isNil(tableBounds)) {
    tableBounds = _getBoundingBoxForTable(gp, tableName)
  } else {
    // need to convert to 4326 if not already in 4326
    const contents = gp.getTableContents(tableName)
    const srs = gp.spatialReferenceSystemDao.queryForId(contents.srs_id)
    const projection = srs.projection
    if (
      !isNil(tableBounds) &&
      srs.definition &&
      srs.definition !== 'undefined' &&
      srs.organization.toUpperCase() + COLON_DELIMITER + srs.organization_coordsys_id !== WORLD_GEODETIC_SYSTEM
    ) {
      tableBounds = tableBounds.projectBoundingBox(projection, WORLD_GEODETIC_SYSTEM)
    }
  }
  return [tableBounds.minLongitude, tableBounds.minLatitude, tableBounds.maxLongitude, tableBounds.maxLatitude]
}

/**
 * Determines internal table information for a geopackage
 * @param gp
 * @returns {{features: {}, tiles: {}, unsupported: []}}
 * @private
 */
function _getInternalTableInformation (gp) {
  const tables = {
    features: {},
    tiles: {},
    unsupported: []
  }
  const gpTables = gp.getTables()
  gpTables.features.forEach(table => {
    const tableInformtion = _getGeoPackageFeatureTableForApp(gp, table)
    if (tableInformtion !== null) {
      tables.features[table] = tableInformtion
    } else {
      tables.unsupported.push(table)
    }
  })
  gpTables.tiles.forEach(table => {
    try {
      const tileDao = gp.getTileDao(table)
      const count = tileDao.count()
      tables.tiles[table] = {
        visible: false,
        tileCount: count,
        minZoom: tileDao.minZoom,
        maxZoom: tileDao.maxZoom,
        extent: _getBoundingBoxForTable(gp, table),
        tileExtent: _calculateTrueExtentForTileTable(gp, table),
        description: 'An image layer with ' + count + ' tiles',
        styleKey: 0
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Unable to process tile table: ' + table)
      tables.unsupported.push(table)
    }
  })
  return tables
}

/**
 * Gets tables from a geopackage
 * @param gp
 * @returns {*}
 */
function _getTables (gp) {
  return gp.getTables()
}

/**
 * Gets tile tables from a geopackage
 * @param gp
 * @returns {*}
 */
function _getTileTables (gp) {
  return gp.getTileTables()
}

/**
 * Gets feature tables from a geopackage
 * @param gp
 * @returns {*}
 */
function _getFeatureTables (gp) {
  return gp.getFeatureTables()
}

/**
 * Gets geopackage file size on disk
 * @param filePath
 * @returns {*}
 */
function getGeoPackageFileSize (filePath) {
  return toHumanReadable(getFileSizeInBytes(filePath))
}

/**
 * True if the geopackage's last modified date matches what is in state
 * @param path
 * @param modifiedDate
 * @returns {boolean}
 */
function isSynchronized (path, modifiedDate) {
  return getLastModifiedDate(path) === (modifiedDate ? modifiedDate : '0')
}

/**
 * True if the geopackage does not exist on the file system
 * @param path
 * @returns {boolean}
 */
function isMissing (path) {
  return !exists(path)
}

/**
 * Normalizes longitude to be -180 to +180
 * @param longitude
 * @returns {number}
 */
function normalizeLongitude (longitude) {
  return (longitude % 360 + 540) % 360 - 180
}

/**
 * True if the geopackage has a valid table structure
 */
async function isGeoPackageValid (filePath) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return GeoPackageValidate.hasMinimumTables(gp)
  })
}

/**
 * Check GeoPackage's health
 * @param path
 * @param modifiedDate
 * @returns {Promise<{synchronized: boolean, invalid: boolean, missing: boolean}>}
 */
async function checkGeoPackageHealth (path, modifiedDate) {
  const missing = isMissing(path)
  const synchronized = isSynchronized(path, modifiedDate)
  let invalid = false
  if (!missing) {
    try {
      invalid = !await isGeoPackageValid(path)
    } catch (error) {
      invalid = true
    }
  }
  return {
    missing,
    synchronized,
    invalid
  }
}

/**
 * Flattens an array
 * @param arr
 * @returns {*}
 */
function flatten (arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten)
  }, [])
}

/**
 * Gets or Creates a geopackage at the filePath
 * @param filePath
 * @returns {Promise<GeoPackage>}
 */
async function getOrCreateGeoPackage (filePath) {
  let gp
  if (!exists(filePath)) {
    gp = await GeoPackageAPI.create(filePath)
  } else {
    gp = await GeoPackageAPI.open(filePath)
  }
  return gp
}

/**
 * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
 * @param filePath
 * @param table
 * @returns {Promise<{visible: boolean, indexed: boolean, description: string, styleKey: number, featureCount: number, extent: array}>}
 */
async function getGeoPackageFeatureTableForApp (filePath, table) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getGeoPackageFeatureTableForApp(gp, table)
  })
}

async function getInternalTableInformation (filePath) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getInternalTableInformation(gp)
  })
}

/**
 * Gets geopackage information required by the app to ensure functionality in all vue components
 * @param filePath
 * @return {Promise<null|{path, tables: {features: {}, tiles: {}, unsupported: []}, size: string, modifiedDate: String, name: string, id: (*|string)}>}
 */
async function getOrCreateGeoPackageForApp (filePath) {
  let gp, geopackage = null
  if (exists(filePath)) {
    gp = await GeoPackageAPI.open(filePath)
  } else {
    gp = await GeoPackageAPI.create(filePath)
  }
  try {
    const filename = path.basename(filePath)
    geopackage = {
      id: createUniqueID(),
      modifiedDate: getLastModifiedDate(filePath),
      size: toHumanReadable(getFileSizeInBytes(filePath)),
      name: filename.substring(0, filename.indexOf(path.extname(filename))),
      path: filePath,
      tables: _getInternalTableInformation(gp)
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to getOrCreate GeoPackage.')
    geopackage = null
  } finally {
    try {
      gp.close()
      gp = undefined
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to close GeoPackage')
    }
  }

  return geopackage
}

/**
 * Gets tables from a geopackage
 * @param filePath
 * @returns {Promise<any>}
 */
async function getTables (filePath) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTables(gp)
  })
}

/**
 * Gets tile tables from a geopackage
 * @param filePath
 * @returns {Promise<any>}
 */
async function getTileTables (filePath) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTileTables(gp)
  })
}

/**
 * Gets feature tables from a geopackage
 * @param filePath
 * @returns {Promise<any>}
 */
async function getFeatureTables (filePath) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureTables(gp)
  })
}

/**
 * Gets details of a geopackage
 * @param filePath
 * @returns {Promise<any>}
 */
async function getDetails (filePath) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    let spatialReferenceSystems = gp.spatialReferenceSystemDao.queryForAll().map(result => gp.spatialReferenceSystemDao.createObject(result))
    return {
      featureTableCount: _getFeatureTables(gp).length,
      tileTableCount: _getTileTables(gp).length,
      path: filePath,
      srsCount: spatialReferenceSystems.length,
      spatialReferenceSystems,
      size: getGeoPackageFileSize(filePath)
    }
  })
}

/**
 * Gets the extent of all content in a geopackage
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getGeoPackageExtent (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    let contentsDao = gp.contentsDao
    let contents = contentsDao.queryForId(tableName)
    let proj = contentsDao.getProjection(contents)
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, WORLD_GEODETIC_SYSTEM)
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  })
}

/**
 * Renames a geopackage table
 * @param filePath
 * @param tableName
 * @param newTableName
 */
async function renameGeoPackageTable (filePath, tableName, newTableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    gp.renameTable(tableName, newTableName)
    gp.connection.run('VACUUM')
  })
}

/**
 * Copies a geopackage table
 * @param filePath
 * @param tableName
 * @param copyTableName
 * @returns {Promise<any>}
 */
async function copyGeoPackageTable (filePath, tableName, copyTableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return gp.copyTable(tableName, copyTableName, true, true)
  })
}

async function tableExists (gp, tableName) {
  return gp.tableExists(tableName)
}

/**
 * Deletes a table from the geopackage
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function deleteGeoPackageTable (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    gp.deleteTable(tableName)
    gp.connection.run('VACUUM')

  })
}

/**
 * Gets the bounding box extent for a feature table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function getBoundingBoxForTable (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getBoundingBoxForTable(gp, tableName)
  })
}

/**
 * Gets a bounding box to perform a query using a coordinate and zoom
 * @param coordinate
 * @param zoom
 * @returns {BoundingBox}
 */
function getQueryBoundingBoxForCoordinateAndZoom (coordinate, zoom) {
  const queryDistanceDegrees = 10.0 / Math.pow(2, zoom)
  return new BoundingBox(normalizeLongitude(coordinate.lng) - queryDistanceDegrees, normalizeLongitude(coordinate.lng) + queryDistanceDegrees, coordinate.lat - queryDistanceDegrees, coordinate.lat + queryDistanceDegrees)
}

function prettyPrintMs (milliseconds) {
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  let msRemaining = milliseconds - days * (1000 * 60 * 60 * 24)
  const hours = Math.floor(msRemaining / (1000 * 60 * 60))
  msRemaining = msRemaining - hours * (1000 * 60 * 60)
  const minutes = Math.floor(msRemaining / (1000 * 60))
  msRemaining = msRemaining - minutes * (1000 * 60)
  const seconds = Math.floor(msRemaining / 1000)

  if (days > 0) {
    return days + (days === 1 ? ' day, ' : ' days, ') + hours + (hours === 1 ? ' hour' : ' hours')
  } else if (hours > 0) {
    return hours + (hours === 1 ? ' hour, ' : ' hours, ') + minutes + (minutes === 1 ? ' minute' : ' minutes')
  } else if (minutes > 0) {
    return minutes + (minutes === 1 ? ' minute, ' : ' minutes, ') + seconds + (seconds === 1 ? ' second' : ' seconds')
  } else {
    return seconds + (seconds === 1 ? ' second' : ' seconds')
  }
}

/**
 * Finds intersection between two web mercator bounding boxes
 * @param bbox1
 * @param bbox2
 * @returns {*}
 */
function boundingBoxIntersection (bbox1, bbox2) {
  let intersection
  const minLon = Math.max(bbox1.minLongitude, bbox2.minLongitude)
  const minLat = Math.max(bbox1.minLatitude, bbox2.minLatitude)
  const maxLon = Math.min(bbox1.maxLongitude, bbox2.maxLongitude)
  const maxLat = Math.min(bbox1.maxLatitude, bbox2.maxLatitude)
  if (minLon < maxLon && minLat < maxLat) {
    intersection = new BoundingBox(minLon, maxLon, minLat, maxLat)
  }

  return intersection
}

async function isHealthy (path, modifiedDate) {
  const health = await checkGeoPackageHealth(path, modifiedDate)
  return !health.missing && !health.invalid && health.synchronized
}

function getDefaultValueForDataType (dataType) {
  let value
  switch (dataType) {
    case GeoPackageDataType.BOOLEAN:
      value = false
      break
    case GeoPackageDataType.TEXT:
      value = ''
      break
    case GeoPackageDataType.BLOB:
      value = new Blob()
      break
    default:
      value = 0
      break
  }
  return value
}

async function getExtentOfGeoPackageTables (filePath, tables) {
  return await performSafeGeoPackageOperation(filePath, (gp) => {
    let extent = null
    tables.forEach(table => {
      const ext = _getBoundingBoxForTable(gp, table)
      if (!isNil(ext)) {
        if (isNil(extent)) {
          extent = ext.slice()
        } else {
          if (ext[0] < extent[0]) {
            extent[0] = ext[0]
          }
          if (ext[1] < extent[1]) {
            extent[1] = ext[1]
          }
          if (ext[2] > extent[2]) {
            extent[2] = ext[2]
          }
          if (ext[3] > extent[3]) {
            extent[3] = ext[3]
          }
        }
      }
    })
    return extent
  })
}

export {
  _getBoundingBoxForTable,
  performSafeGeoPackageOperation,
  getOrCreateGeoPackage,
  getGeoPackageFeatureTableForApp,
  getInternalTableInformation,
  getOrCreateGeoPackageForApp,
  getTables,
  getGeoPackageFileSize,
  getTileTables,
  getFeatureTables,
  getDetails,
  getGeoPackageExtent,
  renameGeoPackageTable,
  copyGeoPackageTable,
  deleteGeoPackageTable,
  tableExists,
  getBoundingBoxForTable,
  normalizeLongitude,
  getQueryBoundingBoxForCoordinateAndZoom,
  flatten,
  prettyPrintMs,
  boundingBoxIntersection,
  isMissing,
  checkGeoPackageHealth,
  isHealthy,
  getDefaultValueForDataType,
  getExtentOfGeoPackageTables,
  _calculateTrueExtentForFeatureTable,
  _getGeoPackageFeatureTableForApp
}
