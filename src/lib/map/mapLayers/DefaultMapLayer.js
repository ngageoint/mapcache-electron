import MapcacheMapLayer from '../MapcacheMapLayer'

export default class DefaultMapLayer {
  static constructMapLayer (layerModel) {
    let mapLayer = new MapcacheMapLayer({
      layer: layerModel,
      pane: layerModel.pane === 'tile' ? 'tilePane' : 'overlayPane',
      zIndex: layerModel.pane === 'tile' ? 201 : 401
    })
    mapLayer.id = layerModel.id
    let opacity = 1.0
    if (layerModel.opacity !== null && layerModel.opacity !== undefined) {
      opacity = layerModel.opacity
    }
    mapLayer.setOpacity(opacity)
    return mapLayer
  }
}
