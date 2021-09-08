import wizard from 'overpass-wizard'
import {presets} from './iD_presets.json'

function getOverpassQuery (search) {
  try {
    return wizard(search, {
      comment: false,
      freeFormPresets: presets,
      globalBbox: false
    })
  } catch (e) {
    return false
  }
}

export {
  getOverpassQuery
}
