import GeoPackage, {BoundingBox, DataTypes} from '@ngageoint/geopackage'
import FeatureTableStyles from '@ngageoint/geopackage/lib/extension/style/featureTableStyles'
import _ from 'lodash'
import geojsonExtent from '@mapbox/geojson-extent'
import VectorStyleUtilities from './VectorStyleUtilities'

export default class GeoPackageUtilities {
  static async buildGeoPackage (fileName, featureTableName, featureCollection, style = VectorStyleUtilities.defaultRandomColorStyle()) {
    // create the geopackage
    let gp = await GeoPackage.create(fileName)
    try {
      // setup the columns for the feature table
      let layerColumns = GeoPackageUtilities.getLayerColumns(featureCollection)
      const FeatureColumn = GeoPackage.FeatureColumn
      let geometryColumns = new GeoPackage.GeometryColumns()
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
          columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
        }
      }

      let extent = geojsonExtent(featureCollection)
      let bb = new GeoPackage.BoundingBox(extent[0], extent[2], extent[1], extent[3])
      await gp.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
      await gp.getFeatureStyleExtension().getOrCreateExtension(featureTableName)
      await gp.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
      await gp.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
      let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
      await featureTableStyles.createTableStyleRelationship()
      await featureTableStyles.createTableIconRelationship()
      await featureTableStyles.createStyleRelationship()
      await featureTableStyles.createIconRelationship()

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

      if (style.default.iconOrStyle['Point'] === 'icon') {
        let pointIcon = style.iconRowMap[style.default.icons['Point']]
        let pointIconRow = featureTableStyles.getIconDao().newRow()
        pointIconRow.setData(Buffer.from(pointIcon.url.split(',')[1], 'base64'))
        pointIconRow.setContentType(pointIcon.url.substring(pointIcon.url.indexOf(':') + 1, pointIcon.url.indexOf(';')))
        pointIconRow.setWidth(pointIcon.width)
        pointIconRow.setHeight(pointIcon.height)
        pointIconRow.setAnchorU(pointIcon.anchor_u)
        pointIconRow.setAnchorV(pointIcon.anchor_v)
        pointIconRow.setName(pointIcon.name)
        featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(pointIconRow)
        await featureTableStyles.setTableIcon('Point', pointIconRow)
        await featureTableStyles.setTableIcon('MultiPoint', pointIconRow)
      }
      await featureTableStyles.setTableStyle('Polygon', polygonStyleRow)
      await featureTableStyles.setTableStyle('LineString', lineStringStyleRow)
      await featureTableStyles.setTableStyle('Point', pointStyleRow)
      await featureTableStyles.setTableStyle('MultiPolygon', polygonStyleRow)
      await featureTableStyles.setTableStyle('MultiLineString', lineStringStyleRow)
      await featureTableStyles.setTableStyle('MultiPoint', pointStyleRow)

