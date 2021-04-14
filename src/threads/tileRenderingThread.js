const { parentPort } = require('worker_threads')
import GeoTiffRenderingUtilities from '../lib/util/GeoTiffRenderingUtilities'
import MBTilesRenderingUtilities from '../lib/util/MBTilesRenderingUtilities'
import GeoPackageRenderingUtilities from '../lib/util/GeoPackageRenderingUtilities'
import CanvasUtilities from '../lib/util/CanvasUtilities'
import LayerTypes from '../lib/source/layer/LayerTypes'
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
