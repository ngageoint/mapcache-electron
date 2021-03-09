import _ from 'lodash'
import * as Vendor from '../../lib/vendor'

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
        if (!_.isNil(project.boundingBoxFilterEditing) && project.boundingBoxFilterEditing === 'grid') {
          if (_.isNil(this.gridLayer)) {
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
