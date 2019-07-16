<template>
  <div>
    <div class="layer__face__stats">
      <p class="layer__face__stats__weight">
        Polygon Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label class="control-label">Fill Color</label>
            <div>
              <colorpicker :color="polygonColor" v-model="polygonColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Color</label>
            <div>
              <colorpicker :color="polygonLineColor" v-model="polygonLineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Width (px)</label>
            <div>
              <numberpicker :number="polygonLineWeight" v-model="polygonLineWeight" />
            </div>
          </div>
        </div>
      </div>
      <p class="layer__face__stats__weight">
        Line Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label class="control-label">Color</label>
            <div>
              <colorpicker :color="lineColor" v-model="lineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Width (px)</label>
            <div>
              <numberpicker :number="lineWeight" v-model="lineWeight" />
            </div>
          </div>
        </div>
      </div>
      <p class="layer__face__stats__weight">
        Circle/Point Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label class="control-label">Fill Color</label>
            <div>
              <colorpicker :color="circleColor" v-model="circleColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Color</label>
            <div>
              <colorpicker :color="circleLineColor" v-model="circleLineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Width (px)</label>
            <div>
              <numberpicker :number="circleLineWeight" v-model="circleLineWeight" />
            </div>
          </div>
        </div>
        <div class="flex-row" v-if="layer.layerType !== 'Drawing'">
          <div>
            <label class="control-label">Point Radius (px)</label>
            <div>
              <numberpicker :number="circleRadiusInPixels" v-model="circleRadiusInPixels" />
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
          polygonColor: 'rgba(255, 0, 0, 1.0)',
          polygonLineColor: 'rgba(255, 0, 0, 1.0)',
          polygonLineWeight: 1.0,
          circleColor: 'rgba(255, 0, 0, 1.0)',
          circleLineColor: 'rgba(255, 0, 0, 1.0)',
          circleLineWeight: 1.0,
          circleRadiusInPixels: 5.0,
          lineColor: 'rgba(255, 0, 0, 1.0)',
          lineWeight: 1.0
        }
      }
      return {
        polygonColor: this.layer.style.polygonColor && this.layer.style.polygonOpacity ? this.getRGBA(this.layer.style.polygonColor, this.layer.style.polygonOpacity) : 'rgba(255, 0, 0, 1.0)',
        polygonLineColor: this.layer.style.polygonLineColor && this.layer.style.polygonLineOpacity ? this.getRGBA(this.layer.style.polygonLineColor, this.layer.style.polygonLineOpacity) : 'rgba(255, 0, 0, 1.0)',
        polygonLineWeight: this.layer.style.polygonLineWeight || 1.0,
        circleColor: this.layer.style.circleColor && this.layer.style.circleOpacity ? this.getRGBA(this.layer.style.circleColor, this.layer.style.circleOpacity) : 'rgba(255, 0, 0, 1.0)',
        circleLineColor: this.layer.style.circleLineColor && this.layer.style.circleLineOpacity ? this.getRGBA(this.layer.style.circleLineColor, this.layer.style.circleLineOpacity) : 'rgba(255, 0, 0, 1.0)',
        circleLineWeight: this.layer.style.circleLineWeight || 1.0,
        circleRadiusInPixels: this.layer.style.circleRadiusInPixels || 5.0,
        lineColor: this.layer.style.lineColor && this.layer.style.lineOpacity ? this.getRGBA(this.layer.style.lineColor, this.layer.style.lineOpacity) : 'rgba(255, 0, 0, 1.0)',
        lineWeight: this.layer.style.lineWeight || 1.0
      }
    },
    created () {
      this.debounceColorOpacityInStyleField = _.debounce((colorField, opacityField, val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          let style = Object.assign({}, this.layer.style)
          style[colorField] = color
          style[opacityField] = opacity
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
      this.debounceFloatFieldInStyle = _.debounce((field, val) => {
        if (val) {
          let style = Object.assign({}, this.layer.style)
          style[field] = parseFloat(val)
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
      polygonColor (val) {
        this.debounceColorOpacityInStyleField('polygonColor', 'polygonOpacity', val)
      },
      polygonLineColor (val) {
        this.debounceColorOpacityInStyleField('polygonLineColor', 'polygonLineOpacity', val)
      },
      polygonLineWeight (val) {
        this.debounceFloatFieldInStyle('polygonLineWeight', val)
      },
      circleColor (val) {
        this.debounceColorOpacityInStyleField('circleColor', 'circleOpacity', val)
      },
      circleLineColor (val) {
        this.debounceColorOpacityInStyleField('circleLineColor', 'circleLineOpacity', val)
      },
      circleLineWeight (val) {
        this.debounceFloatFieldInStyle('circleLineWeight', val)
      },
      circleRadiusInPixels (val) {
        this.debounceFloatFieldInStyle('circleRadiusInPixels', val)
      },
      lineColor (val) {
        this.debounceColorOpacityInStyleField('lineColor', 'lineOpacity', val)
      },
      lineWeight (val) {
        this.debounceFloatFieldInStyle('lineWeight', val)
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
