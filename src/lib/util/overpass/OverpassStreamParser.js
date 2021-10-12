import fs from 'fs'
import {chain} from 'stream-chain'
import {parser} from 'stream-json'
import {pick} from 'stream-json/filters/Pick'
import {streamArray} from 'stream-json/streamers/StreamArray'
import path from 'path'
import polygonConfiguration from './polygon_features.json'
import rewind from '@mapbox/geojson-rewind'
import {rmFile} from '../file/FileUtilities'
import {
  getOrCreateDb,
  addNodeToBatch,
  writeWayToDb,
  writeRelationToDb,
  closeDb,
  iterateNodeFeatures,
  iterateWays,
  flushNodes,
  relationIterator,
  relationWayIterator,
  getFeaturesToProcessCount
} from './OverpassDB'

/**
 * This is a modified version of https://github.com/tyrasd/osmtogeojson
 * Copyright (c) 2013 Martin Raifer
 * Modified by Christopher Caldwell
 */

/*
 * coordinate pool - pool of unallocated coordinates to be used to prevent constantly making new coordinate objects
 */
let coordinatePool = []

/*
 * coordinates pool - pool of linestrings, polylines to prevent constantly making new coordinate object arrays
 */
let coordinateArrayPool = []

/*
 * placeholder object for multi line strings
 */
let _multiLineStringInternalObject

/*
 * placeholder object for line strings
 */
let _lineStringInternalObject

/*
 * placeholder object for polygons
 */
let _polygonInternalObject

/*
 * placeholder object for polygons
 */
let _multiPolygonInternalObject

/*
 * placeholder object for polygons
 */
let _pointInternalObject

/*
 * Internal arrays for storing ways to be processed for a relation. Re-use to decrease memory usage
 */
let _internal_ways_array = []
let _internal_outer_ways_array = []
let _internal_inner_ways_array = []

// stolen from iD/geo.js,
// based on https://github.com/substack/point-in-polygon,
// ray-casting algorithm based on http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
function pointInPolygon (point, polygon) {
  let x = point.lon, y = point.lat, inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat
    const xj = polygon[j].lon, yj = polygon[j].lat
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) {
      inside = !inside
    }
  }
  return inside
}

function polygonIntersectsPolygon (outer, inner) {
  for (let i = 0; i < inner.length; i++) {
    if (pointInPolygon(inner[i], outer)) {
      return true
    }
  }
  return false
}

/**
 * Removes uninteresting data from the osm element
 * @param value
 * @return {*}
 */
function removeUninterestingData (value) {
  delete value.user
  delete value.timestamp
  delete value.changeset
  delete value.uid
  if (typeof value.tags === 'object') {
    delete value.tags['source']
    delete value.tags['area']
    delete value.tags['source_ref']
    delete value.tags['source:ref']
    delete value.tags['history']
    delete value.tags['attribution']
    delete value.tags['created_by']
    delete value.tags['converted_by']
    delete value.tags['time']
    delete value.tags['ele']
    delete value.tags['tiger:county']
    delete value.tags['tiger:tlid']
    delete value.tags['tiger:upload_uuid']
    delete value.tags['fixme']
    delete value.tags['FIXME']
    delete value.tags['note']
    delete value.tags['todo']
    delete value.tags['openGeoDB:']
  }
  return value
}

// configure the polygon features object
const polygonFeatures = {}
polygonConfiguration.forEach(tags => {
  if (tags.polygon === 'all')
    polygonFeatures[tags.key] = true
  else {
    const list = (tags.polygon === 'whitelist') ? 'included_values' : 'excluded_values', tagValuesObj = {}
    tags.values.forEach((value) => {
      tagValuesObj[value] = true
    })
    polygonFeatures[tags.key] = {}
    polygonFeatures[tags.key][list] = tagValuesObj
  }
})

/**
 * Checks if a closed way is a polygon
 * @param tags
 * @return {boolean}
 * @private
 */
function _isPolygonFeature (tags) {
  // explicitely tagged non-areas
  if (tags == null) {
    return false
  }
  if (tags['area'] === 'no') {
    return false
  }
  // assuming that a typical OSM way has on average less tags than the polygonFeatures list, this way around should be faster
  for (const key in tags) {
    const val = tags[key]
    const pfk = polygonFeatures[key]
    // continue with next if tag is unknown or not "categorizing"
    if (typeof pfk == 'undefined' || val === 'no') {
      continue
    }
    // check polygon features for: general acceptance, included or excluded values
    if (pfk === true || (pfk.included_values && pfk.included_values[val] === true) || (pfk.excluded_values && pfk.excluded_values[val] !== true)) {
      return true
    }
  }
  return false
}

