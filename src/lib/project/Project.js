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
    return new Date().getTime()
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
