import MapcacheMapLayer from '../MapcacheMapLayer'

export default class DefaultMapLayer {
  static constructMapLayer (layerModel) {
    let mapLayer = new MapcacheMapLayer({
      layer: layerModel,
      pane: 'tilePane',
      zIndex: 201
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