/**
 * Join ways of a relation
 * @param ways
 * @return {*[]}
 */
function join (ways) {
  const _first = arr => arr[0]
  const _last  = arr => arr[arr.length - 1]
  const _fitTogether = (n1, n2) => n1 != null && n2 != null && n1.id === n2.id
  // stolen from iD/relation.js
  let joined = [], current, first, last, i, how, what;
  while (ways.length) {
    current = ways.pop().nodes.slice()
    joined.push(current)
    while (ways.length && !_fitTogether(_first(current), _last(current))) {
      first = _first(current)
      last  = _last(current)
      for (i = 0; i < ways.length; i++) {
        what = ways[i].nodes
        if (_fitTogether(last, _first(what))) {
          how  = current.push
          what = what.slice(1)
          break
        } else if (_fitTogether(last, _last(what))) {
          how  = current.push
          what = what.slice(0, -1).reverse()
          break
        } else if (_fitTogether(first, _last(what))) {
          how  = current.unshift
          what = what.slice(0, -1)
          break
        } else if (_fitTogether(first, _first(what))) {
          how  = current.unshift
          what = what.slice(1).reverse()
          break
        } else {
          what = how = null
        }
      }
      if (!what)
        break // Invalid geometry (dangling way, unclosed ring)
      ways.splice(i, 1)
      how.apply(current, what)
    }
  }
  return joined
}

/**
 * Converts a node to a point feature
 * @param node
 * @return {{geometry: {coordinates: number[], type: string}, type: string, properties: {}}}
 */
function _constructPointFeature (node) {
  _pointInternalObject.id = 'node/' + node.id
  _pointInternalObject.properties = JSON.parse(node.tags)
  _pointInternalObject.properties.type = 'node'
  _pointInternalObject.geometry.coordinates[0] = node.lon
  _pointInternalObject.geometry.coordinates[1] = node.lat
  return _pointInternalObject
}

/**
 * Checks if an element has any interesting tags remaining as uninteresting tags are removed earlier
 * @param t
 * @param ignore_tags
 * @return {boolean}
 * @private
 */
function _hasInterestingTags(t, ignore_tags) {
  if (typeof ignore_tags !== "object") {
    ignore_tags = {}
  }
  for (var k in t) {
    if (!(ignore_tags[k] === true || ignore_tags[k] === t[k])) {
      return true
    }
  }
  return false
}


/**
 * Constructs a multi line string from a relatio
 * @param db
 * @param rel
 * @return {{geometry: {coordinates: *[], type: string}, id: string, type: string, properties: {}}}
 * @private
 */