      let icons = {}
      let styles = {}
      let iconIdToIconRowId = {}
      let styleIdToStyleRowId = {}
      let iterator = featureCollection.features
      for (let feature of iterator) {
        if (feature.properties) {
          feature.properties.id = undefined
        }
        let featureRowId = GeoPackage.addGeoJSONFeatureToGeoPackage(gp, feature, featureTableName)
        if (!_.isNil(style.features[feature.id])) {
          if (style.features[feature.id].iconOrStyle === 'icon') {
            let iconId = style.features[feature.id].icon
            let featureIconRow = icons[iconId]
            if (_.isNil(featureIconRow)) {
              let featureIcon = style.iconRowMap[iconId]
              featureIconRow = featureTableStyles.getIconDao().newRow()
              featureIconRow.setData(Buffer.from(featureIcon.url.split(',')[1], 'base64'))
              console.log(featureIcon.url.substring(featureIcon.url.indexOf(':') + 1, featureIcon.url.indexOf(';')))
              featureIconRow.setContentType(featureIcon.url.substring(featureIcon.url.indexOf(':') + 1, featureIcon.url.indexOf(';')))
              featureIconRow.setWidth(featureIcon.width)
              featureIconRow.setHeight(featureIcon.height)
              featureIconRow.setAnchorU(featureIcon.anchor_u)
              featureIconRow.setAnchorV(featureIcon.anchor_v)
              featureIconRow.setName(featureIcon.name)
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
      var featureDao = gp.getFeatureDao(featureTableName)
      var fti = featureDao.featureTableIndex
      if (fti) {
        fti.getTableIndex()
        await fti.index()
      }
    } catch (error) {
      console.log(error)
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

  static async copyGeoPackageFeatureLayerAndStyles (geopackageFileName, geopackageCopyFileName, featureTableName) {
    let geoPackage = await GeoPackage.open(geopackageFileName)
    let featureDao = geoPackage.getFeatureDao(featureTableName)
    let featureTableStyles = new FeatureTableStyles(geoPackage, featureTableName)
    let geoPackageCopy = await GeoPackage.create(geopackageCopyFileName)

    // setup the columns for the feature table
    let layerColumns = GeoPackageUtilities.getLayerColumnsFromGeoPackage(featureDao)
    const FeatureColumn = GeoPackage.FeatureColumn
    let geometryColumns = new GeoPackage.GeometryColumns()
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
        columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
      }
    }
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await GeoPackage.getGeoJSONFeaturesInTile(geoPackage, featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    let extent = geojsonExtent(featureCollection)
    let bb = new GeoPackage.BoundingBox(extent[0], extent[2], extent[1], extent[3])
    await geoPackageCopy.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
    await geoPackageCopy.getFeatureStyleExtension().getOrCreateExtension(featureTableName)
    await geoPackageCopy.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
    await geoPackageCopy.getFeatureStyleExtension().getContentsId().getOrCreateExtension()

    let featureTableStylesCopy = new FeatureTableStyles(geoPackageCopy, featureTableName)
    await featureTableStylesCopy.createTableStyleRelationship()
    await featureTableStylesCopy.createTableIconRelationship()
    await featureTableStylesCopy.createStyleRelationship()
    await featureTableStylesCopy.createIconRelationship()
    // copy all styles, icons and relationships
    featureTableStyles.getStyleDao().queryForAll().forEach(result => {
      featureTableStylesCopy.getStyleDao().create(result)
    })
    featureTableStyles.getIconDao().queryForAll().forEach(result => {
      featureTableStylesCopy.getIconDao().create(result)
    })
    await featureTableStylesCopy.setTableFeatureStyles(featureTableStyles.getTableFeatureStyles())

    // create feature table and copy all rows into that table as well as copying any feature styles/icons
    let featureDaoCopy = geoPackageCopy.getFeatureDao(featureTableName)
    let each = featureDao.queryForEach()
    for (let row of each) {
      if (!_.isNil(row)) {
        let featureRowId = featureDaoCopy.create(featureDao.getRow(row))
        let featureRowStyles = featureTableStyles.getFeatureStyles(row.id)
        await featureTableStylesCopy.setFeatureStyles(featureRowId, featureRowStyles)
      }
    }
    var fti = featureDaoCopy.featureTableIndex
    if (fti) {
      fti.getTableIndex()
      await fti.index()
    }
    return geoPackageCopy
  }

  static async copyGeoPackageFeaturesAndStylesForBoundingBox (geoPackage, geoPackageTarget, sourceFeatureTableName, targetFeatureTableName, bounds) {
    let featureDao = geoPackage.getFeatureDao(sourceFeatureTableName)
    let featureTableStyles = new FeatureTableStyles(geoPackage, sourceFeatureTableName)
    let bb = new BoundingBox(bounds[0][1], bounds[1][1], bounds[0][0], bounds[1][0])
    let featuresAdded = 0
    // setup the columns for the feature table
    let layerColumns = GeoPackageUtilities.getLayerColumnsFromGeoPackage(featureDao)
    const FeatureColumn = GeoPackage.FeatureColumn
    let geometryColumns = new GeoPackage.GeometryColumns()
    geometryColumns.table_name = targetFeatureTableName
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
        columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
      }
    }
    await geoPackageTarget.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
    await geoPackageTarget.getFeatureStyleExtension().getOrCreateExtension(targetFeatureTableName)
    await geoPackageTarget.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
    await geoPackageTarget.getFeatureStyleExtension().getContentsId().getOrCreateExtension()

    let featureTableStylesTarget = new FeatureTableStyles(geoPackageTarget, targetFeatureTableName)
    await featureTableStylesTarget.createTableStyleRelationship()
    await featureTableStylesTarget.createTableIconRelationship()
    await featureTableStylesTarget.createStyleRelationship()
    await featureTableStylesTarget.createIconRelationship()
    // copy all styles, icons and relationships
    featureTableStyles.getStyleDao().queryForAll().forEach(result => {
      featureTableStylesTarget.getStyleDao().create(result)
    })
    featureTableStyles.getIconDao().queryForAll().forEach(result => {
      featureTableStylesTarget.getIconDao().create(result)
    })
    await featureTableStylesTarget.setTableFeatureStyles(featureTableStyles.getTableFeatureStyles())
    // create feature table and copy all rows into that table as well as copying any feature styles/icons
    let featureDaoTarget = geoPackageTarget.getFeatureDao(targetFeatureTableName)
    let iterator = featureDao.fastQueryBoundingBox(bb, 'EPSG:4326')
    for (const row of iterator) {
      if (!_.isNil(row)) {
        let featureRowId = featureDaoTarget.create(row)
        let featureRowStyles = featureTableStyles.getFeatureStyles(row.values.id)
        await featureTableStylesTarget.setFeatureStyles(featureRowId, featureRowStyles)
        featuresAdded++
      }
    }
    var fti = featureDaoTarget.featureTableIndex
    if (fti) {
      fti.getTableIndex()
      await fti.index()
    }
    return featuresAdded
  }

  static getLayerColumnsFromGeoPackage (featureDao) {
    let columns = {
      columns: []
    }
    let geomColumn = featureDao.getTable().getGeometryColumn()
    columns.geom = {
      name: geomColumn.name
    }
    let idColumn = featureDao.getTable().getIdColumn()
    columns.id = {
      name: idColumn.name,
      dataType: DataTypes.name(idColumn.dataType)
    }
    for (const column of featureDao.getTable().columns) {
      if (column.name !== columns.id.name && column.name !== columns.geom.name) {
        let c = {
          dataType: DataTypes.name(column.dataType),
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
      id = icon.getId()
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
    return featureTableStyles.getFeatureStyleExtension().getStyle(featureTableName, featureRowId, _.isNil(feature) ? null : feature.getGeometryType(), false)
  }

  static getFeatureIcon (gp, featureTableName, featureRowId) {
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let feature = featureDao.queryForId(featureRowId)
    return featureTableStyles.getFeatureStyleExtension().getIcon(featureTableName, featureRowId, _.isNil(feature) ? null : feature.getGeometryType(), false)
  }

  static getFeatureStyleRows (gp, featureTableName) {
    let styleRows = {}
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let idsToIgnore = featureTableStyles.getAllTableStyleIds().map(n => Number(n))
    let styleDao = featureTableStyles.getStyleDao()
    styleDao.queryForAll().forEach((result) => {
      let styleRow = styleDao.createObject(result)
      styleDao.populateObjectFromResult(styleRow, result)
      if (idsToIgnore.find(id => id === styleRow.getId()) === undefined) {
        styleRows[styleRow.getId()] = styleRow
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
      iconDao.populateObjectFromResult(iconRow, result)
      if (idsToIgnore.find(id => id === iconRow.getId()) === undefined) {
        iconRows[iconRow.getId()] = iconRow
      }
    })
    return iconRows
  }

  static async usePointIconDefault (geopackageFileName, featureTableName, usePointIconDefault, iconRowId) {
    console.log('usePointIcon: ' + usePointIconDefault + ' - ' + iconRowId)
    let gp = await GeoPackage.open(geopackageFileName)
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
    let gp = await GeoPackage.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let styleDao = featureTableStyles.getStyleDao()
    let updatedRow = styleDao.newRow()
    updatedRow.setId(styleRow.id)
    updatedRow.setName(styleRow.name)
    updatedRow.setDescription(styleRow.description)
    updatedRow.setColor(styleRow.color, styleRow.opacity)
    updatedRow.setFillColor(styleRow.fillColor, styleRow.fillOpacity)
    updatedRow.setWidth(styleRow.width)
    styleDao.update(updatedRow)
  }

  static async updateIconRow (geopackageFileName, featureTableName, iconRow) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let iconDao = featureTableStyles.getIconDao()
    let updatedRow = iconDao.newRow()
    updatedRow.setId(iconRow.id)
    updatedRow.setName(iconRow.name)
    updatedRow.setDescription(iconRow.description)
    updatedRow.setContentType(iconRow.contentType)
    updatedRow.setData(iconRow.data)
    updatedRow.setWidth(iconRow.width)
    updatedRow.setHeight(iconRow.height)
    updatedRow.setAnchorU(iconRow.anchorU)
    updatedRow.setAnchorV(iconRow.anchorV)
    iconDao.update(updatedRow)
  }

  static async createStyleRow (geopackageFileName, featureTableName) {
    let gp = await GeoPackage.open(geopackageFileName)
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
    let gp = await GeoPackage.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let iconDao = featureTableStyles.getIconDao()
    let iconRow = iconDao.newRow()
    iconRow.setData(Buffer.from(icon.url.split(',')[1], 'base64'))
    iconRow.setContentType('image/png')
    iconRow.setWidth(icon.width)
    iconRow.setHeight(icon.height)
    iconRow.setAnchorU(icon.anchor_u)
    iconRow.setAnchorV(icon.anchor_v)
    iconRow.setName('New Icon')
    featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(iconRow)
  }

  static async deleteStyleRow (geopackageFileName, featureTableName, styleId) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    featureTableStyles.deleteStyleAndMappingsByStyleRowId(styleId)
  }

  static async deleteIconRow (geopackageFileName, featureTableName, iconId) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    featureTableStyles.deleteIconAndMappingsByIconRowId(iconId)
  }

  static getFeatureStyleRow (gp, featureTableName, featureId, geometryType) {
    let styleRow = null
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let featureStyle = featureTableStyles.getFeatureStyle(featureId, geometryType)
    if (!_.isNil(featureStyle)) {
      styleRow = featureStyle.getStyle()
    }
    return styleRow
  }

  static getFeatureIconRow (gp, featureTableName, featureId, geometryType) {
    let iconRow = null
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let featureStyle = featureTableStyles.getFeatureStyle(featureId, geometryType)
    if (!_.isNil(featureStyle)) {
      iconRow = featureStyle.getIcon()
    }
    return iconRow
  }

  static async setFeatureStyle (geopackageFileName, featureTableName, featureId, styleId) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let feature = featureDao.queryForId(featureId)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    if (styleId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setStyle(featureTableName, featureId, feature.getGeometryType(), null)
    } else {
      let style = featureTableStyles.getStyleDao().queryForId(styleId)
      return featureTableStyles.getFeatureStyleExtension().setStyle(featureTableName, featureId, feature.getGeometryType(), style)
    }
  }

  static async setFeatureIcon (geopackageFileName, featureTableName, featureId, iconId) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    let feature = featureDao.queryForId(featureId)
    if (iconId === -1) {
      return featureTableStyles.getFeatureStyleExtension().setIcon(featureTableName, featureId, feature.getGeometryType(), null)
    } else {
      let icon = featureTableStyles.getIconDao().queryForId(iconId)
      console.log(feature.getGeometryType())
      return featureTableStyles.getFeatureStyleExtension().setIcon(featureTableName, featureId, feature.getGeometryType(), icon)
    }
  }

