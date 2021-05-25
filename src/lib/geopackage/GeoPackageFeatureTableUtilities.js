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
import GeoPackageCommon from './GeoPackageCommon'
import VectorStyleUtilities from '../util/VectorStyleUtilities'

export default class GeoPackageFeatureTableUtilities {
  /**
   * Links a feature row to a media row
   * @param gp
   * @param baseTableName
   * @param baseId
   * @param relatedTableName
   * @param relatedId
   * @returns {number}
   */
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
      GeoPackageFeatureTableUtilities._updateBoundingBoxForFeatureTable(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._updateFeatureGeometry(gp, tableName, featureGeoJson, updateBoundingBox)
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
        if (!isNil(feature.properties[column.getName()]) && !isEmpty(feature.properties[column.getName()])) {
          feature.properties[column.getName()] = moment.utc(feature.properties[column.getName()]).toDate()
        } else {
          delete feature.properties[column.getName()]
        }
      }
    })
    gp.addGeoJSONFeatureToGeoPackage(feature, tableName, true)
    if (updateBoundingBox) {
      GeoPackageFeatureTableUtilities._updateBoundingBoxForFeatureTable(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._addFeatureToFeatureTable(gp, tableName, feature)
    })
  }

  /**
   * Gets columns for a feature table using the feature collection provided
   * @param featureCollection
   * @returns {{columns: Array, id: {name: string}, geom: {name: string}}}
   */
  static getLayerColumns (featureCollection) {
    let properties = {}
    featureCollection.features.forEach(feature => {
      GeoPackageFeatureTableUtilities.addFeatureProperties(feature, properties)
    })
    let columns = []
    Object.keys(properties).forEach(key => {
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
    if (isNil(fields)) {
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
    let layerColumns = isNil(fields) ? GeoPackageFeatureTableUtilities.getLayerColumns(featureCollection) : {
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
        GeoPackageFeatureTableUtilities._addFeatureToFeatureTable(gp, tableName, feature)
      })
    }
    await GeoPackageFeatureTableUtilities._indexFeatureTable(gp, tableName)
  }

  /**
   * Creates a feature table
   * @param filePath
   * @param tableName
   * @param featureCollection
   * @returns {Promise<any>}
   */
  static async createFeatureTable (filePath, tableName, featureCollection) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._createFeatureTable(gp, tableName, featureCollection, true)
    }, true)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._indexFeatureTable(gp, tableName, force)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getFeatureIds(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getPointAndMultiPointFeatureIds(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._renameGeoPackageFeatureTableColumn(gp, tableName, columnName, newColumnName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._deleteGeoPackageFeatureTableColumn(gp, tableName, columnName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._addGeoPackageFeatureTableColumn(gp, tableName, columnName, columnType)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._updateStyleRow(gp, tableName, styleRow)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._updateIconRow(gp, tableName, iconRow)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._createStyleRow(gp, tableName, style)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._createIconRow(gp, tableName, icon)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._deleteStyleRow(gp, tableName, styleId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._deleteIconRow(gp, tableName, iconId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._updateFeatureRow(gp, tableName, featureRow)
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
    GeoPackageFeatureTableUtilities._updateBoundingBoxForFeatureTable(gp, tableName)
  }

  /**
   * Delets a feature row
   * @param filePath
   * @param tableName
   * @param featureRowId
   * @returns {Promise<any>}
   */
  static async deleteFeatureRow (filePath, tableName, featureRowId) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._deleteFeatureRow(gp, tableName, featureRowId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getBoundingBoxForFeature(gp, tableName, featureRowId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._updateBoundingBoxForFeatureTable(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getFeatureCountInBoundingBox(gp, tableName, boundingBox)
    })
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
      if (!isNil(row)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getAllFeaturesAsGeoJSON(gp, tableName)
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
          featureRow.geometry.setGeometry(GeoPackageCommon.projectGeometryTo4326(featureRow.geometry, srs))
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getAllFeatureRowsIn4326(gp, tableName, srsId, boundingBox)
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
  static async getAllFeatureRows (filePath, tableName) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getAllFeatureRows(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getFeatureRow(gp, tableName, id)
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
  static _queryForFeaturesAt (gp, tableName, coordinate, zoom) {
    let features
    if (gp.getFeatureDao(tableName).isIndexed()) {
      features = gp.queryForGeoJSONFeaturesInTable(tableName, GeoPackageCommon.getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom)).filter(feature => !isNil(feature))
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._queryForFeaturesAt(gp, tableName, coordinate, zoom)
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
        count += featureDao.countInBoundingBox(GeoPackageCommon.getQueryBoundingBoxForCoordinateAndZoom(coordinate, zoom), 'EPSG:4326')
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._countOfFeaturesAt(gp, tableNames, coordinate, zoom)
    })
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._getFeatureColumns(gp, tableName)
    })
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
  static async featureExists (filePath, tableName, featureId) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageFeatureTableUtilities._featureExists(gp, tableName, featureId)
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
      await GeoPackageFeatureTableUtilities._createFeatureTable(gp, tableName, featureCollection, fields)

      let featureTableStyles
      if (!isNil(style)) {
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
          keys(feature.properties).forEach(key => {
            if (isObject(feature.properties[key])) {
              delete feature.properties[key]
            }
          })
        }
        let featureRowId = gp.addGeoJSONFeatureToGeoPackage(feature, tableName)
        if (!isNil(style) && !isNil(style.features[feature.id])) {
          const geometryType = GeometryType.fromName(feature.geometry.type.toUpperCase())
          if (!isNil(style.features[feature.id].icon)) {
            let iconId = style.features[feature.id].icon
            let featureIconRow = icons[iconId]
            if (isNil(featureIconRow)) {
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
          } else if (!isNil(style.features[feature.id].style)) {
            let styleId = style.features[feature.id].style
            let featureStyleRow = styles[styleId]
            if (isNil(featureStyleRow)) {
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
      await GeoPackageFeatureTableUtilities._indexFeatureTable(gp, tableName)
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to index feature table.')
    }
    try {
      gp.close()
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to close GeoPackage')
    }
  }
}
