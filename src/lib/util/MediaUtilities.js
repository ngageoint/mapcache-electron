import mime from 'mime/lite'
import path from 'path'
import isNil from 'lodash/isNil'
import FileUtilities from './FileUtilities'

const supportedContentTypes = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/ogg',
  'video/webm',
  'application/pdf',
  'application/json',
  'application/xml',
  'application/geo+json',
  'application/ogg',
  'application/javascript',
  'text/css',
  'text/plain',
  'text/html'
]
const FILE_SIZE_LIMIT = 1024 * 1024 * 500
const FILE_SIZE_LIMIT_HR = '500 MB'
const MEDIA_TABLE_NAME = 'gpkg_media'

export default class MediaUtilities {
  static getMimeType (filePath) {
    return mime.getType(path.extname(filePath))
  }

  static getExtension (mimeType) {
    return mime.getExtension(mimeType)
  }

  static isChromeMimeSupported (m) {
    return supportedContentTypes.indexOf(m.split(';')[0]) !== -1
  }

  /**
   * Returns a data url containing the media's data and content type, if unsupported, an html document is returned letting the user know that preview is unavailable
   * @param media
   * @returns {string}
   */
  static getMediaObjectURL (media) {
    let blob
    if (media) {
      if (MediaUtilities.isChromeMimeSupported(media.contentType)) {
        blob = new Blob([media.data], {type: media.contentType})
      }
    }

    if (isNil(blob)) {
      blob = new Blob(["<html lang='en'><body><div style='height: 100%; display: flex;'><div style='width: 100%; display: flex; align-items: center; justify-content: center; min-height: 0;'><p><h2>Preview unavailable.</h2></p></div></div></body></html>"], {type: 'text/html'})
    }
    return URL.createObjectURL(blob)
  }

  static exceedsFileSizeLimit (filePath) {
    const size = FileUtilities.getFileSizeInBytes(filePath)
    return size > FILE_SIZE_LIMIT
  }

  static getMaxFileSizeString () {
    return FILE_SIZE_LIMIT_HR
  }

  static getMediaTableName () {
    return MEDIA_TABLE_NAME
  }
}
