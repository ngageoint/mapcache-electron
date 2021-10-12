import {FeatureTableStyles, GeometryType, FeatureStyleExtension, FeatureTiles} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import isEqual from 'lodash/isEqual'
import values from 'lodash/values'
import { performSafeGeoPackageOperation } from './GeoPackageCommon'
import { getDefaultIcon } from '../util/style/NodeStyleUtilities'
import { getDefaultMapCacheStyle } from '../util/style/CommonStyleUtilities'

function _imageDataEqual (data1, data2) {
  let equal = true
  if (data1.length === data2.length) {
    for (let i = 0; i < data1.length; i++) {
      if (data1[i] !== data2[i]){
        equal = false
        break
      }
    }
  } else {
    equal = false
  }
  return equal
}

function _addOrSetStyleForFeature(gp, feature, rowId, tableName) {
  if (!isNil(feature.style)) {
    const featureTableStyles = _addStyleExtensionForTable(gp, tableName)
    if (feature.style.icon) {
      const newIcon = feature.style.icon
      const existingIcons = featureTableStyles.getIconDao().queryForAll()
      // if there is an icon matching my icons size, data, and anchor, use it, otherwise create a new icon and assign it to the feature
      const existingIconId = existingIcons.findIndex(icon => {
        return _imageDataEqual(icon.data, newIcon.data) && isEqual(icon.width, newIcon.width) && isEqual(icon.height, newIcon.height) && isEqual(icon.anchor_u, newIcon.anchorU) && isEqual(icon.anchor_v, newIcon.anchorV)
      })
      if (existingIconId !== -1) {
        const existingIcon = existingIcons[existingIconId]
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getIconMappingDao(), rowId, existingIcon.id, GeometryType.fromName(feature.geometry.type.toUpperCase()))
      } else {
        const iconId = _createIconRow(gp, tableName, newIcon)
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getIconMappingDao(), rowId, iconId, GeometryType.fromName(feature.geometry.type.toUpperCase()))
      }
    } else if (feature.style.style) {
      const newStyle = feature.style.style
      const existingStyles = featureTableStyles.getStyleDao().queryForAll()
      // if there is an existing style that matches the style i'm adding, use it, otherwise create a new style and assign it to the feature
      const existingStyleId = existingStyles.findIndex(style => style.color === newStyle.color && style.opacity === newStyle.opacity && style.fill_color === newStyle.fillColor && style.fill_opacity === newStyle.fillOpacity && style.width === newStyle.width)
      if (existingStyleId !== -1) {
        const existingStyle = existingStyles[existingStyleId]
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, existingStyle.id, GeometryType.fromName(feature.geometry.type.toUpperCase()))
      } else {
        const styleId = _createStyleRow(gp, tableName, newStyle)
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, styleId, GeometryType.fromName(feature.geometry.type.toUpperCase()))
      }
    }
  }
}

/**
 * Adds the style extension to a feature table
 * @param gp
 * @param tableName
 */
function _addStyleExtensionForTable(gp, tableName) {
  const featureTableStyles = new FeatureTableStyles(gp, tableName)
  featureTableStyles.getFeatureStyleExtension().getOrCreateExtension(tableName)
  featureTableStyles.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
  featureTableStyles.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
  if (!featureTableStyles.hasTableStyleRelationship()) {
    featureTableStyles.createTableStyleRelationship()
  }
  if (!featureTableStyles.hasTableIconRelationship()) {
    featureTableStyles.createTableIconRelationship()
  }
  if (!featureTableStyles.hasStyleRelationship()) {
    featureTableStyles.createStyleRelationship()
  }
  if (!featureTableStyles.hasIconRelationship()) {
    featureTableStyles.createIconRelationship()
  }
  return featureTableStyles
}

/**
 * Adds the style extension to a feature table
 * @param filePath
 * @param tableName
 * @returns {Promise<any>}
 */
async function addStyleExtensionForTable(filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _addStyleExtensionForTable(gp, tableName)
  })
}

/**
 * Removes the style extension from a feature table
 * @param gp
 * @param tableName
 */
