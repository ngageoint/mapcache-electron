import {
  FeatureTableStyles,
  GeometryType,
  FeatureStyleExtension,
  FeatureTiles,
  GeoPackageAPI
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import isEqual from 'lodash/isEqual'
import values from 'lodash/values'
import { performSafeGeoPackageOperation } from './GeoPackageCommon'
import { getDefaultIcon } from '../util/style/NodeStyleUtilities'
import { getDefaultMapCacheStyle } from '../util/style/CommonStyleUtilities'
import jetpack from 'fs-jetpack'
import path from 'path'
import fs from 'fs'

function _imageDataEqual (data1, data2) {
  let equal = true
  if (data1.length === data2.length) {
    for (let i = 0; i < data1.length; i++) {
      if (data1[i] !== data2[i]) {
        equal = false
        break
      }
    }
  } else {
    equal = false
  }
  return equal
}

/**
 * Adds or sets the style for a feature
 * @param gp
 * @param feature
 * @param rowId
 * @param tableName
 * @private
 */
function _addOrSetStyleForFeature (gp, feature, rowId, tableName) {
  if (!isNil(feature.style)) {
    const featureTableStyles = _addStyleExtensionForTable(gp, tableName)
    const geometryType = feature.geometry != null ? GeometryType.fromName(feature.geometry.type.toUpperCase()) : null
    if (feature.style.icon) {
      const newIcon = feature.style.icon
      const existingIcons = featureTableStyles.getIconDao().queryForAll()
      // if there is an icon matching my icons size, data, and anchor, use it, otherwise create a new icon and assign it to the feature
      const existingIconId = existingIcons.findIndex(icon => {
        return _imageDataEqual(icon.data, newIcon.data) && isEqual(icon.width, newIcon.width) && isEqual(icon.height, newIcon.height) && isEqual(icon.anchor_u, newIcon.anchorU) && isEqual(icon.anchor_v, newIcon.anchorV)
      })
      if (existingIconId !== -1) {
        const existingIcon = existingIcons[existingIconId]
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getIconMappingDao(), rowId, existingIcon.id, geometryType)
      } else {
        const iconId = _createIconRow(gp, tableName, newIcon)
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getIconMappingDao(), rowId, iconId, geometryType)
      }
    } else if (feature.style.style) {
      const newStyle = feature.style.style
      const existingStyles = featureTableStyles.getStyleDao().queryForAll()
      // if there is an existing style that matches the style i'm adding, use it, otherwise create a new style and assign it to the feature
      const existingStyleId = existingStyles.findIndex(style => style.color === newStyle.color && style.opacity === newStyle.opacity && style.fill_color === newStyle.fillColor && style.fill_opacity === newStyle.fillOpacity && style.width === newStyle.width)
      if (existingStyleId !== -1) {
        const existingStyle = existingStyles[existingStyleId]
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, existingStyle.id, geometryType)
      } else {
        const styleId = _createStyleRow(gp, tableName, newStyle)
        featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, styleId, geometryType)
      }
    }
    // else if (feature.isRangeRing) {
    //   // handle setting center point style
    //   const pointStyle = feature.style.pointStyle
    //   const existingStyles = featureTableStyles.getStyleDao().queryForAll()
    //   // if there is an existing style that matches the style i'm adding, use it, otherwise create a new style and assign it to the feature
    //   let existingStyleId = existingStyles.findIndex(style => style.color === pointStyle.color && style.opacity === pointStyle.opacity && style.fill_color === pointStyle.fillColor && style.fill_opacity === pointStyle.fillOpacity && style.width === pointStyle.width)
    //   if (existingStyleId !== -1) {
    //     const existingStyle = existingStyles[existingStyleId]
    //     featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, existingStyle.id, GeometryType.fromName('POINT'))
    //   } else {
    //     const styleId = _createStyleRow(gp, tableName, pointStyle)
    //     featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, styleId, GeometryType.fromName('POINT'))
    //   }
    //   // handle setting line style
    //   const lineStyle = feature.style.lineStyle
    //   // if there is an existing style that matches the style i'm adding, use it, otherwise create a new style and assign it to the feature
    //   existingStyleId = existingStyles.findIndex(style => style.color === lineStyle.color && style.opacity === lineStyle.opacity && style.fill_color === lineStyle.fillColor && style.fill_opacity === lineStyle.fillOpacity && style.width === lineStyle.width)
    //   if (existingStyleId !== -1) {
    //     const existingStyle = existingStyles[existingStyleId]
    //     featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, existingStyle.id, GeometryType.fromName('LINESTRING'))
    //   } else {
    //     const styleId = _createStyleRow(gp, tableName, lineStyle)
    //     featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getStyleMappingDao(), rowId, styleId, GeometryType.fromName('LINESTRING'))
    //   }
    // }
  }
}

