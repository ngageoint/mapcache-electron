import Preprocessor from '../preprocessing/Preprocessor'
import {PROCESSING_STATES} from '../SourceProcessing'
import EventBus from '../../vue/EventBus'
import {mdiSteering} from '@mdi/js'
/**
 * Handles the preprocessing of an Overpass request. This retrieves the feature data from the service before sending to
 * the server to be turned into a geopackage feature table.
 */
export default class OverpassPreProcessor extends Preprocessor {
  cancelled = false
  abortControllerMap = {}
  QUERY_WARNING_COUNT = 100000

  /**
   * Constructor
   * @param source (will be cloned)
   */
  constructor (source) {
    super(source)
  }

  /**
   * Format bytes as human-readable text.
   * @param bytes Number of bytes.
   * @param dp Number of decimal places to display.
   * @return Formatted string.
   */
  humanFileSize(bytes, dp= 1) {
    if (Math.abs(bytes) < 1024) {
      return bytes + ' B'
    }
    const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    let u = -1
    const r = 10**dp;

    do {
      bytes /= 1024
      ++u
    } while (Math.round(Math.abs(bytes) * r) / r >= 1024 && u < units.length - 1)

    return bytes.toFixed(dp) + ' ' + units[u]
  }

  async performQueryCount (query, id = window.mapcache.createUniqueID()) {
    const controller = new AbortController()
    this.abortControllerMap[id] = controller
    let count = 0
    let error = null
    try {
      const params = new URLSearchParams({ data: query })
      const response = await fetch(this.source.url, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: params.toString()
      })
      const result = await response.json()
      for (let i = 0; i < result.elements.length; i++) {
        if (result.elements[i].tags.total) {
          count += Number(result.elements[i].tags.total)
        }
      }
      if (count === 0 && result.remark != null) {
        error = result.remark
      }
      // eslint-disable-next-line no-empty, no-unused-vars
    } catch (e) {
      error = 'Failed to retrieve data.'
    } finally {
      delete this.abortControllerMap[id]
    }
    if (!this.cancelled) {
      if (error != null) {
        // check if error has to do with memory limit
        if (error.indexOf('RAM') !== 0) {
          throw new Error ('Request too large. Try reducing the area of your request.')
        } else {
          throw new Error(error)
        }
      }
      if (count === 0) {
        throw new Error('No features found matching request.')
      }
    }
    return count
  }


  /**
   * Gets the query bounding box and performs a size check
   * @param bbox
   * @param alert
   * @return {Promise<{bbox, count}>}
   */
  async getQueryBoundingBox (bbox, alert = false) {
    const queryCount = this.source.queryCount.replace('{{bbox}}', [bbox[1], bbox[0], bbox[3], bbox[2]].join(','))
    const count = await this.performQueryCount(queryCount, undefined, false)
    if (alert && count > this.QUERY_WARNING_COUNT) {
      const approved = await EventBus.requestUserConfirmation('Overpass download confirmation', 'The response contains ' + count.toLocaleString() + ' results. Would you like to continue with the import?', mdiSteering)
      if (!approved) {
        throw new Error('User cancelled.')
      }
    }
    return {bbox, count}
  }

  elementCounter (string) {
    const re = /"id"/gm
    return ((string || '').match(re) || []).length
  }

  /**
   * Performs a query with a bounding box and saves it to disk
   * @param query
   * @param streamId
   * @param updateElementsRead
   * @return {Promise<void>}
   */
  async performQueryAndSaveToFile (query, streamId, updateElementsRead) {
    const controller = new AbortController()
    this.abortControllerMap[streamId] = controller
    try {
      const params = new URLSearchParams({ data: query })
      const response = await fetch(this.source.url, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: params.toString()
      })

      let elementsRead = 0
      // eslint-disable-next-line no-undef
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let finished = false
      while (!finished) {
        const { value, done } = await reader.read()
        if (value) {
          elementsRead += this.elementCounter(value)
          updateElementsRead(elementsRead)
          await window.mapcache.appendToStream(streamId, value)
        }
        finished = done
      }
      // eslint-disable-next-line no-empty, no-unused-vars
    } catch (e) {
    } finally {
      delete this.abortControllerMap[streamId]
      window.mapcache.closeFileStream(streamId)
    }
  }

  async getAndSaveOverpassDataFile (statusCallback) {
    const queryObj = await this.getQueryBoundingBox(this.source.bbox, true)
    if (!this.cancelled && queryObj.count > 0) {
      return await this.getAndSaveOverpassDataToTemp(queryObj, statusCallback)
    } else {
      return null
    }
  }

  async getAndSaveOverpassDataToTemp (queryObj, statusCallback) {
    const filePath = window.mapcache.generateJsonFilePath(this.source.directory, window.mapcache.createUniqueID())
    const streamId = window.mapcache.openFileStream(filePath)
    const query = this.source.query.replace('{{bbox}}', [queryObj.bbox[1], queryObj.bbox[0], queryObj.bbox[3], queryObj.bbox[2]].join(','))
    const count = queryObj.count
    let stepSize = .05
    let currentPercentage = 0
    await this.performQueryAndSaveToFile(query, streamId, elementsRead => {
      if (elementsRead / count > currentPercentage) {
        currentPercentage += stepSize
        statusCallback({type: PROCESSING_STATES.PREPROCESSING, message: 'Downloading data', completionPercentage: 25 * currentPercentage})
      }
    })
    return {
      filePath,
      elementsInFile: count
    }
  }

  /**
   * Begins execution and returns an updated source configuration
   * @param statusCallback
   * @returns {*}
   */
  async preprocess (statusCallback) {
    statusCallback({type: PROCESSING_STATES.PREPROCESSING, message: 'Requesting data', completionPercentage: 0})
    this.source.fileData = await this.getAndSaveOverpassDataFile(statusCallback)
    return this.source
  }

  /**
   * Cancels the preprocessing
   */
  cancel () {
    this.cancelled = true
    Object.keys(this.abortControllerMap).forEach(key => {
      this.abortControllerMap[key].abort()
    })
    this.abortControllerMap = {}
  }
}
