import {
  GeoPackageAPI,
  BoundingBox,
  GeoPackageDataType,
  GeoPackageValidate,
  RTreeIndex,
} from '@ngageoint/geopackage'
import wkx from 'wkx'
import isNil from 'lodash/isNil'
import path from 'path'
import reproject from 'reproject'
import { createUniqueID } from '../util/UniqueIDUtilities'
import { toHumanReadable, getFileSizeInBytes, getLastModifiedDate, exists } from '../util/FileUtilities'

/**
 * Runs a function against a geopackage on the file system. This will safely open the geopackage, execute the function and then close the geopackage.
 * @param filePath
 * @param func
 * @param isFuncAsync
 * @returns {Promise<any>}
 */
async function performSafeGeoPackageOperation (filePath, func, isFuncAsync = false) {
  let result
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
      result = {error: error}
      // eslint-disable-next-line no-console
      console.error('Failed to perform GeoPackage operation')
    }
    try {
      gp.close()
      gp = undefined
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      result = {error: e}
      // eslint-disable-next-line no-console
      console.error('Failed to close GeoPackage.')
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
  if (!isNil(contents)) {
    bbox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y)
    srs = gp.spatialReferenceSystemDao.queryForId(contents.srs_id)
    projection = 'EPSG:' + contents.srs_id
    if (
      srs.definition &&
      srs.definition !== 'undefined' &&
      srs.organization.toUpperCase() + ':' + srs.organization_coordsys_id !== 'EPSG:4326'
    ) {
      bbox = bbox.projectBoundingBox(projection, 'EPSG:4326')
    }
    extent = [bbox.minLongitude, bbox.minLatitude, bbox.maxLongitude, bbox.maxLatitude]
  }

  return extent
}

/**
 * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
 * @param gp
 * @param table
 * @returns {{visible: boolean, indexed: boolean, description: string, styleKey: number, featureCount: number, extent: array}}
 */
function _getGeoPackageFeatureTableForApp (gp, table) {
  const featureDao = gp.getFeatureDao(table)
  const description = gp.getTableContents(table).description
  const rtreeIndex = new RTreeIndex(gp, featureDao)
  const rtreeIndexed = rtreeIndex.hasExtension(
    rtreeIndex.extensionName,
    rtreeIndex.tableName,
    rtreeIndex.columnName
  )
  return {
    visible: false,
    featureCount: featureDao.count(),
    description: isNil(description) || description.length === 0 ? 'None' : description,
    indexed: rtreeIndexed,
    extent: _getBoundingBoxForTable(gp, table),
    styleKey: 0
  }
}

/**
 * Calculates the actual extent of a table based on it's features or tiles
 * @param gp
 * @param tableName
 * @private
 */
function _calculateTrueExtentForTileTable (gp, tableName) {
  let tableBounds = null
  const tileDao = gp.getTileDao(tableName)
  const minZoom = tileDao.minZoom
  const maxZoom = tileDao.maxZoom
  for (let zoom = minZoom; zoom < maxZoom; zoom++) {
    const bbox = tileDao.getBoundingBoxWithZoomLevel(zoom)
    if (!isNil(bbox)) {
      if (isNil(tableBounds)) {
        tableBounds = bbox
      } else {
        tableBounds.minLongitude = Math.min(tableBounds.minLongitude, bbox.minLongitude)
        tableBounds.maxLongitude = Math.max(tableBounds.maxLongitude, bbox.maxLongitude)
        tableBounds.minLatitude = Math.min(tableBounds.minLatitude, bbox.minLatitude)
        tableBounds.maxLatitude = Math.max(tableBounds.maxLatitude, bbox.maxLatitude)
        tableBounds.width = tableBounds.maxLongitude - tableBounds.minLongitude
        tableBounds.height = tableBounds.maxLatitude - tableBounds.minLatitude
      }
    }
  }
  if (isNil(tableBounds)) {
    tableBounds = _getBoundingBoxForTable(gp, tableName)
  } else {
    const contents = gp.getTableContents(tableName)
    const srs = gp.spatialReferenceSystemDao.queryForId(contents.srs_id)
    const projection = 'EPSG:' + contents.srs_id
    if (
      !isNil(tableBounds) &&
      srs.definition &&
      srs.definition !== 'undefined' &&
      srs.organization.toUpperCase() + ':' + srs.organization_coordsys_id !== 'EPSG:4326'
    ) {
      tableBounds = tableBounds.projectBoundingBox(projection, 'EPSG:4326')
    }
  }
  return [tableBounds.minLongitude, tableBounds.minLatitude, tableBounds.maxLongitude, tableBounds.maxLatitude]
}

/**
 * Projects a geometry to 4326 from the srs provided
 * @param geometry
 * @param srs
 * @returns {wkx.Geometry}
 */
