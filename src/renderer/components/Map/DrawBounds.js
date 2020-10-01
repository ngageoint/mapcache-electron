import { mapActions } from 'vuex'
import * as vendor from '../../../lib/vendor'
import _ from 'lodash'

export default {
  data () {
    return {
      enabled: false
    }
  },
  methods: {
    ...mapActions({
      setBoundingBoxFilter: 'Projects/setBoundingBoxFilter'
    }),
    disableBoundingBoxDrawing () {
      if (this.r && this.map) {
        this.r.disableEdit()
        this.map.removeLayer(this.r)
        this.r = undefined
      }
      this.map.fire('boundingBoxDisabled')
      this.enabled = false
    },
    enableBoundingBoxDrawing (boundingBoxFilter) {
      this.disableBoundingBoxDrawing()
      this.map.fire('boundingBoxEnabled')
      let boundingBox = boundingBoxFilter
      if (_.isNil(boundingBox)) {
        let sw = this.map.getBounds().getSouthWest()
        let ne = this.map.getBounds().getNorthEast()
        boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
      }
      let bounds = vendor.L.latLngBounds(boundingBox)
      this.r = vendor.L.rectangle(bounds)
      this.r.addTo(this.map)
      this.r.enableEdit()

      this.map.fitBounds(boundingBox)

      this.r.on('editable:vertex:dragend', () => {
        let sw = this.r.getBounds().getSouthWest()
        let ne = this.r.getBounds().getNorthEast()
        let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        this.setBoundingBoxFilter({projectId: this.project.id, boundingBoxFilter: [boundingBox[0][1], boundingBox[0][0], boundingBox[1][1], boundingBox[1][0]]})
      })
      this.enabled = true
      this.setBoundingBoxFilter({projectId: this.project.id, boundingBoxFilter: [boundingBox[0][1], boundingBox[0][0], boundingBox[1][1], boundingBox[1][0]]})
    }
  },
  watch: {
    project: {
      async handler (project, oldValue) {
        if (project.boundingBoxFilterEditingEnabled) {
          if (!this.enabled) {
            let boundingBox = project.boundingBoxFilter
            if (_.isNil(boundingBox)) {
              boundingBox = await this.getExtentForVisibleGeoPackagesAndLayers()
            }
            if (!_.isNil(boundingBox)) {
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
  },
  mounted: function () {
    this.$nextTick(async function () {
      if (this.project.boundingBoxFilterEditingEnabled) {
        let boundingBox = this.project.boundingBoxFilter
        if (_.isNil(boundingBox)) {
          boundingBox = await this.getExtentForVisibleGeoPackagesAndLayers()
        }
        boundingBox = [[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]]
        this.enableBoundingBoxDrawing(boundingBox)
      } else {
        this.disableBoundingBoxDrawing()
      }
    })
  }
}
