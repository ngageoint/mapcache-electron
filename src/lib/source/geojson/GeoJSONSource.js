import path from 'path'
import Source from '../Source'
import VectorLayer from '../../layer/vector/VectorLayer'
import {streamingGeoPackageBuild} from '../../geopackage/GeoPackageFeatureTableUtilities'
import { VECTOR } from '../../layer/LayerTypes'
import fs from 'fs'
import {chain} from 'stream-chain'
import {parser} from 'stream-json'
import {pick} from 'stream-json/filters/Pick'
import {streamArray} from 'stream-json/streamers/StreamArray'

export default class GeoJSONSource extends Source {
  async retrieveLayers (statusCallback) {
    statusCallback('Processing GeoJSON file', 0)
    await this.sleep(250)

    const { layerId, layerDirectory } = this.createLayerDirectory()
    const name = path.basename(this.filePath, path.extname(this.filePath))
    let fileName = name + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    const {addFeature, done} = await streamingGeoPackageBuild(filePath, name)

    let { size } = fs.statSync(this.filePath)
    const notifyStepSize = Math.ceil(size / 100)
    await new Promise((resolve, reject) => {
      let progress = 0
      let currentStep = 1
      const stream = fs.createReadStream(this.filePath)
      const pipeline = chain([
        stream,
        parser(),
        pick({filter: 'features'}),
        streamArray()
      ])
      stream.on('data', data => {
        // do the piping manually here.
        if (data != null) {
          progress += data.length
          while (currentStep * notifyStepSize < progress) {
            currentStep++
            statusCallback('Parsing and storing features', currentStep)
          }
        }
      })
      pipeline.on('error', err => {
        stream.close()
        reject(err)
      })
      pipeline.on('data', (data) => addFeature(data.value))
      pipeline.on('end', () => {
        stream.close()
        resolve()
      })
    })


    const {count, extent} = await done()
    statusCallback('Cleaning up', 100)
    await this.sleep(250)

    return [
      new VectorLayer({
        id: layerId,
        layerType: VECTOR,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        name: name,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceLayerName: name,
        sourceType: 'GeoJSON',
        count: count,
        extent: extent
      })
    ]
  }
}
