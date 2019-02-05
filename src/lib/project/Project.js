export default class Project {
  name
  id
  layerCount
  sources
  constructor ({name = 'New Project', id = createId(), layerCount = 0, layers = {}}) {
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

function createId () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
