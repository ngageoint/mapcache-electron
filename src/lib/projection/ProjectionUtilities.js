import proj4 from 'proj4'
import path from 'path'
import isNil from 'lodash/isNil'
import Database from 'better-sqlite3'
import { getExtraResourcesDirectory } from '../util/FileUtilities'

function getCode (name) {
  const matches = name.match(/\d+$/)
  return matches.length > 0 ? Number.parseInt(matches[0]) : -1
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
  const converter = getConverter('EPSG:3857', srs)
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
    from = 'EPSG:4326'
  }

  if (to && !proj4.defs(to)) {
    defineProjection(to)
  }

  return proj4(from, to)
}

const wgs84ToWebMercator = getConverter('EPSG:4326', 'EPSG:3857')
proj4.defs('CRS:84', getDef(4326))

export {
  getCode,
  getDef,
  defineProjection,
  getConverter,
  wgs84ToWebMercator,
  reprojectWebMercatorBoundingBox
}
