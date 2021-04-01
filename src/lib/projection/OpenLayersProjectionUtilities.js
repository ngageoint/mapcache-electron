import proj4 from 'proj4'
import proj4Defs from './proj4Defs'
import { addProjection, get, addCoordinateTransforms, addEquivalentProjections, createSafeCoordinateTransform } from 'ol/proj'
import { get as getTransform } from 'ol/proj/transforms'
import Projection from 'ol/proj/Projection'
import { assign } from 'ol/obj'

export default class OpenLayersProjectionUtilities {
  static defineProjection (name) {
    const definition = proj4Defs[name]
    if (definition) {
      proj4.defs(name, definition)
      proj4.defs('urn:ogc:def:crs:EPSG::' + name.substring(5), definition)
      addProjection(new Projection({
        code: name,
        axisOrientation: definition.axis,
        metersPerUnit: definition.to_meter,
        units: definition.units,
      }))
      addProjection(new Projection({
        code: 'urn:ogc:def:crs:EPSG::' + name.substring(5),
        axisOrientation: definition.axis,
        metersPerUnit: definition.to_meter,
        units: definition.units,
      }))
    }
  }

  static addTransformation (from, to) {
    if (!proj4.defs(from)) {
      OpenLayersProjectionUtilities.defineProjection(from)
    }

    if (!proj4.defs(to)) {
      OpenLayersProjectionUtilities.defineProjection(from)
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
          assign({}, def1, {axis: undefined}),
          assign({}, def2, {axis: undefined})
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
}