function _removeStyleExtensionForTable(gp, tableName) {
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
async function removeStyleExtensionForTable(filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _removeStyleExtensionForTable(gp, tableName)
  })
}

/**
 * Gets the table style
 * @param gp
 * @param tableName
 * @param geometryType
 * @returns {StyleRow}
 */
function _getTableStyle(gp, tableName, geometryType) {
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
async function getTableStyle(filePath, tableName, geometryType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTableStyle(gp, tableName, geometryType)
  })
}

/**
 * Gets the table icon
 * @param gp
 * @param tableName
 * @param geometryType
 * @returns {IconRow}
 */
function _getTableIcon(gp, tableName, geometryType) {
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
async function getTableIcon(filePath, tableName, geometryType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTableIcon(gp, tableName, geometryType)
  })
}

/**
 * Gets the icon by id
 * @param gp
 * @param tableName
 * @param id
 * @returns {UserRow}
 */
function _getIconById(gp, tableName, id) {
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
async function getIconById(filePath, tableName, id) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getIconById(gp, tableName, id)
  })
}

/**
 * Gets the tableIcon's id
 * @param gp
 * @param tableName
 * @param geometryType
 * @returns {number}
 */
function _getTableIconId(gp, tableName, geometryType) {
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
async function getTableIconId(filePath, tableName, geometryType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTableIconId(gp, tableName, geometryType)
  })
}

/**
 * Gets the feature style
 * @param gp
 * @param tableName
 * @param rowId
 * @returns {StyleRow}
 */
function _getFeatureStyle(gp, tableName, rowId) {
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
async function getFeatureStyle(filePath, tableName, rowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureStyle(gp, tableName, rowId)
  })
}

/**
 * Gets the feature icon
 * @param gp
 * @param tableName
 * @param rowId
 * @returns {IconRow}
 */
function _getFeatureIcon(gp, tableName, rowId) {
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
async function getFeatureIcon(filePath, tableName, rowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureIcon(gp, tableName, rowId)
  })
}

/**
 * Gets the style rows for a table
 * @param gp
 * @param tableName
 */
function _getStyleRows(gp, tableName) {
  let styleRows = {}
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let styleDao = featureTableStyles.getStyleDao()
  if (!isNil(styleDao)) {
    styleDao.queryForAll().forEach((result) => {
      styleRows[result.id] = {
        id: result.id,
        name: result.name,
        description: result.description,
        color: result.color,
        opacity: result.opacity,
        fillColor: result.fill_color,
        fillOpacity: result.fill_opacity,
        width: result.width
      }
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
async function getStyleRows(filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getStyleRows(gp, tableName)
  })
}

/**
 * Gets the style rows for a table
 * @param gp
 * @param tableName
 */
function _getStyleRowObjects(gp, tableName) {
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
 * Gets the icon rows for a table
 * @param gp
 * @param tableName
 */
function _getIconRows(gp, tableName) {
  let iconRows = {}
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let iconDao = featureTableStyles.getIconDao()
  if (!isNil(iconDao)) {
    iconDao.queryForAll().forEach((result) => {
      iconRows[result.id] = {
        anchorU: result.anchor_u,
        anchorV: result.anchor_v,
        contentType: result.content_type,
        data: result.data,
        description: result.description,
        height: result.height,
        id: result.id,
        name: result.name,
        width: result.width,
        url: 'data:' + result.contentType + ';base64,' + Buffer.from(result.data).toString('base64')
      }
    })
  }
  return iconRows
}

/**
 * Gets the icon rows as icon row objects for a table
 * @param gp
 * @param tableName
 */
function _getIconRowObjects(gp, tableName) {
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
async function getIconRows(filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getIconRows(gp, tableName)
  })
}

function _getStyleItemsForFeature(gp, tableName, rowId) {
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
    result.styles = values(_getStyleRows(gp, tableName))
    const styleRow = featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, isNil(feature) ? null : geometryType, false)
    if (!isNil(styleRow)) {
      result.style = {
        id: styleRow.id,
        name: styleRow.name,
        description: styleRow.description,
        color: styleRow.color,
        opacity: styleRow.opacity,
        fillColor: styleRow.fill_color,
        fillOpacity: styleRow.fill_opacity,
        width: styleRow.width
      }
    }
    const allowIconSelection = geometryType === GeometryType.POINT || geometryType === GeometryType.MULTIPOINT
    if (allowIconSelection) {
      result.icons = values(_getIconRows(gp, tableName))
      const iconRow = featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, isNil(feature) ? null : geometryType, false)
      if (!isNil(iconRow)) {
        result.icon = {
          anchorU: iconRow.anchorU,
          anchorV: iconRow.anchorV,
          contentType: iconRow.contentType,
          data: iconRow.data,
          description: iconRow.description,
          height: iconRow.height,
          id: iconRow.id,
          name: iconRow.name,
          url: 'data:' + iconRow.contentType + ';base64,' + Buffer.from(iconRow.data).toString('base64'),
          width: iconRow.width
        }
      }
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
async function getStyleItemsForFeature(filePath, tableName, rowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getStyleItemsForFeature(gp, tableName, rowId)
  })
}

