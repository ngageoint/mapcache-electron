import {
  GeoPackageAPI,
  FeatureColumn,
  GeometryColumns,
  BoundingBox,
  DataTypes,
  FeatureTableStyles,
  TileScalingType, TileScaling
} from '@ngageoint/geopackage'
import _ from 'lodash'
import geojsonExtent from '@mapbox/geojson-extent'
import VectorStyleUtilities from './VectorStyleUtilities'
import XYZTileUtilities from './XYZTileUtilities'
import TileBoundingBoxUtils from './tile/tileBoundingBoxUtils'

export default class GeoPackageUtilities {
  static async createGeoPackageTableStyles (featureTableStyles, style) {
    let polyStyle = style.styleRowMap[style.default.styles['Polygon']]
    let polygonStyleRow = featureTableStyles.getStyleDao().newRow()
    polygonStyleRow.setColor(polyStyle.color, polyStyle.opacity)
    polygonStyleRow.setFillColor(polyStyle.fillColor, polyStyle.fillOpacity)
    polygonStyleRow.setWidth(polyStyle.width)
    polygonStyleRow.setName(polyStyle.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(polygonStyleRow)

    let lineStyle = style.styleRowMap[style.default.styles['LineString']]
    let lineStringStyleRow = featureTableStyles.getStyleDao().newRow()
    lineStringStyleRow.setColor(lineStyle.color, lineStyle.opacity)
    lineStringStyleRow.setWidth(lineStyle.width)
    lineStringStyleRow.setName(lineStyle.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(lineStringStyleRow)

    let pointStyle = style.styleRowMap[style.default.styles['Point']]
    let pointStyleRow = featureTableStyles.getStyleDao().newRow()
    pointStyleRow.setColor(pointStyle.color, pointStyle.opacity)
    pointStyleRow.setWidth(pointStyle.width)
    pointStyleRow.setName(pointStyle.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(pointStyleRow)

    await featureTableStyles.setTableStyle('Polygon', polygonStyleRow)
    await featureTableStyles.setTableStyle('LineString', lineStringStyleRow)
    await featureTableStyles.setTableStyle('Point', pointStyleRow)
    await featureTableStyles.setTableStyle('MultiPolygon', polygonStyleRow)
    await featureTableStyles.setTableStyle('MultiLineString', lineStringStyleRow)
    await featureTableStyles.setTableStyle('MultiPoint', pointStyleRow)
  }

  static async createGeoPackageTableIcons (featureTableStyles, style) {
    if (style.default.iconOrStyle['Point'] === 'icon') {
      let pointIcon = style.iconRowMap[style.default.icons['Point']]
      let pointIconRow = featureTableStyles.getIconDao().newRow()
      pointIconRow.data = Buffer.from(pointIcon.url.split(',')[1], 'base64')
      pointIconRow.contentType = pointIcon.url.substring(pointIcon.url.indexOf(':') + 1, pointIcon.url.indexOf(';'))
      pointIconRow.width = pointIcon.width
      pointIconRow.height = pointIcon.height
      pointIconRow.anchorU = pointIcon.anchor_u
      pointIconRow.anchorV = pointIcon.anchor_v
      pointIconRow.name = pointIcon.name
      featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(pointIconRow)
      await featureTableStyles.setTableIcon('Point', pointIconRow)
      await featureTableStyles.setTableIcon('MultiPoint', pointIconRow)
    }
  }

  static async buildGeoPackage (fileName, featureTableName, featureCollection, style = VectorStyleUtilities.defaultRandomColorStyle()) {
    // create the geopackage
    let gp = await GeoPackageAPI.create(fileName)
    try {
      // setup the columns for the feature table
      let layerColumns = GeoPackageUtilities.getLayerColumns(featureCollection)
      let geometryColumns = new GeometryColumns()
      geometryColumns.table_name = featureTableName
      geometryColumns.column_name = layerColumns.geom.name
      geometryColumns.geometry_type_name = 'GEOMETRYCOLLECTION'
      geometryColumns.z = 0
      geometryColumns.m = 0
      let columns = []
      columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, layerColumns.id.name))
      columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, 'GEOMETRYCOLLECTION', false, null))
      let columnCount = 2
      for (const column of layerColumns.columns) {
        if (column.name !== layerColumns.id.name && column.name !== layerColumns.geom.name) {
          columns.push(FeatureColumn.createColumn(columnCount++, column.name, DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
        }
      }

      let extent = geojsonExtent(featureCollection)
      let bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])
      await gp.createFeatureTable(featureTableName, geometryColumns, columns, bb, 4326)
      let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
      await featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(featureTableName)
      await featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
      await featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
      await featureTableStyles.createTableStyleRelationship()
      await featureTableStyles.createTableIconRelationship()
      await featureTableStyles.createStyleRelationship()
      await featureTableStyles.createIconRelationship()

      await GeoPackageUtilities.createGeoPackageTableStyles(featureTableStyles, style)
      await GeoPackageUtilities.createGeoPackageTableIcons(featureTableStyles, style)

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
        let featureRowId = gp.addGeoJSONFeatureToGeoPackage(feature, featureTableName)
        if (!_.isNil(style.features[feature.id])) {
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
            await featureTableStyles.setIcon(featureRowId, feature.geometry.type, featureIconRow)
          } else {
            let styleId = style.features[feature.id].style
            let featureStyleRow = styles[styleId]
            if (_.isNil(featureStyleRow)) {
              let featureStyle = style.styleRowMap[styleId]
              featureStyleRow = featureTableStyles.getStyleDao().newRow()
              featureStyleRow.setColor(featureStyle.color, featureStyle.opacity)
              featureStyleRow.setWidth(featureStyle.width)
              featureStyleRow.setName(featureStyle.name)
              if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                featureStyleRow.setFillColor(featureStyle.fillColor, featureStyle.fillOpacity)
              }
              let featureStyleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(featureStyleRow)
              delete style.styleRowMap[styleId]
              style.styleRowMap[featureStyleRowId] = featureStyle
              styleIdToStyleRowId[styleId] = featureStyleRowId
              styles[styleId] = featureStyleRow
            }
            style.features[feature.id].style = styleIdToStyleRowId[styleId]
            await featureTableStyles.setStyle(featureRowId, feature.geometry.type, featureStyleRow)
          }
        }
      }
      await GeoPackageUtilities.indexFeatureTable(gp, featureTableName)
    } catch (error) {
      console.error(error)
    }
    return gp
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

  static getGeoPackageExtent (geopackage, tableName) {
    let contentsDao = geopackage.contentsDao
    let contents = contentsDao.queryForId(tableName)
    let proj = contentsDao.getProjection(contents)
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  }

  static async copyGeoPackageFeatureLayerAndStyles (geopackageFileName, geopackageCopyFileName, featureTableName) {
    let geoPackage = await GeoPackageAPI.open(geopackageFileName)
    let featureDao = geoPackage.getFeatureDao(featureTableName)
    let featureTableStyles = new FeatureTableStyles(geoPackage, featureTableName)
    let geoPackageCopy = await GeoPackageAPI.create(geopackageCopyFileName)

    let defaultStyle = VectorStyleUtilities.defaultRandomColorStyle()

    // setup the columns for the feature table
    let layerColumns = GeoPackageUtilities.getLayerColumnsFromGeoPackage(featureDao)
    let geometryColumns = new GeometryColumns()
    geometryColumns.table_name = featureTableName
    geometryColumns.column_name = layerColumns.geom.name
    geometryColumns.geometry_type_name = 'GEOMETRYCOLLECTION'
    geometryColumns.z = 0
    geometryColumns.m = 0
    let columns = []
    columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, layerColumns.id.name))
    columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, 'GEOMETRYCOLLECTION', false, null))
    let columnCount = 2
    for (const column of layerColumns.columns) {
      if (column.name !== layerColumns.id.name && column.name !== layerColumns.geom.name) {
        columns.push(FeatureColumn.createColumn(columnCount++, column.name, DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
      }
    }
    let extent = GeoPackageUtilities.getGeoPackageExtent(geoPackage, featureTableName)
    let bb = new BoundingBox(extent[0], extent[2], extent[1], extent[3])
    await geoPackageCopy.createFeatureTable(featureTableName, geometryColumns, columns, bb, 4326)
    let featureTableStylesCopy = new FeatureTableStyles(geoPackageCopy, featureTableName)
    await featureTableStylesCopy.getFeatureStyleExtension().getOrCreateExtension(featureTableName)
    await featureTableStylesCopy.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
    await featureTableStylesCopy.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
    await featureTableStylesCopy.createTableStyleRelationship()
    await featureTableStylesCopy.createTableIconRelationship()
    await featureTableStylesCopy.createStyleRelationship()
    await featureTableStylesCopy.createIconRelationship()

    if (featureTableStyles.getStyleDao() === null) {
      await GeoPackageUtilities.createGeoPackageTableStyles(featureTableStylesCopy, defaultStyle)
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
      await GeoPackageUtilities.createGeoPackageTableIcons(featureTableStylesCopy, defaultStyle)
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
      await featureTableStylesCopy.setTableFeatureStyles(featureTableStyles.getTableFeatureStyles())
    }

    // create feature table and copy all rows into that table as well as copying any feature styles/icons
    let featureDaoCopy = geoPackageCopy.getFeatureDao(featureTableName)
    let each = featureDao.queryForEach()
    for (let row of each) {
      if (!_.isNil(row)) {
        let featureRow = featureDao.getRow(row)
        let featureRowId = featureDaoCopy.create(featureRow)
        let featureRowStyles = featureTableStyles.getFeatureStyles(featureRow.id)
        await featureTableStylesCopy.setFeatureStyles(featureRowId, featureRowStyles)
      }
    }
    await GeoPackageUtilities.indexFeatureTable(geoPackageCopy, featureTableName)
    return geoPackageCopy
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
    let featureTableNames = await geoPackageTarget.getFeatureTables()
    let existingTableCount = 1
    let targetTableName = targetFeatureTableName
    while (featureTableNames.findIndex(tableName => tableName === targetTableName) !== -1) {
      targetTableName = targetFeatureTableName + '_' + existingTableCount
      existingTableCount++
    }
    // setup the columns for the target feature table
    let layerColumns = GeoPackageUtilities.getLayerColumnsFromGeoPackage(featureDao)
    let geometryColumns = new GeometryColumns()
    geometryColumns.table_name = targetTableName
    geometryColumns.column_name = layerColumns.geom.name
    geometryColumns.geometry_type_name = 'GEOMETRYCOLLECTION'
    geometryColumns.z = 0
    geometryColumns.m = 0
    let columns = []
    columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, layerColumns.id.name))
    columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, 'GEOMETRYCOLLECTION', false, null))
    let columnCount = 2
    for (const column of layerColumns.columns) {
      if (column.name !== layerColumns.id.name && column.name !== layerColumns.geom.name) {
        columns.push(FeatureColumn.createColumn(columnCount++, column.name, DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
      }
    }

    // setup feature style extension for the target feature table
    await geoPackageTarget.createFeatureTable(targetTableName, geometryColumns, columns, bb, 4326)
    let featureTableStylesTarget = new FeatureTableStyles(geoPackageTarget, targetTableName)
    await featureTableStylesTarget.getFeatureStyleExtension().getOrCreateExtension(targetTableName)
    await featureTableStylesTarget.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
    await featureTableStylesTarget.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
    await featureTableStylesTarget.getFeatureStyleExtension().getContentsId().getOrCreateExtension()

    // create style and icon relationships for the target feature table
    await featureTableStylesTarget.createTableStyleRelationship()
    await featureTableStylesTarget.createTableIconRelationship()
    await featureTableStylesTarget.createStyleRelationship()
    await featureTableStylesTarget.createIconRelationship()

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
    await featureTableStylesTarget.setTableFeatureStyles(mappedTableFeatureStyles)
    // create feature table and copy all rows into that table as well as copying any feature styles/icons
    let featureDaoTarget = geoPackageTarget.getFeatureDao(targetTableName)
    let iterator = featureDao.fastQueryBoundingBox(bb, 'EPSG:4326')
    for (const row of iterator) {
      if (!_.isNil(row)) {
        // const sourceFeatureRowId = row.values.id
        let featureRowId = featureDaoTarget.create(row)
        let mappedFeatureRowStyles = GeoPackageUtilities.mapSourceToTargetIdForFeatureStyles(featureTableStyles.getFeatureStyles(row.id), styleSourceToTargetIdMap, iconSourceToTargetIdMap)
        await featureTableStylesTarget.setFeatureStyles(featureRowId, mappedFeatureRowStyles)
        featuresAdded++
      }
    }
    return featuresAdded
  }

  static async indexFeatureTable (geopackage, featureTableName) {
    const featureDao = geopackage.getFeatureDao(featureTableName)
    const fti = featureDao.featureTableIndex
    if (fti) {
      if (!_.isNil(fti.tableIndex)) {
        await fti.index()
      }
    }
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
      dataType: DataTypes.nameFromType(idColumn.dataType)
    }
    for (const column of featureDao.getFeatureTable().columns) {
      if (column.name !== columns.id.name && column.name !== columns.geom.name) {
        let c = {
          dataType: DataTypes.nameFromType(column.dataType),
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
          name: '_feature_id'
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

  static getTableStyle (gp, featureTableName, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    return featureTableStyles.getTableStyle(geometryType)
  }

  static getTableIcon (gp, featureTableName, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    return featureTableStyles.getTableIcon(geometryType)
  }

  static getIconById (gp, featureTableName, id) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    return featureTableStyles.getIconDao().queryForId(id)
  }

  static getTableIconId (gp, featureTableName, geometryType) {
    let id = -1
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let icon = featureTableStyles.getTableIcon(geometryType)
    if (!_.isNil(icon)) {
      id = icon.id
    }
    return id
  }

  static getFeatureIds (gp, featureTableName) {
    let featureIds = []
    let featureDao = gp.getFeatureDao(featureTableName)
    featureDao.queryForAll().forEach(f => {
      featureIds.push(f.id)
    })
    return featureIds
  }

  static getFeatureStyle (gp, featureTableName, featureRowId) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let feature = featureDao.queryForId(featureRowId)
    return featureTableStyles.getFeatureStyleExtension().getStyle(featureTableName, featureRowId, _.isNil(feature) ? null : feature.geometryType, false)
  }

  static getFeatureIcon (gp, featureTableName, featureRowId) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let feature = featureDao.queryForId(featureRowId)
    return featureTableStyles.getFeatureStyleExtension().getIcon(featureTableName, featureRowId, _.isNil(feature) ? null : feature.geometryType, false)
  }

  static getFeatureStyleRows (gp, featureTableName) {
    let styleRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
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

  static getFeatureIconRows (gp, featureTableName) {
    let iconRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
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

  static async usePointIconDefault (geopackageFileName, featureTableName, usePointIconDefault, iconRowId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    if (usePointIconDefault) {
      let iconRow = featureTableStyles.getIconDao().queryForId(iconRowId)
      await featureTableStyles.setTableIcon('Point', iconRow)
    } else {
      // Delete icon relationship
      featureTableStyles.deleteTableIcon('Point')
    }
  }

  static async updateStyleRow (geopackageFileName, featureTableName, styleRow) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
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

  static async updateIconRow (geopackageFileName, featureTableName, iconRow) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
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

  static async createStyleRow (geopackageFileName, featureTableName) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let styleDao = featureTableStyles.getStyleDao()
    let styleRow = styleDao.newRow()
    let style = VectorStyleUtilities.randomStyle()
    styleRow.setColor(style.color, style.opacity)
    styleRow.setFillColor(style.fillColor, style.fillOpacity)
    styleRow.setWidth(style.width)
    styleRow.setName(style.name)
    featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
  }

  static async createIconRow (geopackageFileName, featureTableName, icon = VectorStyleUtilities.getDefaultIcon()) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
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

  static async deleteStyleRow (geopackageFileName, featureTableName, styleId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    featureTableStyles.deleteStyleAndMappingsByStyleRowId(styleId)
  }

  static async deleteIconRow (geopackageFileName, featureTableName, iconId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    featureTableStyles.deleteIconAndMappingsByIconRowId(iconId)
  }

  static getFeatureStyleRow (gp, featureTableName, featureId, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    return featureTableStyles.getFeatureStyleExtension().getStyle(featureTableName, featureId, geometryType, false)
  }

  static getFeatureIconRow (gp, featureTableName, featureId, geometryType) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    return featureTableStyles.getFeatureStyleExtension().getIcon(featureTableName, featureId, geometryType, false)
  }

  static async setFeatureStyle (geopackageFileName, featureTableName, featureId, styleId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let feature = featureDao.queryForId(featureId)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    if (styleId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setStyle(featureTableName, featureId, feature.geometryType, null)
    } else {
      let style = featureTableStyles.getStyleDao().queryForId(styleId)
      return featureTableStyles.getFeatureStyleExtension().setStyle(featureTableName, featureId, feature.geometryType, style)
    }
  }

  static async setFeatureIcon (geopackageFileName, featureTableName, featureId, iconId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let feature = featureDao.queryForId(featureId)
    if (iconId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setIcon(featureTableName, featureId, feature.geometryType, null)
    } else {
      let icon = featureTableStyles.getIconDao().queryForId(iconId)
      return featureTableStyles.getFeatureStyleExtension().setIcon(featureTableName, featureId, feature.geometryType, icon)
    }
  }

  static async updateFeatureRow (geopackageFileName, featureTableName, featureRowId, feature) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    featureDao.deleteById(featureRowId)
    gp.addGeoJSONFeatureToGeoPackage(feature, featureTableName, true)
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await gp.getGeoJSONFeaturesInTile(featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {extent: geojsonExtent(featureCollection)}
  }

  static async createFeatureRow (geopackageFileName, featureTableName, feature) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    gp.addGeoJSONFeatureToGeoPackage(feature, featureTableName, true)
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await gp.getGeoJSONFeaturesInTile(featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {count: featureCollection.features.length, extent: geojsonExtent(featureCollection)}
  }

  static async deleteFeatureRow (geopackageFileName, featureTableName, featureRowId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    featureDao.deleteById(featureRowId)
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await gp.getGeoJSONFeaturesInTile(featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {count: featureCollection.features.length, extent: geojsonExtent(featureCollection)}
  }

  static async getBoundingBoxForFeature (geopackageFileName, featureTableName, featureRowId) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let feature = gp.getFeature(featureTableName, featureRowId)
    return geojsonExtent(feature)
  }

  static async getFeatureCountInBoundingBox (geopackageFileName, featureTableName, boundingBox) {
    let gp = await GeoPackageAPI.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    return featureDao.featureTableIndex.countWithGeometryEnvelope(new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0]).buildEnvelope())
  }

  // Return true if every tile layer in the given geopackage has a bounding box
  static tileLayersHaveBoundingBoxes (geoPackage) {
    let haveBoundingBoxes = true
    for (const [key, value] of Object.entries(geoPackage.tileConfigurations)) {
      if (value.boundingBox === undefined) {
        haveBoundingBoxes = false
      }
      if (key === undefined) {
        console.log('no boundingbox for $[key]')
      }
    }
    return haveBoundingBoxes
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
}
