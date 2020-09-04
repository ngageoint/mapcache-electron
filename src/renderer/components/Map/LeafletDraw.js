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
  }

  onAdd (map) {
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._pointLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-point', container)
    this._polyLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-polygon', container)
    this._rectLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-rectangle', container)
    this._linestringLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-linestring', container)
    this._trashLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-trash-disabled', container)

    this._drawingLinks = [this._pointLink, this._polyLink, this._rectLink, this._linestringLink]

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
      this._pointLink.onclick = function () {
        this.disableDrawingLinks()
        this.disableEditingLinks()
        map.editTools.startMarker()
      }.bind(this)

      this._polyLink.onclick = function () {
        this.disableDrawingLinks()
        this.disableEditingLinks()
        map.editTools.startPolygon()
      }.bind(this)
      this._rectLink.onclick = function () {
        this.disableDrawingLinks()
        this.disableEditingLinks()
        map.editTools.startRectangle()
      }.bind(this)
      this._linestringLink.onclick = function () {
        this.disableDrawingLinks()
        this.disableEditingLinks()
        map.editTools.startPolyline()
      }.bind(this)
    }.bind(this)

    this._trashOnClick = function () {
      if (vendor.L.DomUtil.hasClass(this._trashLink, 'leaflet-control-draw-trash-enabled')) {
        map.deleteFeatures.disable()
        this.enableDrawingLinks()
      } else {
        this.disableDrawingLinks()
        map.deleteFeatures.enable()
      }
      this.options.trashEnabled = !this.options.trashEnabled
    }.bind(this)

    this.enableEditingLinks = function () {
      this._trashLink.onclick = this._trashOnClick
      if (vendor.L.DomUtil.hasClass(this._trashLink, 'leaflet-control-disabled')) {
        vendor.L.DomUtil.removeClass(this._trashLink, 'leaflet-control-disabled')
      }
    }.bind(this)

    this.disableEditingLinks = function () {
      this._trashLink.onclick = () => {}
      vendor.L.DomUtil.addClass(this._trashLink, 'leaflet-control-disabled')
    }.bind(this)

    this.mouseMove = function (e) {
      if (this._tooltip) {
        this._tooltip.updatePosition(e.latlng)
      }
    }.bind(this)

    const deleteHandler = vendor.L.Handler.extend({
      addHooks: function () {
        vendor.L.DomUtil.removeClass(this._trashLink, 'leaflet-control-draw-trash-disabled')
        vendor.L.DomUtil.addClass(this._trashLink, 'leaflet-control-draw-trash-enabled')
        this._tooltip = new vendor.L.Draw.Tooltip(map)
        this._tooltip.updateContent({text: 'Click a drawing to delete it.'})
        map.on('mousemove', this.mouseMove)
        map.fire('delete:enable')
      }.bind(this),
      removeHooks: function () {
        map.off('mousemove', this.mouseMove)
        this._tooltip.dispose()
        this._tooltip = null
        vendor.L.DomUtil.removeClass(this._trashLink, 'leaflet-control-draw-trash-enabled')
        vendor.L.DomUtil.addClass(this._trashLink, 'leaflet-control-draw-trash-disabled')
        map.fire('delete:disable')
      }.bind(this)
    })
    map.addHandler('deleteFeatures', deleteHandler)

    map.on('editable:drawing:commit', function () {
      this.enableDrawingLinks()
      this.enableEditingLinks()
    }.bind(this))

    map.on('boundingBoxDisabled', function () {
      this.enableDrawingLinks()
      this.enableEditingLinks()
    }.bind(this))
    map.on('boundingBoxEnabled', function () {
      this.disableDrawingLinks()
      this.disableEditingLinks()
    }.bind(this))

    this.enableDrawingLinks()
    this.enableEditingLinks()

    return container
  }
}