/**
 * Gets the assignment types for each feature
 * @param gp
 * @param tableName
 * @param featureIdAndGeometryTypes
 */
function _getStyleAssignmentForFeatures(gp, tableName, featureIdAndGeometryTypes) {
  let styleAssignmentMap = {}
  const hasStyleExtension = gp.featureStyleExtension.has(tableName)
  if (hasStyleExtension) {
    const styles = _getStyleRows(gp, tableName)
    const icons = _getIconRows(gp, tableName)
    const mappings = _getFeatureStyleMapping(gp, tableName, true, featureIdAndGeometryTypes)
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
 * @param featureIdAndGeometryTypes, null will search against all features
 * @returns {Promise<any>}
 */
async function getStyleAssignmentForFeatures(filePath, tableName, featureIdAndGeometryTypes) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getStyleAssignmentForFeatures(gp, tableName, featureIdAndGeometryTypes)
  })
}

/**
 * Updates a style row
 * @param gp
 * @param tableName
 * @param styleRow
 */
function _updateStyleRow(gp, tableName, styleRow) {
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
async function updateStyleRow(filePath, tableName, styleRow) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _updateStyleRow(gp, tableName, styleRow)
  })
}

/**
 * Updates an icon row
 * @param gp
 * @param tableName
 * @param iconRow
 */
function _updateIconRow(gp, tableName, iconRow) {
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
async function updateIconRow(filePath, tableName, iconRow) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _updateIconRow(gp, tableName, iconRow)
  })
}

/**
 * Creates a style row
 * @param gp
 * @param tableName
 * @param style
 */
function _createStyleRow(gp, tableName, style = getDefaultMapCacheStyle()) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let styleDao = featureTableStyles.getStyleDao()
  let styleRow = styleDao.newRow()
  styleRow.setColor(style.color, style.opacity)
  styleRow.setFillColor(style.fillColor, style.fillOpacity)
  styleRow.setWidth(style.width)
  styleRow.setName(style.name)
  styleRow.setDescription(style.description)
  return featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
}

/**
 * Creates a style row
 * @param filePath
 * @param tableName
 * @param style
 * @returns {Promise<any>}
 */
async function createStyleRow(filePath, tableName, style) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _createStyleRow(gp, tableName, style)
  })
}

/**
 * Creates an icon row
 * @param gp
 * @param tableName
 * @param icon
 */
function _createIconRow(gp, tableName, icon = getDefaultIcon()) {
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
  return featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(iconRow)
}

/**
 * Creates an icon row
 * @param filePath
 * @param tableName
 * @param icon
 * @returns {Promise<any>}
 */
async function createIconRow(filePath, tableName, icon = getDefaultIcon()) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _createIconRow(gp, tableName, icon)
  })
}

/**
 * Deletes a style row
 * @param gp
 * @param tableName
 * @param styleId
 */
