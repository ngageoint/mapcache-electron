import axios from 'axios'
import fs from 'fs'
import { Readable } from 'stream'

function bufferToStream (buffer) {
  let stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

/**
 * Gets a remote image and writes it to file using Node.js libraries
 * @param url
 * @param filePath
 * @returns {Promise<void>}
 */
async function getRemoteImage (url, filePath) {
  await new Promise((resolve) => {
    return axios({
      url: url,
      responseType: 'arraybuffer'
    })
      .then(response => {
        const writer = fs.createWriteStream(filePath)
        bufferToStream(Buffer.from(response.data)).pipe(writer)
        writer.on('finish', () => {
          writer.close()
          resolve()
        })
      })
      .catch(() => {
        // eslint-disable-next-line no-console
        console.error('Failed to retrieve remote icon file')
        resolve()
      })
  })
}


export {
  getRemoteImage
}
