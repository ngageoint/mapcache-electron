const { parentPort } = require('worker_threads')
import GeoTiffRenderingUtilities from '../lib/util/GeoTiffRenderingUtilities'

let setup = false

parentPort.on('message', (message) => {
  if (message.shutdown) {
    closeListeners()
    process.exit()
  } else {
    GeoTiffRenderingUtilities.requestTile(message).then((result) => {
      parentPort.postMessage(result)
    }).catch(error => {
      throw error
    })
  }
})

function closeListeners () {
  process.off('SIGINT')
  process.off('SIGTERM')
  process.off('SIGABRT')
  process.off('SIGSEGV')
  parentPort.off('message')
}

function setupListeners () {
  process.on('SIGINT', () => {
    console.log('sigint received in geotiff worker')
    closeListeners()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('sigterm received in geotiff worker')
    closeListeners()
    process.exit(0)
  })

  process.on('SIGABRT', () => {
    console.log('sigabrt received in geotiff worker')
    closeListeners()
    process.exit(0)
  })

  process.on('SIGSEGV', () => {
    console.log('sigsegv received in mapcache worker')
    closeListeners()
    process.exit(0)
  })

  setup = true
}

if (!setup) {
  setupListeners()
}
