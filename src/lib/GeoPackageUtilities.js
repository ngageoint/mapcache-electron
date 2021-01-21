import {
  GeoPackageAPI,
  FeatureColumn,
  GeometryColumns,
  BoundingBox,
  GeoPackageDataType,
  FeatureTableStyles,
  TileScalingType,
  TileScaling,
  GeometryType,
  GeoPackage,
  FeatureStyleExtension,
  RTreeIndex,
  GeoPackageValidate,
  GeometryData,
  MediaTable,
  IconTable
} from '@ngageoint/geopackage'
import _ from 'lodash'
import moment from 'moment'
import reproject from 'reproject'
import path from 'path'
import jetpack from 'fs-jetpack'
import wkx from 'wkx'
import imagemin from 'imagemin'
import imageminPngquant from 'imagemin-pngquant'
import proj4 from 'proj4'
import { intersect, bbox } from '@turf/turf'
import VectorStyleUtilities from './VectorStyleUtilities'
import XYZTileUtilities from './XYZTileUtilities'
import TileBoundingBoxUtils from './tile/tileBoundingBoxUtils'
import UniqueIDUtilities from './UniqueIDUtilities'
import FileUtilities from './FileUtilities'
import LayerFactory from './source/layer/LayerFactory'
import CanvasUtilities from './CanvasUtilities'
import MediaUtilities from './MediaUtilities'
import GarbageCollector from './GarbageCollector'

export default class GeoPackageUtilities {
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
    if (!_.isNil(gp)) {
      try {
        if (isFuncAsync) {
          result = await func(gp)
        } else {
          result = func(gp)
        }
      } catch (error) {
        result = {error: error}
        // eslint-disable-next-line no-console
        console.error(error)
      }
      try {
        gp.close()
        gp = undefined
        GarbageCollector.tryCollect()
      } catch (e) {
        result = {error: e}
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }
    return result
  }

