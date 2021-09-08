import Preprocessor from './Preprocessor'
import axios from 'axios'
import {USER_CANCELLED_MESSAGE} from '../../network/HttpUtilities'
import osmtogeojson from 'osmtogeojson'

/**
 * Handles the preprocessing of an Overpass request. This retrieves the feature data from the service before sending to
 * the server to be turned into a geopackage feature table.
 */
export default class OverpassPreProcessor extends Preprocessor {
  cancelled = false
  cancelSources = []

  /**
   * Constructor
   * @param source (will be cloned)
   */
  constructor (source) {
    super(source)
  }

  async getOverpassData () {
    return new Promise ((resolve, reject) => {
      const params = new URLSearchParams({ data: this.source.query })
      axios.post(this.source.url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      }).then(response => {
        resolve(osmtogeojson(response.data, {
          flatProperties: true
        }))
      }).catch(() =>  {
        reject('Failed to retrieve Overpass data.')
      })
    })
  }

  /**
   * Begins execution and returns an updated source configuration
   * @returns {*}
   */
  async preprocess () {
    this.source.featureCollection = await this.getOverpassData()
    return this.source
  }

  /**
   * Cancels the preprocessing
   */
  cancel () {
    this.cancelled = true
    this.cancelSources.forEach(cancelSource => {
      cancelSource.cancel(USER_CANCELLED_MESSAGE)
    })
  }
}
