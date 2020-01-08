import MapcacheMapLayer from '../MapcacheMapLayer'

export default class DefaultMapLayer {
  static constructMapLayer (layerModel) {
    let mapLayer = new MapcacheMapLayer({
      layer: layerModel,
      pane: layerModel.pane === 'tile' ? 'tilePane' : 'overlayPane'
    })
    mapLayer.id = layerModel.id
    return mapLayer
  }
}
