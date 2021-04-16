import Source from './Source'
import axios from 'axios'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import _ from 'lodash'
import GeoServiceUtilities from '../GeoServiceUtilities'
import FileUtilities from '../FileUtilities'
import GML2 from 'ol/format/GML2'
import GML3 from 'ol/format/GML3'
import GML32 from 'ol/format/GML32'
import GeoJSON from 'ol/format/GeoJSON'
import WFS from 'ol/format/WFS'
import proj4 from 'proj4'
import defs from '../projection/proj4Defs'
import {addProjection, get, addCoordinateTransforms, addEquivalentProjections, createSafeCoordinateTransform} from 'ol/proj'
import {get as getTransform} from 'ol/proj/transforms'
import Projection from 'ol/proj/Projection'
import {assign} from 'ol/obj'

for (const name in defs) {
  if (defs[name]) {
    proj4.defs(name, defs[name])
    proj4.defs('urn:ogc:def:crs:EPSG::' + name.substring(5), defs[name])
  }
}
const projCodes = Object.keys(proj4.defs);
const len = projCodes.length
for (let i = 0; i < len; ++i) {
  const code = projCodes[i]
  if (!get(code)) {
    const def = proj4.defs(code)
    addProjection(new Projection({
      code: code,
      axisOrientation: def.axis,
      metersPerUnit: def.to_meter,
      units: def.units,
    }))
  }
}

export default class WFSSource extends Source {
  async retrieveLayers () {
    const geopackageLayers = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    for (const layer of this.layers) {
      let features = await this.getFeaturesInLayer(layer).catch(err => {
        throw err
      })
      featureCollection.features = featureCollection.features.concat(features)
    }
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(sourceDirectory, fileName)
    await GeoPackageUtilities.buildGeoPackage(filePath, this.sourceName, featureCollection).catch(err => {
      throw err
    })
    const extent = GeoPackageUtilities.getGeoPackageExtent(filePath, this.sourceName)
    geopackageLayers.push(new VectorLayer({
      id: sourceId,
      name: this.sourceName,
      geopackageFilePath: filePath,
      sourceFilePath: this.filePath,
      sourceDirectory: sourceDirectory,
      sourceId: sourceId,
      sourceLayerName: this.sourceName,
      sourceType: 'WFS',
      extent: extent
    }))
    return geopackageLayers
  }

  /**
   * Will attempt to make a GetFeature request.
   * Supports WFS 1.0.0, 1.1.0 and 2.0.0
   * Supports GeoJSON, GML2, and GML3 and GML32
   * @param layer
   * @returns {Promise<any>}
   */
  getFeaturesInLayer (layer) {
    return new Promise((resolve, reject) => {

      let outputFormat = GeoServiceUtilities.getLayerOutputFormat(layer)

      let srs = layer.defaultSRS
      const otherSrs = layer.otherSRS.find(s => s.endsWith(':4326'))
      if (otherSrs) {
        srs = otherSrs
      }

      // if projection transformation doesn't exist, we need to add it
      if (!getTransform(srs, 'EPSG:4326')) {
        const proj1 = get(srs)
        const proj2 = get('EPSG:4326')
        const def1 = proj4.defs(srs)
        const def2 = proj4.defs('EPSG:4326')
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

      axios({
        url: GeoServiceUtilities.getFeatureRequestURL(this.filePath, layer.name, outputFormat, srs, layer.version),
        withCredentials: true
      }).then(response => {
        // setup options for parsing response
        const options = {
          featureProjection: 'EPSG:4326'
        }
        if (!srs.endsWith(':4326')) {
          options.dataProjection = srs
        }

        let featureCollection
        let features = {}
        if (outputFormat === 'application/json') {
          features = new GeoJSON().readFeatures(response.data, options)
        } else if (outputFormat === 'GML32') {
          features = new WFS({gmlFormat: new GML32(), version: layer.version}).readFeatures(response.data, options)
        } else if (outputFormat === 'GML3') {
          features = new WFS({gmlFormat: new GML3(), version: layer.version}).readFeatures(response.data, options)
        } else if (outputFormat === 'GML2') {
          features = new WFS({gmlFormat: new GML2(), version: layer.version}).readFeatures(response.data, options)
        } else {
          reject(new Error('Service in unsupported WFS format: ' + outputFormat))
        }
        featureCollection = new GeoJSON().writeFeaturesObject(features)
        if (_.isNil(featureCollection) || _.isNil(featureCollection.features) || _.isEmpty(featureCollection.features)) {
          reject(new Error('Error retrieving features.'))
        }
        resolve(featureCollection.features.filter(f => f !== undefined))
      }).catch(() => {
        reject('Error retrieving WFS features.')
      })
    })
  }
}
