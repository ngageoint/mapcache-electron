class Label {
  name
  center
  boundingBox
  zoneLetter
  zoneNumber

  constructor (name, center, boundingBox, zoneLetter, zoneNumber) {
    this.name = name
    this.center = center
    this.boundingBox = boundingBox
    this.zoneLetter = zoneLetter
    this.zoneNumber = zoneNumber
  }

  getName () {
    return this.name
  }

  getCenter () {
    return this.center
  }

  getBoundingBox () {
    return this.boundingBox
  }
}

export {
  Label
}
