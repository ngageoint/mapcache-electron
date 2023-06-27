import * as path from 'path'
import { readFile } from 'fs'
import { URL } from 'url'

export default (protocol, scheme) => {
  protocol.registerBufferProtocol(scheme, (request, callback) => {
      let pathName = new URL(request.url).pathname
      console.log("original url pathname: " + pathName)
      pathName = decodeURI(pathName) // Needed in case URL contains spaces
      let absolutePath = pathName
      console.log('original protocol file path: ' + path.join(__dirname, pathName))
      // TODO: this is a hack at determining where files will exist now that the structure of the build has changed.
      // filename does not include the current dirname, so let's make it an absolute path
      if (pathName.indexOf(__dirname) === -1) {
        // Some files contain index.html in the path when finding the assets... not sure why but will just fix them up
        if (pathName.indexOf(path.join('renderer', 'index.html', 'assets')) > -1) {
          const fixedPath = pathName.replace('index.html', '')
          absolutePath = path.join(__dirname, '..', fixedPath)
          // if they contain images
        } else if (pathName.indexOf('images') > -1) {
          absolutePath = path.join(__dirname, '..', pathName.indexOf('renderer') === -1 ? 'renderer' : '', pathName)
        } else if (pathName.indexOf('renderer') > -1) {
          absolutePath = path.join(__dirname, '..', pathName)
        } else {
          absolutePath = path.join(__dirname, pathName)
        }
      }

      readFile(absolutePath, (error, data) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to read ${pathName} on ${scheme} protocol`)
          callback(null)
        } else {
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
          } else if (extension === '.eot') {
            mimeType = 'application/vnd.ms-fontobject'
          } else if (extension === '.otf') {
            mimeType = 'application/font-otf'
          } else if (extension === '.woff') {
            mimeType = 'font/woff'
          } else if (extension === '.ttf') {
            mimeType = 'font/ttf'
          } else if (extension === '.map') {
            mimeType = 'application/json'
          }

          callback({ mimeType, data })
        }
      })
    }
  )
}
