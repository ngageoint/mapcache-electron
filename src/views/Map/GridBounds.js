import isNil from 'lodash/isNil'
import * as Vendor from '../../lib/leaflet/vendor'

export default {
  methods: {
    disableGridSelection () {
      if (this.gridLayer && this.map) {
        this.map.removeLayer(this.gridLayer)
        this.gridLayer = undefined
      }
    },
    enableGridSelection () {
      this.gridLayer = new Vendor.L.GridLayer.TileSelectionMapLayer({
        pane: 'gridSelectionPane',
        zIndex: 625,
        projectId: this.project.id
      })
      this.gridLayer.addTo(this.map)
    }
  },
  watch: {
    project: {
      handler (project) {
        if (!isNil(project.boundingBoxFilterEditing) && project.boundingBoxFilterEditing === 'grid') {
          if (isNil(this.gridLayer)) {
            this.enableGridSelection()
          }
        } else {
          this.disableGridSelection()
        }
      },
      deep: true
    }
  }
}
