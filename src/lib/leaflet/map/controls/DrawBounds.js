import {L} from '../../vendor'
import isNil from 'lodash/isNil'
import EventBus from '../../../vue/EventBus'

export default {
  data () {
    return {
      drawBoundsId: null
    }
  },
  methods: {
    disableBoundingBoxDrawing () {
      if (this.r && this.map) {
        this.r.disableEdit()
        this.map.removeLayer(this.r)
        this.r = undefined
      }
    },
    enableBoundingBoxDrawing (boundingBoxFilter) {
      let boundingBox = boundingBoxFilter
      let bounds
      if (isNil(boundingBox)) {
        let sw = this.map.getBounds().getSouthWest()
        let ne = this.map.getBounds().getNorthEast()
        boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        bounds = L.latLngBounds(boundingBox)
        bounds = bounds.pad(-0.05)
        boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
        if (this.drawBoundsId != null) {
          EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.drawBoundsId), [Number(boundingBox[0][1]), Number(boundingBox[0][0]), Number(boundingBox[1][1]), Number(boundingBox[1][0])])
        }
      } else {
        bounds = L.latLngBounds(boundingBox)
      }

      this.r = L.rectangle(bounds, {pane: 'markerPane'})
      this.r.addTo(this.map)
      this.r.enableEdit()

      this.map.fitBounds(boundingBox)

      const self = this
      this.r.on('editable:vertex:dragend', () => {
        let sw = this.r.getBounds().getSouthWest()
        let ne = this.r.getBounds().getNorthEast()
        let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        if (self.drawBoundsId != null) {
          EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(self.drawBoundsId), [Number(boundingBox[0][1]), Number(boundingBox[0][0]), Number(boundingBox[1][1]), Number(boundingBox[1][0])])
        }
      })
    },
    cancelDrawingBounds () {
      if (this.drawBoundsId != null) {
        EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_CANCELLED(this.drawBoundsId))
        this.drawBoundsId = null
      }
      this.disableBoundingBoxDrawing()
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
