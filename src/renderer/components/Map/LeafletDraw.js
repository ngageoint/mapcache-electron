import * as vendor from '../../../lib/vendor'

export default class LeafletDraw extends vendor.L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
    this.isDrawing = false
    this.drawingType = null
    this.drawing = null
  }

  onAdd (map) {
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._pointLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-point', container)
    this._polyLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-polygon', container)
    this._rectLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-rectangle', container)
    this._linestringLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-linestring', container)
    this._cancelLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-cancel hidden', container)

    this._drawingLinks = [this._pointLink, this._polyLink, this._rectLink, this._linestringLink]

    const point = {
      type: 0,
      tooltip: 'Click on map to set point.'
    }

    const polygon = {
      type: 1,
      tooltip: 'Click on map to start polygon.',
      tooltipMinVertexNotReached: 'Click on the map to continue the polygon.',
      tooltipComplete: 'Click on first point to finish polygon.'
    }

    const rectangle = {
      type: 2,
      tooltip: 'Click on map and hold to start rectangle. Drag cursor to set rectangle size.'
    }

    const linestring = {
      type: 3,
      tooltip: 'Click on map to start line.',
      tooltipMinVertexNotReached: 'Click on the map to continue the line.',
      tooltipComplete: 'Click on last point to finish line.'
    }

    this.disableDrawingLinks = function () {
      this._drawingLinks.forEach(function (link) {
        link.onclick = function () {}
        vendor.L.DomUtil.addClass(link, 'leaflet-control-disabled')
      })
    }.bind(this)

    this.enableDrawingLinks = function () {
      this._drawingLinks.forEach(function (link) {
        link.onclick = function () {}
        if (vendor.L.DomUtil.hasClass(link, 'leaflet-control-disabled')) {
          vendor.L.DomUtil.removeClass(link, 'leaflet-control-disabled')
        }
      })
      this._pointLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = point
        this.disableDrawingLinks()
        this.drawing = map.editTools.startMarker()
        this.isDrawing = true
        vendor.L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      this._polyLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = polygon
        this.disableDrawingLinks()
        this.drawing = map.editTools.startPolygon()
        this.isDrawing = true
        vendor.L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      this._rectLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = rectangle
        this.disableDrawingLinks()
        this.drawing = map.editTools.startRectangle()
        this.isDrawing = true
        vendor.L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      this._linestringLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = linestring
        this.disableDrawingLinks()
        this.drawing = map.editTools.startPolyline()
        this.isDrawing = true
        vendor.L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
    }.bind(this)

    this._cancelLink.onmousedown = function (e) {
      this.cancelled = true
      if (this.isDrawing) {
        removeTooltip()
        map.editTools.stopDrawing()
        this.drawing.remove()
        this.drawing = null
        this.drawingType = null
        this.enableDrawingLinks()
        vendor.L.DomUtil.addClass(this._cancelLink, 'hidden')
      }
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this.mouseMove = function (e) {
      if (this._tooltip) {
        this._tooltip.updatePosition(e.latlng)
      }
    }.bind(this)

    map.on('editable:drawing:commit', function () {
      this.enableDrawingLinks()
      this.isDrawing = false
      this.drawing = null
      vendor.L.DomUtil.addClass(this._cancelLink, 'hidden')
    }.bind(this))

    map.on('boundingBoxDisabled', function () {
      this.enableDrawingLinks()
    }.bind(this))
    map.on('boundingBoxEnabled', function () {
      this.disableDrawingLinks()
    }.bind(this))

    this.enableDrawingLinks()

    const tooltip = vendor.L.DomUtil.get('tooltip')
    const self = this
    function addTooltip (e) {
      tooltip.innerHTML = self.drawingType.tooltip
      tooltip.style.display = 'block'
    }

    function removeTooltip (e) {
      tooltip.innerHTML = ''
      tooltip.style.display = 'none'
    }

    function updateTooltip (e) {
      if (self.drawingType.type === 1 || self.drawingType.type === 3) {
        if (e.layer.editor._drawnLatLngs.length + 1 < e.layer.editor.MIN_VERTEX) {
          tooltip.innerHTML = self.drawingType.tooltipMinVertexNotReached
        } else {
          tooltip.innerHTML = self.drawingType.tooltipComplete
        }
      }
    }
    map.on('editable:drawing:start', addTooltip)
    map.on('editable:drawing:end', removeTooltip)
    map.on('editable:drawing:click', updateTooltip)

    return container
  }
}
