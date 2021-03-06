import {L} from '../../vendor'
import isNil from 'lodash/isNil'

export default {
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
      } else {
        bounds = L.latLngBounds(boundingBox)
      }
      this.r = L.rectangle(bounds, {pane: 'markerPane'})
      this.r.addTo(this.map)
      this.r.enableEdit()

      this.map.fitBounds(boundingBox)

      this.r.on('editable:vertex:dragend', () => {
        let sw = this.r.getBounds().getSouthWest()
        let ne = this.r.getBounds().getNorthEast()
        let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        window.mapcache.setBoundingBoxFilter({projectId: this.project.id, boundingBoxFilter: [boundingBox[0][1], boundingBox[0][0], boundingBox[1][1], boundingBox[1][0]]})
      })
      if (isNil(this.project.boundingBoxFilter)) {
        window.mapcache.setBoundingBoxFilter({projectId: this.project.id, boundingBoxFilter: [boundingBox[0][1], boundingBox[0][0], boundingBox[1][1], boundingBox[1][0]]})
      }
    }
  },
  watch: {
    project: {
      handler (project) {
        if (!isNil(project.boundingBoxFilterEditing) && project.boundingBoxFilterEditing === 'manual') {
          if (isNil(this.r)) {
            let boundingBox = project.boundingBoxFilter
            if (!isNil(boundingBox)) {
              boundingBox = [[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]]
            }
            this.enableBoundingBoxDrawing(boundingBox)
          }
        } else {
          this.disableBoundingBoxDrawing()
        }
      },
      deep: true
    }
  }
}
