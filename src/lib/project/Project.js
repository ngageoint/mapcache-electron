export default class Project {
  name
  id
  layerCount
  sources
  constructor ({name = 'New Project', id = createId(), layerCount = 0, sources = {}}) {
    this.name = name
    this.id = id
    this.layerCount = layerCount
    this.sources = sources
  }

  toJSON () {
    let {name, id, layerCount, sources} = this
    return {name, id, layerCount, sources}
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
