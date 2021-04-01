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
    closeListeners()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    closeListeners()
    process.exit(0)
  })

  process.on('SIGABRT', () => {
    closeListeners()
    process.exit(0)
  })

  process.on('SIGSEGV', () => {
    closeListeners()
    process.exit(0)
  })

  setup = true
}

if (!setup) {
  setupListeners()
}
