import * as vendor from '../vendor'
import ActionUtilities from '../ActionUtilities'
import XYZTileUtilities from '../XYZTileUtilities'

export default class TileSelectionMapLayer extends vendor.L.GridLayer {
  projectId = null

  createTile (coords) {
    const self = this
    // create a <canvas> element for drawing
    var tile = vendor.L.DomUtil.create('button', '')

    tile.style.pointerEvents = 'initial'
    tile.style.background = '#4e9cca22'
    tile.style.border = '1px solid #4e9cca'

    vendor.L.DomEvent.on(tile, 'mouseover', function () {
      tile.style.background = '#4e9cca66'
    })
    vendor.L.DomEvent.on(tile, 'mouseout', function () {
      tile.style.background = '#4e9cca22'
    })
    vendor.L.DomEvent.on(tile, 'click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      let boundingBox = XYZTileUtilities.tileBboxCalculator(coords.x, coords.y, coords.z)
      if (self.projectId !== null && self.projectId !== undefined) {
        ActionUtilities.setBoundingBoxFilter({projectId: self.projectId, boundingBoxFilter: [boundingBox.west, boundingBox.south, boundingBox.east, boundingBox.north]})
        ActionUtilities.setBoundingBoxFilterEditingDisabled({projectId: self.projectId})
      }
    })
    vendor.L.DomEvent.on(tile, 'mousedown', function () {
      tile.style.background = '#4e9cca99'
    })
    vendor.L.DomEvent.on(tile, 'mouseup', function () {
      tile.style.background = '#4e9cca66'
    })
    return tile
  }

  setProjectId (projectId) {
    this.projectId = projectId
  }

  close () {
    this.layer.close()
  }
}
