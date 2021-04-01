import proj4 from 'proj4'
import proj4Defs from './proj4Defs'
import isNil from 'lodash/isNil'

export default class ProjectionUtilities {
  static defineProjection (name) {
    if (proj4Defs[name]) {
      proj4.defs(name, proj4Defs[name])
      proj4.defs('urn:ogc:def:crs:EPSG::' + name.substring(5), proj4Defs[name])
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
