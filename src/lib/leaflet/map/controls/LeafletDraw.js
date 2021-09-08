import {L} from '../../vendor'
import {DRAWING_MAP_PANE} from '../panes/MapPanes'
import {getDefaultLeafletStyleForMapCache} from '../style/Style'

export default class LeafletDraw extends L.Control {
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
    map.createPane(DRAWING_MAP_PANE.name)
    map.getPane(DRAWING_MAP_PANE.name).style.zIndex = DRAWING_MAP_PANE.zIndex

    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._pointLink = L.DomUtil.create('a', '', container)
    this._polyLink = L.DomUtil.create('a', '', container)
    this._rectLink = L.DomUtil.create('a', '', container)
    this._linestringLink = L.DomUtil.create('a', '', container)
    this._cancelLink = L.DomUtil.create('a', 'warning--text hidden', container)

    this._pointLink.title = 'Draw Point'
    this._polyLink.title = 'Draw Polygon'
    this._rectLink.title = 'Draw Rectangle'
    this._linestringLink.title = 'Draw Line'
    this._cancelLink.title = 'Cancel'

    this._pointLink.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24"><defs><path d="M14.52 4.56L15.59 5.22L16.47 6.08L17.15 7.11L17.58 8.29L17.74 9.56L17.58 10.84L17.15 12.01L16.49 13.02L14.39 16.28L12 20L9.6 16.28L7.52 13.04L7.52 13.04L6.84 12.01L6.41 10.84L6.25 9.56L6.41 8.29L6.84 7.11L7.52 6.08L8.4 5.22L9.47 4.56L10.68 4.14L12 3.99L13.31 4.14L14.52 4.56Z" id="a2ad41dfX"></path></defs><g><g><g><use xlink:href="#a2ad41dfX" opacity="1" fill="currentColor" fill-opacity="1"></use></g></g></g></svg>`
    this._polyLink.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24"><defs><path d="M4 6.77L8 6.77L8 10.77L4 10.77L4 6.77Z" id="g2XsjQAJ2f"></path><path d="M4 16.03L8 16.03L8 20.03L4 20.03L4 16.03Z" id="bbT8mO0Mv"></path><path d="M16 4L20 4L20 8L16 8L16 4Z" id="e2Ze6qgYrp"></path><path d="M16 16.03L20 16.03L20 20.03L16 20.03L16 16.03Z" id="br7bjMJz9"></path><path d="" id="a18NRZMitj"></path><path d="" id="cKIipJUPD"></path><path d="M6 8.77L18 6L18 18.03L6 18.03L6 8.77Z" id="a4H1KABEkA"></path></defs><g><g><g><use xlink:href="#g2XsjQAJ2f" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#bbT8mO0Mv" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#e2Ze6qgYrp" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#br7bjMJz9" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><g><use xlink:href="#a18NRZMitj" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="1" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#cKIipJUPD" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="1" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#a4H1KABEkA" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g></g></g></svg>`
    this._rectLink.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24"><defs><path d="M4 4L8 4L8 8L4 8L4 4Z" id="aaqptPyJyf"></path><path d="M4 16L8 16L8 20L4 20L4 16Z" id="a38f8x6AkT"></path><path d="M16 4L20 4L20 8L16 8L16 4Z" id="c2DQzteb74"></path><path d="M16 16L20 16L20 20L16 20L16 16Z" id="adXzXpWeq"></path><path d="" id="b6cb7dotDG"></path><path d="M6 6L18 6L18 8.15L18 18L6 18L6 6Z" id="auyirvTvb"></path></defs><g><g><g><use xlink:href="#aaqptPyJyf" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#a38f8x6AkT" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#c2DQzteb74" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#adXzXpWeq" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><g><use xlink:href="#b6cb7dotDG" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="1" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#auyirvTvb" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g></g></g></svg>`
    this._linestringLink.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24"><defs><path d="M4 16.01L8 16.01L8 20.01L4 20.01L4 16.01Z" id="e2OzCtZQI"></path><path d="M16 12L20 12L20 16L16 16L16 12Z" id="c1XeTPkMy"></path><path d="M4 8.01L8 8.01L8 12.01L4 12.01L4 8.01Z" id="a1eBV9uNTW"></path><path d="M16 4.01L20 4.01L20 8.01L16 8.01L16 4.01Z" id="bxv5fqfv0"></path><path d="" id="erwqQ4gB"></path><path d="" id="efgKV9tHO"></path><path d="M18 14L6 18.01" id="gBUfL8Zir"></path><path d="M18 5.82L6 10.01" id="a1ffOZgNEG"></path><path d="M18 14L6 10.01" id="a52FCN8PC"></path></defs><g><g><g><use xlink:href="#e2OzCtZQI" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#c1XeTPkMy" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#a1eBV9uNTW" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><use xlink:href="#bxv5fqfv0" opacity="1" fill="currentColor" fill-opacity="1"></use></g><g><g><use xlink:href="#erwqQ4gB" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#efgKV9tHO" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#gBUfL8Zir" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#a1ffOZgNEG" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g><g><g><use xlink:href="#a52FCN8PC" opacity="1" fill-opacity="0" stroke="currentColor" stroke-width="2" stroke-opacity="1"></use></g></g></g></g></svg>`
    this._cancelLink.innerHTML = `<svg style="margin-top: 3px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" preserveAspectRatio="xMidYMid meet" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
`
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

