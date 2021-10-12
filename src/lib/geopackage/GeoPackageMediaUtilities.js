import { MediaTable, IconTable } from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import difference from 'lodash/difference'
import jetpack from 'fs-jetpack'
import request from 'request'
import { getMediaObjectURL, getMediaTableName, getMimeType } from '../util/media/MediaUtilities'
import { performSafeGeoPackageOperation, getDefaultValueForDataType } from './GeoPackageCommon'

function _getMediaObjectUrl (gp, mediaTable, mediaId) {
  const rte = gp.relatedTablesExtension
  const mediaDao = rte.getMediaDao(mediaTable)
  const media = mediaDao.queryForId(mediaId)
  return getMediaObjectURL(media)
}

async function getMediaObjectUrl (filePath, mediaTable, mediaId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getMediaObjectUrl(gp, mediaTable, mediaId)
  })
}

function _getMediaRow (gp, mediaTable, mediaId) {
  const rte = gp.relatedTablesExtension
  const mediaDao = rte.getMediaDao(mediaTable)
  return mediaDao.queryForId(mediaId)
}

async function getMediaRow (filePath, mediaTable, mediaId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getMediaRow(gp, mediaTable, mediaId)
  })
}

/**
 * Gets the media attachments, not including feature icons
 * @param gp
 * @param tableName
 * @param featureDao
 * @param featureId
 * @returns {Array}
 */
function _getMediaRelationshipsForFeatureRow (gp, tableName, featureDao, featureId) {
  // get media relations for this feature table
  const mediaRelationships = []
  const rte = gp.relatedTablesExtension
  if (rte.has()) {
    const mediaRelations = featureDao.mediaRelations
    for (let i = 0; i < mediaRelations.length; i++) {
      const mediaRelation = mediaRelations[i]
      if (mediaRelation.mapping_table_name !== IconTable.TABLE_NAME + '_' + tableName) {
        const userMappingDao = rte.getMappingDao(mediaRelation.mapping_table_name)
        // query for all mappings for this feature id
        const mappings = userMappingDao.queryByBaseId(featureId)
        for (let m = 0; m < mappings.length; m++) {
          mediaRelationships.push({
            relatedId: mappings[m].related_id,
            relatedTable: mediaRelation.related_table_name,
            baseTable: tableName,
            baseId: featureId,
            mappingTable: mediaRelation.mapping_table_name
          })
        }
      }
    }
  }
  return mediaRelationships
}

/**
 * Gets the media attachments for a feature row
 * @param gp
 * @param tableName
 * @param featureId
 * @returns {Array}
 */
function _getMediaRelationships (gp, tableName, featureId) {
  const mediaRelationships = []
  try {
    const featureDao = gp.getFeatureDao(tableName)
    if (!isNil(featureDao)) {
      const linkedMedia = _getMediaRelationshipsForFeatureRow(gp, tableName, featureDao, featureId)
      mediaRelationships.push(...linkedMedia)
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get media relationships.')
  }
  return mediaRelationships
}

/**
 * Gets the media attachments for a feature row
 * @param filePath
 * @param tableName
 * @param featureId
 * @returns {Promise<any>}
 */
async function getMediaRelationships (filePath, tableName, featureId) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getMediaRelationships(gp, tableName, featureId)
  })
}

/**
 * Adds a media attachment
 * @param gp
 * @param tableName
 * @param featureId
 * @param attachment
 * @returns {Promise<boolean>}
 */
function _addMediaAttachment (gp, tableName, featureId, attachment) {
  let success = false
  try {
    const featureDao = gp.getFeatureDao(tableName)
    const featureRow = featureDao.queryForId(featureId)
    if (!isNil(featureRow)) {
      let buffer
      let contentType
      if (attachment.raw != null) {
        buffer = Buffer.from(attachment.raw)
        contentType = attachment.contentType
      } else {
        buffer = jetpack.read(attachment, 'buffer')
        contentType = getMimeType(attachment)
        if (contentType === false) {
          contentType = 'application/octet-stream'
        }
      }

      const mediaTableName = getMediaTableName()
      const rte = gp.relatedTablesExtension
      if (!gp.connection.isTableExists(mediaTableName)) {
        const mediaTable = MediaTable.create(mediaTableName)
        rte.createRelatedTable(mediaTable)
      }
      const mediaDao = rte.getMediaDao(mediaTableName)
      const mediaRow = mediaDao.newRow()

      // check if table has required columns, other than id, data and content_type
      const requiredColumns = difference(mediaDao.table.getRequiredColumns(), ['id', 'data', 'content_type'])
      // iterate over those columns and set them to the default value for that data type, as we do not support
      // additional columns currently in mapcache media attachments
      requiredColumns.forEach(columnName => {
        const type = mediaRow.getRowColumnTypeWithColumnName(columnName)
        mediaRow.setValueWithColumnName(columnName, getDefaultValueForDataType(type))
      })

      mediaRow.data = buffer
      mediaRow.contentType = contentType
      mediaRow.id = mediaDao.create(mediaRow)
      featureDao.linkMediaRow(featureRow, mediaRow)
      success = true
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to add media attachment')
  }
  return success
}

/**
 * Adds a media attachment
 * @param filePath
 * @param tableName
 * @param featureId
 * @param attachment
 * @returns {Promise<any>}
 */
async function addMediaAttachment (filePath, tableName, featureId, attachment) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _addMediaAttachment(gp, tableName, featureId, attachment)
  }, true)
}

/**
 * Adds a media attachment from url
 * @param gp
 * @param tableName
 * @param featureId
 * @param url
 * @returns {Promise<boolean>}
 */
