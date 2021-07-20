import {
  BoundingBox,
  FeatureColumn,
  FeatureTableStyles,
  GeometryColumns,
  GeometryType,
  IconTable,
  MediaTable,
} from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import throttle from 'lodash/throttle'
import keys from 'lodash/keys'
import values from 'lodash/values'
import difference from 'lodash/difference'
import bbox from '@turf/bbox'
import {
  performSafeGeoPackageOperation,
  wait,
  flatten,
  getDefaultValueForDataType,
  deleteGeoPackageTable
} from './GeoPackageCommon'
import { _getAllFeatureRowsIn4326, _getFeatureColumns, mergeFeatureColumns, _indexFeatureTable, _linkFeatureRowToMediaRow } from './GeoPackageFeatureTableUtilities'
import { _getStyleRowObjects, _getIconRowObjects, _getFeatureStyleMapping, _getTableStyleMappings } from './GeoPackageStyleUtilities'
import { getMediaRow } from './GeoPackageMediaUtilities'
import { getMediaTableName } from '../util/MediaUtilities'

/**
 * GeoPackgeFeatureTableBuilder handles building a feature layer using other GeoPackage layers and data sources
 */
/**
 * Builds a feature layer
 * currently this just merges features
 * TODO: support extensions
 * TODO: support non-media related tables
 * @param configuration
 * @param statusCallback
 * @returns {Promise<any>}
 */
