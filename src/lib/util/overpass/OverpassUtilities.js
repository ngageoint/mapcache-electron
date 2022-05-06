import wizard from 'overpass-wizard'
import { presets } from './iD_presets.json'

function getOverpassQuery (search) {
  let result = false
  // eslint-disable-next-line no-console
  let oldConsoleError = console.error
  // eslint-disable-next-line no-console
  console.error = () => {
  }
  try {
    result = wizard(search, {
      comment: false,
      freeFormPresets: presets,
      globalBbox: false,
      timeout: 900,
      aroundRadius: 0,
      compactNWR: true,
      outputMode: 'recursive'
    })
    // eslint-disable-next-line no-unused-vars, no-empty
  } catch (e) {
  }
  // try with quotes
  if (!result) {
    try {
      result = wizard('"' + search + '"', {
        comment: false,
        freeFormPresets: presets,
        globalBbox: false,
        timeout: 900,
        aroundRadius: 0,
        compactNWR: true,
        outputMode: 'recursive'
      })// eslint-disable-next-line no-unused-vars, no-empty
    } catch (e) {
    }
  }
  // eslint-disable-next-line no-console
  console.error = oldConsoleError
  return result
}

function getOverpassCountQuery (search) {
  let result = false
  // eslint-disable-next-line no-console
  let oldConsoleError = console.error
  // eslint-disable-next-line no-console
  console.error = () => {
  }
  try {
    result = wizard(search, {
      comment: false,
      freeFormPresets: presets,
      globalBbox: false,
      timeout: 900,
      aroundRadius: 0,
      compactNWR: true,
      outputMode: 'recursive'
    }).replace('body', 'count').replace('skel', 'count')
    // eslint-disable-next-line no-unused-vars, no-empty
  } catch (e) {
  }
  // try with quotes
  if (!result) {
    try {
      result = wizard('"' + search + '"', {
        comment: false,
        freeFormPresets: presets,
        globalBbox: false,
        timeout: 900,
        aroundRadius: 0,
        compactNWR: true,
        outputMode: 'recursive'
      }).replace('body', 'count').replace('skel', 'count')
      // eslint-disable-next-line no-unused-vars, no-empty
    } catch (e) {
    }
  }
  // eslint-disable-next-line no-console
  console.error = oldConsoleError
  return result
}

const bboxOnlyQuery = '[out:json][timeout:900];\n' +
  '(\n' +
  '  nwr({{bbox}});\n' +
  ');\n' +
  'out meta;'

const bboxOnlyQueryCount = '[out:json][timeout:900];\n' +
  '(\n' +
  '  nwr({{bbox}});\n' +
  ');\n' +
  'out count;'


const OVERPASS_SQ_MI_LIMIT = 25

const requestMaxWidthInDegrees = 0.01
const requestMaxHeightInDegrees = 0.01

/**
 * Splits the overpass bounding box into appropriately sized chunks. This prevents a request for being too large
 * @param bbox
 */
function splitOverpassBoundingBox (bbox) {
  const splitBoundingBoxes = []
  for (let longitude = bbox[0]; longitude < bbox[2]; longitude += requestMaxWidthInDegrees) {
    for (let latitude = bbox[1]; latitude < bbox[3]; latitude += requestMaxHeightInDegrees) {
      splitBoundingBoxes.push([longitude, latitude, Math.min(bbox[2], longitude + requestMaxWidthInDegrees), Math.min(bbox[3], latitude + requestMaxHeightInDegrees)])
    }
  }
  return splitBoundingBoxes
}

export {
  getOverpassQuery,
  getOverpassCountQuery,
  splitOverpassBoundingBox,
  bboxOnlyQuery,
  bboxOnlyQueryCount,
  OVERPASS_SQ_MI_LIMIT
}