    this.show = function () {
      if (L.DomUtil.hasClass(container, 'hidden')) {
        L.DomUtil.removeClass(container, 'hidden')
      }
    }

    this.hide = function () {
      L.DomUtil.addClass(container, 'hidden')
    }

    this.disableDrawingLinks = function () {
      this._drawingLinks.forEach(function (link) {
        link.onclick = function () {}
        L.DomUtil.addClass(link, 'leaflet-control-disabled')
      })
    }.bind(this)

    this.enableDrawingLinks = function () {
      this._drawingLinks.forEach(function (link) {
        link.onclick = function () {}
        if (L.DomUtil.hasClass(link, 'leaflet-control-disabled')) {
          L.DomUtil.removeClass(link, 'leaflet-control-disabled')
        }
      })
      this._pointLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = point
        this.disableDrawingLinks()
        this.drawing = map.editTools.startMarker(undefined, {pane: DRAWING_MAP_PANE.name})
        this.isDrawing = true
        L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      this._polyLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = polygon
        this.disableDrawingLinks()
        this.drawing = map.editTools.startPolygon(undefined, {pane: DRAWING_MAP_PANE.name})
        this.drawing.setStyle(getDefaultLeafletStyleForMapCache())
        this.isDrawing = true
        L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      this._rectLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = rectangle
        this.disableDrawingLinks()
        this.drawing = map.editTools.startRectangle(undefined, {pane: DRAWING_MAP_PANE.name})
        this.drawing.setStyle(getDefaultLeafletStyleForMapCache())
        this.isDrawing = true
        L.DomUtil.removeClass(this._cancelLink, 'hidden')
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      this._linestringLink.onclick = function (e) {
        this.cancelled = false
        this.drawingType = linestring
        this.disableDrawingLinks()
        this.drawing = map.editTools.startPolyline(undefined, {pane: DRAWING_MAP_PANE.name})
        this.drawing.setStyle(getDefaultLeafletStyleForMapCache())
        this.isDrawing = true
        L.DomUtil.removeClass(this._cancelLink, 'hidden')
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
        L.DomUtil.addClass(this._cancelLink, 'hidden')
      }
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)


    map.on('editable:drawing:commit', function () {
      this.enableDrawingLinks()
      this.isDrawing = false
      this.drawing = null
      L.DomUtil.addClass(this._cancelLink, 'hidden')
    }.bind(this))

    this.enableDrawingLinks()

    const tooltip = L.DomUtil.get('tooltip')
    const self = this
    function addTooltip () {
      tooltip.innerHTML = self.drawingType.tooltip
      tooltip.style.display = 'block'
    }

    function removeTooltip () {
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