async function buildFeatureLayer (configuration, statusCallback) {
  return performSafeGeoPackageOperation(configuration.path, async (gp) => {
    const status = {
      message: 'Starting...',
      progress: 0.0
    }

    try {
      const throttleStatusCallback = throttle(statusCallback, 100)

      const tableName = configuration.table

      throttleStatusCallback(status)

      await wait(1000)

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

      const allLayers = configuration.sourceLayers.concat(configuration.geopackageLayers)

      let sourceIdx = 0
      // copy data from source layers
      for (let i = 0; i < allLayers.length; i++) {
        const sourceLayer = allLayers[i]
        let tableName, geopackageFilePath, parentId
        const isGeoPackageLayer = !isNil(sourceLayer.geopackage)
        if (isGeoPackageLayer) {
          tableName = sourceLayer.table
          geopackageFilePath = sourceLayer.geopackage.path
          parentId = sourceLayer.geopackage.id
        } else {
          tableName = sourceLayer.sourceLayerName
          geopackageFilePath = sourceLayer.geopackageFilePath
          parentId = sourceLayer.id
        }
        await performSafeGeoPackageOperation(geopackageFilePath, async (geopackage) => {
          sourceFeatureMap[sourceIdx] = _getAllFeatureRowsIn4326(geopackage, tableName, 4326, boundingBoxFilter)
          sourceColumnMap[sourceIdx] = _getFeatureColumns(geopackage, tableName)
          sourceStyleMap[sourceIdx] = {
            styles: _getStyleRowObjects(geopackage, tableName),
            icons: _getIconRowObjects(geopackage, tableName),
            featureStyleMapping: _getFeatureStyleMapping(geopackage, tableName, numberLayersToRetrieve > 1),
            tableStyleMappings: _getTableStyleMappings(geopackage, tableName),
            parentId: parentId
          }
          // feature row id -> list of objects (media table name, row id)
          mediaRelations[sourceIdx] = {}
          if (geopackage.relatedTablesExtension.has()) {
            geopackage.getFeatureDao(tableName).mediaRelations.forEach(mediaRelation => {
              if (mediaRelation.mapping_table_name !== (IconTable.TABLE_NAME + '_' + tableName)) {
                const userMappingDao = geopackage.relatedTablesExtension.getMappingDao(mediaRelation.mapping_table_name)
                const mappings = userMappingDao.queryForAll()
                mappings.forEach(mapping => {
                  if (isNil(mediaRelations[sourceIdx][mapping.base_id])) {
                    mediaRelations[sourceIdx][mapping.base_id] = []
                  }
                  mediaRelations[sourceIdx][mapping.base_id].push({
                    filePath: geopackageFilePath,
                    mediaTable: mediaRelation.related_table_name,
                    mediaRowId: mapping.related_id
                  })
                })
              }
            })
          }

          const result = mergeFeatureColumns(featureColumns, _getFeatureColumns(geopackage, tableName))
          featureColumns = result.mergedColumns
          sourceNameChanges[sourceIdx] = result.nameChanges
          sourceIdx++
          layersRetrieved++
          status.progress = 25.0 * (layersRetrieved / numberLayersToRetrieve)
          throttleStatusCallback(status)
        })
      }

      const stylesAndIconsExist = keys(sourceStyleMap).filter(id => (keys(sourceStyleMap[id].styles).length + keys(sourceStyleMap[id].icons).length) > 0).length > 0

      await wait(500)

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
        features: flatten(values(sourceFeatureMap)).map(row => {
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

      await wait(500)

      status.message = 'Adding features to GeoPackage layer...'
      throttleStatusCallback(status)
      await wait(500)
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
      const mediaTableName = getMediaTableName()
      const hasMediaRelations = keys(mediaRelations).filter(id => keys(mediaRelations[id]).length > 0).length > 0
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
        targetMediaDao = gp.relatedTablesExtension.getMediaDao(getMediaTableName())
      }

      const columnTypes = {}
      for (let i = 0; i < featureDao.table.getColumnCount(); i++) {
        const column = featureDao.table.getColumnWithIndex(i)
        columnTypes[column.name] = column.dataType
      }

      let id = 0
      const sourceFeatureMapKeys = keys(sourceFeatureMap)
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
        if (!isNil(featureTableStyles) && isNil(parentStyleMapping[parentId])) {
          parentStyleMapping[parentId] = {
            iconMapping: {},
            styleMapping: {}
          }
          keys(styles).forEach(styleId => {
            const styleRow = styles[styleId]
            styleRow.id = null
            parentStyleMapping[parentId].styleMapping[styleId] = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
          })
          keys(icons).forEach(iconId => {
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
            const name = isNil(nameChanges[columnName]) ? columnName : nameChanges[columnName]
            const tableColumn = featureDao.table.getUserColumns().getColumn(name)
            if (isNil(value) && tableColumn.isNotNull() && !tableColumn.hasDefaultValue()) {
              value = getDefaultValueForDataType(tableColumn.getDataType())
            }
            values[name] = value
          })

          // check for any of our table's columns that require a not null value
          featureColumns.getColumns().forEach(column => {
            const columnName = column.getName()
            if (!isNil(values[columnName]) && column.isNotNull() && !column.hasDefaultValue) {
              values[columnName] = getDefaultValueForDataType(column.getDataType())
            }
          })

          values.id = id++
          values.geometry = featureRow.geometry

          // create the new row
          const featureId = featureDao.create(featureDao.newRow(columnTypes, values))

          // add style mapping if necessary
          if (!isNil(featureTableStyles)) {
            let geometryType = !isNil(featureRow.geometry) ? featureRow.geometry.toGeoJSON().type.toUpperCase() : 'GEOMETRY'
            const styleMapping = featureStyleMapping[featureRow.id]
            if (!isNil(styleMapping.iconId) && styleMapping.iconId.id > -1) {
              featureTableStyles.getFeatureStyleExtension().insertStyleMapping(featureTableStyles.getIconMappingDao(), featureId, parentStyleMapping[parentId].iconMapping[styleMapping.iconId.id], GeometryType.fromName(geometryType))
            }
            if (!isNil(styleMapping.styleId) && styleMapping.styleId.id > -1) {
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
            if (isNil(insertedMediaMap[sourceMediaKey])) {
              // get media
              const sourceMediaRow = await getMediaRow(geopackageFilePath, sourceMediaTable, sourceMediaRowId)

              // create new media row
              let mediaRow = targetMediaDao.newRow()
              // check if table has required columns, other than id, data and content_type
              const requiredColumns = difference(targetMediaDao.table.getRequiredColumns(), ['id', 'data', 'content_type'])
              // iterate over those columns and set them to the default value for that data type, as we do not support
              // additional columns currently in mapcache media attachments
              requiredColumns.forEach(columnName => {
                const type = mediaRow.getRowColumnTypeWithColumnName(columnName)
                mediaRow.setValueWithColumnName(columnName, getDefaultValueForDataType(type))
              })

              mediaRow.data = sourceMediaRow.data
              mediaRow.contentType = sourceMediaRow.contentType
              mediaRow.id = targetMediaDao.create(mediaRow)

              // this relates a source's media row to it's new id in the gpkg_media table
              insertedMediaMap[sourceMediaKey] = mediaRow.id
              mediaRow = null
            }
            _linkFeatureRowToMediaRow(gp, tableName, featureId, mediaTableName, insertedMediaMap[sourceMediaKey])
          }

          status.progress = 30 + (50 * id / featureCount)
          throttleStatusCallback(status)
        }
      }

      await wait(500)

      status.message = 'Indexing feature layer for performance...'
      throttleStatusCallback(status)
      // index table
      await _indexFeatureTable(gp, tableName)

      status.message = 'Completed.'
      status.progress = 100.0
      statusCallback(status)
      await wait(500)
    } catch (error) {
      try {
        await deleteGeoPackageTable(configuration.path, configuration.table)
        // eslint-disable-next-line no-empty
      } catch (e) {}
      status.message = 'Failed to build feature layer'
      status.error = error.message
      statusCallback(status)
    }
  }, true)
}
export {
  buildFeatureLayer
}