  static async updateFeatureRow (geopackageFileName, featureTableName, featureRowId, feature) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    featureDao.deleteById(featureRowId)
    GeoPackage.addGeoJSONFeatureToGeoPackageAndIndex(gp, feature, featureTableName)
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await GeoPackage.getGeoJSONFeaturesInTile(gp, featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {extent: geojsonExtent(featureCollection)}
  }

  static async createFeatureRow (geopackageFileName, featureTableName, feature) {
    let gp = await GeoPackage.open(geopackageFileName)
    GeoPackage.addGeoJSONFeatureToGeoPackageAndIndex(gp, feature, featureTableName)
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await GeoPackage.getGeoJSONFeaturesInTile(gp, featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {count: featureCollection.features.length, extent: geojsonExtent(featureCollection)}
  }

  static async deleteFeatureRow (geopackageFileName, featureTableName, featureRowId) {
    let gp = await GeoPackage.open(geopackageFileName)
    let featureDao = gp.getFeatureDao(featureTableName)
    featureDao.deleteById(featureRowId)
    let featureCollection = {
      type: 'FeatureCollection',
      features: (await GeoPackage.getGeoJSONFeaturesInTile(gp, featureTableName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        return f
      })
    }
    return {count: featureCollection.features.length, extent: geojsonExtent(featureCollection)}
  }

  static async getBoundingBoxForFeature (geopackageFileName, featureTableName, featureRowId) {
    let gp = await GeoPackage.open(geopackageFileName)
    let feature = GeoPackage.getFeature(gp, featureTableName, featureRowId)
    return geojsonExtent(feature)
  }
}
