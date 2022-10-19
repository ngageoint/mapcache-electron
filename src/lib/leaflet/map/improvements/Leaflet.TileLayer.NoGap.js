/**
 * Taken from: https://github.com/Leaflet/Leaflet.TileLayer.NoGap
 * "THE BEER-WARE LICENSE":
 * <ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
 * @param L
 */
export default function (L) {
  L.TileLayer.mergeOptions({
    dumpToCanvas: L.Browser.canvas,
    removeZooms: false
  })

  L.TileLayer.include({
    _onUpdateLevel: function (z, zoom) {
      if (this.options.dumpToCanvas) {
        this._levels[z].canvas.style.zIndex =
          this.options.maxZoom - Math.abs(zoom - z)
      }
    },

    _onRemoveLevel: function (z) {
      if (this.options.dumpToCanvas) {
        L.DomUtil.remove(this._levels[z].canvas)
      }
    },

    _onCreateLevel: function (level) {
      if (this.options.dumpToCanvas) {
        level.canvas = L.DomUtil.create(
          'canvas',
          'leaflet-tile-container leaflet-zoom-animated',
          this._container
        )
        level.ctx = level.canvas.getContext('2d')
        this._resetCanvasSize(level)

        if (this.options.removeZooms) {
          Object.keys(this._levels).forEach(key => {
            if (Math.abs(Number(level.zoom) - Number(key)) > 1) {
              const level = this._levels[key]
              if (level != null) {
                L.DomUtil.remove(level.canvas)
              }
            }
          })
          // this._updateLevels()
        }
      }
    },

    _removeTile: function (key) {
      if (this.options.dumpToCanvas) {
        const tile = this._tiles[key]
        const level = this._levels[tile.coords.z]
        const tileSize = this.getTileSize()

        if (level) {
          // Where in the canvas should this tile go?
          const offset = L.point(tile.coords.x, tile.coords.y)
            .subtract(level.canvasRange.min)
            .scaleBy(this.getTileSize())

          level.ctx.clearRect(offset.x, offset.y, tileSize.x, tileSize.y)
        }
      }

      L.GridLayer.prototype._removeTile.call(this, key)
    },

    _resetCanvasSize: function (level) {
      const buff = this.options.keepBuffer,
        pixelBounds = this._getTiledPixelBounds(this._map.getCenter()),
        tileRange = this._pxBoundsToTileRange(pixelBounds),
        tileSize = this.getTileSize()

      tileRange.min = tileRange.min.subtract([buff, buff]) // This adds the no-prune buffer
      tileRange.max = tileRange.max.add([buff + 1, buff + 1])

      const pixelRange = L.bounds(
          tileRange.min.scaleBy(tileSize),
          tileRange.max.add([1, 1]).scaleBy(tileSize) // This prevents an off-by-one when checking if tiles are inside
        ),
        neededSize = pixelRange.max.subtract(pixelRange.min)

      let mustRepositionCanvas = false

      // Resize the canvas, if needed, and only to make it bigger.
      if (
        neededSize.x > level.canvas.width ||
        neededSize.y > level.canvas.height
      ) {
        // Resizing canvases erases the currently drawn content, I'm afraid.
        // To keep it, dump the pixels to another canvas, then display it on
        // top. This could be done with getImageData/putImageData, but that
        // would break for tainted canvases (in non-CORS tilesets)
        const oldSize = { x: level.canvas.width, y: level.canvas.height }
        // console.info('Resizing canvas from ', oldSize, 'to ', neededSize)

        const tmpCanvas = L.DomUtil.create('canvas')
        tmpCanvas.style.width = (tmpCanvas.width = oldSize.x) + 'px'
        tmpCanvas.style.height = (tmpCanvas.height = oldSize.y) + 'px'
        tmpCanvas.getContext('2d').drawImage(level.canvas, 0, 0)

        // const data = level.ctx.getImageData(0, 0, oldSize.x, oldSize.y)

        level.canvas.style.width = (level.canvas.width = neededSize.x) + 'px'
        level.canvas.style.height = (level.canvas.height = neededSize.y) + 'px'
        level.ctx.drawImage(tmpCanvas, 0, 0)
      }

      // Translate the canvas contents if it's moved around
      if (level.canvasRange) {
        const offset = level.canvasRange.min
          .subtract(tileRange.min)
          .scaleBy(this.getTileSize())
        level.ctx.globalCompositeOperation = 'copy'
        level.ctx.drawImage(level.canvas, offset.x, offset.y)
        level.ctx.globalCompositeOperation = 'source-over'
        mustRepositionCanvas = true
      }

      level.canvasRange = tileRange
      level.canvasPxRange = pixelRange
      level.canvasOrigin = pixelRange.min

      if (mustRepositionCanvas) {
        this._setCanvasZoomTransform(
          level,
          this._map.getCenter(),
          this._map.getZoom()
        )
      }
    },

    /// set transform/position of canvas, in addition to the transform/position of the individual tile container
    _setZoomTransform: function (level, center, zoom) {
      L.GridLayer.prototype._setZoomTransform.call(this, level, center, zoom)
      if (this.options.dumpToCanvas) {
        this._setCanvasZoomTransform(level, center, zoom)
      }
    },

    // This will get called twice:
    // * From _setZoomTransform
    // * When the canvas has shifted due to a new tile being loaded
    _setCanvasZoomTransform: function (level, center, zoom) {
      if (!level.canvasOrigin) {
        return
      }
      const scale = this._map.getZoomScale(zoom, level.zoom),
        translate = level.canvasOrigin
          .multiplyBy(scale)
          .subtract(this._map._getNewPixelOrigin(center, zoom))
          .round()

      if (L.Browser.any3d) {
        L.DomUtil.setTransform(level.canvas, translate, scale)
      } else {
        L.DomUtil.setPosition(level.canvas, translate)
      }
    },

    _onOpaqueTile: function (tile) {
      if (!this.options.dumpToCanvas) {
        return
      }

      // Guard against an NS_ERROR_NOT_AVAILABLE (or similar) exception
      // when a non-image-tile has been loaded (e.g. a WMS error).
      // Checking for tile.el.complete is not enough, as it has been
      // already marked as loaded and ready somehow.
      try {
        this.dumpPixels(tile.coords, tile.el)
      } catch (ex) {
        return this.fire('tileerror', {
          error: 'Could not copy tile pixels: ' + ex,
          tile: tile,
          coods: tile.coords,
        })
      }

      // If dumping the pixels was successful, then hide the tile.
      // Do not remove the tile itself, as it is needed to check if the whole
      // level (and its canvas) should be removed (via level.el.children.length)
      tile.el.style.display = 'none'
    },

    // @section Extension methods
    // @uninheritable

    // @method dumpPixels(coords: Object, imageSource: CanvasImageSource): this
    // Dumps pixels from the given `CanvasImageSource` into the layer, into
    // the space for the tile represented by the `coords` tile coordinates (an object
    // like `{x: Number, y: Number, z: Number}` the image source must have the
    // same size as the `tileSize` option for the layer. Has no effect if `dumpToCanvas`
    // is `false`.
    dumpPixels: function (coords, imageSource) {
      const level = this._levels[coords.z],
        tileSize = this.getTileSize()

      if (!level.canvasRange || !this.options.dumpToCanvas) {
        return
      }

      // Check if the tile is inside the currently visible map bounds
      // There is a possible race condition when tiles are loaded after they
      // have been panned outside of the map.
      if (!level.canvasRange.contains(coords)) {
        this._resetCanvasSize(level)
      }

      // Where in the canvas should this tile go?
      const offset = L.point(coords.x, coords.y)
        .subtract(level.canvasRange.min)
        .scaleBy(this.getTileSize())

      level.ctx.drawImage(imageSource, offset.x, offset.y, tileSize.x, tileSize.y)

      return this
    }
  })
}