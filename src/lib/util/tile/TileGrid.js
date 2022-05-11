/**
 * TileGrid represents a grid of tiles
 */
class TileGrid {
  /**
   * Min x
   */
  minX

  /**
   * Max x
   */
  maxX

  /**
   * Min y
   */
  minY

  /**
   * Max y
   */
  maxY

  constructor (minX, minY, maxX, maxY) {
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }
}

export {
  TileGrid
}