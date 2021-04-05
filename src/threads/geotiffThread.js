const { parentPort } = require('worker_threads')
import GeoTiffRenderingUtilities from '../lib/util/GeoTiffRenderingUtilities'

parentPort.on('message', (message) => {
  if (message.shutdown) {
    process.exit()
  } else {
    GeoTiffRenderingUtilities.requestTile(message).then((result) => {
      parentPort.postMessage(result)
    }).catch(error => {
      throw error
    })
  }
})
