import {
  BoundingBox,
  FeatureTableStyles,
  GeometryType,
  GeoPackage,
  GeoPackageDataType,
  IconTable,
  MediaTable
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import { performSafeGeoPackageOperation, deleteGeoPackageTable } from './GeoPackageCommon'
import {
  getFeatureColumns,
  _createFeatureTableWithFeatureStream
} from './GeoPackageFeatureTableUtilities'
import {
  _iterateTableStyleMappings,
  _iterateTableIconMappings,
} from './GeoPackageStyleUtilities'
import { _getMediaRow } from './GeoPackageMediaUtilities'
import { getMediaTableName } from '../util/media/MediaUtilities'
import { WORLD_GEODETIC_SYSTEM } from '../projection/ProjectionConstants'
import { sleep } from '../util/common/CommonUtilities'

/**
 * GeoPackgeFeatureTableBuilder handles building a feature layer using other GeoPackage layers and data sources
 */

/**
 * Determines if a data type is a number type
 * @param dataType
 * @returns {boolean}
 */
function isNumberType (dataType) {
  return dataType === GeoPackageDataType.TINYINT ||
    dataType === GeoPackageDataType.SMALLINT ||
    dataType === GeoPackageDataType.MEDIUMINT ||
    dataType === GeoPackageDataType.INT ||
    dataType === GeoPackageDataType.INTEGER ||
    dataType === GeoPackageDataType.FLOAT ||
    dataType === GeoPackageDataType.DOUBLE ||
    dataType === GeoPackageDataType.REAL
}

function getUserFriendlyColumnTypeName (dataType) {
  if (isNumberType(dataType)) {
    return '(Number)'
  } else if (dataType === GeoPackageDataType.DATE) {
    return '(Date)'
  } else if (dataType === GeoPackageDataType.DATETIME) {
    return '(Date and time)'
  } else if (dataType === GeoPackageDataType.TEXT) {
    return '(Text)'
  } else if (dataType === GeoPackageDataType.BOOLEAN) {
    return '(Checkbox)'
  } else {
    return '(Media)'
  }
}

/**
 * Determines columns to add to the target table and adds them. Returns objects for tracking
 * source => target name changes, and functions for ensuring data is valid, and tracking which columns are not null
 * @param layers
 * @param addField
 * @returns {Promise<{targetColumns: {}, tableColumnMapping: {}}>}
 */
async function addTargetColumns (layers, addField) {
  // determine the target table's columns
  const targetColumns = {}
  const tableColumnMapping = {}

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    let layerTableName, filePath
    const isGeoPackageLayer = !isNil(layer.geopackage)
    if (isGeoPackageLayer) {
      layerTableName = layer.table
      filePath = layer.geopackage.path

    } else {
      layerTableName = layer.sourceLayerName
      filePath = layer.geopackageFilePath
    }

    tableColumnMapping[layer._id] = {}

    const featureColumns = await getFeatureColumns(filePath, layerTableName)
    featureColumns.getColumns().filter(column => !column.isPrimaryKey() && !column.isGeometry()).map(c => {
      // copy column but remove all constraints
      const copy = c.copy()
      copy.unique = false
      copy.max = undefined
      copy.min = undefined
      copy.notNull = false
      copy.defaultValue = undefined
      if (copy.constraints != null) {
        copy.constraints.clear()
      }
      return copy
    }).forEach(column => {
      let readyToAdd = false
      let foundMatch = false
      let typeNameSet = false
      const sourceColumnName = column.getName()
      let targetColumnName = column.getName()
      let duplicateIndex = 1
      while (!readyToAdd && !foundMatch) {
        const existingColumn = targetColumns[targetColumnName.toLowerCase()]
        if (isNil(existingColumn)) {
          readyToAdd = true
        } else if (existingColumn.dataType !== column.dataType) {
          if (isNumberType(column.dataType) && isNumberType(existingColumn.dataType)) {
            existingColumn.dataType = Math.max(column.dataType, existingColumn.dataType)
            targetColumnName = existingColumn.getName()
            foundMatch = true
          } else {
            if (typeNameSet) {
              targetColumnName = sourceColumnName + ' #' + duplicateIndex++
            } else {
              targetColumnName = sourceColumnName + ' ' + getUserFriendlyColumnTypeName(column.dataType)
              typeNameSet = true
            }
            column.setName(targetColumnName)
          }
        } else {
          targetColumnName = existingColumn.getName()
          foundMatch = true
        }
      }

      if (readyToAdd) {
        // add this target column
        addField(column)
        // track target columns here to handle any conflicts
        targetColumns[targetColumnName.toLowerCase()] = column
      }

      // track name => target table name
      tableColumnMapping[layer._id][sourceColumnName.toLowerCase()] = targetColumnName
    })
  }

  return { targetColumns, tableColumnMapping }
}

