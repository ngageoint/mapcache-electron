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
  GeoPackageValidate
} from '@ngageoint/geopackage'
import _ from 'lodash'
import reproject from 'reproject'
import path from 'path'
import fs from 'fs'
import geojsonExtent from '@mapbox/geojson-extent'
import VectorStyleUtilities from './VectorStyleUtilities'
import XYZTileUtilities from './XYZTileUtilities'
import TileBoundingBoxUtils from './tile/tileBoundingBoxUtils'
import UniqueIDUtilities from './UniqueIDUtilities'
import jetpack from 'fs-jetpack'
import FileUtilities from './FileUtilities'
import wkx from 'wkx'
import LayerFactory from './source/layer/LayerFactory'
import CanvasUtilities from './CanvasUtilities'
import imagemin from 'imagemin'
import imageminPngquant from 'imagemin-pngquant'
import proj4 from 'proj4'
import { intersect, bbox } from '@turf/turf'

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
    const gp = await GeoPackageAPI.open(filePath)
    if (!_.isNil(gp)) {
      try {
        if (isFuncAsync) {
          result = await func(gp)
        } else {
          result = func(gp)
        }
      } catch (error) {
        result = {error: error}
        console.log(error)
      }
      try {
        await gp.close()
      } catch (e) {
        result = {error: e}
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
   * Creates geopackage table styles using the style object passed in
   * @param featureTableStyles
   * @param style
   */
  static createGeoPackageTableStyles (featureTableStyles, style) {
    let polyStyle = style.styleRowMap[style.default.styles[GeometryType.nameFromType(GeometryType.POLYGON)]]
    let polygonStyleRow = featureTableStyles.getStyleDao().newRow()
    polygonStyleRow.setColor(polyStyle.color, polyStyle.opacity)
    polygonStyleRow.setFillColor(polyStyle.fillColor, polyStyle.fillOpacity)
    polygonStyleRow.setWidth(polyStyle.width)
    polygonStyleRow.setName(polyStyle.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(polygonStyleRow)

    let lineStyle = style.styleRowMap[style.default.styles[GeometryType.nameFromType(GeometryType.LINESTRING)]]
    let lineStringStyleRow = featureTableStyles.getStyleDao().newRow()
    lineStringStyleRow.setColor(lineStyle.color, lineStyle.opacity)
    lineStringStyleRow.setWidth(lineStyle.width)
    lineStringStyleRow.setName(lineStyle.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(lineStringStyleRow)

    let pointStyle = style.styleRowMap[style.default.styles[GeometryType.nameFromType(GeometryType.POINT)]]
    let pointStyleRow = featureTableStyles.getStyleDao().newRow()
    pointStyleRow.setColor(pointStyle.color, pointStyle.opacity)
    pointStyleRow.setWidth(pointStyle.width)
    pointStyleRow.setName(pointStyle.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(pointStyleRow)

    featureTableStyles.setTableStyle(GeometryType.POLYGON, polygonStyleRow)
    featureTableStyles.setTableStyle(GeometryType.LINESTRING, lineStringStyleRow)
    featureTableStyles.setTableStyle(GeometryType.POINT, pointStyleRow)
    featureTableStyles.setTableStyle(GeometryType.MULTIPOLYGON, polygonStyleRow)
    featureTableStyles.setTableStyle(GeometryType.MULTILINESTRING, lineStringStyleRow)
    featureTableStyles.setTableStyle(GeometryType.MULTIPOINT, pointStyleRow)
  }

  /**
   * Creates geopackage table icons using the style passed in
   * @param featureTableStyles
   * @param style
   */
  static createGeoPackageTableIcons (featureTableStyles, style) {
    if (style.default.iconOrStyle[GeometryType.nameFromType(GeometryType.POINT)] === 'icon') {
      let pointIcon = style.iconRowMap[style.default.icons[GeometryType.nameFromType(GeometryType.POINT)]]
      let pointIconRow = featureTableStyles.getIconDao().newRow()
      pointIconRow.data = Buffer.from(pointIcon.url.split(',')[1], 'base64')
      pointIconRow.contentType = pointIcon.url.substring(pointIcon.url.indexOf(':') + 1, pointIcon.url.indexOf(';'))
      pointIconRow.width = pointIcon.width
      pointIconRow.height = pointIcon.height
      pointIconRow.anchorU = pointIcon.anchor_u
      pointIconRow.anchorV = pointIcon.anchor_v
      pointIconRow.name = pointIcon.name
      featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(pointIconRow)
      featureTableStyles.setTableIcon(GeometryType.POINT, pointIconRow)
      featureTableStyles.setTableIcon(GeometryType.MULTIPOINT, pointIconRow)
    }
  }

  /**
   * Gets or Creates a geopackage at the filePath
   * @param filePath
   * @returns {Promise<GeoPackage>}
   */
  static async getOrCreateGeoPackage (filePath) {
    let gp
    if (!fs.existsSync(filePath)) {
      gp = await GeoPackageAPI.create(filePath)
    } else {
      gp = await GeoPackageAPI.open(filePath)
    }
    return gp
  }

  /**
   * Adds a feature to a feature table and updates the extent listed in the contents, if necessary
   * @param gp
   * @param tableName
   * @param feature
   * @param updateBoundingBox
   */
  static _addFeatureToFeatureTable (gp, tableName, feature, updateBoundingBox = true) {
    if (feature.properties) {
      feature.properties.id = undefined
      _.keys(feature.properties).forEach(key => {
        if (_.isObject(feature.properties[key])) {
          delete feature.properties[key]
        }
      })
    }
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
   * @returns {Promise<void>}
   */
  static async _createFeatureTable (gp, tableName, featureCollection, addFeatures = false) {
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

    let layerColumns = GeoPackageUtilities.getLayerColumns(featureCollection)
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
    let extent = geojsonExtent(featureCollection)
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
    const gp = await GeoPackageAPI.open(filePath)
    return GeoPackageValidate.hasMinimumTables(gp)
  }

  /**
   * Gets geopackage information required by the app to ensure functionality in all vue components
   * @param filePath
   * @returns {Promise<{path: *, tables: {features: {}, tiles: {}}, size: *, name: string, id: *}>}
   */
  static async getOrCreateGeoPackageForApp (filePath) {
    let gp
    if (!fs.existsSync(filePath)) {
      gp = await GeoPackageAPI.create(filePath)
    } else {
      gp = await GeoPackageAPI.open(filePath)
    }
    const filename = path.basename(filePath)
    const geopackage = {
      id: UniqueIDUtilities.createUniqueID(),
      size: FileUtilities.toHumanReadable(jetpack.inspect(filePath, {times: true, absolutePath: true}).size),
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
    } catch (error) {
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
   * @returns {Promise<void>}
   */
  static async buildGeoPackage (fileName, tableName, featureCollection, style) {
    // create the geopackage
    let gp = await GeoPackageAPI.create(fileName)
    try {
      // setup the columns for the feature table
      await this._createFeatureTable(gp, tableName, featureCollection)

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
        GeoPackageUtilities.createGeoPackageTableStyles(featureTableStyles, style)
        GeoPackageUtilities.createGeoPackageTableIcons(featureTableStyles, style)
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
          if (style.features[feature.id].iconOrStyle === 'icon') {
            let iconId = style.features[feature.id].icon
            let featureIconRow = icons[iconId]
            if (_.isNil(featureIconRow)) {
              let featureIcon = style.iconRowMap[iconId]
              featureIconRow = featureTableStyles.getIconDao().newRow()
              featureIconRow.data = Buffer.from(featureIcon.url.split(',')[1], 'base64')
              featureIconRow.contentType = featureIcon.url.substring(featureIcon.url.indexOf(':') + 1, featureIcon.url.indexOf(';'))
              featureIconRow.width = featureIcon.width
              featureIconRow.height = featureIcon.height
              featureIconRow.anchorU = featureIcon.anchor_u
              featureIconRow.anchorV = featureIcon.anchor_v
              featureIconRow.name = featureIcon.name
              let featureIconRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(featureIconRow)
              delete style.iconRowMap[iconId]
              style.iconRowMap[featureIconRowId] = featureIcon
              iconIdToIconRowId[iconId] = featureIconRowId
              icons[iconId] = featureIconRow
            }
            style.features[feature.id].icon = iconIdToIconRowId[iconId]
            featureTableStyles.setIcon(featureRowId, geometryType, featureIconRow)
          } else {
            let styleId = style.features[feature.id].style
            let featureStyleRow = styles[styleId]
            if (_.isNil(featureStyleRow)) {
              let featureStyle = style.styleRowMap[styleId]
              featureStyleRow = featureTableStyles.getStyleDao().newRow()
              featureStyleRow.setColor(featureStyle.color, featureStyle.opacity)
              featureStyleRow.setWidth(featureStyle.width)
              featureStyleRow.setName(featureStyle.name)
              if (geometryType === GeometryType.POLYGON || geometryType === GeometryType.MULTIPOLYGON) {
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
      console.error(error)
    }
    try {
      gp.close()
    } catch (error) {
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
   * Copies a geopackage's feature tables and associated style extension
   * @param filePath
   * @param geopackageCopyFileName
   * @param tableName
   * @returns {Promise<void>}
   */
  static async copyGeoPackageFeatureLayerAndStyles (filePath, geopackageCopyFileName, tableName) {
    let geoPackage = await GeoPackageAPI.open(filePath)
    let geoPackageCopy
    try {
      let featureDao = geoPackage.getFeatureDao(tableName)
      let featureTableStyles = new FeatureTableStyles(geoPackage, tableName)
      geoPackageCopy = await GeoPackageAPI.create(geopackageCopyFileName)

      let defaultStyle = VectorStyleUtilities.defaultRandomColorStyle()

      // setup the columns for the feature table
      let layerColumns = GeoPackageUtilities.getLayerColumnsFromGeoPackage(featureDao)
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
      let extent = GeoPackageUtilities.getGeoPackageExtent(geoPackage, tableName)
      let bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])
      geoPackageCopy.createFeatureTable(tableName, geometryColumns, columns, bb, 4326)
      let featureTableStylesCopy = new FeatureTableStyles(geoPackageCopy, tableName)
      featureTableStylesCopy.getFeatureStyleExtension().getOrCreateExtension(tableName)
      featureTableStylesCopy.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
      featureTableStylesCopy.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
      featureTableStylesCopy.createTableStyleRelationship()
      featureTableStylesCopy.createTableIconRelationship()
      featureTableStylesCopy.createStyleRelationship()
      featureTableStylesCopy.createIconRelationship()

      if (featureTableStyles.getStyleDao() === null) {
        GeoPackageUtilities.createGeoPackageTableStyles(featureTableStylesCopy, defaultStyle)
      } else {
        const styleIds = featureTableStyles.getAllStyleIds()
        const tableStyleIds = featureTableStyles.getAllTableStyleIds()
        featureTableStyles.getStyleDao().queryForAll().map(r => featureTableStyles.getStyleDao().createObject(r)).forEach(result => {
          if (styleIds.findIndex(sId => sId === result.id) !== -1 || tableStyleIds.findIndex(sId => sId === result.id) !== -1) {
            featureTableStylesCopy.getStyleDao().create(result)
          }
        })
      }

      if (featureTableStyles.getIconDao() === null) {
        GeoPackageUtilities.createGeoPackageTableIcons(featureTableStylesCopy, defaultStyle)
      } else {
        const iconIds = featureTableStyles.getAllIconIds()
        const tableIconIds = featureTableStyles.getAllTableIconIds()
        featureTableStyles.getIconDao().queryForAll().map(r => featureTableStyles.getIconDao().createObject(r)).forEach(result => {
          if (iconIds.findIndex(iId => iId === result.id) !== -1 || tableIconIds.findIndex(iId => iId === result.id) !== -1) {
            featureTableStylesCopy.getIconDao().create(result)
          }
        })
      }

      if (featureTableStyles.hasTableStyleRelationship() || featureTableStyles.hasTableIconRelationship()) {
        featureTableStylesCopy.setTableFeatureStyles(featureTableStyles.getTableFeatureStyles())
      }

      // create feature table and copy all rows into that table as well as copying any feature styles/icons
      let featureDaoCopy = geoPackageCopy.getFeatureDao(tableName)
      let each = featureDao.queryForEach()
      for (let row of each) {
        if (!_.isNil(row)) {
          let featureRow = featureDao.getRow(row)
          let featureRowId = featureDaoCopy.create(featureRow)
          let featureRowStyles = featureTableStyles.getFeatureStyles(featureRow.id)
          featureTableStylesCopy.setFeatureStyles(featureRowId, featureRowStyles)
        }
      }
      await GeoPackageUtilities.indexFeatureTable(geoPackageCopy, tableName)
    } catch (error) {
      console.error(error)
    }
    try {
      geoPackage.close()
    } catch (error) {
      console.error(error)
    }
    if (!_.isNil(geoPackageCopy)) {
      try {
        geoPackageCopy.close()
      } catch (error) {
        console.error(error)
      }
    }
  }

  /**
   * Applies source to target id mapping to source FeatureStyles (table or feature row)
   * @param featureStyles { FeatureStyles }
   * @param styleSourceToTargetIdMap
   * @param iconSourceToTargetIdMap
   * @returns { FeatureStyles } updated feature styles
   */
  static mapSourceToTargetIdForFeatureStyles (featureStyles, styleSourceToTargetIdMap, iconSourceToTargetIdMap) {
    if (featureStyles) {
      const styles = featureStyles.styles
      if (styles) {
        if (styles.defaultStyle) {
          styles.defaultStyle.id = styleSourceToTargetIdMap[styles.defaultStyle.id]
        }
        for (let sIdx in styles.styles) {
          styles.styles[sIdx].id = styleSourceToTargetIdMap[styles.styles[sIdx].id]
          styles.styles[sIdx].values.id = styleSourceToTargetIdMap[styles.styles[sIdx].values.id]
        }
      }
      const icons = featureStyles.icons
      if (icons) {
        if (icons.defaultIcon) {
          icons.defaultIcon.id = iconSourceToTargetIdMap[icons.defaultIcon.id]
        }
        for (let iIdx in icons.icons) {
          icons.icons[iIdx].id = iconSourceToTargetIdMap[icons.icons[iIdx].id]
          icons.icons[iIdx].values.id = iconSourceToTargetIdMap[icons.icons[iIdx].values.id]
        }
      }
    }
    return featureStyles
  }

  /**
   * This function copies features and styles from a source table in a geopackage to a target table in another geopackage...
   * Some things this function takes care of is style/icon rows with the same ID as well as matching table names
   * @param geoPackageSource
   * @param geoPackageTarget
   * @param sourceFeatureTableName
   * @param targetFeatureTableName
   * @param targetFeatureTableBounds
   * @returns {Promise<number>}
   */
  static async copyGeoPackageFeaturesAndStylesForBoundingBox (geoPackageSource, geoPackageTarget, sourceFeatureTableName, targetFeatureTableName, targetFeatureTableBounds) {
    let featuresAdded = 0
    let featureDao = geoPackageSource.getFeatureDao(sourceFeatureTableName)
    let featureTableStyles = new FeatureTableStyles(geoPackageSource, sourceFeatureTableName)
    let bb = new BoundingBox(targetFeatureTableBounds[0][1], targetFeatureTableBounds[1][1], targetFeatureTableBounds[0][0], targetFeatureTableBounds[1][0])

    // code to prevent duplicate table names in target GeoPackage
    let tableNames = geoPackageTarget.getFeatureTables()
    let existingTableCount = 1
    let targetTableName = targetFeatureTableName
    while (tableNames.findIndex(tableName => tableName === targetTableName) !== -1) {
      targetTableName = targetFeatureTableName + '_' + existingTableCount
      existingTableCount++
    }
    // setup the columns for the target feature table
    let layerColumns = GeoPackageUtilities.getLayerColumnsFromGeoPackage(featureDao)
    let geometryColumns = new GeometryColumns()
    geometryColumns.table_name = targetTableName
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

    // setup feature style extension for the target feature table
    geoPackageTarget.createFeatureTable(targetTableName, geometryColumns, columns, bb, 4326)
    let featureTableStylesTarget = new FeatureTableStyles(geoPackageTarget, targetTableName)
    featureTableStylesTarget.getFeatureStyleExtension().getOrCreateExtension(targetTableName)
    featureTableStylesTarget.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
    featureTableStylesTarget.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
    featureTableStylesTarget.getFeatureStyleExtension().getContentsId().getOrCreateExtension()

    // create style and icon relationships for the target feature table
    featureTableStylesTarget.createTableStyleRelationship()
    featureTableStylesTarget.createTableIconRelationship()
    featureTableStylesTarget.createStyleRelationship()
    featureTableStylesTarget.createIconRelationship()

    let styleSourceToTargetIdMap = {}
    let iconSourceToTargetIdMap = {}

    // copy all styles, icons and relationships
    featureTableStyles.getStyleDao().queryForAll().forEach(result => {
      const sourceId = result.id
      delete result.id
      styleSourceToTargetIdMap[sourceId] = featureTableStylesTarget.getStyleDao().create(result)
    })
    featureTableStyles.getIconDao().queryForAll().forEach(result => {
      const sourceId = result.id
      delete result.id
      iconSourceToTargetIdMap[sourceId] = featureTableStylesTarget.getIconDao().create(result)
    })
    const mappedTableFeatureStyles = GeoPackageUtilities.mapSourceToTargetIdForFeatureStyles(featureTableStyles.getTableFeatureStyles(), styleSourceToTargetIdMap, iconSourceToTargetIdMap)
    featureTableStylesTarget.setTableFeatureStyles(mappedTableFeatureStyles)
    // create feature table and copy all rows into that table as well as copying any feature styles/icons
    let featureDaoTarget = geoPackageTarget.getFeatureDao(targetTableName)
    let iterator = featureDao.fastQueryBoundingBox(bb, 'EPSG:4326')
    for (const row of iterator) {
      if (!_.isNil(row)) {
        // const sourceFeatureRowId = row.values.id
        let featureRowId = featureDaoTarget.create(row)
        let mappedFeatureRowStyles = GeoPackageUtilities.mapSourceToTargetIdForFeatureStyles(featureTableStyles.getFeatureStyles(row.id), styleSourceToTargetIdMap, iconSourceToTargetIdMap)
        featureTableStylesTarget.setFeatureStyles(featureRowId, mappedFeatureRowStyles)
        featuresAdded++
      }
    }
    return featuresAdded
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
   * Gets the columns for a table represented by the featureDao passed in
   * @param featureDao
   * @returns {{columns: Array}}
   */
  static getLayerColumnsFromGeoPackage (featureDao) {
    let columns = {
      columns: []
    }
    let geomColumn = featureDao.getFeatureTable().geometryColumn
    columns.geom = {
      name: geomColumn.name
    }
    let idColumn = featureDao.getFeatureTable().idColumn
    columns.id = {
      name: idColumn.name,
      dataType: GeoPackageDataType.nameFromType(idColumn.dataType)
    }
    for (const column of featureDao.getFeatureTable().columns) {
      if (column.name !== columns.id.name && column.name !== columns.geom.name) {
        let c = {
          dataType: GeoPackageDataType.nameFromType(column.dataType),
          name: column.name,
          max: column.max,
          notNull: column.notNull,
          defaultValue: column.defaultValue
        }
        columns.columns.push(c)
      }
    }
    return columns
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
    styleDao.queryForAll().forEach((result) => {
      let styleRow = styleDao.createObject(result)
      styleRows[styleRow.id] = styleRow
    })
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
    iconDao.queryForAll().forEach((result) => {
      let iconRow = iconDao.createObject(result)
      iconRows[iconRow.id] = iconRow
    })
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
   */
  static _createStyleRow (gp, tableName) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let styleDao = featureTableStyles.getStyleDao()
    let styleRow = styleDao.newRow()
    let style = VectorStyleUtilities.randomStyle()
    styleRow.setColor(style.color, style.opacity)
    styleRow.setFillColor(style.fillColor, style.fillOpacity)
    styleRow.setWidth(style.width)
    styleRow.setName(style.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
  }

  /**
   * Creates a style row
   * @param filePath
   * @param tableName
   * @returns {Promise<any>}
   */
  static async createStyleRow (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createStyleRow(gp, tableName)
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
    iconRow.data = Buffer.from(icon.url.split(',')[1], 'base64')
    iconRow.contentType = 'image/png'
    iconRow.width = icon.width
    iconRow.height = icon.height
    iconRow.anchorU = icon.anchor_u
    iconRow.anchorV = icon.anchor_v
    iconRow.name = 'New Icon'
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
    const geometryType = GeometryType.fromName(feature.geometryType)
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
    const geometryType = GeometryType.fromName(feature.geometryType)
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
      extent = geojsonExtent(feature)
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
    const extent = geojsonExtent(featureCollection)
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

  /**
   * Gets a bounding box to perform a query using a coordinate and zoom
   * @param coordinate
   * @param zoom
   * @returns {BoundingBox}
   */
  static getQueryBoundingBoxForCoordinateAndZoom (coordinate, zoom) {
    const queryDistanceDegrees = 10.0 / Math.pow(2, zoom)
    return new BoundingBox(coordinate.lng - queryDistanceDegrees, coordinate.lng + queryDistanceDegrees, coordinate.lat - queryDistanceDegrees, coordinate.lat + queryDistanceDegrees)
  }

  /**
   * Qeuries for features at a coordinate with a buffer based on zoom level
   * @param gp
   * @param geopackageId
   * @param geopackageName
   * @param tableName
   * @param coordinate
   * @param zoom
   * @returns {Object}
   */
  static _queryForFeaturesAt (gp, geopackageId, geopackageName, tableName, coordinate, zoom) {
    let features
    if (gp.getFeatureDao(tableName).isIndexed()) {
      features = gp.queryForGeoJSONFeaturesInTable(tableName, GeoPackageUtilities.getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom)).filter(feature => !_.isNil(feature))
    }
    return features
  }

  /**
   * Queries for features at a coordinate with a buffer based on zoom level
   * @param filePath
   * @param geopackageId
   * @param geopackageName
   * @param tableName
   * @param coordinate
   * @param zoom
   * @returns {Promise<any>}
   */
  static async queryForFeaturesAt (filePath, geopackageId, geopackageName, tableName, coordinate, zoom) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._queryForFeaturesAt(gp, geopackageId, geopackageName, tableName, coordinate, zoom)
    })
  }

  /**
   * Gets the count for the features near a coordinate based on zoom
   * @param gp
   * @param geopackageId
   * @param geopackageName
   * @param tableNames
   * @param coordinate
   * @param zoom
   * @returns {number}
   */
  static _countOfFeaturesAt (gp, geopackageId, geopackageName, tableNames, coordinate, zoom) {
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
   * @param geopackageId
   * @param geopackageName
   * @param tableNames
   * @param coordinate
   * @param zoom
   * @returns {Promise<any>}
   */
  static async countOfFeaturesAt (filePath, geopackageId, geopackageName, tableNames, coordinate, zoom) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._countOfFeaturesAt(gp, geopackageId, geopackageName, tableNames, coordinate, zoom)
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
   * TODO: support related tables
   * TODO: bounding box does not cut, instead it just includes any intersecting features
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
        sourceFeatureMap[sourceIdx] = await GeoPackageUtilities.getAllFeatureRowsIn4326(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName, 4326, boundingBoxFilter)
        sourceColumnMap[sourceIdx] = await GeoPackageUtilities.getFeatureColumns(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName)
        const result = GeoPackageUtilities.mergeFeatureColumns(featureColumns, await GeoPackageUtilities.getFeatureColumns(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName))
        featureColumns = result.mergedColumns
        sourceNameChanges[sourceIdx] = result.nameChanges
        sourceIdx++
        layersRetrieved++
        status.progress = 25.0 * (layersRetrieved / numberLayersToRetrieve)
        throttleStatusCallback(status)
      }

      // copy data from geopackage feature layers
      for (let i = 0; i < configuration.geopackageLayers.length; i++) {
        const geopackageLayer = configuration.geopackageLayers[i]
        sourceFeatureMap[sourceIdx] = await GeoPackageUtilities.getAllFeatureRowsIn4326(geopackageLayer.geopackage.path, geopackageLayer.table, 4326, boundingBoxFilter)
        sourceColumnMap[sourceIdx] = await GeoPackageUtilities.getFeatureColumns(geopackageLayer.geopackage.path, geopackageLayer.table)
        const result = GeoPackageUtilities.mergeFeatureColumns(featureColumns, await GeoPackageUtilities.getFeatureColumns(geopackageLayer.geopackage.path, geopackageLayer.table))
        featureColumns = result.mergedColumns
        sourceNameChanges[sourceIdx] = result.nameChanges
        sourceIdx++
        layersRetrieved++
        status.progress = 25.0 * (layersRetrieved / numberLayersToRetrieve)
        throttleStatusCallback(status)
      }

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
      let extent = geojsonExtent(featureCollection)
      let bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])

      status.progress = 30.0

      await GeoPackageUtilities.wait(500)

      status.message = 'Adding features to GeoPackage layer...'
      throttleStatusCallback(status)
      await GeoPackageUtilities.wait(500)
      gp.createFeatureTable(tableName, geometryColumns, columns, bb, 4326)
      const featureDao = gp.getFeatureDao(tableName)

      const columnTypes = {}
      for (let i = 0; i < featureDao.table.getColumnCount(); i++) {
        const column = featureDao.table.getColumnWithIndex(i)
        columnTypes[column.name] = column.dataType
      }

      let id = 0
      _.keys(sourceFeatureMap).forEach(sourceIdx => {
        const featureRows = sourceFeatureMap[sourceIdx]
        const columns = sourceColumnMap[sourceIdx]
        const nameChanges = sourceNameChanges[sourceIdx]
        featureRows.forEach(featureRow => {
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
          featureDao.create(featureDao.newRow(columnTypes, values))

          status.progress = 30 + (50 * id / featureCount)
          throttleStatusCallback(status)
        })
      })

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

      const { estimatedNumberOfTiles, tileScaling, boundingBox, zoomLevels } = GeoPackageUtilities.estimatedTileCount(configuration.boundingBoxFilter, configuration.sourceLayers, configuration.geopackageLayers, configuration.tileScaling, configuration.minZoom, configuration.maxZoom)

      throttleStatusCallback(status)
      const contentsBounds = new BoundingBox(configuration.boundingBoxFilter[0], configuration.boundingBoxFilter[2], configuration.boundingBoxFilter[1], configuration.boundingBoxFilter[3])
      const contentsSrsId = 4326
      const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
      const tileMatrixSetSrsId = 3857
      await gp.createStandardWebMercatorTileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)

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
        layers.push(await layer.initialize())
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
          console.log(geopackage.path)
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
        let layer = configuration.renderingOrder[i]
        let layerIdx = layers.findIndex(l => l.id === layer.id)
        if (layerIdx > -1) {
          sortedLayers.push(layers[layerIdx])
        }
      }

      await GeoPackageUtilities.wait(500)

      // update status to generating tiles
      status.message = 'Generating tiles...'
      throttleStatusCallback(status)
      let tilesAdded = 0
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
            layer.renderTile({x, y, z}, null, (err, result) => {
              if (err) {
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
                    ctx.drawImage(img, 0, 0)
                    resolve()
                  }
                  img.onerror = (error) => {
                    console.log(error)
                    resolve()
                  }
                  img.src = image
                } catch (error) {
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
                  const buffer = await imagemin.buffer(Buffer.from(reader.result), {
                    plugins: [
                      imageminPngquant({
                        speed: 8,
                        quality: [0.5, 0.8]
                      })
                    ]
                  })
                  gp.addTile(buffer, tableName, z, y, x)
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
      case GeoPackageDataType.DATETIME:
        simplifiedType = 'Date'
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
      case GeoPackageDataType.DATETIME:
        simplifiedTypeIcon = 'mdi-calendar'
        break
      default:
        break
    }
    return simplifiedTypeIcon
  }
}
