import * as vendor from '../vendor'

export default class LeafletDraw extends vendor.L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topleft',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  onAdd (map) {
    let _this = this
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._pointLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-point', container)
    this._polyLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-polygon', container)
    this._rectLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-rectangle', container)
    this._linestringLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-linestring', container)
    this._circleLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-circle', container)
    this._trashLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-trash-disabled', container)

    this._trashOnClick = () => {
      if (vendor.L.DomUtil.hasClass(this._trashLink, 'leaflet-control-draw-trash-enabled')) {
        map.deleteFeatures.disable()
        _this.enableDrawingLinks()
      } else {
        _this.disableDrawingLinks()
        map.deleteFeatures.enable()
      }
      this.options.trashEnabled = !this.options.trashEnabled
    }

    vendor.L.DeleteHandler = vendor.L.Handler.extend({
      addHooks: function () {
        this._tooltip = new vendor.L.Draw.Tooltip(map)
        this._tooltip.updateContent({text: 'Click a drawing to delete it.'})
        vendor.L.DomUtil.removeClass(_this._trashLink, 'leaflet-control-draw-trash-disabled')
        vendor.L.DomUtil.addClass(_this._trashLink, 'leaflet-control-draw-trash-enabled')
        map.on('mousemove', this._mouseMove, this)
        map.fire('delete:enable')
      },
      removeHooks: function () {
        map.off('mousemove', this._mouseMove, this)
        this._tooltip.dispose()
        this._tooltip = null
        vendor.L.DomUtil.removeClass(_this._trashLink, 'leaflet-control-draw-trash-enabled')
        vendor.L.DomUtil.addClass(_this._trashLink, 'leaflet-control-draw-trash-disabled')
        map.fire('delete:disable')
      },
      _mouseMove: function (e) {
        this._tooltip.updatePosition(e.latlng)
      }
    })
    map.addHandler('deleteFeatures', vendor.L.DeleteHandler)
    this._drawingLinks = [this._pointLink, this._polyLink, this._rectLink, this._linestringLink, this._circleLink]
    this.disableDrawingLinks = () => {
      _this._drawingLinks.forEach(link => {
        link.onclick = undefined
        vendor.L.DomUtil.addClass(link, 'leaflet-control-disabled')
      })
    }
    this.enableDrawingLinks = () => {
      _this._drawingLinks.forEach(link => {
        link.onclick = undefined
        if (vendor.L.DomUtil.hasClass(link, 'leaflet-control-disabled')) {
          vendor.L.DomUtil.removeClass(link, 'leaflet-control-disabled')
        }
      })
      _this._pointLink.onclick = () => {
        _this.disableDrawingLinks()
        _this.disableEditingLinks()
        map.editTools.startMarker()
      }

      _this._polyLink.onclick = () => {
        _this.disableDrawingLinks()
        _this.disableEditingLinks()
        map.editTools.startPolygon()
      }
      _this._rectLink.onclick = () => {
        _this.disableDrawingLinks()
        _this.disableEditingLinks()
        map.editTools.startRectangle()
      }
      _this._linestringLink.onclick = () => {
        _this.disableDrawingLinks()
        _this.disableEditingLinks()
        map.editTools.startPolyline()
      }
      _this._circleLink.onclick = () => {
        _this.disableDrawingLinks()
        _this.disableEditingLinks()
        map.editTools.startCircle()
      }
    }

    this.enableEditingLinks = () => {
      _this._trashLink.onclick = _this._trashOnClick
      if (vendor.L.DomUtil.hasClass(_this._trashLink, 'leaflet-control-disabled')) {
        vendor.L.DomUtil.removeClass(_this._trashLink, 'leaflet-control-disabled')
      }
    }
    this.disableEditingLinks = () => {
      _this._trashLink.onclick = undefined
      vendor.L.DomUtil.addClass(_this._trashLink, 'leaflet-control-disabled')
    }

    map.on('editable:drawing:commit', () => {
      console.log('editable:drawing:commit')
      _this.enableDrawingLinks()
      _this.enableEditingLinks()
    })

    this.enableDrawingLinks()
    this.enableEditingLinks()

    return container
  }
}