function projectGeometryTo4326 (geometry, srs) {
  let projectedGeometry = geometry.geometry
  if (geometry && !geometry.empty && geometry.geometry) {
    let geoJsonGeom = geometry.geometry.toGeoJSON()
    geoJsonGeom = reproject.reproject(geoJsonGeom, srs.organization.toUpperCase() + ':' + srs.srs_id, 'EPSG:4326')
    projectedGeometry = wkx.Geometry.parseGeoJSON(geoJsonGeom)
  }
  return projectedGeometry
}

/**
 * Determines internal table information for a geopackage
 * @param gp
 * @returns {{features: {}, tiles: {}}}
 * @private
 */
function _getInternalTableInformation (gp) {
  const tables = {
    features: {},
    tiles: {}
  }
  const gpTables = gp.getTables()
  gpTables.features.forEach(table => {
    tables.features[table] = _getGeoPackageFeatureTableForApp(gp, table)
  })
  gpTables.tiles.forEach(table => {
    const tileDao = gp.getTileDao(table)
    const count = tileDao.count()
    tables.tiles[table] = {
      visible: false,
      tileCount: count,
      minZoom: tileDao.minZoom,
      maxZoom: tileDao.maxZoom,
      extent: _calculateTrueExtentForTileTable(gp, table),
      description: 'An image layer with ' + count + ' tiles',
      styleKey: 0
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
 * @param geopackage
 * @returns {boolean}
 */
function isSynchronized (geopackage) {
  return getLastModifiedDate(geopackage.path) === (geopackage.modifiedDate ? geopackage.modifiedDate : '0')
}

/**
 * True if the geopackage does not exist on the file system
 * @param geopackage
 * @returns {boolean}
 */
function isMissing (geopackage) {
  return !exists(geopackage.path)
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
 * @param geopackage
 * @returns {Promise<{synchronized: boolean, invalid: boolean, missing: boolean}>}
 */
async function checkGeoPackageHealth (geopackage) {
  const missing = isMissing(geopackage)
  const synchronized = isSynchronized(geopackage)
  let invalid = false
  if (!missing) {
    try {
      invalid = !await isGeoPackageValid(geopackage.path)
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
    const featureDao = gp.getFeatureDao(table)
    const description = gp.getTableContents(table).description
    const rtreeIndex = new RTreeIndex(gp, featureDao)
    const rtreeIndexed = rtreeIndex.hasExtension(
      rtreeIndex.extensionName,
      rtreeIndex.tableName,
      rtreeIndex.columnName
    )
    return {
      visible: false,
      featureCount: featureDao.count(),
      description: isNil(description) || description.length === 0 ? 'None' : description,
      indexed: rtreeIndexed,
      extent: _getBoundingBoxForTable(gp, table),
      styleKey: 0
    }
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
 * @returns {Promise<{path: *, tables: {features: {}, tiles: {}}, size: *, name: string, id: *}>}
 */
async function getOrCreateGeoPackageForApp (filePath) {
  let gp
  if (!exists(filePath)) {
    gp = await GeoPackageAPI.create(filePath)
  } else {
    gp = await GeoPackageAPI.open(filePath)
  }
  const filename = path.basename(filePath)
  const geopackage = {
    id: createUniqueID(),
    modifiedDate: getLastModifiedDate(filePath),
    size: toHumanReadable(getFileSizeInBytes(filePath)),
    name: filename.substring(0, filename.indexOf(path.extname(filename))),
    path: filePath,
    tables: _getInternalTableInformation(gp)
  }

  try {
    gp.close()
    gp = undefined
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to close GeoPackage')
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
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  })
}

/**
 * Renames a geopackage table
 * @param filePath
 * @param tableName
 * @param newTableName
 * @returns {Promise<any>}
 */
async function renameGeoPackageTable (filePath, tableName, newTableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return gp.renameTable(tableName, newTableName)
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
    return gp.deleteTable(tableName)
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

async function wait (timeMs) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timeMs)
  })
}

function prettyPrintMs(milliseconds) {
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  let msRemaining = milliseconds - days * (1000 * 60 * 60 * 24)
  const hours = Math.floor(msRemaining / (1000 * 60 * 60))
  msRemaining = msRemaining - hours * (1000 * 60 * 60)
  const minutes = Math.floor(msRemaining / (1000 * 60))
  msRemaining = msRemaining - minutes * (1000 * 60)
  const seconds = Math.floor(msRemaining / 1000)

  if (days > 0) {
    return days + ' days, ' + hours + ' hours'
  } else if (hours > 0) {
    return hours + ' hours, ' + minutes + ' minutes'
  } else if (minutes > 0) {
    return minutes + ' minutes, ' + seconds + ' seconds'
  } else {
    return seconds + " seconds"
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

async function isHealthy (geopackage) {
  const health = await checkGeoPackageHealth(geopackage)
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
  wait,
  flatten,
  prettyPrintMs,
  boundingBoxIntersection,
  isMissing,
  checkGeoPackageHealth,
  isHealthy,
  getDefaultValueForDataType,
  getExtentOfGeoPackageTables,
  projectGeometryTo4326
}