function _constructMultiLineString (db, rel) {
  // remove any previously used ways
  while (_internal_ways_array.length > 0) {
    _internal_ways_array.pop()
  }

  relationWayIterator (db, rel, (way) => {
    _internal_ways_array.push(way)
  })

  const lineStrings = join(_internal_ways_array)

  if (lineStrings.length > 1) {
    _multiLineStringInternalObject.id = 'relation/' + rel.id
    _multiLineStringInternalObject.properties = rel.tags || {}
    _lineStringInternalObject.properties.type = 'relation'

    // up the coordinate arrays if needed
    while (coordinateArrayPool.length < lineStrings.length) {
      coordinateArrayPool.push([])
    }

    // remove coordinate arrays based on member length
    while (_multiLineStringInternalObject.geometry.coordinates.length > lineStrings.length) {
      coordinateArrayPool.push(_multiLineStringInternalObject.geometry.coordinates.pop())
    }
    // add coordinate arrays
    while (lineStrings.length > _multiLineStringInternalObject.geometry.coordinates.length) {
      _multiLineStringInternalObject.geometry.coordinates.push(coordinateArrayPool.pop())
    }

    for (let i = 0; i < lineStrings.length; i++) {
      const lineString = lineStrings[i]
      // remove previous coordinates
      while (_multiLineStringInternalObject.geometry.coordinates[i].length > lineString.length) {
        coordinatePool.push(_multiLineStringInternalObject.geometry.coordinates[i].pop())
      }
      // remove previous coordinates
      while (lineString.length > _multiLineStringInternalObject.geometry.coordinates[i].length) {
        if (coordinatePool.length > 0) {
          _multiLineStringInternalObject.geometry.coordinates[i].push(coordinatePool.pop())
        } else {
          _multiLineStringInternalObject.geometry.coordinates[i].push([-1, -1])
        }
      }
      for (let j = 0; j < lineString.length; j++) {
        _multiLineStringInternalObject.geometry.coordinates[i][j][0] = lineString[j].lon
        _multiLineStringInternalObject.geometry.coordinates[i][j][1] = lineString[j].lat
      }
    }
    return _multiLineStringInternalObject
  } else if (lineStrings.length === 1) {
    _lineStringInternalObject.id = 'relation/' + rel.id
    _lineStringInternalObject.properties = rel.tags || {}
    _lineStringInternalObject.properties.type = 'relation'
    while (_lineStringInternalObject.geometry.coordinates.length > lineStrings[0].length) {
      coordinatePool.push(_lineStringInternalObject.geometry.coordinates.pop())
    }
    // remove previous coordinates
    while (lineStrings[0].length > _lineStringInternalObject.geometry.coordinates.length) {
      if (coordinatePool.length > 0) {
        _lineStringInternalObject.geometry.coordinates.push(coordinatePool.pop())
      } else {
        _lineStringInternalObject.geometry.coordinates.push([-1, -1])
      }
    }
    for (let i = 0; i < lineStrings[0].length; i++) {
      _lineStringInternalObject.geometry.coordinates[i][0] = lineStrings[0][i].lon
      _lineStringInternalObject.geometry.coordinates[i][1] = lineStrings[0][i].lat
    }
    return _lineStringInternalObject
  }
}

/**
 * Constructs a MultiPolygon Feature
 * @param db
 * @param rel
 * @return {{geometry: {coordinates: *[][], type: string}, id: string, type: string, properties: {}}|{geometry: {coordinates: *[], type: string}, id: string, type: string, properties: {}}}
 * @private
 */
