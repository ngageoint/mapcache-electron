import VectorLayer from './VectorLayer'

export default class DrawingLayer extends VectorLayer {
  async initialize () {
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'Drawing'
      }
    }
  }
}
