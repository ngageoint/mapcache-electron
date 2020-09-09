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
  FeatureStyleExtension
} from '@ngageoint/geopackage'
import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import geojsonExtent from '@mapbox/geojson-extent'
import VectorStyleUtilities from './VectorStyleUtilities'
import XYZTileUtilities from './XYZTileUtilities'
import TileBoundingBoxUtils from './tile/tileBoundingBoxUtils'
import UniqueIDUtilities from './UniqueIDUtilities'
import jetpack from 'fs-jetpack'
import FileUtilities from './FileUtilities'

export default class GeoPackageUtilities {
  /**
   * Runs a function against a geopackage on the file system. This will safely open the geopackage, execute the function and then close the geopackage.
   * @param filePath
   * @param func
   * @returns {Promise<any>}
   */
  static async performSafeGeoPackageOperation (filePath, func) {
    let result
    const gp = await GeoPackageAPI.open(filePath)
    if (!_.isNil(gp)) {
      try {
        result = func(gp)
      } catch (error) {
        console.log(error)
      }
      try {
        await gp.close()
      } catch (e) {
        console.error(e)
      }
    }
    return result
  }

  static _addStyleExtensionAndDefaultStylesForTable (gp, tableName) {
    const style = VectorStyleUtilities.defaultRandomColorStyle()
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
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

  static async addStyleExtensionAndDefaultStylesForTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._addStyleExtensionAndDefaultStylesForTable(gp, tableName)
    })
  }

  static _removeStyleExtensionForTable (gp, tableName) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.setTableFeatureStyles(null)
    featureTableStyles.deleteRelationships()
    if (featureTableStyles.getFeatureStyleExtension().getExtension(FeatureStyleExtension.EXTENSION_NAME, null, null).length === 0) {
      featureTableStyles.getFeatureStyleExtension().removeExtension()
    }
  }

  static async removeStyleExtensionForTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._removeStyleExtensionForTable(gp, tableName)
    })
  }

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
      name: filename.substring(0, filename.indexOf(path.extname(filename))),
      path: filePath,
      expanded: true,
      layersVisible: false,
      tables: {
        features: {},
        tiles: {},
        attributes: {}
      }
    }

    const tables = gp.getTables()
    tables.features.forEach(table => {
      const featureDao = gp.getFeatureDao(table)
      const description = gp.getTableContents(table).description
      geopackage.tables.features[table] = {
        tableVisible: false,
        expanded: false,
        featureCount: featureDao.count(),
        description: _.isNil(description) || description.length === 0 ? 'None' : description
      }
    })
    tables.tiles.forEach(table => {
      const tileDao = gp.getTileDao(table)
      const count = tileDao.count()
      geopackage.tables.tiles[table] = {
        tableVisible: false,
        expanded: false,
        tileCount: count,
        minZoom: tileDao.minZoom,
        maxZoom: tileDao.maxZoom,
        description: 'An image layer with ' + count + ' tiles'
      }
    })
    tables.attributes.forEach(table => {
      geopackage.tables.attributes[table] = {
        tableVisible: false,
        expanded: false
      }
    })

    try {
      gp.close()
    } catch (error) {
      console.error(error)
    }

    return geopackage
  }

  static _getTileTables (gp) {
    return gp.getTileTables()
  }

  static async getTileTables (filePath) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTileTables(gp)
    })
  }

  static _getFeatureTables (gp) {
    return gp.getFeatureTables()
  }

  static async getFeatureTables (filePath) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureTables(gp)
    })
  }

  static _getTables (gp) {
    return gp.getTables()
  }

  static async getTables (filePath) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTables(gp)
    })
  }

  static getGeoPackageFileSize (filePath) {
    let fileInfo = jetpack.inspect(filePath, {
      times: true,
      absolutePath: true
    })
    return FileUtilities.toHumanReadable(fileInfo.size)
  }

  static _getDetails (gp, filePath) {
    let spatialReferenceSystems = gp.spatialReferenceSystemDao.queryForAll().map(result => gp.spatialReferenceSystemDao.createObject(result))
    return {
      featureTableCount: gp.getTables().features.length,
      tileTableCount: gp.getTables().tiles.length,
      path: filePath,
      srsCount: spatialReferenceSystems.length,
      spatialReferenceSystems,
      size: GeoPackageUtilities.getGeoPackageFileSize(filePath)
    }
  }

  static async getDetails (filePath) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getDetails(gp, filePath)
    })
  }

  static async buildGeoPackage (fileName, tableName, featureCollection, style = VectorStyleUtilities.defaultRandomColorStyle()) {
    // create the geopackage
    let gp = await GeoPackageAPI.create(fileName)
    try {
      // setup the columns for the feature table
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
      let featureTableStyles = new FeatureTableStyles(gp, tableName)
      featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
      featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
      featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
      featureTableStyles.createTableStyleRelationship()
      featureTableStyles.createTableIconRelationship()
      featureTableStyles.createStyleRelationship()
      featureTableStyles.createIconRelationship()
      GeoPackageUtilities.createGeoPackageTableStyles(featureTableStyles, style)
      GeoPackageUtilities.createGeoPackageTableIcons(featureTableStyles, style)

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
        if (!_.isNil(style.features[feature.id])) {
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
      console.log('indexed!')
    } catch (error) {
      console.error(error)
    }
    try {
      gp.close()
    } catch (error) {
      console.error(error)
    }
  }

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
          dataType: prop.type,
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

  static _getGeoPackageExtent (gp, tableName) {
    let contentsDao = gp.contentsDao
    let contents = contentsDao.queryForId(tableName)
    let proj = contentsDao.getProjection(contents)
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  }

  static async getGeoPackageExtent (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getGeoPackageExtent(gp, tableName)
    })
  }

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

  static async _indexFeatureTable (gp, tableName) {
    const featureDao = gp.getFeatureDao(tableName)
    const fti = featureDao.featureTableIndex
    if (fti) {
      await fti.index()
    }
  }

  static async indexFeatureTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._indexFeatureTable(gp, tableName)
    })
  }

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

  static _getTableStyle (gp, tableName, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getTableStyle(geometryType)
  }

  static async getTableStyle (filePath, tableName, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTableStyle(gp, tableName, geometryType)
    })
  }

  static _getTableIcon (gp, tableName, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getTableIcon(geometryType)
  }

  static async getTableIcon (filePath, tableName, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTableIcon(gp, tableName, geometryType)
    })
  }

  static _getIconById (gp, tableName, id) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getIconDao().queryForId(id)
  }

  static async getIconById (filePath, tableName, id) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getIconById(gp, tableName, id)
    })
  }

  static _getTableIconId (gp, tableName, geometryType) {
    let id = -1
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let icon = featureTableStyles.getTableIcon(geometryType)
    if (!_.isNil(icon)) {
      id = icon.id
    }
    return id
  }

  static async getTableIconId (filePath, tableName, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getTableIconId(gp, tableName, geometryType)
    })
  }

  static _getFeatureIds (gp, tableName) {
    let featureIds = []
    let featureDao = gp.getFeatureDao(tableName)
    const idColumn = featureDao.table.getIdColumn().getName()
    featureDao.queryForAll().forEach(f => {
      featureIds.push(f[idColumn])
    })
    return featureIds
  }

  static async getFeatureIds (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIds(gp, tableName)
    })
  }

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

  static async getPointAndMultiPointFeatureIds (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getPointAndMultiPointFeatureIds(gp, tableName)
    })
  }

  static _getFeatureStyle (gp, tableName, rowId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let featureDao = gp.getFeatureDao(tableName)
    let feature = featureDao.queryForId(rowId)
    return featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, _.isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  }

  static async getFeatureStyle (filePath, tableName, rowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureStyle(gp, tableName, rowId)
    })
  }

  static _getFeatureIcon (gp, tableName, rowId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let featureDao = gp.getFeatureDao(tableName)
    let feature = featureDao.queryForId(rowId)
    return featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, _.isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  }

  static async getFeatureIcon (filePath, tableName, rowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIcon(gp, tableName, rowId)
    })
  }

  static _getFeatureStyleRows (gp, tableName) {
    let styleRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let idsToIgnore = featureTableStyles.getAllTableStyleIds().map(n => Number(n))
    let styleDao = featureTableStyles.getStyleDao()
    styleDao.queryForAll().forEach((result) => {
      let styleRow = styleDao.createObject(result)
      if (idsToIgnore.find(id => id === styleRow.id) === undefined) {
        styleRows[styleRow.id] = styleRow
      }
    })
    return styleRows
  }

  static async getFeatureStyleRows (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureStyleRows(gp, tableName)
    })
  }

  static _getFeatureIconRows (gp, tableName) {
    let iconRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    let idsToIgnore = featureTableStyles.getAllTableIconIds().map(n => Number(n))
    let iconDao = featureTableStyles.getIconDao()
    iconDao.queryForAll().forEach((result) => {
      let iconRow = iconDao.createObject(result)
      if (idsToIgnore.find(id => id === iconRow.id) === undefined) {
        iconRows[iconRow.id] = iconRow
      }
    })
    return iconRows
  }

  static async getFeatureIconRows (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIconRows(gp, tableName)
    })
  }

  static _usePointIconDefault (gp, tableName, usePointIconDefault) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    if (usePointIconDefault) {
      let pointIcon = VectorStyleUtilities.getDefaultIcon()
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
    } else {
      const iconRow = featureTableStyles.getTableIcons().getIcon(GeometryType.POINT)
      // Delete icon relationship
      featureTableStyles.deleteTableIcon(GeometryType.POINT)
      featureTableStyles.deleteTableIcon(GeometryType.MULTIPOINT)
      // Delete default point/multipoint icon
      if (!_.isNil(iconRow)) {
        featureTableStyles.getIconDao().deleteById(iconRow.id)
      }
    }
  }

  static async usePointIconDefault (filePath, tableName, usePointIconDefault, rowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._usePointIconDefault(gp, tableName, usePointIconDefault, rowId)
    })
  }

  static _renameGeoPackageTable (gp, tableName, newTableName) {
    gp.renameTable(tableName, newTableName)
  }

  static async renameGeoPackageTable (filePath, tableName, newTableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._renameGeoPackageTable(gp, tableName, newTableName)
    })
  }

  static _copyGeoPackageTable (gp, tableName, copyTableName) {
    gp.copyTable(tableName, copyTableName, true, true)
  }

  static async copyGeoPackageTable (filePath, tableName, copyTableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._copyGeoPackageTable(gp, tableName, copyTableName)
    })
  }

  static _deleteGeoPackageTable (gp, tableName) {
    gp.deleteTable(tableName)
  }

  static async deleteGeoPackageTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteGeoPackageTable(gp, tableName)
    })
  }

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

  static async updateStyleRow (filePath, tableName, styleRow) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateStyleRow(gp, tableName, styleRow)
    })
  }

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

  static async updateIconRow (filePath, tableName, iconRow) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateIconRow(gp, tableName, iconRow)
    })
  }

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

  static async createStyleRow (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createStyleRow(gp, tableName)
    })
  }

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

  static async createIconRow (filePath, tableName, icon = VectorStyleUtilities.getDefaultIcon()) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createIconRow(gp, tableName, icon)
    })
  }

  static _deleteStyleRow (gp, tableName, styleId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.deleteStyleAndMappingsByStyleRowId(styleId)
  }

  static async deleteStyleRow (filePath, tableName, styleId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteStyleRow(gp, tableName, styleId)
    })
  }

  static _deleteIconRow (gp, tableName, iconId) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.deleteIconAndMappingsByIconRowId(iconId)
  }

  static async deleteIconRow (filePath, tableName, iconId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteIconRow(gp, tableName, iconId)
    })
  }

  static _getFeatureStyleRow (gp, tableName, featureId, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getFeatureStyleExtension().getStyle(tableName, featureId, geometryType, false)
  }

  static async getFeatureStyleRow (filePath, tableName, featureId, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureStyleRow(gp, tableName, featureId, geometryType)
    })
  }

  static _getFeatureIconRow (gp, tableName, featureId, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    return featureTableStyles.getFeatureStyleExtension().getIcon(tableName, featureId, geometryType, false)
  }

  static async getFeatureIconRow (filePath, tableName, featureId, geometryType) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureIconRow(gp, tableName, featureId, geometryType)
    })
  }

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

  static async setFeatureStyle (filePath, tableName, featureId, styleId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._setFeatureStyle(gp, tableName, featureId, styleId)
    })
  }

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

  static async setFeatureIcon (filePath, tableName, featureId, iconId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._setFeatureIcon(gp, tableName, featureId, iconId)
    })
  }

  static async _updateFeatureRow (gp, tableName, featureRowId, feature) {
    const featureDao = gp.getFeatureDao(tableName)
    featureDao.deleteById(featureRowId)
    gp.addGeoJSONFeatureToGeoPackage(feature, tableName, true)
    const featureCollection = {
      type: 'FeatureCollection',
      features: (await gp.getGeoJSONFeaturesInTile(tableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {extent: geojsonExtent(featureCollection)}
  }

  static async updateFeatureRow (filePath, tableName, featureRowId, feature) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._updateFeatureRow(gp, tableName, featureRowId, feature)
    })
  }

  static async _createFeatureRow (gp, tableName, feature) {
    gp.addGeoJSONFeatureToGeoPackage(feature, tableName, true)
    const featureCollection = {
      type: 'FeatureCollection',
      features: (await gp.getGeoJSONFeaturesInTile(tableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {count: featureCollection.features.length, extent: geojsonExtent(featureCollection)}
  }

  static async createFeatureRow (filePath, tableName, feature) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._createFeatureRow(gp, tableName, feature)
    })
  }

  static async _deleteFeatureRow (gp, tableName, featureRowId) {
    gp.getFeatureDao(tableName).deleteById(featureRowId)
    const featureCollection = {
      type: 'FeatureCollection',
      features: (await gp.getGeoJSONFeaturesInTile(tableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {count: featureCollection.features.length, extent: geojsonExtent(featureCollection)}
  }

  static async deleteFeatureRow (filePath, tableName, featureRowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._deleteFeatureRow(gp, tableName, featureRowId)
    })
  }

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

  static async getBoundingBoxForFeature (filePath, tableName, featureRowId) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getBoundingBoxForFeature(gp, tableName, featureRowId)
    })
  }

  static _getBoundingBoxForTable (gp, tableName) {
    const contents = gp.getTableContents(tableName)
    let extent
    if (!_.isNil(contents)) {
      let bbox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y)
      const srs = gp.spatialReferenceSystemDao.queryForId(contents.srs_id)
      if (
        srs.definition &&
        srs.definition !== 'undefined' &&
        srs.organization.toUpperCase() + ':' + srs.organization_coordsys_id !== 'EPSG:4326'
      ) {
        bbox = bbox.projectBoundingBox(srs.projection, 'EPSG:4326')
      }
      extent = [bbox.minLongitude, bbox.minLatitude, bbox.maxLongitude, bbox.maxLatitude]
    }
    return extent
  }

  static async getBoundingBoxForTable (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getBoundingBoxForTable(gp, tableName)
    })
  }

  static _getFeatureCountInBoundingBox (gp, tableName, boundingBox) {
    return gp.getFeatureDao(tableName).featureTableIndex.countWithGeometryEnvelope(new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0]).buildEnvelope())
  }

  static async getFeatureCountInBoundingBox (filePath, tableName, boundingBox) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageUtilities._getFeatureCountInBoundingBox(gp, tableName, boundingBox)
    })
  }

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

  static _getAllFeaturesAsGeoJSON (gp, tableName) {
    const featureDao = gp.getFeatureDao(tableName)
    const srs = featureDao.srs
    this._features = featureDao.queryForAll().map(result => {
      let feature = GeoPackage.parseFeatureRowIntoGeoJSON(result, srs)
      feature.type = 'Feature'
    })
  }

  static async getAllFeaturesAsGeoJSON (filePath, tableName) {
    return GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      GeoPackageUtilities._getAllFeaturesAsGeoJSON(gp, tableName)
    })
  }
}
