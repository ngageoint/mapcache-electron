import { FeatureTableStyles, GeometryType, FeatureStyleExtension } from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import values from 'lodash/values'
import GeoPackageCommon from './GeoPackageCommon'
import VectorStyleUtilities from '../util/VectorStyleUtilities'

/**
 * GeoPackage Style Utilities is a utility class to support utilizing the NGA Style Extension for GeoPackage feature tables.
 */
export default class GeoPackageStyleUtilities {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._addStyleExtensionForTable(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._removeStyleExtensionForTable(gp, tableName)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getTableStyle(gp, tableName, geometryType)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getTableIcon(gp, tableName, geometryType)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getIconById(gp, tableName, id)
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
    if (!isNil(icon)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getTableIconId(gp, tableName, geometryType)
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
    return featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  }

  /**
   * Gets the feature style
   * @param filePath
   * @param tableName
   * @param rowId
   * @returns {Promise<any>}
   */
  static async getFeatureStyle (filePath, tableName, rowId) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getFeatureStyle(gp, tableName, rowId)
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
    return featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  }

  /**
   * Gets the feature icon
   * @param filePath
   * @param tableName
   * @param rowId
   * @returns {Promise<any>}
   */
  static async getFeatureIcon (filePath, tableName, rowId) {
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getFeatureIcon(gp, tableName, rowId)
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
    if (!isNil(styleDao)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getStyleRows(gp, tableName)
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
    if (!isNil(iconDao)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getIconRows(gp, tableName)
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
      const styleRows = GeoPackageStyleUtilities._getStyleRows(gp, tableName)
      result.styles = values(styleRows).map(style => {
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
      result.style = featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, isNil(feature) ? null : geometryType, false)
      const allowIconSelection = geometryType === GeometryType.POINT || geometryType === GeometryType.MULTIPOINT
      if (allowIconSelection) {
        const iconRows = GeoPackageStyleUtilities._getIconRows(gp, tableName)
        result.icons = values(iconRows).map(icon => {
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
        result.icon = featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, isNil(feature) ? null : geometryType, false)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getStyleItemsForFeature(gp, tableName, rowId)
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
      const styles = GeoPackageStyleUtilities._getStyleRows(gp, tableName)
      const icons = GeoPackageStyleUtilities._getIconRows(gp, tableName)
      const mappings = GeoPackageStyleUtilities._getFeatureStyleMapping(gp, tableName, true)
      Object.keys(mappings).forEach(featureId => {
        let style
        let icon
        const mapping = mappings[featureId]
        if (!isNil(mapping.styleId)) {
          style = styles[mapping.styleId.id]
        }
        if (!isNil(mapping.iconId)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getStyleAssignmentForFeatures(gp, tableName)
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
      return GeoPackageStyleUtilities._updateStyleRow(gp, tableName, styleRow)
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
      return GeoPackageStyleUtilities._updateIconRow(gp, tableName, iconRow)
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
      return GeoPackageStyleUtilities._createStyleRow(gp, tableName, style)
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
      return GeoPackageStyleUtilities._createIconRow(gp, tableName, icon)
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
      return GeoPackageStyleUtilities._deleteStyleRow(gp, tableName, styleId)
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
      return GeoPackageStyleUtilities._deleteIconRow(gp, tableName, iconId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getFeatureStyleRow(gp, tableName, featureId, geometryType)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._getFeatureIconRow(gp, tableName, featureId, geometryType)
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
      if (!isNil(style)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._setTableStyle(gp, tableName, geometryType, styleId)
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
      if (!isNil(icon)) {
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._setTableIcon(gp, tableName, geometryType, iconId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._setFeatureStyle(gp, tableName, featureId, styleId)
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
    return GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      return GeoPackageStyleUtilities._setFeatureIcon(gp, tableName, featureId, iconId)
    })
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
      if (!isNil(row)) {
        const featureRow = featureDao.getRow(row)
        const geometry = featureRow.geometry
        let geometryType = GeometryType.GEOMETRY
        if (!isNil(geometry) && !geometry.empty && geometry.geometry) {
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
   * Gets mapping of featureRows -> respective styles
   * @param gp
   * @param tableName
   * @param checkForTableStyles
   *
   */
  static _getFeatureStyleMapping(gp, tableName, checkForTableStyles = true) {
    const featureTableStyles = new FeatureTableStyles(gp, tableName)
    const features = GeoPackageStyleUtilities._getAllFeatureIdsAndGeometryTypes(gp, tableName)
    const featureStyleMapping = {}
    const styleMappingDao = featureTableStyles.getFeatureStyleExtension().getStyleMappingDao(tableName)
    let styleMappings = []
    if (!isNil(styleMappingDao)) {
      styleMappings = styleMappingDao.queryForAll().map(record => {
        return {
          featureId: record.base_id,
          id: record.related_id
        }
      })
    }
    const iconMappingDao = featureTableStyles.getFeatureStyleExtension().getIconMappingDao(tableName)
    let iconMappings = []
    if (!isNil(iconMappingDao)) {
      iconMappings = iconMappingDao.queryForAll().map(record => {
        return {
          featureId: record.base_id,
          id: record.related_id
        }
      })
    }
    const tableStyleMappingDao = featureTableStyles.getFeatureStyleExtension().getTableStyleMappingDao(tableName)
    let tableStyleMappings = []
    if (!isNil(tableStyleMappingDao)) {
      tableStyleMappings = tableStyleMappingDao.queryForAll().map(record => {
        return {
          id: record.related_id,
          geometryType: GeometryType.fromName(record.geometry_type_name)
        }
      })
    }
    const tableIconMappingDao = featureTableStyles.getFeatureStyleExtension().getTableIconMappingDao(tableName)
    let tableIconMappings = []
    if (!isNil(tableIconMappingDao)) {
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
      if (!isNil(featureIcon)) {
        featureStyleMapping[feature.id].iconId = featureIcon
        featureStyleMapping[feature.id].styleId = null
      }
      if (!isNil(featureStyle)) {
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
    if (!isNil(tableStyleMappingDao)) {
      tableStyleMappings = tableStyleMappingDao.queryForAll().map(record => {
        return {
          id: record.related_id,
          geometryType: GeometryType.fromName(record.geometry_type_name)
        }
      })
    }
    const tableIconMappingDao = featureTableStyles.getFeatureStyleExtension().getTableIconMappingDao(tableName)
    let tableIconMappings = []
    if (!isNil(tableIconMappingDao)) {
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
}
