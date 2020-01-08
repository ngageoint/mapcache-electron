import UniqueIDUtilities from '../UniqueIDUtilities'

export default class Project {
  name
  id
  layerCount
  sources
  constructor ({name = 'New Project', id = UniqueIDUtilities.createUniqueID(), layerCount = 0, layers = {}}) {
    this.name = name
    this.id = id
    this.layerCount = layerCount
    this.layers = layers
  }

  toJSON () {
    let {name, id, layerCount, layers} = this
    return {name, id, layerCount, layers}
  }
}
