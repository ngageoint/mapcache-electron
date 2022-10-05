import * as path from 'path'
import { readFile } from 'fs'
import { URL } from 'url'

export default (protocol, scheme) => {
  protocol.registerBufferProtocol(scheme, (request, callback) => {
      let pathName = new URL(request.url).pathname
      pathName = decodeURI(pathName) // Needed in case URL contains spaces
      let absolutePath = pathName
      if (pathName.indexOf(__dirname) === -1) {
        absolutePath = path.join(__dirname, pathName)
      }
      readFile(absolutePath, (error, data) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to read ${pathName} on ${scheme} protocol`, error)
        }
        const extension = path.extname(pathName).toLowerCase()
        let mimeType = ''

        if (extension === '.js') {
          mimeType = 'text/javascript'
        } else if (extension === '.html') {
          mimeType = 'text/html'
        } else if (extension === '.css') {
          mimeType = 'text/css'
        } else if (extension === '.svg' || extension === '.svgz') {
          mimeType = 'image/svg+xml'
        } else if (extension === '.json') {
          mimeType = 'application/json'
        } else if (extension === '.wasm') {
          mimeType = 'application/wasm'
        } else if (extension === '.webm') {
          mimeType = 'video/webm'
        }

        callback({ mimeType, data })
      })
    }
  )
}
