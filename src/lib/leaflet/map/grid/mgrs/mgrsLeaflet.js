import merge from 'lodash/merge'
import { zonesWithin } from './gzd/GZDZones'

function generateGridStyle (color = '#000', labelColor = '#000', opacity = 1.0, weight = 1) {
  return {
    style: {
      color: color,
      opacity: opacity,
      fillColor: color,
      fillOpacity: 0,
      weight: weight, // in pixels,
    },
    hover: {
      color: color,
      opacity: opacity,
      fillColor: color,
      fillOpacity: 0.4,
      weight: weight, // in pixels
    },
    press: {
      color: color,
      opacity: opacity,
      fillColor: color,
      fillOpacity: 0.6,
      weight: weight, // in pixels
    },
    labelStyle: {
      labelPos: {
        x: 0.5,
        y: 0.5,
      },
      fontSize: 12,
      fontFamily: 'Roboto',
      fontColor: labelColor,
      fontWeight: 'bold'
    }
  }
}

function getFontStyle (fontStyle) {
  let styleString = ''

  if (fontStyle.fontSize != null) {
    styleString += 'font-size: ' + fontStyle.fontSize + 'px; '
  }

  if (fontStyle.fontWeight != null) {
    styleString += 'font-weight: ' + fontStyle.fontWeight + '; '
  }

  if (fontStyle.fontFamily != null) {
    styleString += 'font-family: ' + fontStyle.fontFamily + '; '
  }

  if (fontStyle.fontColor != null) {
    styleString += 'color: ' + fontStyle.fontColor + '; '
  }

  return styleString
}

function defaultGridOptions (isDark = false) {
  return {
    onClick: null,
    interactive: false,
    onlyInterestingZones: false,
    gzd: {
      minZoom: 0,
      maxZoom: 20,
      showLabel: true,
      gridLabelClassName: 'mgrs-gzd-label',
      ...generateGridStyle(isDark ? '#FF4444ff' : 'red', isDark ? '#FF4444ff' : 'red', 0.5, 2.0)
    },
    one_hundred_km: {
      minZoom: 6,
      maxZoom: 9,
      precision: 100000,
      showLabel: true,
      gridLabelClassName: 'mgrs-100km-label',
      ...generateGridStyle(isDark ? '#ddddddaa' : '#000000ff', '#000000ff', 0.5, 1.0)
    },
    ten_km: {
      minZoom: 10,
      maxZoom: 12,
      precision: 10000,
      showLabel: false,
      gridLabelClassName: '',
      ...generateGridStyle(isDark ? '#ddddddaa' : '#000000aa', '#000000ff', 0.5, 1.0)
    },
    one_km: {
      minZoom: 13,
      maxZoom: 15,
      precision: 1000,
      showLabel: false,
      gridLabelClassName: '',
      ...generateGridStyle(isDark ? '#ddddddaa' : '#000000aa', '#000000ff', 0.5, 1.0)
    },
    one_hundred_meter: {
      minZoom: 16,
      maxZoom: 18,
      precision: 100,
      showLabel: false,
      gridLabelClassName: '',
      ...generateGridStyle(isDark ? '#ddddddaa' : '#000000aa', '#000000ff', 0.5, 1.0)
    },
    ten_meter: {
      minZoom: 19,
      maxZoom: 20,
      precision: 10,
      showLabel: false,
      gridLabelClassName: '',
      ...generateGridStyle(isDark ? '#ddddddaa' : '#000000aa', '#000000ff', 0.5, 1.0)
    }
  }
}

function toExtent (bounds) {
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  return [sw.lng, sw.lat, ne.lng, ne.lat]
}

