import _ from 'lodash'
import TileSelectionMapLayer from '../../lib/map/TileSelectionMapLayer'

export default {
  methods: {
    disableGridSelection () {
      if (this.gridLayer && this.map) {
        this.map.removeLayer(this.gridLayer)
        this.gridLayer = undefined
      }
    },
    enableGridSelection () {
      this.gridLayer = new TileSelectionMapLayer()
      this.gridLayer.setProjectId(this.project.id)
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