/**
 * Adds the style extension to a feature table
 * @param gp
 * @param tableName
 */
function _addStyleExtensionForTable (gp, tableName) {
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
async function addStyleExtensionForTable (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _addStyleExtensionForTable(gp, tableName)
  })
}

/**
 * Removes the style extension from a feature table
 * @param gp
 * @param tableName
 */
function _removeStyleExtensionForTable (gp, tableName) {
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
async function removeStyleExtensionForTable (filePath, tableName) {
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
function _getTableStyle (gp, tableName, geometryType) {
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
async function getTableStyle (filePath, tableName, geometryType) {
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
function _getTableIcon (gp, tableName, geometryType) {
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
async function getTableIcon (filePath, tableName, geometryType) {
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
function _getIconById (gp, tableName, id) {
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
async function getIconById (filePath, tableName, id) {
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
function _getTableIconId (gp, tableName, geometryType) {
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
async function getTableIconId (filePath, tableName, geometryType) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getTableIconId(gp, tableName, geometryType)
  })
}


/**
 * Gets the feature's style or icon
 * @param gp
 * @param tableName
 * @param rowId
 * @returns {any}
 */
function _getFeatureStyleOrIcon (gp, tableName, rowId) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let featureDao = gp.getFeatureDao(tableName)
  let feature = featureDao.queryForId(rowId)
  const result = {
    style: null,
    icon: null
  }

  const icon = featureTableStyles.getFeatureStyleExtension().getIcon(tableName, rowId, isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
  if (icon != null) {
    result.icon = {
      anchorU: icon.anchorU,
      anchorV: icon.anchorV,
      contentType: icon.contentType,
      data: icon.data,
      description: icon.description,
      height: icon.height,
      name: icon.name,
      width: icon.width,
      url: 'data:' + icon.contentType + ';base64,' + Buffer.from(icon.data).toString('base64')
    }
  } else {
    const style = featureTableStyles.getFeatureStyleExtension().getStyle(tableName, rowId, isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()), false)
    if (style != null) {
      result.style = {
        color: style.getHexColor() || '#000000',
        opacity: style.getOpacity() || 1.0,
        fillColor: style.getFillHexColor() || '#000000',
        fillOpacity: style.getFillOpacity() || 1.0,
        width: style.getWidth() || 1.0,
        name: style.getName(),
        description: style.getDescription()
      }
      if (style.getFillHexColor() == null) {
        result.style.fillOpacity = 0.0
      }
    }
  }

  // style/icon not assigned for feature, try table style/icon
  if (result.style == null && result.icon == null) {
    const tableIcon = featureTableStyles.getFeatureStyleExtension().getTableIcon(tableName, isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()))
    if (tableIcon != null) {
      result.icon = {
        anchorU: tableIcon.anchorU,
        anchorV: tableIcon.anchorV,
        contentType: tableIcon.contentType,
        data: tableIcon.data,
        description: tableIcon.description,
        height: tableIcon.height,
        name: tableIcon.name,
        width: tableIcon.width,
        url: 'data:' + tableIcon.contentType + ';base64,' + Buffer.from(tableIcon.data).toString('base64')
      }
    } else {
      const tableStyle = featureTableStyles.getFeatureStyleExtension().getTableStyle(tableName, isNil(feature) ? null : GeometryType.fromName(feature.geometryType.toUpperCase()))
      if (tableStyle != null) {
        result.style = {
          color: tableStyle.getHexColor() || '#000000',
          opacity: tableStyle.getOpacity() || 1.0,
          fillColor: tableStyle.getFillHexColor() || '#000000',
          fillOpacity: tableStyle.getFillOpacity() || 1.0,
          width: tableStyle.getWidth() || 1.0,
          name: tableStyle.getName(),
          description: tableStyle.getDescription()
        }
        if (tableStyle.getFillHexColor() == null) {
          result.style.fillOpacity = 0.0
        }
      } else {
        // use default
        result.style = {
          color: '#000000',
          opacity: 1.0,
          fillColor: '#000000',
          fillOpacity: 0.2,
          width: 8.0,
          name: '',
          description: ''
        }
      }
    }
  }

  return result
}

/**
 * Gets the feature style
 * @param filePath
 * @param tableName
 * @param rowId
 * @returns {Promise<any>}
 */
async function getFeatureStyleOrIcon (filePath, tableName, rowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureStyleOrIcon(gp, tableName, rowId)
  })
}

/**
 * Gets the feature style
 * @param gp
 * @param tableName
 * @param rowId
 * @returns {StyleRow}
 */
function _getFeatureStyle (gp, tableName, rowId) {
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
async function getFeatureStyle (filePath, tableName, rowId) {
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
function _getFeatureIcon (gp, tableName, rowId) {
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
async function getFeatureIcon (filePath, tableName, rowId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getFeatureIcon(gp, tableName, rowId)
  })
}

/**
 * Gets the style rows for a table
 * @param gp
 * @param tableName
 */
function _getStyleRows (gp, tableName) {
  let styleRows = {}
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let styleDao = featureTableStyles.getStyleDao()
  if (!isNil(styleDao)) {
    styleDao.queryForAll().forEach((result) => {
      styleRows[result.id] = {
        id: result.id,
        name: result.name,
        description: result.description,
        color: result.color || '#000000',
        opacity: result.opacity || 1.0,
        fillColor: result.fill_color || '#000000',
        fillOpacity: result.fill_opacity || 1.0,
        width: result.width
      }
      if (result.fill_color == null) {
        styleRows[result.id].fillOpacity = 0.0
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
async function getStyleRows (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getStyleRows(gp, tableName)
  })
}

/**
 * Gets the style rows for a table
 * @param gp
 * @param tableName
 */
function _getStyleRowObjects (gp, tableName) {
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
 * Iterates over styles referenced by a feature table
 * @param gp
 * @param tableName
 * @param callback
 * @private
 */
function _iterateStyleRows (gp, tableName, callback) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let styleDao = featureTableStyles.getStyleDao()
  if (!isNil(styleDao)) {
    const each = styleDao.queryForEach()
    for (let row of each) {
      if (!isNil(row)) {
        callback(styleDao.createObject(row))
      }
    }
  }
}

/**
 * Iterates over icons referenced by a feature table
 * @param gp
 * @param tableName
 * @param callback
 * @private
 */
function _iterateIconRows (gp, tableName, callback) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  let iconDao = featureTableStyles.getIconDao()
  if (!isNil(iconDao)) {
    const each = iconDao.queryForEach()
    for (let row of each) {
      if (!isNil(row)) {
        callback(iconDao.createObject(row))
      }
    }
  }
}


/**
 * Iterates table style mappings
 * @param gp
 * @param tableName
 * @param callback
 * @private
 */
function _iterateTableStyleMappings (gp, tableName, callback) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  const tableStyleMappingDao = featureTableStyles.getFeatureStyleExtension().getTableStyleMappingDao(tableName)
  if (!isNil(tableStyleMappingDao)) {
    let each = tableStyleMappingDao.queryForEach()
    for (let row of each) {
      if (!isNil(row)) {
        callback(tableStyleMappingDao.createObject(row))
      }
    }
  }
}

function _iterateTableIconMappings (gp, tableName, callback) {
  let featureTableStyles = new FeatureTableStyles(gp, tableName)
  const tableIconMappingDao = featureTableStyles.getFeatureStyleExtension().getTableIconMappingDao(tableName)
  if (!isNil(tableIconMappingDao)) {
    let each = tableIconMappingDao.queryForEach()
    for (let row of each) {
      if (!isNil(row)) {
        callback(tableIconMappingDao.createObject(row))
      }
    }
  }
}

/**
 * Gets the icon rows for a table
 * @param gp
 * @param tableName
 */
function _getIconRows (gp, tableName) {
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
function _getIconRowObjects (gp, tableName) {
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
async function getIconRows (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getIconRows(gp, tableName)
  })
}

function _getStyleItemsForFeature (gp, tableName, rowId) {
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
async function getStyleItemsForFeature (filePath, tableName, rowId) {
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
function _getStyleAssignmentForFeatures (gp, tableName, featureIdAndGeometryTypes) {
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
async function getStyleAssignmentForFeatures (filePath, tableName, featureIdAndGeometryTypes) {
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
function _updateStyleRow (gp, tableName, styleRow) {
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
async function updateStyleRow (filePath, tableName, styleRow) {
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
function _updateIconRow (gp, tableName, iconRow) {
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
async function updateIconRow (filePath, tableName, iconRow) {
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
function _createStyleRow (gp, tableName, style = getDefaultMapCacheStyle()) {
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
async function createStyleRow (filePath, tableName, style) {
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
function _createIconRow (gp, tableName, icon = getDefaultIcon()) {
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
async function createIconRow (filePath, tableName, icon = getDefaultIcon()) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _createIconRow(gp, tableName, icon)
  })
}

/**
 * Deletes a style row
 * @param gp
 * @param styleId
 */
function _deleteStyleRow (gp, styleId) {
  gp.getFeatureTables().forEach(tableName => {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.deleteStyleAndMappingsByStyleRowId(styleId)
  })
}

/**
 * Deletes a style row
 * @param filePath
 * @param styleId
 * @returns {Promise<any>}
 */
async function deleteStyleRow (filePath, styleId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteStyleRow(gp, styleId)
  })
}

/**
 * Deletes an icon row
 * @param gp
 * @param iconId
 */
function _deleteIconRow (gp, iconId) {
  gp.getFeatureTables().forEach(tableName => {
    let featureTableStyles = new FeatureTableStyles(gp, tableName)
    featureTableStyles.deleteIconAndMappingsByIconRowId(iconId)
  })
}

/**
 * Deletes an icon row
 * @param filePath
 * @param iconId
 * @returns {Promise<any>}
 */
async function deleteIconRow (filePath, iconId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteIconRow(gp, iconId)
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
function _getFeatureStyleRow (gp, tableName, featureId, geometryType) {
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
async function getFeatureStyleRow (filePath, tableName, featureId, geometryType) {
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
function _getFeatureIconRow (gp, tableName, featureId, geometryType) {
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
async function getFeatureIconRow (filePath, tableName, featureId, geometryType) {
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
function _setTableStyle (gp, tableName, geometryType, styleId) {
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
async function setTableStyle (filePath, tableName, geometryType, styleId) {
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
function _setTableIcon (gp, tableName, geometryType, iconId) {
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
async function setTableIcon (filePath, tableName, geometryType, iconId) {
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
function _setFeatureStyle (gp, tableName, featureId, styleId) {
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
async function setFeatureStyle (filePath, tableName, featureId, styleId) {
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
function _clearStylingForFeature (gp, tableName, featureId) {
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
async function clearStylingForFeature (filePath, tableName, featureId) {
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
function _setFeatureIcon (gp, tableName, featureId, iconId) {
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
async function setFeatureIcon (filePath, tableName, featureId, iconId) {
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
function _getAllFeatureIdsAndGeometryTypes (gp, tableName) {
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
function _getFeatureStyleMapping (gp, tableName, checkForTableStyles = true, featureIdAndGeometryTypes) {
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

function _getStyleDrawOverlap (gp, tableName) {
  const featureDao = gp.getFeatureDao(tableName)
  const featureTiles = new FeatureTiles(featureDao)
  featureTiles.scale = 1.0
  return { width: featureTiles.widthOverlap, height: featureTiles.heightOverlap }
}

function getStyleDrawOverlap (filePath, tableName) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getStyleDrawOverlap(gp, tableName)
  })
}

function getIconImageData (file) {
  const fileInfo = jetpack.inspect(file, { times: true, absolutePath: true })
  let extension = path.extname(fileInfo.absolutePath).slice(1)
  if (extension === 'jpg') {
    extension = 'jpeg'
  }
  let url = 'data:image/' + extension + ';base64,' + fs.readFileSync(fileInfo.absolutePath).toString('base64')
  return { extension, url }
}

function determineAssignment (gp, tableName, geometryType) {
  const assignment = {
    icon: undefined,
    iconUrl: undefined,
    style: undefined
  }
  let style = _getTableStyle(gp, tableName, geometryType)
  let icon = _getTableIcon(gp, tableName, geometryType)
  if (!isNil(style)) {
    assignment.style = {
      id: style.id,
      name: style.getName(),
      description: style.getDescription(),
      color: style.getHexColor() || '#000000',
      opacity: style.getOpacity() || 1.0,
      fillColor: style.getFillHexColor() || '#000000',
      fillOpacity: style.getFillOpacity() || (style.getFillHexColor() == null ? 0.0 : 1.0),
      width: style.getWidth()
    }
  }
  if (!isNil(icon)) {
    assignment.icon = {
      anchorU: icon.anchorU,
      anchorV: icon.anchorV,
      contentType: icon.contentType,
      data: icon.data,
      description: icon.description,
      height: icon.height,
      id: icon.id,
      name: icon.name,
      width: icon.description,
      url: 'data:' + icon.contentType + ';base64,' + Buffer.from(icon.data).toString('base64')
    }
  }
  return assignment
}

async function getGeoPackageFeatureTableStyleData (filePath, tableName) {
  const result = {}
  result.styleRows = []
  result.iconRows = []
  result.pointAssignment = null
  result.lineAssignment = null
  result.polygonAssignment = null
  result.multipointAssignment = null
  result.multilineAssignment = null
  result.multipolygonAssignment = null
  result.geometryCollectionAssignment = null
  result.hasStyleExtension = false
  let gp
  try {
    gp = await GeoPackageAPI.open(filePath)
    result.hasStyleExtension = gp.featureStyleExtension.has(tableName)
    if (result.hasStyleExtension) {
      result.styleRows = Object.values(_getStyleRows(gp, tableName))
      result.iconRows = Object.values(_getIconRows(gp, tableName))
      if (result.styleRows.length + result.iconRows.length > 0) {
        result.pointAssignment = determineAssignment(gp, tableName, GeometryType.POINT)
        result.lineAssignment = determineAssignment(gp, tableName, GeometryType.LINESTRING)
        result.polygonAssignment = determineAssignment(gp, tableName, GeometryType.POLYGON)
        result.multipointAssignment = determineAssignment(gp, tableName, GeometryType.MULTIPOINT)
        result.multilineAssignment = determineAssignment(gp, tableName, GeometryType.MULTILINESTRING)
        result.multipolygonAssignment = determineAssignment(gp, tableName, GeometryType.MULTIPOLYGON)
        result.geometryCollectionAssignment = determineAssignment(gp, tableName, GeometryType.GEOMETRYCOLLECTION)
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get GeoPackage style.')
  } finally {
    try {
      gp.close()
      gp = undefined
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to close GeoPackage.')
    }
  }
  return result
}

async function hasStyleExtension (path, tableName) {
  let hasStyle = false
  let gp
  try {
    gp = await GeoPackageAPI.open(path)
    hasStyle = gp.featureStyleExtension.has(tableName)
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to determine if style extension is enabled.')
  }
  try {
    gp.close()
    gp = undefined
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to close geopackage.')
  }
  return hasStyle
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
  _getStyleRowObjects,
  _getIconRowObjects,
  getStyleDrawOverlap,
  _getStyleDrawOverlap,
  _addOrSetStyleForFeature,
  clearStylingForFeature,
  _clearStylingForFeature,
  hasStyleExtension,
  getGeoPackageFeatureTableStyleData,
  getIconImageData,
  getFeatureStyleOrIcon,
  _iterateStyleRows,
  _iterateIconRows,
  _iterateTableStyleMappings,
  _iterateTableIconMappings
}
