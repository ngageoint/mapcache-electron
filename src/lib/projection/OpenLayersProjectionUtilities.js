import proj4 from 'proj4'
import { getCode, getDef } from './ProjectionUtilities'
import {
  addProjection,
  get,
  addCoordinateTransforms,
  addEquivalentProjections,
  createSafeCoordinateTransform,
  assign
} from 'ol-format-node'
import { Projection, get as getTransform } from 'ol-format-node/proj'

function defineProjection (name) {
  const code = getCode(name)
  if (code !== -1) {
    const definition = getDef(code)
    if (definition) {
      proj4.defs(name, definition)
      proj4.defs('urn:ogc:def:crs:EPSG::' + code, definition)
      addProjection(new Projection({
        code: name,
        axisOrientation: definition.axis,
        metersPerUnit: definition.to_meter,
        units: definition.units,
      }))
      addProjection(new Projection({
        code: 'urn:ogc:def:crs:EPSG::' + code,
        axisOrientation: definition.axis,
        metersPerUnit: definition.to_meter,
        units: definition.units,
      }))
    }
  } else {
    throw new Error('unable to determine projection from name: ' + name)
  }
}

function addTransformation (from, to) {
  if (!proj4.defs(from)) {
    defineProjection(from)
  }

  if (!proj4.defs(to)) {
    defineProjection(from)
  }

  // if projection transformation doesn't exist, we need to add it
  if (!getTransform(from, to)) {
    const proj1 = get(from)
    const proj2 = get(to)
    const def1 = proj4.defs(from)
    const def2 = proj4.defs(to)
    if (def1 === def2) {
      addEquivalentProjections([proj1, proj2])
    } else {
      // Reset axis because OpenLayers always uses x, y axis order
      const transform = proj4(
        assign({}, def1, { axis: undefined }),
        assign({}, def2, { axis: undefined })
      )
      addCoordinateTransforms(
        proj1,
        proj2,
        createSafeCoordinateTransform(proj1, proj2, transform.forward),
        createSafeCoordinateTransform(proj2, proj1, transform.inverse)
      )
    }
  }
}

export {
  getCode,
  getDef,
  defineProjection,
  addTransformation
}
