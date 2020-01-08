import { mapActions } from 'vuex'
import * as vendor from '../../../lib/vendor'

export default {
  methods: {
    ...mapActions({
      setGeoPackageVectorConfigurationBoundingBox: 'Projects/setGeoPackageVectorConfigurationBoundingBox',
      setGeoPackageTileConfigurationBoundingBox: 'Projects/setGeoPackageTileConfigurationBoundingBox'
    }),
    disableBoundingBoxDrawing () {
      if (this.r && this.map) {
        this.r.disableEdit()
        this.map.removeLayer(this.r)
        this.r = undefined
        this.activeGeoPakageId = undefined
        this.activeConfigurationId = undefined
      }
      this.map.fire('boundingBoxDisabled')
    },
    enableBoundingBoxDrawing (geopackage, configuration) {
      this.disableBoundingBoxDrawing()
      this.map.fire('boundingBoxEnabled')
      let boundingBox = configuration.boundingBox || this.map.getBounds()
      if (!configuration.boundingBox) {
        let sw = this.map.getBounds().getSouthWest()
        let ne = this.map.getBounds().getNorthEast()
        let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        if (configuration.type === 'vector') {
          this.setGeoPackageVectorConfigurationBoundingBox({projectId: this.projectId, geopackageId: geopackage.id, configId: configuration.id, boundingBox: boundingBox})
        } else {
          this.setGeoPackageTileConfigurationBoundingBox({projectId: this.projectId, geopackageId: geopackage.id, configId: configuration.id, boundingBox: boundingBox})
        }
      }
      this.activeGeoPakageId = geopackage.id
      this.activeConfigurationId = configuration.id
      let bounds = vendor.L.latLngBounds(boundingBox)
      this.r = vendor.L.rectangle(bounds)
      this.r.addTo(this.map)
      this.r.enableEdit()

      // this.r.setStyle({color: 'DarkRed'})
      this.r.on('editable:vertex:dragend', () => {
        let sw = this.r.getBounds().getSouthWest()
        let ne = this.r.getBounds().getNorthEast()
        let boundingBox = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
        if (configuration.type === 'vector') {
          this.setGeoPackageVectorConfigurationBoundingBox({projectId: this.projectId, geopackageId: geopackage.id, configId: configuration.id, boundingBox: boundingBox})
        } else {
          this.setGeoPackageTileConfigurationBoundingBox({projectId: this.projectId, geopackageId: geopackage.id, configId: configuration.id, boundingBox: boundingBox})
        }
      })
    }
  }
  // watch: {
  //   drawBounds: {
  //     handler (value, oldValue) {
  //       this.setupDrawing(value)
  //     },
  //     deep: true
  //   }
  // },
  // mounted: function () {
  //   this.$nextTick(function () {
  //     this.setupDrawing(this.drawBounds)
  //   })
  // }
}
