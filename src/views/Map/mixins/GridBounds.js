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
        this.gridLayer.remove()
        this.gridLayer = null
      }
    },
    fixLongitude (lng) {
      while (lng > 180.0) {
        lng -= 360.0
      }
      while (lng < -180.0) {
        lng += 360.0
      }
      return lng
    },
    enableGridSelection (type) {
      const self = this
      this.disableGridSelection()

      if (this.gridLayer != null) {
        this.gridLayer.remove()
        this.gridLayer = null
      }
      if (type === 0) {
        this.gridLayer = L.xyzGrid({
          interactive: true,
          pane: GRID_SELECTION_PANE.name,
          zIndex: GRID_SELECTION_PANE.zIndex,
          id: this.gridBoundsId,
        })
        this.gridLayer.bgColor = null
        this.gridLayer.fgColor = null
        this.gridLayer.addTo(this.map)
      } else if (type === 1) {
        const style = {
          style: {
            color: '#4e9cca',
            fillColor: '#4e9cca',
            fillOpacity: 0.125
          },
          hover: {
            color: '#4e9cca',
            fillColor: '#4e9cca',
            fillOpacity: 0.4
          },
          press: {
            color: '#4e9cca',
            fillColor: '#4e9cca',
            fillOpacity: 0.6
          },
          labelStyle: {
            fontColor: '#326482'
          },
        }
        this.gridLayer = L.garsGrid({
          pane: GRID_SELECTION_PANE.name,
          zIndex: GRID_SELECTION_PANE.zIndex,
          gridOptions: {
            onClick: (e, layer) => {
              const bounds = layer.getBounds()
              if (bounds != null && self.gridBoundsId) {
                EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(self.gridBoundsId), [self.fixLongitude(bounds._southWest.lng), bounds._southWest.lat, self.fixLongitude(bounds._northEast.lng), bounds._northEast.lat])
              }
            },
            interactive: true,
            twenty_degree: {...style},
            ten_degree: {...style},
            five_degree: {...style},
            thirty_minute: {...style},
            fifteen_minute: {...style},
            five_minute: {...style},
          }
        })
        this.gridLayer.addTo(this.map)
      } else if (type === 2) {
        const style = {
          style: {
            color: '#4e9cca',
            fillColor: '#4e9cca',
            fillOpacity: 0.125
          },
          hover: {
            color: '#4e9cca',
            fillColor: '#4e9cca',
            fillOpacity: 0.4
          },
          press: {
            color: '#4e9cca',
            fillColor: '#4e9cca',
            fillOpacity: 0.6
          },
          labelStyle: {
            fontColor: '#326482'
          },
        }
        this.gridLayer = L.mgrsGrid({
          pane: GRID_SELECTION_PANE.name,
          zIndex: GRID_SELECTION_PANE.zIndex,
          gridOptions: {
            onClick: (e, layer) => {
              const bounds = layer.getBounds()
              if (bounds != null && self.gridBoundsId) {
                EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(self.gridBoundsId), [self.fixLongitude(bounds._southWest.lng), bounds._southWest.lat, self.fixLongitude(bounds._northEast.lng), bounds._northEast.lat])
              }
            },
            interactive: true,
            gzd: {...style},
            one_hundred_km: {...style},
            ten_km: {...style},
            one_km: {...style},
            one_hundred_meter: {...style},
            ten_meter: {...style}
          }
        })
        this.gridLayer.addTo(this.map)
      }
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
    EventBus.$on(EventBus.EventTypes.GRID_BOUNDING_BOX, (id, type) => {
      EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_STOP)
      if (this.gridBoundsId != null) {
        EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX_CANCELLED(this.gridBoundsId))
      }
      this.gridBoundsId = id
      this.enableGridSelection(type)
      if (this.gridOverlayControl) {
        this.gridOverlayControl.disable()
        this.garsGridOverlay.remove()
        this.mgrsGridOverlay.remove()
        this.xyzGridOverlay.remove()
        this.showGridSelection = false
        this.gridSelection = 0
      }
      if (this.coordinateControl) {
        if (type === 0) {
          this.coordinateControl.setCoordinateType('XYZ')
        } else if (type === 1) {
          this.coordinateControl.setCoordinateType('GARS')
        } else if (type === 2) {
          this.coordinateControl.setCoordinateType('MGRS')
        }
      }
    })
    EventBus.$on(EventBus.EventTypes.GRID_BOUNDING_BOX_STOP, () => {
      this.cancelGridPicking()
      if (this.gridOverlayControl) {
        this.gridOverlayControl.enable()
      }
      if (this.coordinateControl) {
        this.coordinateControl.setCoordinateType('LatLng')
      }
    })
  },
  beforeDestroy() {
    EventBus.$off([EventBus.EventTypes.GRID_BOUNDING_BOX, EventBus.EventTypes.GRID_BOUNDING_BOX_STOP])
    this.cancelGridPicking()
  }
}
