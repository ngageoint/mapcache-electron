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

function defineProjection (name) {
  const code = getCode(name)
  if (code !== -1) {
    const def = getDef(code)
    if (def) {
      proj4.defs(name, def)
      proj4.defs('urn:ogc:def:crs:EPSG::' + code, def)
    }
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

export {
  getCode,
  getDef,
  defineProjection,
  getConverter,
  wgs84ToWebMercator
}
