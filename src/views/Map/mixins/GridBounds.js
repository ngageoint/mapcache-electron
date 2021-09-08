import {L} from '../../../lib/leaflet/vendor'
import EventBus from '../../../lib/vue/EventBus'
import {GRID_SELECTION_PANE} from '../../../lib/leaflet/map/panes/MapPanes'

export default {
  data () {
    return {
      gridBoundsId: null
    }
  },
  methods: {
    disableGridSelection () {
      if (this.gridLayer && this.map) {
        this.map.removeLayer(this.gridLayer)
        this.gridLayer = undefined
      }
    },
    enableGridSelection () {
      this.disableGridSelection()
      this.gridLayer = new L.GridLayer.TileSelectionLayer({
        pane: GRID_SELECTION_PANE.name,
        zIndex: GRID_SELECTION_PANE.zIndex,
        id: this.gridBoundsId
      })
      this.gridLayer.addTo(this.map)
    },
    cancelGridPicking () {
      if (this.gridBoundsId != null) {
        EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX_CANCELLED(this.gridBoundsId))
        this.gridBoundsId = null
      }
      this.disableGridSelection()
    }
  },
  mounted () {
    EventBus.$on(EventBus.EventTypes.GRID_BOUNDING_BOX, (id) => {
      EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_STOP)
      if (this.gridBoundsId != null) {
        EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX_CANCELLED(this.gridBoundsId))
      }
      this.gridBoundsId = id
      this.enableGridSelection()
    })
    EventBus.$on(EventBus.EventTypes.GRID_BOUNDING_BOX_STOP, () => {
      this.cancelGridPicking()
    })
  },
  beforeDestroy() {
    EventBus.$off([EventBus.EventTypes.GRID_BOUNDING_BOX, EventBus.EventTypes.GRID_BOUNDING_BOX_STOP])
    this.cancelGridPicking()
  }
}
