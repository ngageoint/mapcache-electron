import proj4 from 'proj4'
import path from 'path'
import isNil from 'lodash/isNil'
import Database from 'better-sqlite3'
import FileUtilities from '../util/FileUtilities'

export default class ProjectionUtilities {

  static getCode (name) {
    let code = -1
    if (name.startsWith('EPSG:')) {
      code = Number.parseInt(name.substring(5))
    }
    return code
  }

  static getDef (code) {
    let def
    const db = new Database(path.join(FileUtilities.getExtraResourcesDirectory(), 'proj4.db'), { readonly: true })
    const stmt = db.prepare('SELECT def FROM defs WHERE code = ?')
    const row = stmt.get(code)
    if (row && row.def) {
      def = row.def
    }
    db.close()
    return def
  }

  static defineProjection (name) {
    const code = ProjectionUtilities.getCode(name)
    if (code !== -1) {
      const def = ProjectionUtilities.getDef(code)
      if (def) {
        proj4.defs(name, def)
        proj4.defs('urn:ogc:def:crs:EPSG::' + code, def)
      }
    }
  }

  static getConverter (from, to) {
    if (from && !proj4.defs(from)) {
      ProjectionUtilities.defineProjection(from)
    }

    if (isNil(to)) {
      to = from
      from = 'EPSG:4326'
    }

    if (to && !proj4.defs(to)) {
      ProjectionUtilities.defineProjection(to)
    }

    return proj4(from, to)
  }

  static wgs84ToWebMercator = ProjectionUtilities.getConverter('EPSG:4326', 'EPSG:3857')
}
