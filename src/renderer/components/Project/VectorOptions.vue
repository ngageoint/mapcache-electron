<template>
  <div>

    <div class="layer__face__stats">
      <p class="layer__face__stats__weight">
        Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label class="control-label">Fill Color</label>
            <div>
              <colorpicker :color="fillColor" v-model="fillColor" />
            </div>
          </div>
        </div>
        <div class="flex-row" v-if="layer.layerType !== 'Drawing'">
          <div>
            <label class="control-label">Fill Outline Color</label>
            <div>
              <colorpicker :color="fillOutlineColor" v-model="fillOutlineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Color</label>
            <div>
              <colorpicker :color="color" v-model="color" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Stroke Width (px)</label>
            <div>
              <numberpicker :number="weight" v-model="weight" />
            </div>
          </div>
        </div>
        <div class="flex-row" v-if="layer.layerType !== 'Drawing'">
          <div>
            <label class="control-label">Radius (px)</label>
            <div>
              <numberpicker :number="radius" v-model="radius" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import ColorPicker from './ColorPicker'
  import NumberPicker from './NumberPicker'
  import _ from 'lodash'

  export default {
    props: {
      layer: Object,
      projectId: String
    },
    data () {
      if (!this.layer.style) {
        return {
          fillColor: 'rgba(255, 0, 0, 1.0)',
          fillOutlineColor: 'rgba(255, 0, 0, 1.0)',
          color: 'rgba(255, 0, 0, 1.0)',
          weight: 1.0,
          radius: 1.0
        }
      }
      return {
        fillColor: this.layer.style.fillColor && this.layer.style.fillOpacity ? this.getRGBA(this.layer.style.fillColor, this.layer.style.fillOpacity) : 'rgba(255, 0, 0, 1.0)',
        fillOutlineColor: this.layer.style.fillOutlineColor || 'rgba(255, 0, 0, 1.0)',
        color: this.layer.style.color && this.layer.style.opacity ? this.getRGBA(this.layer.style.color, this.layer.style.opacity) : 'rgba(255, 0, 0, 1.0)',
        weight: this.layer.style.weight || 1.0,
        radius: this.layer.style.radius || 1.0
      }
    },
    created () {
      this.debounceUpdateFillColor = _.debounce((val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          let style = Object.assign({}, this.layer.style)
          style.fillColor = color
          style.fillOpacity = opacity
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
      this.debounceUpdateFillOutlineColor = _.debounce((val) => {
        if (val) {
          const {color} = this.parseColor(val)
          let style = Object.assign({}, this.layer.style)
          style.fillOutlineColor = color
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
      this.debounceUpdateColor = _.debounce((val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          let style = Object.assign({}, this.layer.style)
          style.color = color
          style.opacity = opacity
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
      this.debounceUpdateWeight = _.debounce((val) => {
        if (val) {
          let style = Object.assign({}, this.layer.style)
          style.weight = parseFloat(val)
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
      this.debounceUpdateRadius = _.debounce((val) => {
        if (val) {
          let style = Object.assign({}, this.layer.style)
          style.radius = parseFloat(val)
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
    },
    components: {
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker
    },
    methods: {
      ...mapActions({
        updateProjectLayerStyle: 'Projects/updateProjectLayerStyle'
      }),
      parseColor (val) {
        let color = '#FFFFFF'
        let opacity = 1.0
        if (val.slice(0, 1) === '#') {
          color = val
        } else if (val.slice(0, 4) === 'rgba') {
          const rgba = val.replace(/^rgba?\(|\s+|\)$/g, '').split(',')
          color = '#' + ((1 << 24) + (parseInt(rgba[0]) << 16) + (parseInt(rgba[1]) << 8) + parseInt(rgba[2])).toString(16).slice(1)
          opacity = parseFloat(rgba[3])
        }
        return {color, opacity}
      },
      getRGBA (color, opacity) {
        return 'rgba(' + parseInt(color.substring(1, 3), 16) + ' ,' + parseInt(color.substring(3, 5), 16) + ' ,' + parseInt(color.substring(5, 7), 16) + ' ,' + opacity + ')'
      }
    },
    watch: {
      fillColor (val) {
        this.debounceUpdateFillColor(val)
      },
      fillOutlineColor (val) {
        this.debounceUpdateFillOutlineColor(val)
      },
      color (val) {
        this.debounceUpdateColor(val)
      },
      weight (val) {
        this.debounceUpdateWeight(val)
      },
      radius (val) {
        this.debounceUpdateRadius(val)
      }
    }
  }
</script>

<style scoped>
  .flex-row {
    display: flex;
    flex-direction: row;
  }
  .layer__face__stats {
    color: #777;
    text-transform: uppercase;
    font-size: 12px
  }
  .layer__face__stats p {
    font-size: 15px;
    color: #777;
    font-weight: bold;
  }
  .flex-row {
    margin-left: 10px;
    margin-bottom: 10px;
  }
</style>