  /**
   * Adds the style extension to a feature table
   * @param gp
   * @param tableName
   */
  static _addStyleExtensionForTable (gp, tableName) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
    featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
    featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
    featureTableStyles.createTableStyleRelationship()
    featureTableStyles.createTableIconRelationship()
    featureTableStyles.createStyleRelationship()
    featureTableStyles.createIconRelationship()
  }

  /**
   * Adds the style extension to a feature table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async addStyleExtensionForTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._addStyleExtensionForTable(gp, tableName)
    })
  }

  /**
   * Removes the style extension from a feature table
   * @param gp
   * @param tableName
   */
  static _removeStyleExtensionForTable (gp, tableName) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.setTableFeatureStyles(null)
    featureTableStyles.deleteRelationships()
    if (featureTableStyles.getFeatureStyleExtension().getExtension(FeatureStyleExtension.EXTENSION_NAME, null, null).length === 0) {
      featureTableStyles.getFeatureStyleExtension().removeExtension()
    }
  }

  /**
   * Removes the style extension from a feature table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async removeStyleExtensionForTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._removeStyleExtensionForTable(gp, tableName)
    })
  }

  /**
   * Gets or Creates a geopackage at the filePath
   * @param filePath
   * @returns {Promise<GeoPackage>}
   */
  static async getOrCreateGeoPackage (filePath) {
    let gp
    if (!jetpack.exists(filePath)) {
      gp = await GeoPackageAPI.create(filePath)
    } else {
      gp = await GeoPackageAPI.open(filePath)
    }
    return gp
  }

  /**
   * Update feature geometry
   * @param gp
   * @param tableName
   * @param featureGeoJson
   * @param updateBoundingBox
   */
  static _updateFeatureGeometry (gp, tableName, featureGeoJson, updateBoundingBox = true) {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    const featureRow = featureDao.queryForId(featureGeoJson.id)
    const geometryData = new GeometryData()
    geometryData.setSrsId(srs.srs_id)
    let feature = _.cloneDeep(featureGeoJson)
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
      this._updateBoundingBoxForFeatureTable(gp, tableName)
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
  static async updateFeatureGeometry (filePath, tableName, featureGeoJson, updateBoundingBox = true) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateFeatureGeometry(gp, tableName, featureGeoJson, updateBoundingBox)
    })
  }

  /**
   * Adds a feature to a feature table and updates the extent listed in the contents, if necessary
   * @param gp
   * @param tableName
   * @param feature
   * @param updateBoundingBox
   */
  static _addFeatureToFeatureTable (gp, tableName, feature, updateBoundingBox = true) {
    // fix dates
    gp.getFeatureDao(tableName).table.getUserColumns().getColumns().forEach(column => {
      if (column.dataType === GeoPackageDataType.DATE || column.dataType === GeoPackageDataType.DATETIME) {
        if (!_.isNil(feature.properties[column.getName()]) && !_.isEmpty(feature.properties[column.getName()])) {
          feature.properties[column.getName()] = moment.utc(feature.properties[column.getName()]).toDate()
        } else {
          delete feature.properties[column.getName()]
        }
      }
    })
    gp.addGeoJSONFeatureToGeoPackage(feature, tableName, true)
    if (updateBoundingBox) {
      this._updateBoundingBoxForFeatureTable(gp, tableName)
    }
  }

  /**
   * Adds a feature to the feature table and updates the extent listed in the contents, if necessary
   * @param filePath
   * @param tableName
   * @param feature
   * @returns {Promise<any>}
   */
  static addFeatureToFeatureTable (filePath, tableName, feature) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._addFeatureToFeatureTable(gp, tableName, feature)
    })
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
  static async _createFeatureTable (gp, tableName, featureCollection, addFeatures = false, fields = null) {
    if (_.isNil(fields)) {
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
    let layerColumns = _.isNil(fields) ? GeoPackageUtilities.getLayerColumns(featureCollection) : {
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
    if (addFeatures) {
      featureCollection.features.forEach(feature => {
        this._addFeatureToFeatureTable(gp, tableName, feature)
      })
    }
    await this._indexFeatureTable(gp, tableName)
  }

  /**
   * Creates a feature table
   * @param filePath
   * @param tableName
   * @param featureCollection
   * @returns {Promise<any>}
   */
  static async createFeatureTable (filePath, tableName, featureCollection) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createFeatureTable(gp, tableName, featureCollection, true)
    }, true)
  }

  /**
   * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
   * @param gp
   * @param table
   * @returns {{visible: boolean, indexed: boolean, description: string, styleKey: number, featureCount: number}}
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
      description: _.isNil(description) || description.length === 0 ? 'None' : description,
      indexed: rtreeIndexed,
      styleKey: 0
    }
  }

  /**
   * Gets the geopackage feature table information required by the app to ensure functionality in all vue components
   * @param filePath
   * @param table
   * @returns {Promise<any>}
   */
  static async getGeoPackageFeatureTableForApp (filePath, table) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getGeoPackageFeatureTableForApp(gp, table)
    })
  }

  static async isGeoPackageValid (filePath) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageValidate.hasMinimumTables(gp)
    })
  }

  /**
   * Gets geopackage information required by the app to ensure functionality in all vue components
   * @param filePath
   * @returns {Promise<{path: *, tables: {features: {}, tiles: {}}, size: *, name: string, id: *}>}
   */
  static async getOrCreateGeoPackageForApp (filePath) {
    let gp
    if (!jetpack.exists(filePath)) {
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
      tables: {
        features: {},
        tiles: {}
      }
    }

    const tables = gp.getTables()
    tables.features.forEach(table => {
      geopackage.tables.features[table] = GeoPackageUtilities._getGeoPackageFeatureTableForApp(gp, table)
    })
    tables.tiles.forEach(table => {
      const tileDao = gp.getTileDao(table)
      const count = tileDao.count()
      geopackage.tables.tiles[table] = {
        visible: false,
        tileCount: count,
        minZoom: tileDao.minZoom,
        maxZoom: tileDao.maxZoom,
        description: 'An image layer with ' + count + ' tiles',
        styleKey: 0
      }
    })

    try {
      gp.close()
      gp = undefined
      GarbageCollector.tryCollect()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }

    return geopackage
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTileTables(gp)
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureTables(gp)
    })
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTables(gp)
    })
  }

  /**
   * Gets geopackage file size on disk
   * @param filePath
   * @returns {*}
   */
  static getGeoPackageFileSize (filePath) {
    let fileInfo = jetpack.inspect(filePath, {
      times: true,
      absolutePath: true
    })
    return FileUtilities.toHumanReadable(fileInfo.size)
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
      featureTableCount: GeoPackageUtilities._getFeatureTables(gp).length,
      tileTableCount: GeoPackageUtilities._getTileTables(gp).length,
      path: filePath,
      srsCount: spatialReferenceSystems.length,
      spatialReferenceSystems,
      size: GeoPackageUtilities.getGeoPackageFileSize(filePath)
    }
  }

  /**
   * Gets details of a geopackage
   * @param filePath
   * @returns {Promise<any>}
   */
  static async getDetails (filePath) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getDetails(gp, filePath)
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
   * @returns {Promise<void>}
   */
  static async buildGeoPackage (fileName, tableName, featureCollection, style = null, fields = null) {
    // create the geopackage
    let gp = await GeoPackageAPI.create(fileName)
    try {
      // setup the columns for the feature table
      await this._createFeatureTable(gp, tableName, featureCollection, fields)

      let featureTableStyles
      if (!_.isNil(style)) {
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
      for (let feature of iterator) {
        if (feature.properties) {
          feature.properties.id = undefined
          _.keys(feature.properties).forEach(key => {
            if (_.isObject(feature.properties[key])) {
              delete feature.properties[key]
            }
          })
        }
        let featureRowId = gp.addGeoJSONFeatureToGeoPackage(feature, tableName)
        if (!_.isNil(style) && !_.isNil(style.features[feature.id])) {
          const geometryType = GeometryType.fromName(feature.geometry.type.toUpperCase())
          if (!_.isNil(style.features[feature.id].icon)) {
            let iconId = style.features[feature.id].icon
            let featureIconRow = icons[iconId]
            if (_.isNil(featureIconRow)) {
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
          } else if (!_.isNil(style.features[feature.id].style)) {
            let styleId = style.features[feature.id].style
            let featureStyleRow = styles[styleId]
            if (_.isNil(featureStyleRow)) {
              let featureStyle = style.styleRowMap[styleId]
              featureStyleRow = featureTableStyles.getStyleDao().newRow()
              featureStyleRow.setColor(featureStyle.color, featureStyle.opacity)
              featureStyleRow.setWidth(featureStyle.width)
              featureStyleRow.setName(featureStyle.name)
              if (geometryType === GeometryType.POLYGON || geometryType === GeometryType.MULTIPOLYGON || geometryType === GeometryType.GEOMETRYCOLLECTION) {
                featureStyleRow.setFillColor(featureStyle.fillColor, featureStyle.fillOpacity)
              }
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
      await GeoPackageUtilities._indexFeatureTable(gp, tableName)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    try {
      gp.close()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  /**
   * Gets columns for a feature table using the feature collection provided
   * @param featureCollection
   * @returns {{columns: Array, id: {name: string}, geom: {name: string}}}
   */
  static getLayerColumns (featureCollection) {
    let properties = {}
    featureCollection.features.forEach(feature => {
      GeoPackageUtilities.addFeatureProperties(feature, properties)
    })
    let columns = []
    Object.keys(properties).forEach(key => {
      let prop = properties[key]
      if (prop.name.toLowerCase() !== 'id') {
        let c = {
          dataType: !_.isNil(prop.type) ? prop.type : 'TEXT',
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getGeoPackageExtent(gp, tableName)
    })
  }

  /**
   * Indexes a feature table
   * @param gp
   * @param tableName
   * @param force
   * @returns {Promise<void>}
   */
  static async _indexFeatureTable (gp, tableName, force = false) {
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
  static async indexFeatureTable (filePath, tableName, force = false) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._indexFeatureTable(gp, tableName, force)
    }, true)
  }

  /**
   * Adds feature properties to a properties object
   * @param feature
   * @param currentProperties
   */
  static addFeatureProperties (feature, currentProperties) {
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
   * Gets the table style
   * @param gp
   * @param tableName
   * @param geometryType
   * @returns {StyleRow}
   */
  static _getTableStyle (gp, tableName, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getTableStyle(geometryType)
  }

  /**
   * Gets the table style
   * @param filePath
   * @param tableName
   * @param geometryType
   * @returns {Promise<any>}
   */
  static async getTableStyle (filePath, tableName, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTableStyle(gp, tableName, geometryType)
    })
  }

  /**
   * Gets the table icon
   * @param gp
   * @param tableName
   * @param geometryType
   * @returns {IconRow}
   */
  static _getTableIcon (gp, tableName, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getTableIcon(geometryType)
  }

  /**
   * Gets the table icon
   * @param filePath
   * @param tableName
   * @param geometryType
   * @returns {Promise<any>}
   */
  static async getTableIcon (filePath, tableName, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTableIcon(gp, tableName, geometryType)
    })
  }

  /**
   * Gets the icon by id
   * @param gp
   * @param tableName
   * @param id
   * @returns {UserRow}
   */
  static _getIconById (gp, tableName, id) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getIconDao().queryForId(id)
  }

  /**
   * Gets the icon by id
   * @param filePath
   * @param tableName
   * @param id
   * @returns {Promise<any>}
   */
  static async getIconById (filePath, tableName, id) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getIconById(gp, tableName, id)
    })
  }

  /**
   * Gets the tableIcon's id
   * @param gp
   * @param tableName
   * @param geometryType
   * @returns {number}
   */
  static _getTableIconId (gp, tableName, geometryType) {
    let id = -1
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let icon = featureTableStyles.getTableIcon(geometryType)
    if (!_.isNil(icon)) {
      id = icon.id
    }
    return id
  }

  /**
   * Gets the table icon's id
   * @param filePath
   * @param tableName
   * @param geometryType
   * @returns {Promise<any>}
   */
  static async getTableIconId (filePath, tableName, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTableIconId(gp, tableName, geometryType)
    })
  }

  /**
   * Gets the feature ids for the features in a feature table
   * @param gp
   * @param tableName
   * @returns {Array}
   */
  static _getFeatureIds (gp, tableName) {
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
  static async getFeatureIds (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIds(gp, tableName)
    })
  }

  /**
   * Gets the ids for the point and multi point geometry type features
   * @param gp
   * @param tableName
   * @returns {Array}
   */
  static _getPointAndMultiPointFeatureIds (gp, tableName) {
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
  static async getPointAndMultiPointFeatureIds (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getPointAndMultiPointFeatureIds(gp, tableName)
    })
  }

  /**
   * Gets the feature style
   * @param gp
   * @param tableName
   * @param rowId
   * @returns {StyleRow}
   */
  static _getFeatureStyle (gp, tableName, rowId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let featureDao = gp.getFeatureDao(tableName)
    let feature = featureDao.queryForId(rowId)
    return featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, _.isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  }

  /**
   * Gets the feature style
   * @param filePath
   * @param tableName
   * @param rowId
   * @returns {Promise<any>}
   */
  static async getFeatureStyle (filePath, tableName, rowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureStyle(gp, tableName, rowId)
    })
  }

  /**
   * Gets the feature icon
   * @param gp
   * @param tableName
   * @param rowId
   * @returns {IconRow}
   */
  static _getFeatureIcon (gp, tableName, rowId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let featureDao = gp.getFeatureDao(tableName)
    let feature = featureDao.queryForId(rowId)
    return featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, _.isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  }

  /**
   * Gets the feature icon
   * @param filePath
   * @param tableName
   * @param rowId
   * @returns {Promise<any>}
   */
  static async getFeatureIcon (filePath, tableName, rowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIcon(gp, tableName, rowId)
    })
  }

  /**
   * Gets the style rows for a table
   * @param gp
   * @param tableName
   */
  static _getStyleRows (gp, tableName) {
    let styleRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let styleDao = featureTableStyles.getStyleDao()
    if (!_.isNil(styleDao)) {
      styleDao.queryForAll().forEach((result) => {
        let styleRow = styleDao.createObject(result)
        styleRows[styleRow.id] = styleRow
      })
    }
    return styleRows
  }

  /**
   * Gets the style rows for a table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getStyleRows (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getStyleRows(gp, tableName)
    })
  }

  /**
   * Gets the icon rows for a table
   * @param gp
   * @param tableName
   */
  static _getIconRows (gp, tableName) {
    let iconRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let iconDao = featureTableStyles.getIconDao()
    if (!_.isNil(iconDao)) {
      iconDao.queryForAll().forEach((result) => {
        let iconRow = iconDao.createObject(result)
        iconRows[iconRow.id] = iconRow
      })
    }
    return iconRows
  }

  /**
   * Gets the icon rows for a table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getIconRows (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getIconRows(gp, tableName)
    })
  }

  static _getStyleItemsForFeature (gp, tableName, rowId) {
    const hasStyleExtension = gp.featureStyleExtension.has(tableName)
    const featureDao = gp.getFeatureDao(tableName)
    const feature = featureDao.queryForId(rowId)
    const geometryType = GeometryType.fromName(feature.geometryType.toUpperCase())
    const result = {
      featureId: rowId,
      styles: [],
      icons: [],
      hasStyleExtension: hasStyleExtension,
      style: null,
      icon: null,
      geometryType: geometryType
    }
    if (hasStyleExtension) {
      let featureTableStyles = new FeatureTableStyles(gp, tableName)
      const styleRows = GeoPackageUtilities._getStyleRows(gp, tableName)
      result.styles = _.values(styleRows).map(style => {
        return {
          id: style.id,
          name: style.getName(),
          description: style.getDescription(),
          color: style.getHexColor(),
          opacity: style.getOpacity(),
          fillColor: style.getFillHexColor(),
          fillOpacity: style.getFillOpacity(),
          width: style.getWidth(),
          styleRow: style
        }
      })
      result.style = featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, _.isNil(feature) ? null : geometryType, false)
      const allowIconSelection = geometryType === GeometryType.POINT || geometryType === GeometryType.MULTIPOINT
      if (allowIconSelection) {
        const iconRows = GeoPackageUtilities._getIconRows(gp, tableName)
        result.icons = _.values(iconRows).map(icon => {
          return {
            id: icon.id,
            name: icon.name,
            data: icon.data,
            width: icon.width,
            height: icon.height,
            anchorU: icon.anchorU,
            anchorV: icon.anchorV,
            contentType: icon.contentType,
            url: 'data:' + icon.contentType + ';base64,' + icon.data.toString('base64'),
            iconRow: icon
          }
        })
        result.icon = featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, _.isNil(feature) ? null : geometryType, false)
      }
    }
    return result
  }

  /**
   * Returns everything needed for assigning styles/icons to the feature rowId provided
   * @param filePath
   * @param tableName
   * @param rowId
   * @returns {Promise<any>}
   */
  static async getStyleItemsForFeature (filePath, tableName, rowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getStyleItemsForFeature(gp, tableName, rowId)
    })
  }

  /**
   * Gets the assignment types for each feature
   * @param gp
   * @param tableName
   */
  static _getStyleAssignmentForFeatures (gp, tableName) {
    let styleAssignmentMap = {}
    const hasStyleExtension = gp.featureStyleExtension.has(tableName)
    if (hasStyleExtension) {
      const styles = GeoPackageUtilities._getStyleRows(gp, tableName)
      const icons = GeoPackageUtilities._getIconRows(gp, tableName)
      const mappings = GeoPackageUtilities._getFeatureStyleMapping(gp, tableName, true)
      Object.keys(mappings).forEach(featureId => {
        let style
        let icon
        const mapping = mappings[featureId]
        if (!_.isNil(mapping.styleId)) {
          style = styles[mapping.styleId.id]
        }
        if (!_.isNil(mapping.iconId)) {
          icon = icons[mapping.iconId.id]
          icon.url = 'data:' + icon.contentType + ';base64,' + icon.data.toString('base64')
        }
        styleAssignmentMap[featureId] = {
          style,
          icon
        }
      })
    }
    return styleAssignmentMap
  }

  /**
   * Gets the assignment types for each feature
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getStyleAssignmentForFeatures (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getStyleAssignmentForFeatures(gp, tableName)
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._renameGeoPackageTable(gp, tableName, newTableName)
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._copyGeoPackageTable(gp, tableName, copyTableName)
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteGeoPackageTable(gp, tableName)
    })
  }

  /**
   * Renames a geopackage table column
   * @param gp
   * @param tableName
   * @param columnName
   * @param newColumnName
   */
  static _renameGeoPackageFeatureTableColumn (gp, tableName, columnName, newColumnName) {
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
  static async renameGeoPackageFeatureTableColumn (filePath, tableName, columnName, newColumnName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._renameGeoPackageFeatureTableColumn(gp, tableName, columnName, newColumnName)
    })
  }

  /**
   * Deletes a table column from the geopackage
   * @param gp
   * @param tableName
   * @param columnName
   */
  static _deleteGeoPackageFeatureTableColumn (gp, tableName, columnName) {
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
  static async deleteGeoPackageFeatureTableColumn (filePath, tableName, columnName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteGeoPackageFeatureTableColumn(gp, tableName, columnName)
    })
  }

  /**
   * Adds a table column to the geopackage
   * @param gp
   * @param tableName
   * @param columnName
   * @param columnType
   */
  static _addGeoPackageFeatureTableColumn (gp, tableName, columnName, columnType) {
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
  static async addGeoPackageFeatureTableColumn (filePath, tableName, columnName, columnType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._addGeoPackageFeatureTableColumn(gp, tableName, columnName, columnType)
    })
  }

  /**
   * Updates a style row
   * @param gp
   * @param tableName
   * @param styleRow
   */
  static _updateStyleRow (gp, tableName, styleRow) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let styleDao = featureTableStyles.getStyleDao()
    let updatedRow = styleDao.newRow()
    updatedRow.id = styleRow.id
    updatedRow.setName(styleRow.name)
    updatedRow.setDescription(styleRow.description)
    updatedRow.setColor(styleRow.color, styleRow.opacity)
    updatedRow.setFillColor(styleRow.fillColor, styleRow.fillOpacity)
    updatedRow.setWidth(styleRow.width)
    styleDao.update(updatedRow)
  }

  /**
   * Updates a style row
   * @param filePath
   * @param tableName
   * @param styleRow
   * @returns {Promise<any>}
   */
  static async updateStyleRow (filePath, tableName, styleRow) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateStyleRow(gp, tableName, styleRow)
    })
  }

  /**
   * Updates an icon row
   * @param gp
   * @param tableName
   * @param iconRow
   */
  static _updateIconRow (gp, tableName, iconRow) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let iconDao = featureTableStyles.getIconDao()
    let updatedRow = iconDao.newRow()
    updatedRow.id = iconRow.id
    updatedRow.name = iconRow.name
    updatedRow.description = iconRow.description
    updatedRow.contentType = iconRow.contentType
    updatedRow.data = iconRow.data
    updatedRow.width = iconRow.width
    updatedRow.height = iconRow.height
    updatedRow.anchorU = iconRow.anchorU
    updatedRow.anchorV = iconRow.anchorV
    iconDao.update(updatedRow)
  }

  /**
   * Updates an icon row
   * @param filePath
   * @param tableName
   * @param iconRow
   * @returns {Promise<any>}
   */
  static async updateIconRow (filePath, tableName, iconRow) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateIconRow(gp, tableName, iconRow)
    })
  }

  /**
   * Creates a style row
   * @param gp
   * @param tableName
   * @param style
   */
  static _createStyleRow (gp, tableName, style = VectorStyleUtilities.randomStyle()) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let styleDao = featureTableStyles.getStyleDao()
    let styleRow = styleDao.newRow()
    styleRow.setColor(style.color, style.opacity)
    styleRow.setFillColor(style.fillColor, style.fillOpacity)
    styleRow.setWidth(style.width)
    styleRow.setName(style.name)
    styleRow.setDescription(style.description)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
  }

  /**
   * Creates a style row
   * @param filePath
   * @param tableName
   * @param style
   * @returns {Promise<any>}
   */
  static async createStyleRow (filePath, tableName, style) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createStyleRow(gp, tableName, style)
    })
  }

  /**
   * Creates an icon row
   * @param gp
   * @param tableName
   * @param icon
   */
  static _createIconRow (gp, tableName, icon = VectorStyleUtilities.getDefaultIcon()) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let iconDao = featureTableStyles.getIconDao()
    let iconRow = iconDao.newRow()
    iconRow.name = icon.name
    iconRow.description = icon.description
    iconRow.data = icon.data
    iconRow.contentType = icon.contentType
    iconRow.width = icon.width
    iconRow.height = icon.height
    iconRow.anchorU = icon.anchorU
    iconRow.anchorV = icon.anchorV
    featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(iconRow)
  }

  /**
   * Creates an icon row
   * @param filePath
   * @param tableName
   * @param icon
   * @returns {Promise<any>}
   */
  static async createIconRow (filePath, tableName, icon = VectorStyleUtilities.getDefaultIcon()) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createIconRow(gp, tableName, icon)
    })
  }

  /**
   * Deletes a style row
   * @param gp
   * @param tableName
   * @param styleId
   */
  static _deleteStyleRow (gp, tableName, styleId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.deleteStyleAndMappingsByStyleRowId(styleId)
  }

  /**
   * Deletes a style row
   * @param filePath
   * @param tableName
   * @param styleId
   * @returns {Promise<any>}
   */
  static async deleteStyleRow (filePath, tableName, styleId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteStyleRow(gp, tableName, styleId)
    })
  }

  /**
   * Deletes an icon row
   * @param gp
   * @param tableName
   * @param iconId
   */
  static _deleteIconRow (gp, tableName, iconId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.deleteIconAndMappingsByIconRowId(iconId)
  }

  /**
   * Deletes an icon row
   * @param filePath
   * @param tableName
   * @param iconId
   * @returns {Promise<any>}
   */
  static async deleteIconRow (filePath, tableName, iconId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteIconRow(gp, tableName, iconId)
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
  static _getFeatureStyleRow (gp, tableName, featureId, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getFeatureStyleExtension().getStyle(tableName, featureId, geometryType, false)
  }

  /**
   * Gets a feature style row
   * @param filePath
   * @param tableName
   * @param featureId
   * @param geometryType
   * @returns {Promise<any>}
   */
  static async getFeatureStyleRow (filePath, tableName, featureId, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureStyleRow(gp, tableName, featureId, geometryType)
    })
  }

  /**
   * Gets a feature icon row
   * @param gp
   * @param tableName
   * @param featureId
   * @param geometryType
   * @returns {IconRow}
   */
  static _getFeatureIconRow (gp, tableName, featureId, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getFeatureStyleExtension().getIcon(tableName, featureId, geometryType, false)
  }

  /**
   * Gets a feature icon row
   * @param filePath
   * @param tableName
   * @param featureId
   * @param geometryType
   * @returns {Promise<any>}
   */
  static async getFeatureIconRow (filePath, tableName, featureId, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIconRow(gp, tableName, featureId, geometryType)
    })
  }

  /**
   * Sets a table style
   * @param gp
   * @param tableName
   * @param geometryType
   * @param styleId
   * @returns {number}
   */
  static _setTableStyle (gp, tableName, geometryType, styleId) {
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    if (styleId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setTableStyle(tableName, geometryType, null)
    } else {
      let style = featureTableStyles.getStyleDao().queryForId(styleId)
      if (!_.isNil(style)) {
        return featureTableStyles.getFeatureStyleExtension().setTableStyle(tableName, geometryType, style)
      }
    }
  }

  /**
   * Sets a table style
   * @param filePath
   * @param tableName
   * @param geometryType
   * @param styleId
   * @returns {Promise<any>}
   */
  static async setTableStyle (filePath, tableName, geometryType, styleId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._setTableStyle(gp, tableName, geometryType, styleId)
    })
  }

  /**
   * Sets a table icon
   * @param gp
   * @param tableName
   * @param geometryType
   * @param iconId
   * @returns {number}
   */
  static _setTableIcon (gp, tableName, geometryType, iconId) {
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    if (iconId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setTableIcon(tableName, geometryType, null)
    } else {
      let icon = featureTableStyles.getIconDao().queryForId(iconId)
      if (!_.isNil(icon)) {
        return featureTableStyles.getFeatureStyleExtension().setTableIcon(tableName, geometryType, icon)
      }
    }
  }

  /**
   * Sets a table icon
   * @param filePath
   * @param tableName
   * @param geometryType
   * @param iconId
   * @returns {Promise<any>}
   */
  static async setTableIcon (filePath, tableName, geometryType, iconId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._setTableIcon(gp, tableName, geometryType, iconId)
    })
  }

  /**
   * Sets a feature style
   * @param gp
   * @param tableName
   * @param featureId
   * @param styleId
   * @returns {number}
   */
  static _setFeatureStyle (gp, tableName, featureId, styleId) {
    const featureDao = gp.getFeatureDao(tableName)
    const feature = featureDao.queryForId(featureId)
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    const geometryType = GeometryType.fromName(feature.geometryType.toUpperCase())
    if (styleId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setStyle(tableName, featureId, geometryType, null)
    } else {
      let style = featureTableStyles.getStyleDao().queryForId(styleId)
      return featureTableStyles.getFeatureStyleExtension().setStyle(tableName, featureId, geometryType, style)
    }
  }

  /**
   * Sets a feature style
   * @param filePath
   * @param tableName
   * @param featureId
   * @param styleId
   * @returns {Promise<any>}
   */
  static async setFeatureStyle (filePath, tableName, featureId, styleId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._setFeatureStyle(gp, tableName, featureId, styleId)
    })
  }

  /**
   * Sets a feature icon
   * @param gp
   * @param tableName
   * @param featureId
   * @param iconId
   * @returns {number}
   */
  static _setFeatureIcon (gp, tableName, featureId, iconId) {
    const featureDao = gp.getFeatureDao(tableName)
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    const feature = featureDao.queryForId(featureId)
    const geometryType = GeometryType.fromName(feature.geometryType.toUpperCase())
    if (iconId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setIcon(tableName, featureId, geometryType, null)
    } else {
      let icon = featureTableStyles.getIconDao().queryForId(iconId)
      return featureTableStyles.getFeatureStyleExtension().setIcon(tableName, featureId, geometryType, icon)
    }
  }

  /**
   * Sets a feature icon
   * @param filePath
   * @param tableName
   * @param featureId
   * @param iconId
   * @returns {Promise<any>}
   */
  static async setFeatureIcon (filePath, tableName, featureId, iconId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._setFeatureIcon(gp, tableName, featureId, iconId)
    })
  }

  /**
   * Updates a feature row
   * @param gp
   * @param tableName
   * @param featureRow
   */
  static _updateFeatureRow (gp, tableName, featureRow) {
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
  static async updateFeatureRow (filePath, tableName, featureRow) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateFeatureRow(gp, tableName, featureRow)
    })
  }

  /**
   * Deletes a feature row
   * @param gp
   * @param tableName
   * @param featureRowId
   */
  static _deleteFeatureRow (gp, tableName, featureRowId) {
    gp.getFeatureDao(tableName).deleteById(featureRowId)
    this._updateBoundingBoxForFeatureTable(gp, tableName)
  }

  /**
   * Delets a feature row
   * @param filePath
   * @param tableName
   * @param featureRowId
   * @returns {Promise<any>}
   */
  static async deleteFeatureRow (filePath, tableName, featureRowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteFeatureRow(gp, tableName, featureRowId)
    })
  }

  /**
   * Gets the bounding box for a feature's geometry
   * @param gp
   * @param tableName
   * @param featureRowId
   * @returns {null}
   */
  static _getBoundingBoxForFeature (gp, tableName, featureRowId) {
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
  static async getBoundingBoxForFeature (filePath, tableName, featureRowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getBoundingBoxForFeature(gp, tableName, featureRowId)
    })
  }

  /**
   * Updates the bounding box for a feature table to match the actual contents of the table
   * @param gp
   * @param tableName
   */
  static _updateBoundingBoxForFeatureTable (gp, tableName) {
    const contentsDao = gp.contentsDao
    const contents = contentsDao.queryForId(tableName)
    const featureDao = gp.getFeatureDao(tableName)
    const features = []
    featureDao.queryForAll().forEach(result => {
      const featureRow = featureDao.createObject(result)
      const geometry = featureRow.geometry
      features.push({
        type: 'Feature',
        properties: {},
        geometry: geometry.geometry.toGeoJSON()
      })
    })
    const featureCollection = {
      type: 'FeatureCollection',
      features: features
    }
    const extent = bbox(featureCollection)
    contents.min_x = extent[0]
    contents.min_y = extent[1]
    contents.max_x = extent[2]
    contents.max_y = extent[3]
    contentsDao.update(contents)
  }

  /**
   * Updates the bounding box for a feature table to match the actual contents of the table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async updateBoundingBoxForFeatureTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateBoundingBoxForFeatureTable(gp, tableName)
    })
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
    if (!_.isNil(contents)) {
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
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getBoundingBoxForTable(gp, tableName)
    })
  }

  /**
   * Gets the feature count in a bounding box
   * @param gp
   * @param tableName
   * @param boundingBox
   * @returns {number}
   */
  static _getFeatureCountInBoundingBox (gp, tableName, boundingBox) {
    return gp.getFeatureDao(tableName).countInBoundingBox(new BoundingBox(boundingBox[0], boundingBox[2], boundingBox[1], boundingBox[3]), 'EPSG:4326')
  }

  /**
   * Gets the feature count in a bounding box
   * @param filePath
   * @param tableName
   * @param boundingBox
   * @returns {Promise<any>}
   */
  static async getFeatureCountInBoundingBox (filePath, tableName, boundingBox) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureCountInBoundingBox(gp, tableName, boundingBox)
    })
  }

  /**
   * Determines the estimated work for a tile configuration
   * @param project
   * @param tileConfiguration
   * @returns {{boundingBox: null, estimatedNumberOfTiles: number, tileScaling: null, zoomLevels: Array}}
   */
  static tileConfigurationEstimatedWork (project, tileConfiguration) {
    const results = {
      estimatedNumberOfTiles: 0,
      tileScaling: null,
      boundingBox: null,
      zoomLevels: []
    }

    let tilesToAdd = 0
    let boundingBox
    const tileScaling = tileConfiguration.tileScaling
    let tileScalingMethod
    let zoomOut
    let zoomIn
    let zoomLevels = []

    if (!_.isNil(tileConfiguration.minZoom) && !_.isNil(tileConfiguration.maxZoom) && !_.isNil(tileConfiguration.boundingBox)) {
      const minZoom = Number(tileConfiguration.minZoom)
      const maxZoom = Number(tileConfiguration.maxZoom)

      // we will use the intersection of the requested bounding box and the bounding box for all layers combined
      let extents = tileConfiguration.vectorLayers.map(vectorLayer => project.layers[vectorLayer].extent)
      extents = extents.concat(tileConfiguration.tileLayers.map(tileLayer => project.layers[tileLayer].extent))
      if (extents.length > 0) {
        boundingBox = TileBoundingBoxUtils.getBoundingBoxFromExtents(extents)
      }
      if (!_.isNil(boundingBox)) {
        const result = TileBoundingBoxUtils.intersection(
          new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0]),
          new BoundingBox(tileConfiguration.boundingBox[0][1], tileConfiguration.boundingBox[1][1], tileConfiguration.boundingBox[0][0], tileConfiguration.boundingBox[1][0])
        )
        boundingBox = [[result[1], result[0]], [result[3], result[2]]]
      } else {
        boundingBox = tileConfiguration.boundingBox
      }

      if (tileScaling) {
        const vectorLayerCount = tileConfiguration.vectorLayers.length
        const tileLayerCount = tileConfiguration.tileLayers.length
        const tileLayers = tileConfiguration.tileLayers.map(layerId => project.layers[layerId])
        if (vectorLayerCount === 0 &&
          tileLayerCount > 0 &&
          tileLayers.filter(tileLayer => tileLayer.layerType === 'GeoTIFF').length === tileLayerCount &&
          tileLayers.filter(tileLayer => Math.abs(tileLayer.naturalWebMercatorZoom - tileLayers[0].naturalWebMercatorZoom) <= 1).length === tileLayerCount) {
          // no vector layers, and each tile layer is a geotiff and the difference in zoom levels is <= 1, enable tile scaling
          const zoom = Math.min(tileLayers.map(tileLayer => tileLayer.naturalWebMercatorZoom).reduce((a, b) => Math.max(a, b)), maxZoom)
          if (maxZoom - zoom > 0) {
            zoomIn = maxZoom - zoom
          }
          zoomOut = 2
          tileScalingMethod = TileScalingType.IN_OUT
          for (let z = zoom; z >= minZoom; z -= 2) {
            zoomLevels.push(z)
          }
          tilesToAdd = XYZTileUtilities.tileCountInExtentForZoomLevels(boundingBox, zoomLevels)
        } else {
          for (let zoom = minZoom; zoom <= maxZoom; zoom += 2) {
            zoomLevels.push(zoom)
          }
          zoomIn = 1
          zoomOut = 1
          tileScalingMethod = TileScalingType.IN_OUT
          tilesToAdd = XYZTileUtilities.tileCountInExtentForZoomLevels(boundingBox, zoomLevels)
        }

        const tileScalingRecord = new TileScaling()
        tileScalingRecord.scaling_type = tileScalingMethod
        tileScalingRecord.zoom_in = zoomIn
        tileScalingRecord.zoom_out = zoomOut
        results.tileScaling = tileScalingRecord
      } else {
        for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
          zoomLevels.push(zoom)
        }
        tilesToAdd = XYZTileUtilities.tileCountInExtent(boundingBox, minZoom, maxZoom)
      }
    }
    results.estimatedNumberOfTiles = tilesToAdd
    results.boundingBox = boundingBox
    results.zoomLevels = zoomLevels
    return results
  }

  static estimatedTileCount (boundingBoxFilter, dataSources, geopackageLayers, tileScaling = false, minZoom = 0, maxZoom = 20) {
    const results = {
      estimatedNumberOfTiles: 0,
      tileScaling: null,
      boundingBox: null,
      zoomLevels: []
    }

    let tilesToAdd = 0
    let tileScalingMethod
    let zoomOut
    let zoomIn
    let zoomLevels = []
    let boundingBox

    if (!_.isNil(minZoom) && !_.isNil(maxZoom) && !_.isNil(boundingBoxFilter)) {
      // we will use the intersection of the requested bounding box and the bounding box for all layers combined
      let extents = dataSources.map(dataSource => dataSource.extent)
      // extents = extents.concat(geopackageLayers.map(geopackageLayer => geopackageLayer.extent))
      if (extents.length > 0) {
        boundingBox = TileBoundingBoxUtils.getBoundingBoxFromExtents(extents)
      }
      if (!_.isNil(boundingBox)) {
        const result = TileBoundingBoxUtils.intersection(
          new BoundingBox(boundingBox[0], boundingBox[2], boundingBox[1], boundingBox[3]),
          new BoundingBox(boundingBoxFilter[0], boundingBoxFilter[2], boundingBoxFilter[1], boundingBoxFilter[3])
        )
        boundingBox = [[result[1], result[0]], [result[3], result[2]]]
      } else {
        boundingBox = [[boundingBoxFilter[1], boundingBoxFilter[0]], [boundingBoxFilter[3], boundingBoxFilter[2]]]
      }
      if (tileScaling) {
        // TODO: figure out natural zoom or already available zoom levels to help prevent extra work
        // const vectorLayerCount = dataSources.filter(dataSource => dataSource.type === 'feature').length + geopackageLayers.filter(geopackage => geopackage.type === 'feature').length
        // const tileLayerCount = dataSources.length + geopackageLayers.length - vectorLayerCount
        // const tileLayers = tileConfiguration.tileLayers.map(layerId => project.layers[layerId])
        // if (vectorLayerCount === 0 &&
        //   tileLayerCount > 0 &&
        //   tileLayers.filter(tileLayer => tileLayer.layerType === 'GeoTIFF').length === tileLayerCount &&
        //   tileLayers.filter(tileLayer => Math.abs(tileLayer.naturalWebMercatorZoom - tileLayers[0].naturalWebMercatorZoom) <= 1).length === tileLayerCount) {
        //   // no vector layers, and each tile layer is a geotiff and the difference in zoom levels is <= 1, enable tile scaling
        //   const zoom = Math.min(tileLayers.map(tileLayer => tileLayer.naturalWebMercatorZoom).reduce((a, b) => Math.max(a, b)), maxZoom)
        //   if (maxZoom - zoom > 0) {
        //     zoomIn = maxZoom - zoom
        //   }
        //   zoomOut = 2
        //   tileScalingMethod = TileScalingType.IN_OUT
        //   for (let z = zoom; z >= minZoom; z -= 2) {
        //     zoomLevels.push(z)
        //   }
        //   tilesToAdd = XYZTileUtilities.tileCountInExtentForZoomLevels(boundingBox, zoomLevels)
        // }
        let onlyOneTile = false
        for (let zoom = maxZoom; zoom >= minZoom; zoom -= 1) {
          const tiles = XYZTileUtilities.tileCountInExtentForZoomLevels(boundingBox, [zoom])
          if (tiles > 1 || (tiles === 1 && !onlyOneTile)) {
            zoomLevels.push({
              zoom,
              tiles: tiles
            })
          }
          onlyOneTile = onlyOneTile || tiles === 1
        }

        // should have an array of zoom levels and the number of tiles they need. list will stop at first occurrence of only a single tile being generated
        // now i need to remove every other start with the smallest zoom level working my way up to the largest requested
        if (zoomLevels.length > 1) {
          for (let i = 0; i <= zoomLevels.length; i += 2) {
            zoomLevels.splice(i, 1)
          }
        }

        zoomIn = zoomLevels[zoomLevels.length - 1].zoom - minZoom
        zoomOut = 1
        tileScalingMethod = TileScalingType.IN_OUT
        zoomLevels = zoomLevels.map(zoomLevel => zoomLevel.zoom)
        tilesToAdd = XYZTileUtilities.tileCountInExtentForZoomLevels(boundingBox, zoomLevels)
        const tileScalingRecord = new TileScaling()
        tileScalingRecord.scaling_type = tileScalingMethod
        tileScalingRecord.zoom_in = zoomIn
        tileScalingRecord.zoom_out = zoomOut
        results.tileScaling = tileScalingRecord
      } else {
        for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
          zoomLevels.push(zoom)
        }
        tilesToAdd = XYZTileUtilities.tileCountInExtent(boundingBox, minZoom, maxZoom)
      }
    }
    results.estimatedNumberOfTiles = tilesToAdd
    results.boundingBox = boundingBox
    results.zoomLevels = zoomLevels
    return results
  }

  /**
   * Gets all features in a table as geojson
   * @param gp
   * @param tableName
   * @returns {any[]}
   */
  static _getAllFeaturesAsGeoJSON (gp, tableName) {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    let each = featureDao.queryForEach()
    const features = []
    for (let row of each) {
      if (!_.isNil(row)) {
        const featureRow = featureDao.getRow(row)
        const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureRow, srs)
        feature.type = 'Feature'
        features.push(feature)
      }
    }
    return features
  }

  /**
   * Gets all features id's and respective geometry types
   * @param gp
   * @param tableName
   * @returns {any[]}
   */
  static _getAllFeatureIdsAndGeometryTypes (gp, tableName) {
    const featureDao = gp.getFeatureDao(tableName)
    let each = featureDao.queryForEach()
    const results = []
    for (let row of each) {
      if (!_.isNil(row)) {
        const featureRow = featureDao.getRow(row)
        const geometry = featureRow.geometry
        let geometryType = GeometryType.GEOMETRY
        if (!_.isNil(geometry) && !geometry.empty && geometry.geometry) {
          geometryType = GeometryType.fromName(geometry.toGeoJSON().type.toUpperCase())
        }
        const id = featureRow.id
        results.push({
          id,
          geometryType
        })
      }
    }
    return results
  }

  /**
   * Gets all features in a table as geojson
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getAllFeaturesAsGeoJSON (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getAllFeaturesAsGeoJSON(gp, tableName)
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
  static _getAllFeatureRowsIn4326 (gp, tableName, srsId, boundingBox) {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    const projectionNeeded = srs.organization.toUpperCase() + ':' + srs.srs_id !== 'EPSG:4326'
    let each
    if (!_.isNil(boundingBox) && !_.isNil(featureDao.featureTableIndex) && featureDao.isIndexed()) {
      each = featureDao.featureTableIndex.queryWithBoundingBox(boundingBox, 'EPSG:4326')
    } else {
      each = featureDao.queryForEach()
    }
    const featureRows = []
    for (let row of each) {
      if (!_.isNil(row)) {
        const featureRow = featureDao.getRow(row)
        if (projectionNeeded) {
          featureRow.geometry.setGeometry(GeoPackageUtilities.projectGeometryTo4326(featureRow.geometry, srs))
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
  static async getAllFeatureRowsIn4326 (filePath, tableName, srsId, boundingBox) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getAllFeatureRowsIn4326(gp, tableName, srsId, boundingBox)
    })
  }

  /**
   * Gets all features in a table
   * @param gp
   * @param tableName
   * @returns {any[]}
   */
  static _getAllFeatureRows (gp, tableName) {
    const featureDao = gp.getFeatureDao(tableName)
    const each = featureDao.queryForEach()
    const featureRows = []
    for (let row of each) {
      if (!_.isNil(row)) {
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
  static async getAllFeatureRows (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getAllFeatureRows(gp, tableName)
    })
  }

  /**
   * Gets feature in table
   * @param gp
   * @param tableName
   * @param id
   * @returns {FeatureRow}
   */
  static _getFeatureRow (gp, tableName, id) {
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
  static async getFeatureRow (filePath, tableName, id) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureRow(gp, tableName, id)
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
    return new BoundingBox(GeoPackageUtilities.normalizeLongitude(coordinate.lng) - queryDistanceDegrees, GeoPackageUtilities.normalizeLongitude(coordinate.lng) + queryDistanceDegrees, coordinate.lat - queryDistanceDegrees, coordinate.lat + queryDistanceDegrees)
  }

  /**
   * Qeuries for features at a coordinate with a buffer based on zoom level
   * @param gp
   * @param tableName
   * @param coordinate
   * @param zoom
   * @returns {Object}
   */
  static _queryForFeaturesAt (gp, tableName, coordinate, zoom) {
    let features
    if (gp.getFeatureDao(tableName).isIndexed()) {
      features = gp.queryForGeoJSONFeaturesInTable(tableName, GeoPackageUtilities.getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom)).filter(feature => !_.isNil(feature))
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
  static async queryForFeaturesAt (filePath, tableName, coordinate, zoom) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._queryForFeaturesAt(gp, tableName, coordinate, zoom)
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
  static _countOfFeaturesAt (gp, tableNames, coordinate, zoom) {
    let count = 0
    for (let i = 0; i < tableNames.length; i++) {
      const tableName = tableNames[i]
      const featureDao = gp.getFeatureDao(tableName)
      if (featureDao.isIndexed()) {
        count += featureDao.countInBoundingBox(GeoPackageUtilities.getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom), 'EPSG:4326')
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
  static async countOfFeaturesAt (filePath, tableNames, coordinate, zoom) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._countOfFeaturesAt(gp, tableNames, coordinate, zoom)
    })
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
      return flat.concat(Array.isArray(toFlatten) ? GeoPackageUtilities.flatten(toFlatten) : toFlatten)
    }, [])
  }

  /**
   * Builds a feature layer
   * currently this just merges features
   * TODO: support extensions
   * TODO: support non-media related tables
   * @param configuration
   * @param statusCallback
   * @returns {Promise<any>}
   */
  static async buildFeatureLayer (configuration, statusCallback) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(configuration.path, async (gp) => {
      const status = {
        message: 'Starting...',
        progress: 0.0
      }

      const throttleStatusCallback = _.throttle(statusCallback, 100)

      const tableName = configuration.table

      throttleStatusCallback(status)

      await GeoPackageUtilities.wait(1000)

      let sourceFeatureMap = {}
      let sourceColumnMap = {}
      let sourceNameChanges = {}
      let sourceStyleMap = {}
      let parentStyleMapping = {}
      let mediaRelations = {}
      let insertedMediaMap = {}

      // retrieve layers
      status.message = 'Retrieving features from data sources and geopackage feature layers...'
      status.progress = 0.0
      throttleStatusCallback(status)

      const numberLayersToRetrieve = configuration.sourceLayers.length + configuration.geopackageLayers.length

      let layersRetrieved = 0
      let featureColumns = null

      let boundingBoxFilter
      if (configuration.boundingBoxFilter) {
        boundingBoxFilter = new BoundingBox(configuration.boundingBoxFilter[0], configuration.boundingBoxFilter[2], configuration.boundingBoxFilter[1], configuration.boundingBoxFilter[3])
      }

      let sourceIdx = 0
      // copy data from source layers
      for (let i = 0; i < configuration.sourceLayers.length; i++) {
        const sourceLayer = configuration.sourceLayers[i]
        await GeoPackageUtilities.performSafeGeoPackageOperation(sourceLayer.geopackageFilePath, async (geopackage) => {
          sourceFeatureMap[sourceIdx] = GeoPackageUtilities._getAllFeatureRowsIn4326(geopackage, sourceLayer.sourceLayerName, 4326, boundingBoxFilter)
          sourceColumnMap[sourceIdx] = GeoPackageUtilities._getFeatureColumns(geopackage, sourceLayer.sourceLayerName)
          sourceStyleMap[sourceIdx] = {
            styles: GeoPackageUtilities._getStyleRows(geopackage, sourceLayer.sourceLayerName),
            icons: GeoPackageUtilities._getIconRows(geopackage, sourceLayer.sourceLayerName),
            featureStyleMapping: GeoPackageUtilities._getFeatureStyleMapping(geopackage, sourceLayer.sourceLayerName, numberLayersToRetrieve > 1),
            tableStyleMappings: GeoPackageUtilities._getTableStyleMappings(geopackage, sourceLayer.sourceLayerName),
            parentId: sourceLayer.id
          }

          // feature row id -> list of objects (media table name, row id)
          mediaRelations[sourceIdx] = {}
          if (geopackage.relatedTablesExtension.has()) {
            geopackage.getFeatureDao(sourceLayer.sourceLayerName).mediaRelations.forEach(mediaRelation => {
              if (mediaRelation.mapping_table_name !== (IconTable.TABLE_NAME + '_' + sourceLayer.sourceLayerName)) {
                const userMappingDao = geopackage.relatedTablesExtension.getMappingDao(mediaRelation.mapping_table_name)
                const mappings = userMappingDao.queryForAll()
                mappings.forEach(mapping => {
                  if (_.isNil(mediaRelations[sourceIdx][mapping.base_id])) {
                    mediaRelations[sourceIdx][mapping.base_id] = []
                  }
                  mediaRelations[sourceIdx][mapping.base_id].push({
                    filePath: sourceLayer.geopackageFilePath,
                    mediaTable: mediaRelation.related_table_name,
                    mediaRowId: mapping.related_id
                  })
                })
              }
            })
          }

          const result = GeoPackageUtilities.mergeFeatureColumns(featureColumns, GeoPackageUtilities._getFeatureColumns(geopackage, sourceLayer.sourceLayerName))
          featureColumns = result.mergedColumns
          sourceNameChanges[sourceIdx] = result.nameChanges
          sourceIdx++
          layersRetrieved++
          status.progress = 25.0 * (layersRetrieved / numberLayersToRetrieve)
          throttleStatusCallback(status)
        })
      }

      // copy data from geopackage feature layers
      for (let i = 0; i < configuration.geopackageLayers.length; i++) {
        const geopackageLayer = configuration.geopackageLayers[i]
        await GeoPackageUtilities.performSafeGeoPackageOperation(geopackageLayer.geopackage.path, async (geopackage) => {
          sourceFeatureMap[sourceIdx] = GeoPackageUtilities._getAllFeatureRowsIn4326(geopackage, geopackageLayer.table, 4326, boundingBoxFilter)
          sourceColumnMap[sourceIdx] = GeoPackageUtilities._getFeatureColumns(geopackage, geopackageLayer.table)
          sourceStyleMap[sourceIdx] = {
            styles: GeoPackageUtilities._getStyleRows(geopackage, geopackageLayer.table),
            icons: GeoPackageUtilities._getIconRows(geopackage, geopackageLayer.table),
            featureStyleMapping: GeoPackageUtilities._getFeatureStyleMapping(geopackage, geopackageLayer.table, numberLayersToRetrieve > 1),
            tableStyleMappings: GeoPackageUtilities._getTableStyleMappings(geopackage, geopackageLayer.table),
            parentId: geopackageLayer.geopackage.id
          }
          mediaRelations[sourceIdx] = {}
          if (geopackage.relatedTablesExtension.has()) {
            geopackage.getFeatureDao(geopackageLayer.table).mediaRelations.forEach(mediaRelation => {
              if (mediaRelation.mapping_table_name !== (IconTable.TABLE_NAME + '_' + geopackageLayer.table)) {
                const userMappingDao = geopackage.relatedTablesExtension.getMappingDao(mediaRelation.mapping_table_name)
                const mappings = userMappingDao.queryForAll()
                mappings.forEach(mapping => {
                  if (_.isNil(mediaRelations[sourceIdx][mapping.base_id])) {
                    mediaRelations[sourceIdx][mapping.base_id] = []
                  }
                  mediaRelations[sourceIdx][mapping.base_id].push({
                    filePath: geopackageLayer.geopackage.path,
                    mediaTable: mediaRelation.related_table_name,
                    mediaRowId: mapping.related_id
                  })
                })
              }
            })
          }

          const result = GeoPackageUtilities.mergeFeatureColumns(featureColumns, GeoPackageUtilities._getFeatureColumns(geopackage, geopackageLayer.table))
          featureColumns = result.mergedColumns
          sourceNameChanges[sourceIdx] = result.nameChanges
          sourceIdx++
          layersRetrieved++
          status.progress = 25.0 * (layersRetrieved / numberLayersToRetrieve)
          throttleStatusCallback(status)
        })
      }

      const stylesAndIconsExist = _.keys(sourceStyleMap).filter(id => (_.keys(sourceStyleMap[id].styles).length + _.keys(sourceStyleMap[id].icons).length) > 0).length > 0

      await GeoPackageUtilities.wait(500)

      // combine layers
      status.message = 'Combining features and organizing properties...'
      throttleStatusCallback(status)

      let geometryColumns = new GeometryColumns()
      geometryColumns.table_name = tableName
      geometryColumns.column_name = 'geometry'
      geometryColumns.geometry_type_name = GeometryType.nameFromType(GeometryType.GEOMETRY)
      geometryColumns.z = 0
      geometryColumns.m = 0
      let columns = []
      columns.push(FeatureColumn.createPrimaryKeyColumn(0, 'id'))
      columns.push(FeatureColumn.createGeometryColumn(1, 'geometry', GeometryType.GEOMETRY, false, null))
      let columnIndex = 2
      featureColumns.getColumns().forEach(column => {
        column.resetIndex()
        column.setIndex(columnIndex++)
        columns.push(column)
      })

      const featureCollection = {
        type: 'FeatureCollection',
        features: GeoPackageUtilities.flatten(_.values(sourceFeatureMap)).map(row => {
          return {
            type: 'Feature',
            properties: {},
            geometry: row.geometry.geometry.toGeoJSON()
          }
        })
      }

      const featureCount = featureCollection.features.length
      let extent = bbox(featureCollection)
      let bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])

      status.progress = 30.0

      await GeoPackageUtilities.wait(500)

      status.message = 'Adding features to GeoPackage layer...'
      throttleStatusCallback(status)
      await GeoPackageUtilities.wait(500)
      gp.createFeatureTable(tableName, geometryColumns, columns, bb, 4326)
      const featureDao = gp.getFeatureDao(tableName)
      let featureTableStyles
      if (stylesAndIconsExist) {
        featureTableStyles = new FeatureTableStyles(gp, tableName)
        featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
        featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
        featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
        featureTableStyles.createTableStyleRelationship()
        featureTableStyles.createTableIconRelationship()
        featureTableStyles.createStyleRelationship()
        featureTableStyles.createIconRelationship()
      }

      // if any of the source layers have media relations, create the media table (this is where all of the media for the source layers will be copied into)
      const mediaTableName = MediaUtilities.getMediaTableName()
      const hasMediaRelations = _.keys(mediaRelations).filter(id => _.keys(mediaRelations[id]).length > 0).length > 0
      let targetMediaDao
      if (hasMediaRelations) {
        const rte = gp.relatedTablesExtension
        if (!gp.connection.isTableExists(mediaTableName)) {
          const mediaTable = MediaTable.create(mediaTableName)
          rte.createRelatedTable(mediaTable)
        } else {
          // media table already exists, there may be layers from this geopackage being added to the new feature layer, so add the existing
          const mediaDao = gp.relatedTablesExtension.getMediaDao(mediaTableName)
          const each = mediaDao.queryForEach()
          for (let row of each) {
            const sourceMediaKey = configuration.path + '_' + mediaTableName + '_' + row.id
            insertedMediaMap[sourceMediaKey] = row.id

          }
        }
        targetMediaDao = gp.relatedTablesExtension.getMediaDao(MediaUtilities.getMediaTableName())
      }

      const columnTypes = {}
      for (let i = 0; i < featureDao.table.getColumnCount(); i++) {
        const column = featureDao.table.getColumnWithIndex(i)
        columnTypes[column.name] = column.dataType
      }

      let id = 0
      const sourceFeatureMapKeys = _.keys(sourceFeatureMap)
      for (let sIdx = 0; sIdx < sourceFeatureMapKeys.length; sIdx++) {
        const sourceIdx = sourceFeatureMapKeys[sIdx]
        const featureRows = sourceFeatureMap[sourceIdx]
        const columns = sourceColumnMap[sourceIdx]
        const nameChanges = sourceNameChanges[sourceIdx]

        const styles = sourceStyleMap[sourceIdx].styles
        const icons = sourceStyleMap[sourceIdx].icons
        const featureStyleMapping = sourceStyleMap[sourceIdx].featureStyleMapping
        const parentId = sourceStyleMap[sourceIdx].parentId
        const featureMediaListMap = mediaRelations[sourceIdx]

        // insert styles and icons
        if (!_.isNil(featureTableStyles) && _.isNil(parentStyleMapping[parentId])) {
          parentStyleMapping[parentId] = {
            iconMapping: {},
            styleMapping: {}
          }
          _.keys(styles).forEach(styleId => {
            const styleRow = styles[styleId]
            styleRow.id = null
            parentStyleMapping[parentId].styleMapping[styleId] = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
          })
          _.keys(icons).forEach(iconId => {
            const iconRow = icons[iconId]
            iconRow.id = null
            parentStyleMapping[parentId].iconMapping[iconId] = featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(iconRow)
          })

          // only one layer being added to this feature table, so we can migrate over table style/icon relationships
          if (numberLayersToRetrieve === 1) {
            const tableStyleMapping = sourceStyleMap[sourceIdx].tableStyleMappings
            const featureContentsId = featureTableStyles.getFeatureStyleExtension().contentsIdExtension.getOrCreateIdByTableName(tableName)
            tableStyleMapping.tableStyleMappings.forEach(mapping => {
              featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getTableStyleMappingDao(), featureContentsId.id, parentStyleMapping[parentId].styleMapping[mapping.id], mapping.geometryType)
            })
            tableStyleMapping.tableIconMappings.forEach(mapping => {
              featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getTableIconMappingDao(), featureContentsId.id, parentStyleMapping[parentId].iconMapping[mapping.id], mapping.geometryType)
            })
          }
        }

        for (let featureRowIndex = 0; featureRowIndex < featureRows.length; featureRowIndex++) {
          const featureRow = featureRows[featureRowIndex]
          const values = {}

          // iterate over this row's columns and pull values out to be added to the new row
          columns.getColumns().forEach(column => {
            const columnName = column.getName()
            let value = featureRow.getValueWithColumnName(columnName)
            const name = _.isNil(nameChanges[columnName]) ? columnName : nameChanges[columnName]
            const tableColumn = featureDao.table.getUserColumns().getColumn(name)
            if (_.isNil(value) && tableColumn.isNotNull() && !tableColumn.hasDefaultValue()) {
              value = GeoPackageUtilities.getDefaultValueForDataType(tableColumn.getDataType())
            }
            values[name] = value
          })

          // check for any of our table's columns that require a not null value
          featureColumns.getColumns().forEach(column => {
            const columnName = column.getName()
            if (!_.isNil(values[columnName]) && column.isNotNull() && !column.hasDefaultValue) {
              values[columnName] = GeoPackageUtilities.getDefaultValueForDataType(column.getDataType())
            }
          })

          values.id = id++
          values.geometry = featureRow.geometry

          // create the new row
          const featureId = featureDao.create(featureDao.newRow(columnTypes, values))

          // add style mapping if necessary
          if (!_.isNil(featureTableStyles)) {
            let geometryType = !_.isNil(featureRow.geometry) ? featureRow.geometry.toGeoJSON().type.toUpperCase() : 'GEOMETRY'
            const styleMapping = featureStyleMapping[featureRow.id]
            if (!_.isNil(styleMapping.iconId) && styleMapping.iconId.id > -1) {
              featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getIconMappingDao(), featureId, parentStyleMapping[parentId].iconMapping[styleMapping.iconId.id], GeometryType.fromName(geometryType))
            }
            if (!_.isNil(styleMapping.styleId) && styleMapping.styleId.id > -1) {
              featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), featureId, parentStyleMapping[parentId].styleMapping[styleMapping.styleId.id], GeometryType.fromName(geometryType))
            }
          }

          // add related media rows for feature row
          const mediaToAdd = featureMediaListMap[featureRow.id] || []

          for (let i = 0; i < mediaToAdd.length; i++) {
            const mediaRef = mediaToAdd[i]
            const geopackageFilePath = mediaRef.filePath
            const sourceMediaTable = mediaRef.mediaTable
            const sourceMediaRowId = mediaRef.mediaRowId
            const sourceMediaKey = geopackageFilePath + '_' + sourceMediaTable + '_' + sourceMediaRowId

            // check if media has been previously added for a different feature row
            if (_.isNil(insertedMediaMap[sourceMediaKey])) {
              // get media
              const sourceMediaRow = await GeoPackageUtilities.getMediaRow(geopackageFilePath, sourceMediaTable, sourceMediaRowId)

              // create new media row
              let mediaRow = targetMediaDao.newRow()
              // check if table has required columns, other than id, data and content_type
              const requiredColumns = _.difference(targetMediaDao.table.getRequiredColumns(), ['id', 'data', 'content_type'])
              // iterate over those columns and set them to the default value for that data type, as we do not support
              // additional columns currently in mapcache media attachments
              requiredColumns.forEach(columnName => {
                const type = mediaRow.getRowColumnTypeWithColumnName(columnName)
                mediaRow.setValueWithColumnName(columnName, GeoPackageUtilities.getDefaultValueForDataType(type))
              })

              mediaRow.data = sourceMediaRow.data
              mediaRow.contentType = sourceMediaRow.contentType
              mediaRow.id = targetMediaDao.create(mediaRow)

              // this relates a source's media row to it's new id in the gpkg_media table
              insertedMediaMap[sourceMediaKey] = mediaRow.id
              mediaRow = null
            }
            GeoPackageUtilities._linkFeatureRowToMediaRow(gp, tableName, featureId, mediaTableName, insertedMediaMap[sourceMediaKey])
          }

          status.progress = 30 + (50 * id / featureCount)
          throttleStatusCallback(status)
        }
      }

      await GeoPackageUtilities.wait(500)

      status.message = 'Indexing feature layer for performance...'
      throttleStatusCallback(status)
      // index table
      await this._indexFeatureTable(gp, tableName)

      status.message = 'Feature layer creation completed'
      status.progress = 100.0

      throttleStatusCallback(status)
      await GeoPackageUtilities.wait(500)
    }, true)
  }

  static _linkFeatureRowToMediaRow (gp, baseTableName, baseId, relatedTableName, relatedId) {
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
   * Builds a tile layer
   * @param configuration
   * @param statusCallback
   * @returns {Promise<any>}
   */
  static async buildTileLayer (configuration, statusCallback) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(configuration.path, async (gp) => {
      const status = {
        message: 'Starting...',
        progress: 0.0
      }

      const throttleStatusCallback = _.throttle(statusCallback, 100)

      const tableName = configuration.table

      throttleStatusCallback(status)

      await GeoPackageUtilities.wait(1000)

      let minZoom = configuration.minZoom
      let maxZoom = configuration.maxZoom

      status.message = 'Preparing layers...'

      let { estimatedNumberOfTiles, tileScaling, boundingBox, zoomLevels } = GeoPackageUtilities.estimatedTileCount(configuration.boundingBoxFilter, configuration.sourceLayers, configuration.geopackageLayers, configuration.tileScaling, configuration.minZoom, configuration.maxZoom)

      boundingBox = XYZTileUtilities.trimToWebMercatorMax(boundingBox)

      throttleStatusCallback(status)
      const contentsBounds = new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0])
      const contentsSrsId = 4326
      const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
      const tileMatrixSetSrsId = 3857
      try {
        await gp.createStandardWebMercatorTileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        status.message = 'Failed: Table already exists...'
        throttleStatusCallback(status)
        return
      }

      if (!_.isNil(tileScaling)) {
        const tileScalingExtension = gp.getTileScalingExtension(tableName)
        await tileScalingExtension.getOrCreateExtension()
        tileScalingExtension.createOrUpdate(tileScaling)
      }

      let layersPrepared = 0
      const numberOfLayers = configuration.sourceLayers.length + configuration.geopackageLayers.length
      let layers = []

      for (let i = 0; i < configuration.sourceLayers.length; i++) {
        const sourceLayer = configuration.sourceLayers[i]
        const layer = LayerFactory.constructLayer(sourceLayer)
        layer._maxFeatures = undefined
        layers.push(await layer.initialize(true))
        layersPrepared++
        status.progress = 20.0 * layersPrepared / numberOfLayers
        throttleStatusCallback(status)
      }

      for (let i = 0; i < configuration.geopackageLayers.length; i++) {
        const geopackageLayer = configuration.geopackageLayers[i]
        const geopackage = geopackageLayer.geopackage
        const tableName = geopackageLayer.table
        const type = geopackageLayer.type
        let layer
        if (type === 'feature') {
          layer = LayerFactory.constructLayer({
            id: geopackage.id + '_' + tableName,
            geopackageFilePath: geopackage.path,
            sourceDirectory: geopackage.path,
            sourceLayerName: tableName,
            sourceType: 'GeoPackage',
            layerType: 'Vector'
          })
        } else {
          layer = LayerFactory.constructLayer({id: geopackage.id + '_' + tableName, filePath: geopackage.path, sourceLayerName: tableName, layerType: 'GeoPackage'})
        }
        layer._maxFeatures = undefined
        layers.push(await layer.initialize())
        layersPrepared++
        status.progress = 20.0 * layersPrepared / numberOfLayers
        throttleStatusCallback(status)
      }

      // sort layers into rendering order
      let sortedLayers = []
      for (let i = 0; i < configuration.renderingOrder.length; i++) {
        let layerId = configuration.renderingOrder[i]
        let layerIdx = layers.findIndex(l => l.id === layerId)
        if (layerIdx > -1) {
          sortedLayers.push(layers[layerIdx])
        }
      }

      await GeoPackageUtilities.wait(500)

      // update status to generating tiles
      status.message = 'Generating tiles...'
      throttleStatusCallback(status)
      let tilesAdded = 0
      let timeStart = new Date().getTime()
      await XYZTileUtilities.iterateAllTilesInExtentForZoomLevels(boundingBox, zoomLevels, async ({z, x, y}) => {
        // setup canvas that we will draw each layer into
        let canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        let ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
        let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
        let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])

        const tileBounds = new BoundingBox(tileLowerLeft[0], tileUpperRight[0], tileLowerLeft[1], tileUpperRight[1])
        const tileWidth = tileBounds.maxLongitude - tileBounds.minLongitude
        const tileHeight = tileBounds.maxLatitude - tileBounds.minLatitude

        const getX = lng => {
          return Math.floor(256 / tileWidth * (lng - tileBounds.minLongitude))
        }

        const getY = lat => {
          return Math.floor(256 / tileHeight * (tileBounds.maxLatitude - lat))
        }

        const difference = intersect(tileBounds.toGeoJSON().geometry, contentsBounds.toGeoJSON().geometry)
        if (!_.isNil(difference)) {
          const differenceBbox = bbox(difference)
          const minLon = differenceBbox[0]
          const minLat = differenceBbox[1]
          const maxLon = differenceBbox[2]
          const maxLat = differenceBbox[3]
          const minX = Math.max(0, getX(minLon) - 1)
          const maxX = Math.min(256, getX(maxLon) + 1)
          const minY = Math.max(0, getY(maxLat) - 1)
          const maxY = Math.min(256, getY(minLat) + 1)
          ctx.rect(minX, minY, maxX - minX, maxY - minY)
          ctx.clip()
        }

        for (let i = 0; i < sortedLayers.length; i++) {
          await new Promise((resolve, reject) => {
            let layer = sortedLayers[i]
            const layerAlpha = layer.opacity !== null && layer.opacity !== undefined ? layer.opacity : 1.0
            layer.renderTile({x, y, z}, null, (err, result) => {
              if (err) {
                // eslint-disable-next-line no-console
                console.error(err)
                reject(err)
              } else if (!_.isNil(result)) {
                try {
                  let image
                  // result could be a buffer, a canvas, or a data url (string)
                  if (typeof result === 'string') {
                    image = result
                  } else {
                    image = result.toDataURL()
                  }
                  let img = new Image()
                  img.onload = () => {
                    ctx.globalAlpha = layerAlpha
                    ctx.drawImage(img, 0, 0)
                    ctx.globalAlpha = 1.0
                    resolve()
                  }
                  img.onerror = (error) => {
                    // eslint-disable-next-line no-console
                    console.error(error)
                    resolve()
                  }
                  img.src = image
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error(error)
                  resolve()
                }
              } else {
                resolve()
              }
            })
          })
        }

        // look at merged canvas
        if (!CanvasUtilities.isBlank(canvas)) {
          await new Promise((resolve) => {
            if (CanvasUtilities.hasTransparentPixels(canvas)) {
              canvas.toBlob((blob) => {
                let reader = new FileReader()
                reader.addEventListener('loadend', async function () {
                  try {
                    const buffer = await imagemin.buffer(Buffer.from(reader.result), {
                      plugins: [
                        imageminPngquant({
                          speed: 8,
                          quality: [0.5, 0.8]
                        })
                      ]
                    })
                    gp.addTile(buffer, tableName, z, y, x)
                  } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error(e)
                  }
                  resolve(false)
                })
                reader.readAsArrayBuffer(blob)
              }, 'image/png')
            } else {
              canvas.toBlob((blob) => {
                const reader = new FileReader()
                reader.addEventListener('loadend', function () {
                  gp.addTile(Buffer.from(reader.result), tableName, z, y, x)
                  resolve(false)
                })
                reader.readAsArrayBuffer(blob)
              }, 'image/jpeg', 0.7)
            }
          })
        }
        tilesAdded += 1
        const averageTimePerTile = (new Date().getTime() - timeStart) / tilesAdded
        status.message = 'Tiles processed: ' + tilesAdded + ' of ' + estimatedNumberOfTiles + '\nApprox. time remaining: ' + GeoPackageUtilities.prettyPrintMs(averageTimePerTile * (estimatedNumberOfTiles - tilesAdded))
        status.progress = 20 + 80 * tilesAdded / estimatedNumberOfTiles
        throttleStatusCallback(status)
      })

      status.progress = 100.0

      throttleStatusCallback(status)
      await GeoPackageUtilities.wait(500)
    }, true)
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
    const missing = GeoPackageUtilities.isMissing(geopackage)
    const synchronized = GeoPackageUtilities.isSynchronized(geopackage)
    let invalid = false
    if (!missing) {
      try {
        invalid = !await GeoPackageUtilities.isGeoPackageValid(geopackage.path)
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
    const health = await GeoPackageUtilities.checkGeoPackageHealth(geopackage)
    return !health.missing && !health.invalid && health.synchronized
  }

  /**
   * merges feature columns from several tables to be used in a new table
   * will create new column if data type is different
   * will update column
   * @param mergedColumns
   * @param featureColumns
   */
  static mergeFeatureColumns (mergedColumns, featureColumns) {
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
    if (_.isNil(mergedColumns)) {
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

  static _getFeatureColumns (gp, tableName) {
    return gp.getFeatureDao(tableName).table.getUserColumns()
  }

  /**
   * Gets the feature columns for a table
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getFeatureColumns (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureColumns(gp, tableName)
    })
  }

  /**
   * Projects a geometry to 4326 from the srs provided
   * @param geometry
   * @param srs
   * @returns {wkx.Geometry}
   */
  static projectGeometryTo4326 (geometry, srs) {
    let projectedGeometry = geometry.geometry
    if (geometry && !geometry.empty && geometry.geometry) {
      let geoJsonGeom = geometry.geometry.toGeoJSON()
      geoJsonGeom = reproject.reproject(geoJsonGeom, srs.organization.toUpperCase() + ':' + srs.srs_id, 'EPSG:4326')
      projectedGeometry = wkx.Geometry.parseGeoJSON(geoJsonGeom)
    }
    return projectedGeometry
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

  static getSimplifiedType (dataType) {
    let simplifiedType = 'Number'
    switch (dataType) {
      case GeoPackageDataType.BOOLEAN:
        simplifiedType = 'Boolean'
        break
      case GeoPackageDataType.TEXT:
        simplifiedType = 'Text'
        break
      case GeoPackageDataType.DATE:
        simplifiedType = 'Date'
        break
      case GeoPackageDataType.DATETIME:
        simplifiedType = 'Date & Time'
        break
      default:
        break
    }
    return simplifiedType
  }

  static getSimplifiedTypeIcon (dataType) {
    let simplifiedTypeIcon = 'mdi-pound'
    switch (dataType) {
      case GeoPackageDataType.BOOLEAN:
        simplifiedTypeIcon = 'mdi-toggle-switch'
        break
      case GeoPackageDataType.TEXT:
        simplifiedTypeIcon = 'mdi-format-text'
        break
      case GeoPackageDataType.DATE:
        simplifiedTypeIcon = 'mdi-calendar'
        break
      case GeoPackageDataType.DATETIME:
        simplifiedTypeIcon = 'mdi-calendar-clock'
        break
      default:
        break
    }
    return simplifiedTypeIcon
  }

  /**
   * Gets mapping of featureRows -> respective styles
   * @param gp
   * @param tableName
   * @param checkForTableStyles
   *
   */
  static _getFeatureStyleMapping(gp, tableName, checkForTableStyles = true) {
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    const features = GeoPackageUtilities._getAllFeatureIdsAndGeometryTypes(gp, tableName)
    const featureStyleMapping = {}
    const styleMappingDao = featureTableStyles.getFeatureStyleExtension().getStyleMappingDao(tableName)
    let styleMappings = []
    if (!_.isNil(styleMappingDao)) {
      styleMappings = styleMappingDao.queryForAll().map(record => {
        return {
          featureId: record.base_id,
          id: record.related_id
        }
      })
    }
    const iconMappingDao = featureTableStyles.getFeatureStyleExtension().getIconMappingDao(tableName)
    let iconMappings = []
    if (!_.isNil(iconMappingDao)) {
      iconMappings = iconMappingDao.queryForAll().map(record => {
        return {
          featureId: record.base_id,
          id: record.related_id
        }
      })
    }
    const tableStyleMappingDao = featureTableStyles.getFeatureStyleExtension().getTableStyleMappingDao(tableName)
    let tableStyleMappings = []
    if (!_.isNil(tableStyleMappingDao)) {
      tableStyleMappings = tableStyleMappingDao.queryForAll().map(record => {
        return {
          id: record.related_id,
          geometryType: GeometryType.fromName(record.geometry_type_name)
        }
      })
    }
    const tableIconMappingDao = featureTableStyles.getFeatureStyleExtension().getTableIconMappingDao(tableName)
    let tableIconMappings = []
    if (!_.isNil(tableIconMappingDao)) {
      tableIconMappings = tableIconMappingDao.queryForAll().map(record => {
        return {
          id: record.related_id,
          geometryType: GeometryType.fromName(record.geometry_type_name)
        }
      })
    }
    features.forEach(feature => {
      if (checkForTableStyles) {
        featureStyleMapping[feature.id] = {
          styleId: tableStyleMappings.find(mapping => mapping.geometryType === feature.geometryType),
          iconId: tableIconMappings.find(mapping => mapping.geometryType === feature.geometryType)
        }
      } else {
        featureStyleMapping[feature.id] = {
          styleId: undefined,
          iconId: undefined
        }
      }
      const featureIcon = iconMappings.find(mapping => mapping.featureId === feature.id)
      const featureStyle = styleMappings.find(mapping => mapping.featureId === feature.id)
      if (!_.isNil(featureIcon)) {
        featureStyleMapping[feature.id].iconId = featureIcon
        featureStyleMapping[feature.id].styleId = null
      }
      if (!_.isNil(featureStyle)) {
        featureStyleMapping[feature.id].styleId = featureStyle
        featureStyleMapping[feature.id].iconId = null
      }
    })
    return featureStyleMapping
  }

  /**
   * Gets table styles/icons as list of {id, geometryType}
   * @param gp
   * @param tableName
   */
  static _getTableStyleMappings(gp, tableName) {
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    const tableStyleMappingDao = featureTableStyles.getFeatureStyleExtension().getTableStyleMappingDao(tableName)
    let tableStyleMappings = []
    if (!_.isNil(tableStyleMappingDao)) {
      tableStyleMappings = tableStyleMappingDao.queryForAll().map(record => {
        return {
          id: record.related_id,
          geometryType: GeometryType.fromName(record.geometry_type_name)
        }
      })
    }
    const tableIconMappingDao = featureTableStyles.getFeatureStyleExtension().getTableIconMappingDao(tableName)
    let tableIconMappings = []
    if (!_.isNil(tableIconMappingDao)) {
      tableIconMappings = tableIconMappingDao.queryForAll().map(record => {
        return {
          id: record.related_id,
          geometryType: GeometryType.fromName(record.geometry_type_name)
        }
      })
    }
    return {
      tableIconMappings,
      tableStyleMappings
    }
  }

  /**
   * Check if a feature exists
   * @param gp
   * @param tableName
   * @param featureId
   * @returns {boolean}
   */
  static _featureExists (gp, tableName, featureId) {
    let exists = false
    if (gp.getFeatureTables().indexOf(tableName) !== -1) {
      exists = !_.isNil(gp.getFeatureDao(tableName).queryForId(featureId))
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
  static async featureExists (filePath, tableName, featureId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._featureExists(gp, tableName, featureId)
    })
  }

  static _getMediaObjectUrl (gp, mediaTable, mediaId) {
    const rte = gp.relatedTablesExtension
    const mediaDao = rte.getMediaDao(mediaTable)
    const media = mediaDao.queryForId(mediaId)
    return MediaUtilities.getMediaObjectURL(media)
  }

  static async getMediaObjectUrl (filePath, mediaTable, mediaId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getMediaObjectUrl(gp, mediaTable, mediaId)
    })
  }

  static _getMediaRow (gp, mediaTable, mediaId) {
    const rte = gp.relatedTablesExtension
    const mediaDao = rte.getMediaDao(mediaTable)
    return mediaDao.queryForId(mediaId)
  }

  static async getMediaRow (filePath, mediaTable, mediaId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getMediaRow(gp, mediaTable, mediaId)
    })
  }

  /**
   * Gets the media attachments, not including feature icons
   * @param gp
   * @param tableName
   * @param featureDao
   * @param featureId
   * @returns {Array}
   */
  static _getMediaRelationshipsForFeatureRow (gp, tableName, featureDao, featureId) {
    // get media relations for this feature table
    const mediaRelationships = []
    const rte = gp.relatedTablesExtension
    if (rte.has()) {
      const mediaRelations = featureDao.mediaRelations
      for (let i = 0; i < mediaRelations.length; i++) {
        const mediaRelation = mediaRelations[i]
        if (mediaRelation.mapping_table_name !== IconTable.TABLE_NAME + '_' + tableName) {
          const userMappingDao = rte.getMappingDao(mediaRelation.mapping_table_name)
          // query for all mappings for this feature id
          const mappings = userMappingDao.queryByBaseId(featureId)
          for (let m = 0; m < mappings.length; m++) {
            mediaRelationships.push({
              relatedId: mappings[m].related_id,
              relatedTable: mediaRelation.related_table_name,
              baseTable: tableName,
              baseId: featureId,
              mappingTable: mediaRelation.mapping_table_name
            })
          }
        }
      }
    }
    return mediaRelationships
  }

  /**
   * Gets the media attachments for a feature row
   * @param gp
   * @param tableName
   * @param featureId
   * @returns {Array}
   */
  static _getMediaRelationships (gp, tableName, featureId) {
    const mediaRelationships = []
    try {
      const featureDao = gp.getFeatureDao(tableName)
      if (!_.isNil(featureDao)) {
        const linkedMedia = GeoPackageUtilities._getMediaRelationshipsForFeatureRow(gp, tableName, featureDao, featureId)
        mediaRelationships.push(...linkedMedia)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    return mediaRelationships
  }

  /**
   * Gets the media attachments for a feature row
   * @param filePath
   * @param tableName
   * @param featureId
   * @returns {Promise<any>}
   */
  static async getMediaRelationships (filePath, tableName, featureId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getMediaRelationships(gp, tableName, featureId)
    })
  }

  /**
   * Adds a media attachment
   * @param gp
   * @param tableName
   * @param featureId
   * @param attachmentFile
   * @returns {Promise<boolean>}
   */
  static async _addMediaAttachment (gp, tableName, featureId, attachmentFile) {
    let success = false
    try {
      const featureDao = gp.getFeatureDao(tableName)
      const featureRow = featureDao.queryForId(featureId)
      if (!_.isNil(featureRow)) {
        const buffer = await jetpack.readAsync(attachmentFile, 'buffer')
        const mediaTableName = MediaUtilities.getMediaTableName()
        const rte = gp.relatedTablesExtension
        if (!gp.connection.isTableExists(mediaTableName)) {
          const mediaTable = MediaTable.create(mediaTableName)
          rte.createRelatedTable(mediaTable)
        }
        const mediaDao = rte.getMediaDao(mediaTableName)
        let contentType = MediaUtilities.getMimeType(attachmentFile)
        if (contentType === false) {
          contentType = 'application/octet-stream'
        }

        const mediaRow = mediaDao.newRow()

        // check if table has required columns, other than id, data and content_type
        const requiredColumns = _.difference(mediaDao.table.getRequiredColumns(), ['id', 'data', 'content_type'])
        // iterate over those columns and set them to the default value for that data type, as we do not support
        // additional columns currently in mapcache media attachments
        requiredColumns.forEach(columnName => {
          const type = mediaRow.getRowColumnTypeWithColumnName(columnName)
          mediaRow.setValueWithColumnName(columnName, GeoPackageUtilities.getDefaultValueForDataType(type))
        })

        mediaRow.data = buffer
        mediaRow.contentType = contentType
        mediaRow.id = mediaDao.create(mediaRow)
        featureDao.linkMediaRow(featureRow, mediaRow)
        success = true
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    return success
  }

  /**
   * Adds a media attachment
   * @param filePath
   * @param tableName
   * @param featureId
   * @param attachmentFile
   * @returns {Promise<any>}
   */
  static async addMediaAttachment (filePath, tableName, featureId, attachmentFile) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._addMediaAttachment(gp, tableName, featureId, attachmentFile)
    }, true)
  }

  /**
   * Gets the count of media attachments
   * @param gp
   * @param tableName
   */
  static _getMediaAttachmentsCounts (gp, tableName) {
    let counts = {}
    try {
      const featureDao = gp.getFeatureDao(tableName)
      if (!_.isNil(featureDao)) {
        const rte = gp.relatedTablesExtension
        if (rte.has()) {
          const mediaRelations = featureDao.mediaRelations
          for (let i = 0; i < mediaRelations.length; i++) {
            const mediaRelation = mediaRelations[i]
            if (mediaRelation.mapping_table_name !== IconTable.TABLE_NAME + '_' + tableName) {
              const userMappingDao = rte.getMappingDao(mediaRelation.mapping_table_name)
              const mappings = userMappingDao.queryForAll()
              mappings.forEach(mapping => {
                if (_.isNil(counts[mapping.base_id])) {
                  counts[mapping.base_id] = 0
                }
                counts[mapping.base_id] = counts[mapping.base_id] + 1
              })
            }
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    return counts
  }

  /**
   * Gets the count of media attachments
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async getMediaAttachmentsCounts (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getMediaAttachmentsCounts(gp, tableName)
    })
  }

  /**
   * Deletes a media relationship and if no relationships to the media remain, deletes the media
   * @param gp
   * @param mediaRelationship
   */
  static _deleteMediaAttachment (gp, mediaRelationship) {
    const {baseId, relatedTable, relatedId, mappingTable} = mediaRelationship
    const rte = gp.relatedTablesExtension
    // delete relationship
    let mappingDao = rte.getMappingDao(mappingTable)
    mappingDao.deleteWhere('base_id = ? and related_id = ?', [baseId, relatedId])

    // see if our related media is mapped anywhere else
    let hasOtherRelationships = false
    const mediaRelatedTableRelations = rte.extendedRelationDao.getRelatedTableRelations(relatedTable)
    for (let i = 0; i < mediaRelatedTableRelations.length; i++) {
      const mediaRelation = mediaRelatedTableRelations[i]
      mappingDao = rte.getMappingDao(mediaRelation.mapping_table_name)
      if (mappingDao.queryByRelatedId(relatedId).length > 0) {
        hasOtherRelationships = true
        break
      }
    }
    // delete media if no relationships remain
    if (!hasOtherRelationships) {
      const mediaDao = rte.getMediaDao(relatedTable)
      mediaDao.deleteById(relatedId)
    }
  }

  /**
   * Deletes a media relationship and if no relationships to the media remain, deletes the media
   * @param filePath
   * @param mediaRelationship
   * @returns {Promise<any>}
   */
  static deleteMediaAttachment(filePath, mediaRelationship) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteMediaAttachment(gp, mediaRelationship)
    })
  }
}