function _constructMultiPolygon(db, rel) {
  // clean these up
  while (_internal_outer_ways_array.length > 0) {
    _internal_outer_ways_array.pop()
  }
  while (_internal_inner_ways_array.length > 0) {
    _internal_inner_ways_array.pop()
  }

  relationWayIterator(db, rel, (way) => {
    if (way.role === 'outer') {
      _internal_outer_ways_array.push(way)
    } else if (way.role === 'inner') {
      _internal_inner_ways_array.push(way)
    }
  })

  let outerCount = _internal_outer_ways_array.length

  let mp_id = rel.id
  let mp_type = 'relation'
  let mp_tags = rel.tags
  // determine if it is a simple multi polygon or not
  const simpleMP = outerCount === 1 && !_hasInterestingTags(rel.tags, {'type': true})
  if (simpleMP) {
    mp_id = _internal_outer_ways_array[0].id
    mp_type = 'way'
    mp_tags = _internal_outer_ways_array[0].tags
  }

  let outers = join(_internal_outer_ways_array)
  let inners = join(_internal_inner_ways_array)
  const usedInners = []

  if (outers.length === 1) {
    _polygonInternalObject.id = mp_type + '/' + mp_id
    _polygonInternalObject.properties = mp_tags || {}
    _polygonInternalObject.properties.type = mp_type

    const outer = outers[0]

    // remove extra arrays so that we only have 1, which is for the outer ring
    while (_polygonInternalObject.geometry.coordinates.length > 1) {
      coordinateArrayPool.push(_polygonInternalObject.geometry.coordinates.pop())
    }

    // add polygon array so there is at least one for the outer ring
    while (_polygonInternalObject.geometry.coordinates.length < 1) {
      if (coordinateArrayPool.length > 0) {
        _polygonInternalObject.geometry.coordinates.push(coordinatePool.pop())
      } else {
        _polygonInternalObject.geometry.coordinates.push([])
      }
    }

    // remove unneeded coordinates from the outer ring
    while (_polygonInternalObject.geometry.coordinates[0].length > outer.length) {
      coordinatePool.push(_polygonInternalObject.geometry.coordinates[0].pop())
    }

    // add additional coordinates needed for the outer ring
    while (outer.length > _polygonInternalObject.geometry.coordinates[0].length) {
      if (coordinatePool.length > 0) {
        _polygonInternalObject.geometry.coordinates[0].push(coordinatePool.pop())
      } else {
        _polygonInternalObject.geometry.coordinates[0].push([-1, -1])
      }
    }

    // set the coordinates for the outer ring
    for (let i = 0; i < outer.length; i++) {
      _polygonInternalObject.geometry.coordinates[0][i][0] = outer[i].lon
      _polygonInternalObject.geometry.coordinates[0][i][1] = outer[i].lat
    }

    // iterate inner rings
    for (let i = 0; i < inners.length; i++) {
      const inner = inners[i]
      if (coordinateArrayPool.length > 0) {
        _polygonInternalObject.geometry.coordinates.push(coordinateArrayPool.pop())
      } else {
        _polygonInternalObject.geometry.coordinates.push([])
      }

      // remove unneeded coordinates
      while (_polygonInternalObject.geometry.coordinates[i + 1].length > inner.length) {
        coordinatePool.push(_polygonInternalObject.geometry.coordinates[i + 1].pop())
      }

      // add additional coordinates
      while (inner.length > _polygonInternalObject.geometry.coordinates[i + 1].length) {
        if (coordinatePool.length > 0) {
          _polygonInternalObject.geometry.coordinates[i + 1].push(coordinatePool.pop())
        } else {
          _polygonInternalObject.geometry.coordinates[i + 1].push([-1, -1])
        }
      }

      // add inner ring's coordinates
      for (let j = 0; j < inner.length; j++) {
        _polygonInternalObject.geometry.coordinates[i + 1][j][0] = inner[j].lon
        _polygonInternalObject.geometry.coordinates[i + 1][j][1] = inner[j].lat
      }
    }
    return _polygonInternalObject
  } else {
    _multiPolygonInternalObject.id = mp_type + '/' + mp_id
    _multiPolygonInternalObject.properties = mp_tags || {}
    _multiPolygonInternalObject.properties.type = mp_type

    // remove any extra polygons from a previous multi polygon
    while (_multiPolygonInternalObject.geometry.coordinates.length > outers.length) {
      const loosePoly = _multiPolygonInternalObject.geometry.coordinates.pop()
      while (loosePoly.length > 0) {
        coordinateArrayPool.push(loosePoly.pop())
      }
    }
    // add extra arrays for polygons needed for this multi polygon
    while (outers.length > _multiPolygonInternalObject.geometry.coordinates.length) {
      _multiPolygonInternalObject.geometry.coordinates.push([])
    }

    // iterate outer rings
    for (let i = 0; i < outers.length; i++) {
      const outer = outers[i]
      // remove previous inner rings
      while (_multiPolygonInternalObject.geometry.coordinates[i].length > 1) {
        coordinateArrayPool.push(_multiPolygonInternalObject.geometry.coordinates[i].pop())
      }

      if (_multiPolygonInternalObject.geometry.coordinates[i].length === 0) {
        _multiPolygonInternalObject.geometry.coordinates[i].push([])
      }

      // remove unneeded coordinates
      while (_multiPolygonInternalObject.geometry.coordinates[i][0].length > outer.length) {
        coordinatePool.push(_multiPolygonInternalObject.geometry.coordinates[i][0].pop())
      }

      // add additional coordinates
      while (outer.length > _multiPolygonInternalObject.geometry.coordinates[i][0].length) {
        if (coordinatePool.length > 0) {
          _multiPolygonInternalObject.geometry.coordinates[i][0].push(coordinatePool.pop())
        } else {
          _multiPolygonInternalObject.geometry.coordinates[i][0].push([-1, -1])
        }
      }

      // add outer ring's coordinates
      for (let j = 0; j < outer.length; j++) {
        _multiPolygonInternalObject.geometry.coordinates[i][0][j][0] = outer[j].lon
        _multiPolygonInternalObject.geometry.coordinates[i][0][j][1] = outer[j].lat
      }

      // iterate inner rings
      let innerRingIndex = 1
      for (let j = 0; j < inners.length; j++) {
        const inner = inners[j]
        if (usedInners.indexOf(j) === -1 && polygonIntersectsPolygon(outer, inner)) {
          usedInners.push(j)
          if (coordinateArrayPool.length > 0) {
            _multiPolygonInternalObject.geometry.coordinates[i].push(coordinateArrayPool.pop())
          } else {
            _multiPolygonInternalObject.geometry.coordinates[i].push([])
          }
          // remove unneeded coordinates
          while (_multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex].length > inner.length) {
            coordinatePool.push(_multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex].pop())
          }
          // add additional coordinates
          while (inner.length > _multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex].length) {
            if (coordinatePool.length > 0) {
              _multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex].push(coordinatePool.pop())
            } else {
              _multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex].push([-1, -1])
            }
          }
          // add inner ring's coordinates
          for (let k = 0; k < inner.length; k++) {
            _multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex][k][0] = inner[k].lon
            _multiPolygonInternalObject.geometry.coordinates[i][innerRingIndex][k][1] = inner[k].lat
          }
          innerRingIndex++
        }
      }
    }
    return _multiPolygonInternalObject
  }
}