function _deleteStyleRow(gp, tableName, styleId) {
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
async function deleteStyleRow(filePath, tableName, styleId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteStyleRow(gp, tableName, styleId)
  })
}

/**
 * Deletes an icon row
 * @param gp
 * @param tableName
 * @param iconId
 */
function _deleteIconRow(gp, tableName, iconId) {
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
async function deleteIconRow(filePath, tableName, iconId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteIconRow(gp, tableName, iconId)
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
function _getFeatureStyleRow(gp, tableName, featureId, geometryType) {
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
async function getFeatureStyleRow(filePath, tableName, featureId, geometryType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureStyleRow(gp, tableName, featureId, geometryType)
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
function _getFeatureIconRow(gp, tableName, featureId, geometryType) {
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
async function getFeatureIconRow(filePath, tableName, featureId, geometryType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureIconRow(gp, tableName, featureId, geometryType)
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
function _setTableStyle(gp, tableName, geometryType, styleId) {
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
async function setTableStyle(filePath, tableName, geometryType, styleId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _setTableStyle(gp, tableName, geometryType, styleId)
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
function _setTableIcon(gp, tableName, geometryType, iconId) {
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
async function setTableIcon(filePath, tableName, geometryType, iconId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _setTableIcon(gp, tableName, geometryType, iconId)
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
function _setFeatureStyle(gp, tableName, featureId, styleId) {
  const featureDao = gp.getFeatureDao(tableName)
  const feature = featureDao.queryForId(featureId)
  const featureTableStyles = new FeatureTableStyles(gp, tableName)
  const geometryType = GeometryType.fromName(feature.geometryType.toUpperCase())
  if (styleId === -1) {
    return featureTableStyles.getFeatureStyleExtension().setStyle(tableName, featureId, geometryType, null)
  } else {
    let style = featureTableStyles.getStyleDao().queryForId(styleId)
    featureTableStyles.getFeatureStyleExtension().setIcon(tableName, featureId, geometryType, null)
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
async function setFeatureStyle(filePath, tableName, featureId, styleId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _setFeatureStyle(gp, tableName, featureId, styleId)
  })
}

/**
 * Sets a feature style
 * @param gp
 * @param tableName
 * @param featureId
 */
function _clearStylingForFeature(gp, tableName, featureId) {
  const featureDao = gp.getFeatureDao(tableName)
  const feature = featureDao.queryForId(featureId)
  const featureTableStyles = new FeatureTableStyles(gp, tableName)
  if (featureTableStyles.has()) {
    const geometryType = GeometryType.fromName(feature.geometryType.toUpperCase())
    if (featureTableStyles.hasStyleRelationship()) {
      featureTableStyles.getFeatureStyleExtension().setStyle(tableName, featureId, geometryType, null)
      featureTableStyles.getFeatureStyleExtension().setStyle(tableName, featureId, null, null)
    }
    if (featureTableStyles.hasIconRelationship()) {
      featureTableStyles.getFeatureStyleExtension().setIcon(tableName, featureId, geometryType, null)
      featureTableStyles.getFeatureStyleExtension().setIcon(tableName, featureId, null, null)
    }
  }
}

/**
 * clears a feature's styling
 * @param filePath
 * @param tableName
 * @param featureId
 * @returns {Promise<any>}
 */
async function clearStylingForFeature(filePath, tableName, featureId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _clearStylingForFeature(gp, tableName, featureId)
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
function _setFeatureIcon(gp, tableName, featureId, iconId) {
  const featureDao = gp.getFeatureDao(tableName)
  const featureTableStyles = new FeatureTableStyles(gp, tableName)
  const feature = featureDao.queryForId(featureId)
  const geometryType = GeometryType.fromName(feature.geometryType.toUpperCase())
  if (iconId === -1) {
    return featureTableStyles.getFeatureStyleExtension().setIcon(tableName, featureId, geometryType, null)
  } else {
    let icon = featureTableStyles.getIconDao().queryForId(iconId)
    featureTableStyles.getFeatureStyleExtension().setStyle(tableName, featureId, geometryType, null)
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
async function setFeatureIcon(filePath, tableName, featureId, iconId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _setFeatureIcon(gp, tableName, featureId, iconId)
  })
}

/**
 * Gets all features id's and respective geometry types
 * @param gp
 * @param tableName
 * @returns {any[]}
 */
function _getAllFeatureIdsAndGeometryTypes(gp, tableName) {
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
 * @param featureIdAndGeometryTypes - feature ids to filter with
 */
function _getFeatureStyleMapping(gp, tableName, checkForTableStyles = true, featureIdAndGeometryTypes) {
  const featureTableStyles = new FeatureTableStyles(gp, tableName)
  const filter = featureIdAndGeometryTypes != null
  const features = featureIdAndGeometryTypes || _getAllFeatureIdsAndGeometryTypes(gp, tableName)
  const featureStyleMapping = {}
  const styleMappingDao = featureTableStyles.getFeatureStyleExtension().getStyleMappingDao(tableName)
  let styleMappings = []
  if (!isNil(styleMappingDao)) {
    styleMappings = (filter ? featureIdAndGeometryTypes.flatMap(f => styleMappingDao.queryByBaseId(f.id)).filter(mapping => mapping != null) : styleMappingDao.queryForAll()).map(record => {
      return {
        featureId: record.base_id,
        id: record.related_id
      }
    })
  }
  const iconMappingDao = featureTableStyles.getFeatureStyleExtension().getIconMappingDao(tableName)
  let iconMappings = []
  if (!isNil(iconMappingDao)) {
    iconMappings = (filter ? featureIdAndGeometryTypes.flatMap(f => iconMappingDao.queryByBaseId(f.id)).filter(mapping => mapping != null) : iconMappingDao.queryForAll()).map(record => {
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
    } else if (!isNil(featureStyle)) {
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
function _getTableStyleMappings(gp, tableName) {
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

function _getStyleDrawOverlap (gp, tableName) {
  const featureDao = gp.getFeatureDao(tableName)
  const featureTiles = new FeatureTiles(featureDao)
  return {width: featureTiles.widthOverlap, height: featureTiles.heightOverlap}
}

function getStyleDrawOverlap (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getStyleDrawOverlap(gp, tableName)
  })
}

/**
 * GeoPackage Style Utilities is a utility class to support utilizing the NGA Style Extension for GeoPackage feature tables.
 */
export {
  _addStyleExtensionForTable,
  addStyleExtensionForTable,
  _removeStyleExtensionForTable,
  removeStyleExtensionForTable,
  _getTableStyle,
  getTableStyle,
  _getTableIcon,
  getTableIcon,
  _getIconById,
  getIconById,
  _getTableIconId,
  getTableIconId,
  _getFeatureStyle,
  getFeatureStyle,
  _getFeatureIcon,
  getFeatureIcon,
  _getStyleRows,
  getStyleRows,
  _getIconRows,
  getIconRows,
  _getStyleItemsForFeature,
  getStyleItemsForFeature,
  _getStyleAssignmentForFeatures,
  getStyleAssignmentForFeatures,
  _updateStyleRow,
  updateStyleRow,
  _updateIconRow,
  updateIconRow,
  _createStyleRow,
  createStyleRow,
  _createIconRow,
  createIconRow,
  _deleteStyleRow,
  deleteStyleRow,
  _deleteIconRow,
  deleteIconRow,
  _getFeatureStyleRow,
  getFeatureStyleRow,
  _getFeatureIconRow,
  getFeatureIconRow,
  _setTableStyle,
  setTableStyle,
  _setTableIcon,
  setTableIcon,
  _setFeatureStyle,
  setFeatureStyle,
  _setFeatureIcon,
  setFeatureIcon,
  _getAllFeatureIdsAndGeometryTypes,
  _getFeatureStyleMapping,
  _getTableStyleMappings,
  _getStyleRowObjects,
  _getIconRowObjects,
  getStyleDrawOverlap,
  _getStyleDrawOverlap,
  _addOrSetStyleForFeature,
  clearStylingForFeature,
  _clearStylingForFeature
}
