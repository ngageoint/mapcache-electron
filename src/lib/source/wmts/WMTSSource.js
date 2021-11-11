import Source from '../Source'
import WMTSLayer from '../../layer/tile/WMTSLayer'
import { WMTS } from '../../layer/LayerTypes'
import { getRecommendedEpsg, getRecommendedSrs } from '../../util/wmts/WMTSUtilities'

export default class WMTSSource extends Source {
  constructor (id, directory, filePath, layer, wmtsInfo, sourceName, withCredentials = false) {
    super(id, directory, filePath)
    this.layer = layer
    this.sourceName = sourceName
    this.wmtsInfo = wmtsInfo
    this.format = layer.format
    this.withCredentials = withCredentials
  }
  async retrieveLayers (statusCallback) {
    statusCallback('Processing WMTS server', 0)
    await this.sleep(250)

    statusCallback('Storing WMTS server data', 50)
    await this.sleep(250)

    const supportedTileMatrixSets = this.wmtsInfo.tileMatrixSet.filter(tms => this.layer.tileMatrixSets.findIndex(set => set.identifier === tms.identifier) !== -1)
    const supportedTileMatrixSetSrsList = supportedTileMatrixSets.map(tms => tms.supportedCRS)
    const preferredTileMatrixSetSrs = getRecommendedSrs(supportedTileMatrixSetSrsList)
    const tileMatrixSet = supportedTileMatrixSets.find(tms => tms.supportedCRS === preferredTileMatrixSetSrs)
    const srs = getRecommendedEpsg(supportedTileMatrixSetSrsList)

    const { layerId, layerDirectory } = this.createLayerDirectory()
    statusCallback('Cleaning up', 100)
    await this.sleep(250)
    return [
      new WMTSLayer({
        id: layerId,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        filePath: this.filePath,
        name: this.sourceName,
        sourceLayerName: this.sourceName,
        layer: this.layer,
        tileMatrixSet: tileMatrixSet,
        extent: this.layer.extent,
        version: '1.0.0',
        layerType: WMTS,
        srs: srs,
        withCredentials: this.withCredentials,
      })
    ]
  }
}