/**
 * Get feature counts for each layer
 * @param layers
 * @param boundingBoxFilter
 * @returns {Promise<{}>}
 */
async function getTableFeatureCounts (layers, boundingBoxFilter) {
  const featureTableCountMap = {}
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    let layerTableName, filePath
    const isGeoPackageLayer = !isNil(layer.geopackage)
    if (isGeoPackageLayer) {
      layerTableName = layer.table
      filePath = layer.geopackage.path
    } else {
      layerTableName = layer.sourceLayerName
      filePath = layer.geopackageFilePath
    }

    await performSafeGeoPackageOperation(filePath, async (layerGeoPackage) => {
      const featureDao = layerGeoPackage.getFeatureDao(layerTableName)
      let count
      if (!isNil(boundingBoxFilter) && !isNil(featureDao.featureTableIndex) && featureDao.isIndexed()) {
        count = featureDao.featureTableIndex.countWithBoundingBox(boundingBoxFilter, WORLD_GEODETIC_SYSTEM)
      } else {
        count = featureDao.count()
      }
      featureTableCountMap[layer._id] = count
    })
  }
  return featureTableCountMap
}

/**
 * Builds a feature layer by merging together all the features from the provides sources
 * Current limitations of merging feature tables:
 *  - table constraints are not merged
 *  - unique constraints are dropped
 *  - check constraints are dropped
 *  - collate constraints are dropped
 *  - related tables, other than media/styles are not copied to target GeoPackage
 *  - table styles will need to be associated to each feature in order to preserve the look (unless only one layer is being used)
 * @param configuration
 * @param statusCallback
 * @returns {Promise<*>}
 */