/**
 * Process OSM nodes
 * @param db
 * @param featureCallback
 */
function processNodes (db, featureCallback) {
  // nodes should be turned into feature if they have interesting tags, belong to a relation, or are not listed in any ways
  iterateNodeFeatures(db, node => {
    featureCallback(_constructPointFeature(node))
  })
}

/**
 * Process relations
 * @param db
 * @param featureCallback
 */
function processRelations (db, featureCallback) {
  // handle relations
  relationIterator(db, rel => {
    if (rel.tags.type === 'route' || rel.tags.type === 'waterway') {
      featureCallback(rewind(_constructMultiLineString(db, rel)))
    } else if (rel.tags.type === 'multipolygon' || rel.tags.type === 'boundary') {
      featureCallback(rewind(_constructMultiPolygon(db, rel)))
    }
  })
}

/**
 * Processes ways
 * @param db
 * @param featureCallback
 */
function processWays (db, featureCallback) {
  // process ways
  iterateWays(db, way => {
    if (way.is_polygon) {
      _polygonInternalObject.id = 'way/' + way.id
      _polygonInternalObject.properties = way.tags || {}
      _polygonInternalObject.properties.type = 'way'

      while (_polygonInternalObject.geometry.coordinates.length > 1) {
        coordinateArrayPool.push(_polygonInternalObject.geometry.coordinates.pop())
      }

      while (_polygonInternalObject.geometry.coordinates.length < 1) {
        if (coordinateArrayPool.length > 0) {
          _polygonInternalObject.geometry.coordinates.push(coordinateArrayPool.pop())
        } else {
          _polygonInternalObject.geometry.coordinates.push([])
        }
      }

      while (_polygonInternalObject.geometry.coordinates[0].length > way.nodes.length) {
        coordinatePool.push(_polygonInternalObject.geometry.coordinates[0].pop())
      }
      // remove previous coordinates
      while (way.nodes.length > _polygonInternalObject.geometry.coordinates[0].length) {
        if (coordinatePool.length > 0) {
          _polygonInternalObject.geometry.coordinates[0].push(coordinatePool.pop())
        } else {
          _polygonInternalObject.geometry.coordinates[0].push([-1, -1])
        }
      }
      for (let i = 0; i < way.nodes.length; i++) {
        const coordinate = way.nodes[i]
        _polygonInternalObject.geometry.coordinates[0][i][0] = coordinate.lon
        _polygonInternalObject.geometry.coordinates[0][i][1] = coordinate.lat
      }
      return featureCallback(rewind(_polygonInternalObject))
    } else {
      _lineStringInternalObject.id = 'way/' + way.id
      _lineStringInternalObject.properties = way.tags || {}
      _lineStringInternalObject.properties.type = 'way'

      while (_lineStringInternalObject.geometry.coordinates.length > way.nodes.length) {
        coordinatePool.push(_lineStringInternalObject.geometry.coordinates.pop())
      }
      // remove previous coordinates
      while (way.nodes.length > _lineStringInternalObject.geometry.coordinates.length) {
        if (coordinatePool.length > 0) {
          _lineStringInternalObject.geometry.coordinates.push(coordinatePool.pop())
        } else {
          _lineStringInternalObject.geometry.coordinates.push([-1, -1])
        }
      }
      for (let i = 0; i < way.nodes.length; i++) {
        _lineStringInternalObject.geometry.coordinates[i][0] = way.nodes[i].lon
        _lineStringInternalObject.geometry.coordinates[i][1] = way.nodes[i].lat
      }
      return featureCallback(_lineStringInternalObject)
    }
  })
}

/**
 * Converts nodes, ways, and rels into GeoJSON and calls featureCallback
 * @param db
 * @param featureCallback
 * @return {boolean|*}
 * @private
 */
