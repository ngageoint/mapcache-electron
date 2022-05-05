import proj4 from 'proj4'
import path from 'path'
import isNil from 'lodash/isNil'
import Database from 'better-sqlite3'
import { getExtraResourcesDirectory } from '../util/file/FileUtilities'
import {
  WEB_MERCATOR,
  WEB_MERCATOR_CODE,
  WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_CODE,
  WORLD_GEODETIC_SYSTEM_CRS
} from './ProjectionConstants'

function getCode (name) {
  const matches = name.match(/\d+$/)
  return matches.length > 0 ? Number.parseInt(matches[0]) : -1
}

function epsgMatches (srsA, srsB) {
  const srsIdA = srsA.match(/\d+/g)[0]
  const srsIdB = srsB.match(/\d+/g)[0]
  return srsIdA === srsIdB
}

function getMetersPerUnit (name) {
  let metersPerUnit = null
  const def = getDef(getCode(name))
  if (def != null) {
    metersPerUnit = def.to_meter
  }
  return metersPerUnit
}
function getUnits (name) {
  let units = null
  const def = getDef(getCode(name))
  if (def != null) {
    units = def.units
  }
  if (def != null && units == null) {
    if (getCode(name) === WORLD_GEODETIC_SYSTEM_CODE) {
      units = 'degrees'
    } else if (getCode(name) === WEB_MERCATOR_CODE) {
      units = 'meters'
    } else if (def.projName === 'longlat') {
      units = 'degrees'
    }
  }
  return units
}

function getDef (code) {
  let def
  const db = new Database(path.join(getExtraResourcesDirectory(), 'proj4.db'), { readonly: true })
  const stmt = db.prepare('SELECT def FROM defs WHERE code = ?')
  const row = stmt.get(code)
  if (row && row.def) {
    def = row.def
  }
  db.close()
  return def
}

/**
 * Define projection, if no definition is provided, will lookup in proj4.db
 * @param name
 * @param definition
 */
function defineProjection (name, definition = null) {
  const code = getCode(name)
  if (code !== -1) {
    const def = definition == null ? getDef(code) : definition
    if (def) {
      proj4.defs(name, def)
      proj4.defs('urn:ogc:def:crs:EPSG::' + code, def)
    }
  }
}


/**
 * Converts an EPSG:3857 bounding box into the provided spatial reference system.
 * Uses a process of densification, adding coordinates along the boundary and converting each to the target srs.
 * The bounds are determined by finding the max and min coordinates along the bounding box.
 * @param minLon
 * @param maxLon
 * @param minLat
 * @param maxLat
 * @param srs
 * @param density
 * @returns {{minLon: number, maxLat: number, minLat: number, maxLon: number}}
 */
function reprojectWebMercatorBoundingBox (minLon, maxLon, minLat, maxLat, srs, density = 21) {
  const converter = getConverter(WEB_MERCATOR, srs)
  const xStep = (maxLon - minLon) / density
  const yStep = (maxLat - minLat) / density
  const steps = density + 1
  let projected
  const xArray = []
  const yArray = []
  for (let i = 0; i < steps; i++) {
    // left boundary
    projected = converter.forward([minLon, maxLat - i * yStep])
    xArray.push(projected[0])
    yArray.push(projected[1])

    // bottom boundary
    projected = converter.forward([minLon + i * xStep, minLat])
    xArray.push(projected[0])
    yArray.push(projected[1])

    // right boundary
    projected = converter.forward([maxLon, minLat + i * yStep])
    xArray.push(projected[0])
    yArray.push(projected[1])

    // top boundary
    projected = converter.forward([maxLon - i * xStep, maxLat])
    xArray.push(projected[0])
    yArray.push(projected[1])
  }

  return {
    minLon: Math.min(...xArray),
    maxLon: Math.max(...xArray),
    minLat: Math.min(...yArray),
    maxLat: Math.max(...yArray)
  }
}

function getConverter (from, to) {
  if (from && !proj4.defs(from)) {
    defineProjection(from)
  }

  if (isNil(to)) {
    to = from
    from = WORLD_GEODETIC_SYSTEM
  }

  if (to && !proj4.defs(to)) {
    defineProjection(to)
  }

  return proj4(from, to)
}

const wgs84ToWebMercator = getConverter(WORLD_GEODETIC_SYSTEM, WEB_MERCATOR)
proj4.defs(WORLD_GEODETIC_SYSTEM_CRS, getDef(WORLD_GEODETIC_SYSTEM_CODE))

function convertToWebMercator (extent) {
  let filterLowerLeft = wgs84ToWebMercator.forward([extent[0], extent[1]])
  let filterUpperRight = wgs84ToWebMercator.forward([extent[2], extent[3]])
  return {minLon: filterLowerLeft[0], maxLon: filterUpperRight[0], minLat: filterLowerLeft[1], maxLat: filterUpperRight[1]}
}

export {
  getCode,
  getDef,
  getUnits,
  defineProjection,
  getConverter,
  wgs84ToWebMercator,
  reprojectWebMercatorBoundingBox,
  getMetersPerUnit,
  convertToWebMercator,
  epsgMatches
}
