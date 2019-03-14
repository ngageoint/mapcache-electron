import { mapState, mapActions } from 'vuex'

export default {
  computed: {
    ...mapState({
      extents (state) {
        return state.UIState[this.projectId].extents
      }
    })
  },
  methods: {
    ...mapActions({
      setProjectExtents: 'UIState/setProjectExtents'
    })
  },
  watch: {
    extents: {
      handler (value, oldValue) {
        let oldExtent = oldValue
        let extent = value
        if (!oldExtent || extent[0] !== oldExtent[0] || extent[1] !== oldExtent[1] || extent[2] !== oldExtent[2] || extent[3] !== oldExtent[3]) {
          this.map.fitBounds([
            [extent[1], extent[0]],
            [extent[3], extent[2]]
          ])
        }
      },
      deep: true
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      console.log('Zoom To Extent mounted')
      let extent = this.extents
      this.map.fitBounds([
        [extent[1], extent[0]],
        [extent[3], extent[2]]
      ])

      this.map.on('moveend', () => {
        let bounds = this.map.getBounds()
        this.setProjectExtents({projectId: this.projectId, extents: [bounds.getEast(), bounds.getSouth(), bounds.getWest(), bounds.getNorth()]})
      }, this)
    })
  }
}
