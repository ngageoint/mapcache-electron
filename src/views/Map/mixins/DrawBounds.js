import { L } from '../../../lib/leaflet/vendor'
import isNil from 'lodash/isNil'
import EventBus from '../../../lib/vue/EventBus'
import { getDefaultLeafletOverlayStyleForMapCache } from '../../../lib/leaflet/map/style/Style'
import { DRAWING_LAYER_PANE, DRAWING_VERTEX_PANE } from '../../../lib/leaflet/map/panes/MapPanes'

export default {
  data () {
    return {
      drawBoundsId: null,
      isDrawingBounds: false,
      drawBoundsMode: 0
    }
  },
  methods: {
    disableBoundingBoxDrawing () {
      if (this.r && this.map) {
        this.stopDrawBoundsMode()
        this.r.remove()
        this.r = undefined
      }
      this.isDrawingBounds = false
    },
    enableBoundingBoxDrawing (boundingBoxFilter) {
      let bounds = L.latLngBounds(boundingBoxFilter)
      this.drawBoundsMode = 0
      this.r = L.rectangle(bounds, { pane: DRAWING_LAYER_PANE.name })
      this.r.setStyle(getDefaultLeafletOverlayStyleForMapCache())
      this.r.addTo(this.map)
      this.toggleBoundsEdit()
      this.map.fitBounds(boundingBoxFilter)
      const self = this
      this.r.on('editable:vertex:dragend', () => {
        let sw = this.r.getBounds().getSouthWest()
        let ne = this.r.getBounds().getNorthEast()
        let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        if (self.drawBoundsId != null) {
          EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(self.drawBoundsId), [Number(boundingBox[0][1]), Number(boundingBox[0][0]), Number(boundingBox[1][1]), Number(boundingBox[1][0])])
        }
      })
      this.isDrawingBounds = true
    },
    cancelDrawingBounds () {
      if (this.drawBoundsId != null) {
        EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_CANCELLED(this.drawBoundsId))
        this.drawBoundsId = null
      }
      this.disableBoundingBoxDrawing()
    },
    stopDrawBoundsMode () {
      if (this.r != null) {
        this.r.pm.disableLayerDrag()
        this.r.pm.disable()
        this.r.off('pm:edit')
        this.r.off('pm:dragend')
      }
      this.map.off('pm:dragend')
      this.isDragging = false
    },
    toggleBoundsEdit () {
      this.stopDrawBoundsMode()
      this.r.pm.enable({
        allowSelfIntersection: true,
        panes: {
          vertexPane: DRAWING_VERTEX_PANE.name,
          layerPane: DRAWING_LAYER_PANE.name,
          markerPane: DRAWING_VERTEX_PANE.name
        },
        snapDistance: 5
      })
      this.r.on('pm:edit', () => {
        this.updateBounds()
      })
    },
    toggleBoundsDrag () {
      this.stopDrawBoundsMode()
      this.isDragging = true
      this.r.pm.enableLayerDrag()
      this.r.on('pm:dragend', () => {
        this.updateBounds()
      })
    },
    updateBounds () {
      let sw = this.r.getBounds().getSouthWest()
      let ne = this.r.getBounds().getNorthEast()
      let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
      if (this.drawBoundsId != null) {
        EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.drawBoundsId), [Number(boundingBox[0][1]), Number(boundingBox[0][0]), Number(boundingBox[1][1]), Number(boundingBox[1][0])])
      }
    }
  },
  mounted () {
    EventBus.$on(EventBus.EventTypes.DRAW_BOUNDING_BOX, (id, boundingBox) => {
      // in case grid is enabled, let's disable it
      EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX_STOP)
      if (this.drawBoundsId != null) {
        this.disableBoundingBoxDrawing()
        EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_CANCELLED(this.drawBoundsId))
      }
      this.drawBoundsId = id
      let bbox = boundingBox
      if (!isNil(bbox)) {
        bbox = [[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]]
      }
      this.enableBoundingBoxDrawing(bbox)
    })

    EventBus.$on(EventBus.EventTypes.DRAW_BOUNDING_BOX_STOP, () => {
      this.cancelDrawingBounds()
    })
  },
  beforeDestroy () {
    EventBus.$off([EventBus.EventTypes.DRAW_BOUNDING_BOX, EventBus.EventTypes.DRAW_BOUNDING_BOX_STOP])
    this.cancelDrawingBounds()
  }
}
