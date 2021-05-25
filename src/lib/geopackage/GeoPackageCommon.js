import {
  GeoPackageAPI,
  BoundingBox,
  GeoPackageDataType,
  GeoPackageValidate,
  RTreeIndex,
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import path from 'path'
import UniqueIDUtilities from '../util/UniqueIDUtilities'
import FileUtilities from '../util/FileUtilities'

export default class GeoPackageCommon {
  /**
   * Runs a function against a geopackage on the file system. This will safely open the geopackage, execute the function and then close the geopackage.
   * @param filePath
   * @param func
   * @param isFuncAsync
   * @returns {Promise<any>}
   */
  static async performSafeGeoPackageOperation (filePath, func, isFuncAsync = false) {
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
   * Gets or Creates a geopackage at the filePath
   * @param filePath
   * @returns {Promise<GeoPackage>}
   */
  static async getOrCreateGeoPackage (filePath) {
    let gp
    if (!FileUtilities.exists(filePath)) {
      gp = await GeoPackageAPI.create(filePath)
    } else {
      gp = await GeoPackageAPI.open(filePath)
    }
    return gp
  }

  static async isGeoPackageValid (filePath) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageValidate.hasMinimumTables(gp)
    })
  }

  /**
   * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
   * @param gp
   * @param table
   * @returns {{visible: boolean, indexed: boolean, description: string, styleKey: number, featureCount: number, extent: array}}
   */
  static _getGeoPackageFeatureTableForApp (gp, table) {
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
      extent: GeoPackageCommon._getBoundingBoxForTable(gp, table),
      styleKey: 0
    }
  }

  /**
   * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
   * @param filePath
   * @param table
   * @returns {Promise<{visible: boolean, indexed: boolean, description: string, styleKey: number, featureCount: number, extent: array}>}
   */
  static async getGeoPackageFeatureTableForApp (filePath, table) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getGeoPackageFeatureTableForApp(gp, table)
    })
  }

  static _getInternalTableInformation (gp) {
    const tables = {
      features: {},
      tiles: {}
    }
    const gpTables = gp.getTables()
    gpTables.features.forEach(table => {
      tables.features[table] = GeoPackageCommon._getGeoPackageFeatureTableForApp(gp, table)
    })
    gpTables.tiles.forEach(table => {
      const tileDao = gp.getTileDao(table)
      const count = tileDao.count()
      tables.tiles[table] = {
        visible: false,
        tileCount: count,
        minZoom: tileDao.minZoom,
        maxZoom: tileDao.maxZoom,
        extent: this._calculateTrueExtentForTileTable(gp, table),
        description: 'An image layer with ' + count + ' tiles',
        styleKey: 0
      }
    })
    return tables
  }

  static async getInternalTableInformation (filePath) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getInternalTableInformation(gp)
    })
  }

  /**
   * Gets geopackage information required by the app to ensure functionality in all vue components
   * @param filePath
   * @returns {Promise<{path: *, tables: {features: {}, tiles: {}}, size: *, name: string, id: *}>}
   */
  static async getOrCreateGeoPackageForApp (filePath) {
    let gp
    if (!FileUtilities.exists(filePath)) {
      gp = await GeoPackageAPI.create(filePath)
    } else {
      gp = await GeoPackageAPI.open(filePath)
    }
    const filename = path.basename(filePath)
    const geopackage = {
      id: UniqueIDUtilities.createUniqueID(),
      modifiedDate: FileUtilities.getLastModifiedDate(filePath),
      size: FileUtilities.toHumanReadable(FileUtilities.getFileSizeInBytes(filePath)),
      name: filename.substring(0, filename.indexOf(path.extname(filename))),
      path: filePath,
      tables: GeoPackageCommon._getInternalTableInformation(gp)
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
   * @param gp
   * @returns {*}
   */
  static _getTables (gp) {
    return gp.getTables()
  }

  /**
   * Gets tables from a geopackage
   * @param filePath
   * @returns {Promise<any>}
   */
  static async getTables (filePath) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getTables(gp)
    })
  }

  /**
   * Gets geopackage file size on disk
   * @param filePath
   * @returns {*}
   */
  static getGeoPackageFileSize (filePath) {
    return FileUtilities.toHumanReadable(FileUtilities.getFileSizeInBytes(filePath))
  }

  /**
   * Gets details of a geopackage
   * @param gp
   * @param filePath
   * @returns {{path: *, spatialReferenceSystems: SpatialReferenceSystem[], srsCount: number, size: *, featureTableCount: *, tileTableCount: *}}
   */
  static _getDetails (gp, filePath) {
    let spatialReferenceSystems = gp.spatialReferenceSystemDao.queryForAll().map(result => gp.spatialReferenceSystemDao.createObject(result))
    return {
      featureTableCount: GeoPackageCommon._getFeatureTables(gp).length,
      tileTableCount: GeoPackageCommon._getTileTables(gp).length,
      path: filePath,
      srsCount: spatialReferenceSystems.length,
      spatialReferenceSystems,
      size: GeoPackageCommon.getGeoPackageFileSize(filePath)
    }
  }

  /**
   * Gets tile tables from a geopackage
   * @param gp
   * @returns {*}
   */
  static _getTileTables (gp) {
    return gp.getTileTables()
  }

  /**
   * Gets tile tables from a geopackage
   * @param filePath
   * @returns {Promise<any>}
   */
  static async getTileTables (filePath) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getTileTables(gp)
    })
  }

  /**
   * Gets feature tables from a geopackage
   * @param gp
   * @returns {*}
   */
  static _getFeatureTables (gp) {
    return gp.getFeatureTables()
  }

  /**
   * Gets feature tables from a geopackage
   * @param filePath
   * @returns {Promise<any>}
   */
  static async getFeatureTables (filePath) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getFeatureTables(gp)
    })
  }

  /**
   * Gets details of a geopackage
   * @param filePath
   * @returns {Promise<any>}
   */
  static async getDetails (filePath) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getDetails(gp, filePath)
    })
  }

  /**
   * Gets the extent of all content in a geopackage
   * @param gp
   * @param tableName
   * @returns {number[]}
   */
  static _getGeoPackageExtent (gp, tableName) {
    let contentsDao = gp.contentsDao
    let contents = contentsDao.queryForId(tableName)
    let proj = contentsDao.getProjection(contents)
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  }

  /**
   * Gets the extent of all content in a geopackage
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getGeoPackageExtent (filePath, tableName) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getGeoPackageExtent(gp, tableName)
    })
  }

  /**
   * Renames a geopackage table
   * @param gp
   * @param tableName
   * @param newTableName
   */
  static _renameGeoPackageTable (gp, tableName, newTableName) {
    gp.renameTable(tableName, newTableName)
  }

  /**
   * Renames a geopackage table
   * @param filePath
   * @param tableName
   * @param newTableName
   * @returns {Promise<any>}
   */
  static async renameGeoPackageTable (filePath, tableName, newTableName) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._renameGeoPackageTable(gp, tableName, newTableName)
    })
  }

  /**
   * Copies a geopackage table
   * @param gp
   * @param tableName
   * @param copyTableName
   */
  static _copyGeoPackageTable (gp, tableName, copyTableName) {
    gp.copyTable(tableName, copyTableName, true, true)
  }

  /**
   * Copies a geopackage table
   * @param filePath
   * @param tableName
   * @param copyTableName
   * @returns {Promise<any>}
   */
  static async copyGeoPackageTable (filePath, tableName, copyTableName) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._copyGeoPackageTable(gp, tableName, copyTableName)
    })
  }

  /**
   * Deletes a table from the geopackage
   * @param gp
   * @param tableName
   */
  static _deleteGeoPackageTable (gp, tableName) {
    gp.deleteTable(tableName)
  }

  /**
   * Deletes a table from the geopackage
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async deleteGeoPackageTable (filePath, tableName) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._deleteGeoPackageTable(gp, tableName)
    })
  }

  /**
   * Calculates the actual extent of a table based on it's features or tiles
   * @param gp
   * @param tableName
   * @private
   */
  static _calculateTrueExtentForTileTable (gp, tableName) {
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
      tableBounds = this._getBoundingBoxForTable(gp, tableName)
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
   * Gets the bounding box extent for a table
   * @param gp
   * @param tableName
   * @returns {number[]}
   */
  static _getBoundingBoxForTable (gp, tableName) {
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
   * Gets the bounding box extent for a feature table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getBoundingBoxForTable (filePath, tableName) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageCommon._getBoundingBoxForTable(gp, tableName)
    })
  }

  static normalizeLongitude (longitude) {
    return (longitude % 360 + 540) % 360 - 180
  }

  /**
   * Gets a bounding box to perform a query using a coordinate and zoom
   * @param coordinate
   * @param zoom
   * @returns {BoundingBox}
   */
  static getQueryBoundingBoxForCoordinateAndZoom (coordinate, zoom) {
    const queryDistanceDegrees = 10.0 / Math.pow(2, zoom)
    return new BoundingBox(GeoPackageCommon.normalizeLongitude(coordinate.lng) - queryDistanceDegrees, GeoPackageCommon.normalizeLongitude(coordinate.lng) + queryDistanceDegrees, coordinate.lat - queryDistanceDegrees, coordinate.lat + queryDistanceDegrees)
  }

  static async wait (timeMs) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, timeMs)
    })
  }

  static flatten (arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? GeoPackageCommon.flatten(toFlatten) : toFlatten)
    }, [])
  }

  static prettyPrintMs(milliseconds) {
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
  static intersection (bbox1, bbox2) {
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

  static isSynchronized (geopackage) {
    return FileUtilities.getLastModifiedDate(geopackage.path) === (geopackage.modifiedDate ? geopackage.modifiedDate : '0')
  }

  static isMissing (geopackage) {
    return !FileUtilities.exists(geopackage.path)
  }

  /**
   * Check GeoPackage's health
   * @param geopackage
   * @returns {Promise<{synchronized: boolean, invalid: boolean, missing: boolean}>}
   */
  static async checkGeoPackageHealth (geopackage) {
    const missing = GeoPackageCommon.isMissing(geopackage)
    const synchronized = GeoPackageCommon.isSynchronized(geopackage)
    let invalid = false
    if (!missing) {
      try {
        invalid = !await GeoPackageCommon.isGeoPackageValid(geopackage.path)
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

  static async isHealthy (geopackage) {
    const health = await GeoPackageCommon.checkGeoPackageHealth(geopackage)
    return !health.missing && !health.invalid && health.synchronized
  }

  static getDefaultValueForDataType (dataType) {
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
}