function _convertToGeoJSON(db, featureCallback) {
  processNodes(db, featureCallback)
  processRelations(db, featureCallback)
  processWays(db, featureCallback)
}

/**
 * Setup the data structures for converting osm data into geojson
 */
function setup () {
  coordinatePool = []
  coordinateArrayPool = []
  _multiLineStringInternalObject = {
    type: 'Feature',
    id: '-1',
    properties: {},
    geometry: {
      type: 'MultiLineString',
      coordinates: []
    }
  }
  _lineStringInternalObject = {
    type: 'Feature',
    id: '-1',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  }
  _polygonInternalObject = {
    type: 'Feature',
    id: '-1',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[]]
    }
  }
  _multiPolygonInternalObject = {
    type: 'Feature',
    id: '-1',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: []
    }
  }
  _pointInternalObject = {
    type: 'Feature',
    id: '-1',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [-1, -1]
    }
  }
  _internal_outer_ways_array = []
  _internal_inner_ways_array = []
  _internal_ways_array = []
}
function cleanup () {
  coordinatePool = undefined
  coordinateArrayPool = undefined
  _multiLineStringInternalObject = undefined
  _lineStringInternalObject = undefined
  _polygonInternalObject = undefined
  _multiPolygonInternalObject = undefined
  _pointInternalObject = undefined
  _internal_outer_ways_array = undefined
  _internal_inner_ways_array = undefined
  _internal_ways_array = undefined
}

/**
 * Parses an OSM Overpass json file by streaming the elements into an underlying sqlite database and
 * performing queries to generte the appropriate features
 * @param filePath
 * @param featureCallback
 * @param elementsInFile
 * @param completionPercentageCallback
 * @param adjustBatchSize (set the batch size for better processing speed)
 * @return {Promise<unknown>}
 */
async function streamOverpassJsonFile(filePath, featureCallback, elementsInFile, completionPercentageCallback, adjustBatchSize) {
  const dbFile = path.join(path.dirname(filePath), 'osm.db')
  const db = getOrCreateDb(dbFile)

  let step = 0.01
  let currentStep = 0.0
  let elementsProcessed = 0
  let featuresProcessed = 0


  async function streamType (type, onElement, done = () => {}) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
      const pipeline = chain([
        stream,
        parser(),
        pick({filter: 'elements'}),
        streamArray()
      ])
      pipeline.on('error', err => {
        stream.close()
        reject(err)
      })
      pipeline.on('data', (data) => {
        try {
          if (data.value.type === type) {
            onElement(data)
            elementsProcessed++
            if ((elementsProcessed / elementsInFile) > currentStep) {
              completionPercentageCallback(currentStep * 0.80)
              currentStep += step
            }
          }
        } catch (e) {
          stream.close()
          reject(e)
        }
      })
      pipeline.on('end', () => {
        done()
        stream.close()
        resolve()
      })
    })
  }

  const close = () => {
    try {
      cleanup()
      closeDb(db)
      rmFile(dbFile)
      // eslint-disable-next-line no-empty, no-unused-vars
    } catch (e) {}
  }

  try {
    await streamType('node', (data) => {
      const value = removeUninterestingData(data.value)
      value.isInteresting = _hasInterestingTags(value.tags)
      value.tags = value.tags || {}
      addNodeToBatch(value)
    }, () => {
      flushNodes()
    })

    await streamType('way', (data) => {
      const value = removeUninterestingData(data.value)
      value.isInteresting = _hasInterestingTags(value.tags)
      value.isPolygon = _isPolygonFeature(value.tags)
      writeWayToDb(value)
    })

    await streamType('relation', (data) => {
      const value = removeUninterestingData(data.value)
      value.isInteresting = _hasInterestingTags(value.tags, {type: true})
      writeRelationToDb(value, _hasInterestingTags)
    })

    currentStep = 0.0
    const featuresToProcess = getFeaturesToProcessCount(db)
    adjustBatchSize(featuresToProcess)
    setup()
    _convertToGeoJSON(db, (f) => {
      featureCallback(f)
      featuresProcessed++
      if ((featuresProcessed / featuresToProcess) > currentStep) {
        completionPercentageCallback(0.80 + (.20 * currentStep))
        currentStep += step
      }
    })
  } catch (e) {
    throw new Error('Failed to convert data')
  } finally {
    close()
  }
}

export {
  streamOverpassJsonFile
}
