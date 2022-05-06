import merge from 'lodash/merge'
import { latLng2GARS, latLng2Name } from './GARS'

function generateGridStyle (color, maxLength = null) {
  return {
    style: {
      color: color,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0,
      weight: 1, // in pixels,
    },
    hover: {
      color: color,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0.4,
      weight: 1, // in pixels
    },
    press: {
      color: color,
      opacity: 1.0,
      fillColor: color,
      fillOpacity: 0.6,
      weight: 1, // in pixels
    },
    labelStyle: {
      labelPos: {
        x: 0.5,
        y: 0.5,
      },
      labelMaxLength: maxLength,
      fontSize: 10,
      fontFamily: 'Roboto',
      fontColor: color,
      fontWeight: 'bold'
    }
  }
}

function getDefaultStyle (maxLength, isDark = false) {
  return generateGridStyle(isDark ? '#ddddddaa' : '#000', maxLength)
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

function defaultGridOptions (dark = false) {
  return {
    onClick: null,
    interactive: false,
    twenty_degree: {
      minZoom: 0,
      maxZoom: 3,
      showLabel: true,
      gridLabelClassName: '',
      ...getDefaultStyle(null, dark)
    },
    ten_degree: {
      minZoom: 4,
      maxZoom: 5,
      showLabel: true,
      gridLabelClassName: '',
      ...getDefaultStyle(null, dark)
    },
    five_degree: {
      minZoom: 6,
      maxZoom: 7,
      showLabel: true,
      gridLabelClassName: '',
      ...getDefaultStyle(null, dark)
    },
    thirty_minute: {
      minZoom: 8,
      maxZoom: 9,
      showLabel: true,
      gridLabelClassName: '',
      ...getDefaultStyle(5, dark)
    },
    fifteen_minute: {
      minZoom: 10,
      maxZoom: 10,
      showLabel: true,
      gridLabelClassName: '',
      ...getDefaultStyle(6, dark)
    },
    five_minute: {
      minZoom: 11,
      maxZoom: 20,
      showLabel: true,
      gridLabelClassName: '',
      ...getDefaultStyle(7, dark)
    }
  }
}

/**
 * This code is migrated from https://github.com/tomeinc/Leaflet.GARS
 *
 * Copyright (c) 2016 Tome Inc
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @param L
 * @return {number}
 *
 */
function setupGARSGrid (L) {
  L.GARSGrid = L.LayerGroup.extend({
    options: {
      gridOptions: defaultGridOptions(false),
      // Redraw on move or moveend
      // Can be any leaflet event, but move and moveend are the sensible ones.
      // Will also be called on viewreset.
      redraw: 'move',
      dark: false
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

    setDarkModeEnabled: function (enabled) {
      this.options.gridOptions = defaultGridOptions(enabled)
    },

    measureText (text, font = 'bold 12px Roboto') {
      this._canvasContext.font = font
      return this._canvasContext.measureText(text).width
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
      this.eachLayer(this.removeLayer, this)

      let blocks = []
      let zoom = this._map.getZoom()
      const garsLabelFn = (lat, lng, increment, options) => {
        let label = null
        if (options.showLabel) {
          label = latLng2GARS(lat + increment / 2.0, lng + increment / 2.0).substr(0, options.labelStyle.labelMaxLength)
        }
        return label
      }
      if (zoom >= this.options.gridOptions.five_minute.minZoom && zoom <= this.options.gridOptions.five_minute.maxZoom) {
        blocks = blocks.concat(this.calculateBlocks(L.GARSUtil.roundBounds(this._map.getBounds(), 0.25 / 3.0), 0.25 / 3.0, this.options.gridOptions.five_minute, garsLabelFn))
      }
      if (zoom >= this.options.gridOptions.fifteen_minute.minZoom && zoom <= this.options.gridOptions.fifteen_minute.maxZoom) {
        //quadBlocks are .25 degree squares, 4 per bigBlock
        blocks = blocks.concat(this.calculateBlocks(L.GARSUtil.roundBounds(this._map.getBounds(), 0.25), 0.25, this.options.gridOptions.fifteen_minute, garsLabelFn))
      }
      if (zoom >= this.options.gridOptions.thirty_minute.minZoom && zoom <= this.options.gridOptions.thirty_minute.maxZoom) {
        //Big blocks are 0.5x0.5 lat/lng squares
        blocks = blocks.concat(this.calculateBlocks(L.GARSUtil.roundBounds(this._map.getBounds(), 0.5), 0.5, this.options.gridOptions.thirty_minute, garsLabelFn))
      }

      const degreeLabelFn = (lat, lng, increment, options) => {
        let label = null
        if (options.showLabel) {
          label = latLng2Name(lat, lng, increment)
        }
        return label
      }
      if (zoom >= this.options.gridOptions.five_degree.minZoom && zoom <= this.options.gridOptions.five_degree.maxZoom) {
        blocks = blocks.concat(this.calculateBlocks(L.GARSUtil.roundBounds(this._map.getBounds(), 5.0), 5.0, this.options.gridOptions.five_degree, degreeLabelFn))
      }
      if (zoom >= this.options.gridOptions.ten_degree.minZoom && zoom <= this.options.gridOptions.ten_degree.maxZoom) {
        blocks = blocks.concat(this.calculateBlocks(L.GARSUtil.roundBounds(this._map.getBounds(), 10.0), 10.0, this.options.gridOptions.ten_degree, degreeLabelFn))
      }
      if (zoom >= this.options.gridOptions.twenty_degree.minZoom && zoom <= this.options.gridOptions.twenty_degree.maxZoom) {
        blocks = blocks.concat(this.calculateBlocks(L.GARSUtil.roundBounds(this._map.getBounds(), 20.0), 20.0, this.options.gridOptions.twenty_degree, degreeLabelFn))
      }

      for (let i in blocks) {
        this.addLayer(blocks[i])
      }
      return this
    },
    calculateBlocks: function (bounds, increment, options, labelFn) {
      let ret = []
      for (let bw = bounds.getWest(); bw < bounds.getEast(); bw += increment) {
        for (let bs = bounds.getSouth(); bs < bounds.getNorth(); bs += increment) {
          const rect = L.rectangle([[bs, bw], [bs + increment, bw + increment]], {
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
          ret.push(rect)
          const text = labelFn(bs, bw, increment, options)
          if (text != null) {
            const textWidth = this.measureText(text, this.getFontString(options.labelStyle))
            const center = [bs + increment / 2.0, bw + increment / 2.0]
            const marker = L.marker(center, {
              icon: L.divIcon({
                iconSize: L.point(textWidth, options.labelStyle.fontSize),
                iconAnchor: L.point(textWidth / 2.0, options.labelStyle.fontSize / 2),
                className: options.gridLabelClassName,
                html: '<span style="' + getFontStyle(options.labelStyle) + '">' + text + '</span>'
              }),
              interactive: false,
              pane: this.pane,
              zIndex: this.zIndex
            })
            ret.push(marker)
          }
        }
      }
      return ret
    }
  })

  L.GARSUtil = {
    //Round bounds to the next biggest increment
    roundBounds: function (bounds, increment) {
      var sw = bounds.getSouthWest()
      var ne = bounds.getNorthEast()
      if (sw.lat > 0) {
        sw.lat -= sw.lat % increment
      } else if (sw.lat < 0) {
        sw.lat -= increment + (sw.lat % increment)
      }//else it's 0, good enough
      if (sw.lng > 0) {
        sw.lng -= sw.lng % increment
      } else if (sw.lng < 0) {
        sw.lng -= increment + (sw.lng % increment)
      } //else it's 0, good enough

      if (ne.lat > 0) {
        ne.lat += increment - (ne.lat % increment)
      } else if (ne.lat < 0) {
        ne.lat -= ne.lat % increment
      } //else it's 0, good enough
      if (ne.lng > 0) {
        ne.lng += increment - (ne.lng % increment)
      } else if (ne.lng < 0) {
        ne.lng -= ne.lng % increment
      } //else it's 0, good enough

      sw.lat = Math.max(sw.lat, -80.0)
      ne.lat = Math.min(ne.lat, 80.0)

      return L.latLngBounds(sw, ne)
    },
  }

  L.garsGrid = function (options) {
    return new L.GARSGrid(options)
  }
}

export {
  setupGARSGrid,
  generateGridStyle
}