async function _addMediaAttachmentFromUrl (gp, tableName, featureId, url) {
  let success = false
  try {
    const featureDao = gp.getFeatureDao(tableName)
    const featureRow = featureDao.queryForId(featureId)
    if (!isNil(featureRow)) {
      let {buffer, contentType} = await new Promise (resolve => {
        request.get({ url, encoding: null }, function (err, res, body) {
          if (!err) {
            resolve({buffer: body, contentType: res.headers['content-type']})
          } else {
            resolve({buffer: null, contentType: null})
          }
        })
      })
      if (buffer != null) {
        const mediaTableName = getMediaTableName()
        const rte = gp.relatedTablesExtension
        if (!gp.connection.isTableExists(mediaTableName)) {
          const mediaTable = MediaTable.create(mediaTableName)
          rte.createRelatedTable(mediaTable)
        }
        const mediaDao = rte.getMediaDao(mediaTableName)
        if (contentType == null) {
          contentType = 'application/octet-stream'
        }

        const mediaRow = mediaDao.newRow()

        // check if table has required columns, other than id, data and content_type
        const requiredColumns = difference(mediaDao.table.getRequiredColumns(), ['id', 'data', 'content_type'])
        // iterate over those columns and set them to the default value for that data type, as we do not support
        // additional columns currently in mapcache media attachments
        requiredColumns.forEach(columnName => {
          const type = mediaRow.getRowColumnTypeWithColumnName(columnName)
          mediaRow.setValueWithColumnName(columnName, getDefaultValueForDataType(type))
        })

        mediaRow.data = buffer
        mediaRow.contentType = contentType
        mediaRow.id = mediaDao.create(mediaRow)
        featureDao.linkMediaRow(featureRow, mediaRow)
        success = true
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to add media attachment')
  }
  return success
}

/**
 * Adds a media attachment
 * @param filePath
 * @param tableName
 * @param featureId
 * @param url
 * @returns {Promise<any>}
 */
async function addMediaAttachmentFromUrl (filePath, tableName, featureId, url) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _addMediaAttachmentFromUrl(gp, tableName, featureId, url)
  }, true)
}

/**
 * Gets the count of media attachments
 * @param gp
 * @param tableName
 * @param featureIds
 */
function _getMediaAttachmentsCounts (gp, tableName, featureIds) {
  let counts = {}
  try {
    const featureDao = gp.getFeatureDao(tableName)
    if (!isNil(featureDao)) {
      const rte = gp.relatedTablesExtension
      if (rte.has()) {
        const mediaRelations = featureDao.mediaRelations
        for (let i = 0; i < mediaRelations.length; i++) {
          const mediaRelation = mediaRelations[i]
          if (mediaRelation.mapping_table_name !== IconTable.TABLE_NAME + '_' + tableName) {
            const userMappingDao = rte.getMappingDao(mediaRelation.mapping_table_name)
            let mappings = []
            if (featureIds == null) {
              mappings = userMappingDao.queryForAll()
              mappings.forEach(mapping => {
                if (isNil(counts[mapping.base_id])) {
                  counts[mapping.base_id] = 0
                }
                counts[mapping.base_id]++
              })
            } else {
              mappings = featureIds.map(featureId => {
                const count = userMappingDao.queryByBaseId(featureId).length
                if (count > 0) {
                  counts[featureId] = count
                }
              })
            }
          }
        }
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get media attachments')
  }
  return counts
}

/**
 * Gets the count of media attachments
 * @param filePath
 * @param tableName
 * @param featureIds
 * @returns {Promise<any>}
 */
async function getMediaAttachmentsCounts (filePath, tableName, featureIds) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _getMediaAttachmentsCounts(gp, tableName, featureIds)
  })
}

/**
 * Deletes a media relationship and if no relationships to the media remain, deletes the media
 * @param gp
 * @param mediaRelationship
 */
function _deleteMediaAttachment (gp, mediaRelationship) {
  const {baseId, relatedTable, relatedId, mappingTable} = mediaRelationship
  const rte = gp.relatedTablesExtension
  // delete relationship
  let mappingDao = rte.getMappingDao(mappingTable)
  mappingDao.deleteWhere('base_id = ? and related_id = ?', [baseId, relatedId])

  // see if our related media is mapped anywhere else
  let hasOtherRelationships = false
  const mediaRelatedTableRelations = rte.extendedRelationDao.getRelatedTableRelations(relatedTable)
  for (let i = 0; i < mediaRelatedTableRelations.length; i++) {
    const mediaRelation = mediaRelatedTableRelations[i]
    mappingDao = rte.getMappingDao(mediaRelation.mapping_table_name)
    if (mappingDao.queryByRelatedId(relatedId).length > 0) {
      hasOtherRelationships = true
      break
    }
  }
  // delete media if no relationships remain
  if (!hasOtherRelationships) {
    const mediaDao = rte.getMediaDao(relatedTable)
    mediaDao.deleteById(relatedId)
  }
}

/**
 * Deletes a media relationship and if no relationships to the media remain, deletes the media
 * @param filePath
 * @param mediaRelationship
 * @returns {Promise<any>}
 */
function deleteMediaAttachment(filePath, mediaRelationship) {
  return performSafeGeoPackageOperation(filePath, (gp) => {
    return _deleteMediaAttachment(gp, mediaRelationship)
  })
}

export {
  _getMediaObjectUrl,
  getMediaObjectUrl,
  _getMediaRow,
  getMediaRow,
  _getMediaRelationshipsForFeatureRow,
  _getMediaRelationships,
  getMediaRelationships,
  _addMediaAttachment,
  addMediaAttachment,
  _getMediaAttachmentsCounts,
  getMediaAttachmentsCounts,
  _deleteMediaAttachment,
  deleteMediaAttachment,
  _addMediaAttachmentFromUrl,
  addMediaAttachmentFromUrl
}