function setupMGRSGrid (L) {
  L.MGRSGrid = L.LayerGroup.extend({
    options: {
      gridOptions: defaultGridOptions(false),
      redraw: 'move',
    },

    initialize: function (options) {
      this.pane = options.pane || 'overlayPane'
      this.zIndex = options.zIndex || 400
      L.LayerGroup.prototype.initialize.call(this)
      this.options.gridOptions = defaultGridOptions(options.dark)
      merge(this.options, options)
      this._canvas = document.createElement('canvas')
      this._canvasContext = this._canvas.getContext('2d')
    },

    setDarkModeEnabled (enabled) {
      this.options.gridOptions = defaultGridOptions(enabled)
    },

    measureText (text, font = 'bold 12px Roboto') {
      this._canvasContext.font = font
      return this._canvasContext.measureText(text)
    },

    onAdd: function (map) {
      this._map = map
      map.on('viewreset ' + this.options.redraw, this.redraw, this)
      this.redraw()
    },

    onRemove: function (map) {
      this.eachLayer(this.removeLayer, this)
      map.off('viewreset ' + this.options.redraw, this.redraw, this)
    },

    mouseOut: function (e, options) {
      e.target.setStyle(options.style)
    },

    mouseOver: function (e, options) {
      e.target.setStyle(options.hover)
    },

    clickDown: function (e, options) {
      e.target.setStyle(options.press)
    },

    clickUp: function (e, options) {
      e.target.setStyle(options.hover)
    },

    getFontString: function (fontStyle) {
      return fontStyle.fontWeight + ' ' + fontStyle.fontSize + 'px ' + fontStyle.fontFamily
    },

    redraw: function () {
      this.clearLayers()
      let blocks = []
      let labels = []
      let zoom = Math.floor(this._map.getZoom())
      const bounds = toExtent(this._map.getBounds())
      let zones = zonesWithin(bounds, this.options.gridOptions.onlyInterestingZones)

      // handle GZD zones
      if (zoom >= this.options.gridOptions.gzd.minZoom && zoom <= this.options.gridOptions.gzd.maxZoom) {
        let result = this.getGridZoneDesignatorPolygons(zones, bounds, 0, this.options.gridOptions.gzd, zoom > 3)
        blocks = blocks.concat(result.blocks)
        labels = labels.concat(result.labels)
      }

      if (zoom >= this.options.gridOptions.one_hundred_km.minZoom && zoom <= this.options.gridOptions.one_hundred_km.maxZoom) {
        let result = this.getGridZoneDesignatorPolygons(zones, bounds, this.options.gridOptions.one_hundred_km.precision, this.options.gridOptions.one_hundred_km, zoom > 6)
        blocks = blocks.concat(result.blocks)
        labels = labels.concat(result.labels)
      }

      const grids = [this.options.gridOptions.ten_km, this.options.gridOptions.one_km, this.options.gridOptions.one_hundred_meter, this.options.gridOptions.ten_meter]

      grids.forEach(grid => {
        if (zoom >= grid.minZoom && zoom <= grid.maxZoom) {
          let result = this.getGridZoneDesignatorPolygons(zones, bounds, grid.precision, grid, false)
          blocks = blocks.concat(result.blocks)
          labels = labels.concat(result.labels)
        }
      })

      for (let i in blocks) {
        this.addLayer(blocks[i])
      }
      for (let i in labels) {
        if (this._map.getBounds().contains(labels[i].getLatLng())) {
          this.addLayer(labels[i])
        }
      }
      return this
    },
    drawLabel (label, options) {
      const text = label.getName()
      const lngLat = label.getCenter()
      const dimensions = this.measureText(text, this.getFontString(options.labelStyle))
      const textWidth = dimensions.width + 8
      const textHeight = (dimensions.actualBoundingBoxAscent + dimensions.actualBoundingBoxDescent) * 2
      const labelPolyBounds = label.getBoundingBox()
      const ur = this._map.latLngToLayerPoint(new L.latLng(labelPolyBounds[3], labelPolyBounds[2]))
      const ll = this._map.latLngToLayerPoint(new L.latLng(labelPolyBounds[1], labelPolyBounds[0]))
      const zoneWidth = Math.abs(ur.x - ll.x)
      const zoneHeight = Math.abs(ur.y - ll.y)
      const textWidthPercent = textWidth / zoneWidth
      const textHeightPercent = textHeight / zoneHeight
      if (textWidthPercent < 0.75 && textHeightPercent < 0.75) {
        return L.marker([lngLat.latitude, lngLat.longitude], {
          pane: this.pane,
          zIndex: this.zIndex,
          icon: L.divIcon({
            iconSize: L.point(textWidth, textHeight),
            iconAnchor: L.point(textWidth / 2, textHeight / 2),
            className: options.gridLabelClassName,
            html: '<span style="' + getFontStyle(options.labelStyle) + ' padding-left: 2px;">' + text + '</span>'
          }),
          interactive: false,
        })
      }
    },
    getGridZoneDesignatorPolygons: function (zones, bounds, precision, options, showLabel) {
      const blocks = []
      const labelMarkers = []
      zones.forEach(zone => {
        const { polygons, labels } = zone.polygonsAndLabelsInBounds(bounds, precision)
        polygons.forEach(polygon => {
          const latLngs = polygon.geometry.coordinates[0].map(coord => {
            return L.latLng(coord[1], coord[0])
          })
          const rect = L.polygon(latLngs, {
            ...options.style,
            interactive: this.options.gridOptions.interactive,
            pane: this.pane,
            zIndex: this.zIndex
          })
          if (this.options.gridOptions.interactive) {
            rect.on('mouseover', (e) => this.mouseOver(e, options))
            rect.on('mouseout', (e) => this.mouseOut(e, options))
            rect.on('mousedown', (e) => this.clickDown(e, options))
            rect.on('mouseup', (e) => this.clickUp(e, options))
            if (this.options.gridOptions.onClick != null) {
              rect.on('click', (e) => this.options.gridOptions.onClick(e, rect))
            }
          }
          blocks.push(rect)
        })
        if (showLabel) {
          labels.forEach(label => {
            const leafletLabel = this.drawLabel(label, options)
            if (leafletLabel != null) {
              labelMarkers.push(leafletLabel)
            }
          })
        }
      })
      return { blocks, labels: labelMarkers }

    },
  })

  L.mgrsGrid = function (options) {
    return new L.MGRSGrid(options)
  }
}

export {
  setupMGRSGrid,
  generateGridStyle
}