async function buildFeatureLayer (configuration, statusCallback) {
  return performSafeGeoPackageOperation(configuration.path, async (gp) => {
    const tableName = configuration.table
    // only issue an update every 100ms
    statusCallback('Starting build', 0.0)

    await sleep(1000)

    let currentStatusPercentage = 0.0

    try {
      // get bounding box filter
      let boundingBoxFilter
      if (configuration.boundingBoxFilter) {
        boundingBoxFilter = new BoundingBox(configuration.boundingBoxFilter[0], configuration.boundingBoxFilter[2], configuration.boundingBoxFilter[1], configuration.boundingBoxFilter[3])
      }

      statusCallback('Creating table', 5.0)
      currentStatusPercentage = 5.0
      await sleep(1000)

      // start streaming build for tableName
      const {
        adjustBatchSize,
        addField,
        addFeature,
        addStyle,
        addIcon,
        setFeatureStyle,
        setFeatureIcon,
        addMediaAttachment,
        setTableStyle,
        setTableIcon,
        processBatch,
        done
      } = await _createFeatureTableWithFeatureStream(gp, tableName)

      statusCallback('Merging and adding fields', 10.0)
      currentStatusPercentage = 10.0
      await sleep(1000)

      // get all layers into a list
      const layers = configuration.layerOrder.reverse().map(id => {
        const sourceLayer = configuration.sourceLayers.find(layer => layer.id === id)
        const geopackageLayer = configuration.geopackageLayers.find(layer => (layer.geopackage.id + '_' + layer.table) === id)
        if (sourceLayer != null) {
          return sourceLayer
        } else {
          return geopackageLayer
        }
      })

      // add an id value we can key off of
      layers.forEach((layer, index) => layer._id = index)

      const isSingleLayer = layers.length === 1

      // merge columns from source tables and add them to target table
      const { tableColumnMapping } = await addTargetColumns(layers, addField)

      // get feature counts
      const tableFeatureCountMap = await getTableFeatureCounts(layers, boundingBoxFilter)

      const targetFeatureTableStyles = new FeatureTableStyles(gp, tableName)

      // feature progress tracking variables
      let featuresAdded = 0
      let totalFeaturesToAdd = Object.values(tableFeatureCountMap).reduce((a, b) => (a + b))

      // media tracking
      let targetMediaDao = null
      let insertedMediaMap = {} // this has potential to get very large if there are a lot of features with media
      const mediaTableName = getMediaTableName()

      // style/icon tracking
      const styleIdMap = {} // this has the potential to get very large if there are a lot of features with

      statusCallback('Copying features', 15.0)
      currentStatusPercentage = 15.0

      // add features from souce tables to target table
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i]
        const layerId = layer._id
        let layerInTargetGeoPackage = false
        let layerTableName, layerFilePath
        const isGeoPackageLayer = !isNil(layer.geopackage)
        if (isGeoPackageLayer) {
          layerTableName = layer.table
          layerFilePath = layer.geopackage.path
          layerInTargetGeoPackage = layer.geopackage.id === configuration.geopackageId
        } else {
          layerTableName = layer.sourceLayerName
          layerFilePath = layer.geopackageFilePath
        }

        const addFeaturesToGeoPackage = async (layerGeoPackage) => {
          const featureDao = layerGeoPackage.getFeatureDao(layerTableName)

          // get media relations
          const mediaRelations = []
          if (layerGeoPackage.relatedTablesExtension.has()) {
            featureDao.mediaRelations.forEach(mediaRelation => {
              if (!mediaRelation.mapping_table_name.startsWith(IconTable.TABLE_NAME)) {
                mediaRelations.push({
                  mediaTable: mediaRelation.related_table_name,
                  mappingDao: layerGeoPackage.relatedTablesExtension.getMappingDao(mediaRelation.mapping_table_name)
                })
              }
            })
          }

          // create media table if it hasn't already been
          if (mediaRelations.length > 0 && targetMediaDao == null) {
            const rte = gp.relatedTablesExtension
            if (!gp.connection.isTableExists(mediaTableName)) {
              const mediaTable = MediaTable.create(mediaTableName)
              rte.createRelatedTable(mediaTable)
            }
            targetMediaDao = gp.relatedTablesExtension.getMediaDao(mediaTableName)
          }

          // get feature table styles
          let featureTableStyles = new FeatureTableStyles(layerGeoPackage, layerTableName)
          const hasStylesOrIcons = featureTableStyles.has()

          // setup the style source to target id map
          if (styleIdMap[layerFilePath] == null) {
            styleIdMap[layerFilePath] = {
              style: {},
              icon: {}
            }
          }

          // create functions for checking for valid styles or adding new styles to the target (if needed)
          let checkForCompatibleStyleOrAdd = (style) => {
            let targetStyleId
            const results = targetFeatureTableStyles.getStyleDao().queryWhere('width = ? and color = ? and opacity = ? and fill_color = ? and fill_opacity = ?', [style.getWidth(), style.getHexColor(), style.getOpacity(), style.getFillHexColor(), style.getFillOpacity()])
            let foundMatch = false
            for (let result of results) {
              if (result != null) {
                foundMatch = true
                targetStyleId = result.id
              }
            }
            // didn't find a match so we need to insert this icon
            if (!foundMatch) {
              targetStyleId = addStyle(style)
            }
            return targetStyleId
          }
          let checkForCompatibleIconOrAdd = (icon) => {
            let targetIconId
            const results = targetFeatureTableStyles.getIconDao().queryWhere('width = ? and height = ? and anchor_u = ? and anchor_v = ? and data = ?', [icon.width, icon.height, icon.anchorU, icon.anchorV, icon.data])
            let foundMatch = false
            for (let result of results) {
              if (result != null) {
                foundMatch = true
                targetIconId = result.id
              }
            }
            // didn't find a match so we need to insert this icon
            if (!foundMatch) {
              targetIconId = addIcon(icon)
            }
            return targetIconId
          }

          // handle case where we want to set default table styles
          if (isSingleLayer) {
            if (layerInTargetGeoPackage) {
              _iterateTableStyleMappings(layerGeoPackage, layerTableName, styleMapping => {
                setTableStyle(styleMapping.relatedId, styleMapping.getGeometryTypeName())
              })
              _iterateTableIconMappings(layerGeoPackage, layerTableName, iconMapping => {
                setTableIcon(iconMapping.relatedId, iconMapping.getGeometryTypeName())
              })
            } else {
              _iterateTableStyleMappings(layerGeoPackage, layerTableName, styleMapping => {
                styleIdMap[layerFilePath].style[styleMapping.relatedId] = checkForCompatibleStyleOrAdd(featureTableStyles.getStyleDao().queryForId(styleMapping.relatedId))
                setTableStyle(styleIdMap[layerFilePath].style[styleMapping.relatedId], styleMapping.getGeometryTypeName())
              })
              _iterateTableIconMappings(layerGeoPackage, layerTableName, iconMapping => {
                styleIdMap[layerFilePath].icon[iconMapping.relatedId] = checkForCompatibleIconOrAdd(featureTableStyles.getIconDao().queryForId(iconMapping.relatedId))
                setTableIcon(styleIdMap[layerFilePath].icon[iconMapping.relatedId], iconMapping.getGeometryTypeName())
              })
            }
          }

          const srs = featureDao.srs
          const featureCount = tableFeatureCountMap[layerId]
          let each
          if (!isNil(boundingBoxFilter) && !isNil(featureDao.featureTableIndex) && featureDao.isIndexed()) {
            each = featureDao.featureTableIndex.queryWithBoundingBox(boundingBoxFilter, WORLD_GEODETIC_SYSTEM)
          } else {
            each = featureDao.queryForEach()
          }

          statusCallback('Copying features', 15.0 + (80.0 * (featuresAdded / totalFeaturesToAdd)))
          currentStatusPercentage = 15.0 + (80.0 * (featuresAdded / totalFeaturesToAdd))

          // adjust the batch size for the number of elements to be inserted
          adjustBatchSize(featureCount)

          for (let row of each) {
            if (!isNil(row)) {
              const featureRow = featureDao.getRow(row)
              const sourceId = featureRow.id
              const feature = GeoPackage.parseFeatureRowIntoGeoJSON(featureDao.getRow(row), srs)
              delete feature.id

              // fix fields
              Object.keys(feature.properties).forEach(sourceColumnName => {
                const targetColumnName = tableColumnMapping[layer._id][sourceColumnName.toLowerCase()]
                const value = feature.properties[sourceColumnName]
                delete feature.properties[sourceColumnName]
                feature.properties[targetColumnName] = value
              })

              // add feature
              const targetId = addFeature(feature)

              // query for media and add
              mediaRelations.forEach(({ mediaTable, mappingDao }) => {
                const mappings = mappingDao.queryByBaseId(sourceId)
                for (let mapping of mappings) {
                  const sourceMediaRowId = mapping.related_id
                  const sourceMediaKey = layerFilePath + '_' + mediaTable + '_' + sourceMediaRowId
                  const inserted = insertedMediaMap[sourceMediaKey] || layerInTargetGeoPackage
                  if (!inserted) {
                    addMediaAttachment(targetId, _getMediaRow(layerGeoPackage, mediaTable, sourceMediaRowId))
                    insertedMediaMap[sourceMediaKey] = true
                  } else {
                    addMediaAttachment(targetId, sourceMediaRowId)
                  }
                }
              })

              // query for styles
              if (hasStylesOrIcons) {
                const featureStyle = featureTableStyles.getFeatureStyleExtension().getFeatureStyleForFeatureRow(featureRow)
                if (featureStyle != null && featureStyle.icon != null) {
                  const sourceIconId = featureStyle.icon.id
                  if (layerInTargetGeoPackage) {
                    styleIdMap[layerFilePath].icon[sourceIconId] = sourceIconId
                  } else if (styleIdMap[layerFilePath].icon[sourceIconId] == null) {
                    styleIdMap[layerFilePath].icon[sourceIconId] = checkForCompatibleIconOrAdd(featureStyle.icon)
                  }
                  setFeatureIcon(targetId, feature.geometry.type, styleIdMap[layerFilePath].icon[sourceIconId])
                } else if (featureStyle != null && featureStyle.style != null) {
                  const sourceStyleId = featureStyle.style.id
                  if (layerInTargetGeoPackage) {
                    styleIdMap[layerFilePath].style[sourceStyleId] = sourceStyleId
                  } else if (styleIdMap[layerFilePath].style[sourceStyleId] == null) {
                    styleIdMap[layerFilePath].style[sourceStyleId] = checkForCompatibleStyleOrAdd(featureStyle.style)
                  }
                  setFeatureStyle(targetId, feature.geometry.type, styleIdMap[layerFilePath].style[sourceStyleId])
                } else if (layers.length > 1) {
                  const tableIcon = featureTableStyles.getTableIcon(GeometryType.fromName(feature.geometry.type.toUpperCase()))
                  if (tableIcon != null) {
                    const sourceIconId = tableIcon.id
                    if (layerInTargetGeoPackage) {
                      styleIdMap[layerFilePath].icon[sourceIconId] = sourceIconId
                    } else if (styleIdMap[layerFilePath].icon[sourceIconId] == null) {
                      styleIdMap[layerFilePath].icon[sourceIconId] = checkForCompatibleIconOrAdd(tableIcon)
                    }
                    setFeatureIcon(targetId, feature.geometry.type, styleIdMap[layerFilePath].icon[sourceIconId])
                  } else {
                    const tableStyle = featureTableStyles.getTableStyle(GeometryType.fromName(feature.geometry.type.toUpperCase()))
                    if (tableStyle != null) {
                      const sourceStyleId = tableStyle.id
                      if (layerInTargetGeoPackage) {
                        styleIdMap[layerFilePath].style[sourceStyleId] = sourceStyleId
                      } else if (styleIdMap[layerFilePath].style[sourceStyleId] == null) {
                        styleIdMap[layerFilePath].style[sourceStyleId] = checkForCompatibleStyleOrAdd(tableStyle)
                      }
                      setFeatureStyle(targetId, feature.geometry.type, styleIdMap[layerFilePath].style[sourceStyleId])
                    }
                  }
                }
              }

              featuresAdded++
              if (15.0 + (80.0 * (featuresAdded / totalFeaturesToAdd) - currentStatusPercentage >= 0.1)) {
                statusCallback('Copying features', 15.0 + (80.0 * (featuresAdded / totalFeaturesToAdd)))
                currentStatusPercentage = 15.0 + (80.0 * (featuresAdded / totalFeaturesToAdd))
              }
            }
          }
          processBatch()
        }

        if (layerFilePath === configuration.path) {
          gp.connection.adapter.db.unsafeMode(true)
          await addFeaturesToGeoPackage(gp)
          gp.connection.adapter.db.unsafeMode(false)
        } else {
          await performSafeGeoPackageOperation(layerFilePath, addFeaturesToGeoPackage)
        }
      }
      // call done to close the geopackage and clean up
      await done()

      statusCallback('Cleaning up', 95.0)
      await sleep(2000)
      statusCallback('Completed', 100.0)

    } catch (error) {
      try {
        await deleteGeoPackageTable(configuration.path, configuration.table)
        // eslint-disable-next-line no-empty
      } catch (e) {
      }
      statusCallback('Failed to build feature layer', 100, error.message)
      await sleep(2000)
    }
  }, true)
}

export {
  buildFeatureLayer
}
