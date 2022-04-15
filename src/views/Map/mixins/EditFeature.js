import { L } from '../../../lib/leaflet/vendor'
import cloneDeep from 'lodash/cloneDeep'
import {DRAWING_LAYER_PANE, DRAWING_VERTEX_PANE} from '../../../lib/leaflet/map/panes/MapPanes'
import { flattenFeature, explodeFlattenedFeature } from '../../../lib/util/geojson/GeoJSONUtilities'

const MODES = {
  EDIT: 0,
  DRAG: 1,
  CUT: 2,
  ROTATE: 3,
  ERASE: 4,
  DRAW_MARKER: 5,
  DRAW_LINE: 6,
  DRAW_RECTANGLE: 7,
  DRAW_POLYGON: 8,
}

export default {
  data () {
    return {
      editingLayer: null,
      isEditing: false,
      mode: null,
      editingStack: [],
      stackIndex: 0,
      noUndo: true,
      noRedo: true,
      isDragging: false,
      editDrawing: false
    }
  },
  methods: {
    addFeature ({layer}) {
      this.map.removeLayer(layer)
      this.editingLayer.addData(layer.toGeoJSON(10))
      this.updateEditingStack()
      this.stopMode()
    },
    drawStart () {
      this.stopMode()
      this.editDrawing = true
    },
    drawEnd () {
      this.stopMode()
      this.editDrawing = false
    },
    getEditingLayer () {
      return this.editingLayer
    },
    editFeature (editingFeature) {
      this.stopEditing()
      this.isEditing = true
      this.id = editingFeature.id
      this.feature = cloneDeep(editingFeature)
      this.feature.type = 'Feature'

      const featureCollection = {
        type: 'FeatureCollection',
        features: flattenFeature(this.feature).filter(feature => feature.geometry != null)
      }
      this.editingLayer = L.geoJSON(featureCollection, {
        pane: DRAWING_LAYER_PANE.name,
        zIndex: DRAWING_LAYER_PANE.zIndex,
      }).addTo(this.map)

      // setup redo/undo stack
      this.editingStack = [cloneDeep(editingFeature)]
      this.stackIndex = 0
      this.updateUndoRedoState()
      window.mapcache.unregisterUndoListeners()
      window.mapcache.unregisterRedoListeners()
      window.mapcache.registerUndoListener(this.undoEdit)
      window.mapcache.registerRedoListener(this.redoEdit)
      this.map.on('pm:create', this.addFeature)
      this.map.on('pm:drawstart', this.drawStart)
      this.map.on('pm:drawend', this.drawEnd)
    },
    getUpdatedFeature () {
      const updatedFeature = cloneDeep(this.feature)
      if (this.editingLayer != null) {
        const features = this.editingLayer.getLayers().map(layer => {
          let feature = cloneDeep(layer.feature)
          if (feature != null && feature.geometry != null) {
            if (feature.geometry.type === 'Point') {
              feature.geometry.coordinates = [layer._latlng.lng, layer._latlng.lat]
            } else {
              feature.geometry = layer.toGeoJSON(10).geometry
            }
          }
          return feature
        })
        updatedFeature.geometry = explodeFlattenedFeature(features)
      }
      return updatedFeature
    },
    updateFeature () {
      if (this.editingLayer != null) {
        this.feature.geometry = this.getUpdatedFeature().geometry
      }
      this.map.pm.getGeomanLayers(false).forEach(layer => {
        if (layer != null) {
          layer.remove()
        }
      })
    },
    stopEditing () {
      window.mapcache.unregisterUndoListeners()
      window.mapcache.unregisterRedoListeners()
      this.stopMode()
      this.isEditing = false
      if (this.editingLayer != null) {
        this.editingLayer.remove()
        this.editingLayer = null
      }
      this.editingStack = []
      this.stackIndex = 0
      this.noUndo = true
      this.noRedo = true
      this.map.off('pm:create', this.addFeature)
      this.map.off('pm:drawstart', this.drawStart)
      this.map.off('pm:drawend', this.drawEnd)
    },
    saveChanges () {
      this.updateFeature()
      this.stopEditing()
      return this.feature
    },
    stopMode () {
      switch (this.mode) {
        case MODES.EDIT:
          if (this.editingLayer != null) {
            this.editingLayer.pm.disable()
          }
          this.editingLayer.off('pm:edit')
          break
        case MODES.DRAG:
          if (this.editingLayer != null) {
            if (this.editingLayer instanceof L.FeatureGroup) {
              Object.values(this.editingLayer.pm._layers).forEach(layer => {
                layer.pm.disableLayerDrag()
                layer.off('pm:dragend')
              })
            } else {
              this.editingLayer.pm.disableLayerDrag()
            }
          }
          this.isDragging = false
          this.map.off('pm:dragend')
          break
        case MODES.CUT:
          this.map.pm.disableGlobalCutMode()
          this.map.off('pm:cut')
          break
        case MODES.ROTATE:
          this.map.pm.disableGlobalRotateMode()
          this.map.off('pm:rotateend')
          break
        case MODES.ERASE:
          this.map.pm.disableGlobalRemovalMode()
          this.map.off('pm:remove')
          break
        case MODES.DRAW_MARKER:
          this.map.pm.disableDraw()
          break
        case MODES.DRAW_LINE:
          this.map.pm.disableDraw()
          break
        case MODES.DRAW_RECTANGLE:
          this.map.pm.disableDraw()
          break
        case MODES.DRAW_POLYGON:
          this.map.pm.disableDraw()
          break
      }
      this.mode = null
    },
    toggleVertexEditing () {
      if (this.mode === MODES.EDIT) {
        this.stopMode()
      } else {
        this.stopMode()
        this.editingLayer.pm.enable({
          allowSelfIntersection: true,
          limitMarkersToCount: 50,
          limitMarkersToViewport: true,
          panes: {
            vertexPane: DRAWING_VERTEX_PANE.name, layerPane: DRAWING_LAYER_PANE.name, markerPane: DRAWING_VERTEX_PANE.name
          },
          snapDistance: 5
        })
        this.editingLayer.on('pm:edit', () => {
          this.updateEditingStack()
        })
        this.mode = MODES.EDIT
      }
    },
    toggleCut () {
      if (this.mode === MODES.CUT) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableGlobalCutMode({
          allowSelfIntersection: false,
        })
        this.map.on('pm:cut', (e) => {
          e.originalLayer.setLatLngs(e.layer.getLatLngs())
          e.originalLayer.addTo(this.map)
          e.originalLayer._pmTempLayer = false
          e.layer._pmTempLayer = true
          e.layer.remove()
          this.stopMode()
          this.updateEditingStack()
        })
        this.mode = MODES.CUT
      }
    },
    toggleDrag () {
      if (this.mode === MODES.DRAG) {
        this.stopMode()
      } else {
        this.stopMode()
        this.isDragging = true
        if (this.editingLayer instanceof L.FeatureGroup) {
          Object.values(this.editingLayer.pm._layers).forEach(layer => {
            layer.pm.enableLayerDrag()
            layer.on('pm:dragend', () => {
              this.updateEditingStack()
            })
          })
        } else {
          this.editingLayer.pm.enableLayerDrag()
          this.editingLayer.on('pm:dragend', () => {
            this.updateEditingStack()
          })
        }
        this.mode = MODES.DRAG
      }
    },
    toggleRotate () {
      if (this.mode === MODES.ROTATE) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableGlobalRotateMode()
        this.mode = MODES.ROTATE
        this.map.on('pm:rotateend', () => {
          this.updateEditingStack()
        })
      }
    },
    toggleErase () {
      if (this.mode === MODES.ERASE) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableGlobalRemovalMode()
        this.mode = MODES.ERASE
        this.map.on('pm:remove', (layer) => {
          this.editingLayer.removeLayer(layer.layer)
          this.map.removeLayer(layer)
          this.updateEditingStack()
        })
      }
    },
    toggleDrawMarker () {
      if (this.mode === MODES.DRAW_MARKER) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableDraw('Marker', {
          snappable: true,
        })
        this.mode = MODES.DRAW_MARKER
      }
    },
    toggleDrawLine () {
      if (this.mode === MODES.DRAW_LINE) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableDraw('Line', {
          snappable: true,
        })
        this.mode = MODES.DRAW_LINE
      }
    },
    toggleDrawRectangle () {
      if (this.mode === MODES.DRAW_RECTANGLE) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableDraw('Rectangle', {
          snappable: true
        })
        this.mode = MODES.DRAW_RECTANGLE
      }
    },
    toggleDrawPolygon () {
      if (this.mode === MODES.DRAW_POLYGON) {
        this.stopMode()
      } else {
        this.stopMode()
        this.map.pm.enableDraw('Polygon', {
          snappable: true
        })
        this.mode = MODES.DRAW_POLYGON
      }
    },
    resetMode (mode) {
      if (mode != null) {
        switch (mode) {
          case MODES.EDIT:
            this.toggleVertexEditing()
            this.toggleVertexEditing()
            break
          case MODES.DRAG:
            this.toggleDrag()
            this.toggleDrag()
            break
          case MODES.CUT:
            this.toggleCut()
            this.toggleCut()
            break
          case MODES.ROTATE:
            this.toggleRotate()
            this.toggleRotate()
            break
          case MODES.ERASE:
            this.toggleErase()
            this.toggleErase()
            break
          case MODES.DRAW_MARKER:
            this.toggleDrawMarker()
            this.toggleDrawMarker()
            break
          case MODES.DRAW_LINE:
            this.toggleDrawLine()
            this.toggleDrawLine()
            break
          case MODES.DRAW_RECTANGLE:
            this.toggleDrawRectangle()
            this.toggleDrawRectangle()
            break
          case MODES.DRAW_POLYGON:
            this.toggleDrawPolygon()
            this.toggleDrawPolygon()
            break
        }
      }
    },
    updateEditingStack () {
      // clear stack from current position on
      while (this.editingStack.length - 1 > this.stackIndex) {
        this.editingStack.pop()
      }
      const updatedFeature = this.getUpdatedFeature()
      this.editingStack.push(updatedFeature)
      this.stackIndex = this.editingStack.length - 1
      this.updateUndoRedoState()
      this.resetMode(this.mode)
    },
    updateUndoRedoState () {
      // make sure it is in the appropriate range and then test
      this.stackIndex = Math.min(Math.max(0, this.stackIndex), this.editingStack.length - 1)
      this.noUndo = this.stackIndex === 0
      this.noRedo = this.stackIndex === this.editingStack.length - 1
    },
    redoEdit () {
      if (!this.noRedo) {
        this.stackIndex++
        this.setFeatureToStackIndex()
        this.updateUndoRedoState()
        this.resetMode(this.mode)
      }
    },
    undoEdit () {
      if (!this.noUndo) {
        this.stackIndex--
        this.setFeatureToStackIndex()
        this.updateUndoRedoState()
        this.resetMode(this.mode)
      }
    },
    setFeatureToStackIndex () {
      const stackFeature = this.editingStack[this.stackIndex]
      const featureCollection = {
        type: 'FeatureCollection',
        features: flattenFeature(stackFeature)
      }
      this.editingLayer.clearLayers()
      this.editingLayer.addData(featureCollection)
    }
  },
  beforeDestroy () {
    this.stopMode()
    this.stopEditing()
  }
}
