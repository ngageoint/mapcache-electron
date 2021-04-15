const { parentPort } = require('worker_threads')
import GeoTiffRenderingUtilities from '../util/GeoTiffRenderingUtilities'
import MBTilesRenderingUtilities from '../util/MBTilesRenderingUtilities'
import GeoPackageRenderingUtilities from '../util/GeoPackageRenderingUtilities'
import CanvasUtilities from '../util/CanvasUtilities'
import LayerTypes from '../source/layer/LayerTypes'
import { createCanvas } from 'canvas'

CanvasUtilities.setCreateCanvasFunction((width, height) => {
  return createCanvas(width, height)
})

parentPort.on('message', (message) => {
  switch (message.layerType) {
    case LayerTypes.GEOTIFF:
      GeoTiffRenderingUtilities.requestTile(message).then((result) => {
        parentPort.postMessage(result)
      }).catch(error => {
        throw error
      })
      break;
    case LayerTypes.MBTILES:
      MBTilesRenderingUtilities.requestTile(message).then((result) => {
        parentPort.postMessage(result)
      }).catch(error => {
        throw error
      })
      break;
    case LayerTypes.VECTOR:
      GeoPackageRenderingUtilities.requestTile(message).then((result) => {
        parentPort.postMessage(result)
      }).catch(error => {
        throw error
      })
      break;
    default:
      throw new Error(message.layerType + ' not a supported layer type')
  }
})
