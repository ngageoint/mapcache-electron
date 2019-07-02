import { mapState, mapActions } from 'vuex'
import * as vendor from '../../../lib/vendor'

export default {
  computed: {
    ...mapState({
      drawBounds (state) {
        return state.UIState[this.projectId].drawBounds
      }
    })
  },
  methods: {
    ...mapActions({
      setDrawnBounds: 'UIState/setDrawnBounds'
    }),
    setupDrawing (drawBounds) {
      if (this.r) {
        this.map.removeLayer(this.r)
      }
      // find the newly activated drawing
      if (!this.activeGeopackage) return
      let gpDrawBounds = drawBounds[this.activeGeopackage.id]
      for (const key in gpDrawBounds) {
        // if the bounds drawing for the whole geopackage was activated, do this
        if (gpDrawBounds[key] === true) {
          let aoi
          if (this.activeGeopackage.imageryLayers[key]) {
            aoi = this.activeGeopackage.imageryLayers[key].aoi
          } else if (this.activeGeopackage.featureLayers[key]) {
            aoi = this.activeGeopackage.featureLayers[key].aoi
          } else if (this.activeGeopackage.featureToImageryLayers[key]) {
            aoi = this.activeGeopackage.featureToImageryLayers[key].aoi
          } else {
            aoi = this.activeGeopackage[key]
          }
          if (!aoi || !aoi.length) {
            this.r = this.map.editTools.startRectangle()
          } else {
            let bounds = vendor.L.latLngBounds(aoi)
            this.r = vendor.L.rectangle(bounds)
            this.r.addTo(this.map)
            this.r.enableEdit()
          }
          this.r.layerId = key
          // this.r.setStyle({color: 'DarkRed'})
          this.r.on('editable:vertex:dragend', () => {
            let sw = this.r.getBounds().getSouthWest()
            let ne = this.r.getBounds().getNorthEast()
            let bounds = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
            this.setDrawnBounds({projectId: this.projectId, bounds, geopackageId: this.activeGeopackage.id, layerId: this.r.layerId})
          })
        }
      }
    }
  },
  watch: {
    drawBounds: {
      handler (value, oldValue) {
        this.setupDrawing(value)
      },
      deep: true
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      this.setupDrawing(this.drawBounds)
    })
  }
}
