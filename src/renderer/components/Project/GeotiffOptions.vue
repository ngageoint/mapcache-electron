<template>
  <div>
    <div class="layer__face__stats">
      <p class="layer__face__stats__weight">
        Rendering Method
      </p>
      <div class="preset-select">
        <select v-model="renderingMethod">
          <!-- <option value="">Custom</option> -->
          <option v-for="method in renderMethods" :value="method.value">{{method.name}}</option>
        </select>
      </div>
    </div>
    <div class="layer__horizontal__divider detail-divider"></div>
    <div v-if="renderingMethod === 0">
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Gray Scale Options
          <div class="flex-column option-block">
            Gray Band Options
            <div class="preset-select gray-color">
              <select v-model="grayBand">
                <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
              </select>
              <div class="color-band-name">Gray</div>
            </div>
            <div class="flex-row option-block" v-if="grayBand >= 0">
              <span class="text-box-label">Min</span>
              <input type="number" class="text-box" v-model="grayBandMin"/>
              <span class="text-box-label">Max</span>
              <input type="number" class="text-box" v-model="grayBandMax"/>
            </div>
            <div>
              Color Gradient
              <div class="preset-select">
                <select v-model="grayScaleColorGradient">
                  <option value=0>White is Zero</option>
                  <option value=1>Black is Zero</option>
                </select>
              </div>
            </div>
            <div>
              Stretch to Min/Max
              <input type="checkbox" v-model="stretchToMinMax">
            </div>
          </div>
        </p>
      </div>
      <div class="layer__horizontal__divider detail-divider"></div>
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Transparency Options
        <div class="flex-row option-block">
          <span class="text-box-label">
            NO_DATA Value
            <input type="checkbox" v-model="enableGlobalNoDataValue">
          </span>
          <input type="number" class="text-box" v-model="globalNoDataValue"/>
        </div>
        <div class="flex-row option-block">
          <span class="text-box-label">
            Opacity Mask
            <input type="checkbox" v-model="enableGlobalOpacity">
          </span>
          <div style="flex: 1; padding: 8px; max-width: 180px;">
            <vue-slider v-model="globalOpacity" :min="0" :max="100" :interval="1" />
          </div>
        </div>
        <div class="flex-column option-block">
          Alpha Band
          <div class="preset-select alpha-color">
            <select v-model="alphaBand">
              <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
            </select>
            <div class="color-band-name">Alpha</div>
          </div>
        </div>
        </p>
      </div>
    </div>
    <div v-else-if="renderingMethod === 1">
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          RGB Options
          <div class="flex-column option-block">
            Red Band Options
            <div class="preset-select red-color">
              <select v-model="redBand">
                <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
              </select>
              <div class="color-band-name">Red</div>
            </div>
            <div class="flex-row option-block" v-if="redBand >= 0">
              <span class="text-box-label">Min</span>
              <input type="number" class="text-box" v-model="redBandMin"/>
              <span class="text-box-label">Max</span>
              <input type="number" class="text-box" v-model="redBandMax"/>
            </div>
          </div>
          <div class="flex-column option-block">
            Green Band Options
            <div class="preset-select green-color">
              <select v-model="greenBand">
                <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
              </select>
              <div class="color-band-name">Green</div>
            </div>
            <div class="flex-row option-block" v-if="greenBand >= 0">
              <span class="text-box-label">Min</span>
              <input type="number" class="text-box" v-model="greenBandMin"/>
              <span class="text-box-label">Max</span>
              <input type="number" class="text-box" v-model="greenBandMax"/>
            </div>
          </div>
          <div class="flex-column option-block">
            Blue Band Options
            <div class="preset-select blue-color">
              <select v-model="blueBand">
                <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
              </select>
              <div class="color-band-name">Blue</div>
            </div>
            <div class="flex-row option-block" v-if="blueBand >= 0">
              <span class="text-box-label">Min</span>
              <input type="number" class="text-box" v-model="blueBandMin"/>
              <span class="text-box-label">Max</span>
              <input type="number" class="text-box" v-model="blueBandMax"/>
            </div>
          </div>
          <div>
            Stretch to Min/Max
            <input type="checkbox" v-model="stretchToMinMax">
          </div>
        </p>
      </div>
      <div class="layer__horizontal__divider detail-divider"></div>
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Transparency Options
          <div class="flex-row option-block">
            <span class="text-box-label">
              NO_DATA Value
              <input type="checkbox" v-model="enableGlobalNoDataValue">
            </span>
            <input type="number" class="text-box" v-model="globalNoDataValue"/>
          </div>
          <div class="flex-row option-block">
            <span class="text-box-label">
              Opacity Mask
              <input type="checkbox" v-model="enableGlobalOpacity">
            </span>
            <div style="flex: 1; padding: 8px; max-width: 180px;">
              <vue-slider v-model="globalOpacity" :min="0" :max="100" :interval="1" />
            </div>
          </div>
          <div class="flex-column option-block">
            Alpha Band
            <div class="preset-select alpha-color">
              <select v-model="alphaBand">
                <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
              </select>
              <div class="color-band-name">Alpha</div>
            </div>
          </div>
        </p>
      </div>
    </div>
    <div v-else-if="renderingMethod === 2">
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Color Palette Options
          <div class="flex-column option-block">
            Color Palette Band Options
            <div class="preset-select palette-color">
              <select v-model="paletteBand">
                <option v-for="band in bandOptions" :value="band.value">{{band.name}}</option>
              </select>
              <div class="color-band-name">Palette</div>
            </div>
          </div>
        </p>
      </div>
      <div class="layer__horizontal__divider detail-divider"></div>
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Transparency Options
          <div class="flex-row option-block">
              <span class="text-box-label">
                Opacity Mask
                <input type="checkbox" v-model="enableGlobalOpacity">
              </span>
            <div style="flex: 1; padding: 8px; max-width: 180px;">
              <vue-slider v-model="globalOpacity" :min="0" :max="100" :interval="1" />
            </div>
          </div>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import VueSlider from 'vue-slider-component'
  import 'vue-slider-component/theme/antd.css'

  export default {
    data () {
      return {
        globalNoDataValue: this.layer.globalNoDataValue,
        globalOpacity: this.layer.globalOpacity
      }
    },
    created () {
      this.debounceLayerField = _.debounce((value, key) => {
        if (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer[key] = value
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      }, 500)
    },
    components: {
      VueSlider
    },
    props: {
      layer: Object,
      projectId: String
    },
    computed: {
      bandOptions () {
        return this.layer.bandOptions
      },
      renderingMethod: {
        get () {
          return this.layer.renderingMethod
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.renderingMethod = value
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      redBand: {
        get () {
          return this.layer.redBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.redBand = Number(value)
          updatedLayer.redBandMin = this.layer.bandOptions[updatedLayer.redBand].min
          updatedLayer.redBandMax = this.layer.bandOptions[updatedLayer.redBand].max
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      redBandMin: {
        get () {
          return this.layer.redBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'redBandMin')
        }
      },
      redBandMax: {
        get () {
          return this.layer.redBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'redBandMax')
        }
      },
      greenBand: {
        get () {
          return this.layer.greenBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.greenBand = Number(value)
          updatedLayer.greenBandMin = this.layer.bandOptions[updatedLayer.greenBand].min
          updatedLayer.greenBandMax = this.layer.bandOptions[updatedLayer.greenBand].max
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      greenBandMin: {
        get () {
          return this.layer.greenBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'greenBandMin')
        }
      },
      greenBandMax: {
        get () {
          return this.layer.greenBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'greenBandMax')
        }
      },
      blueBand: {
        get () {
          return this.layer.blueBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.blueBand = Number(value)
          updatedLayer.blueBandMin = this.layer.bandOptions[updatedLayer.blueBand].min
          updatedLayer.blueBandMax = this.layer.bandOptions[updatedLayer.blueBand].max
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      blueBandMin: {
        get () {
          return this.layer.blueBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'blueBandMin')
        }
      },
      blueBandMax: {
        get () {
          return this.layer.blueBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'blueBandMax')
        }
      },
      grayBand: {
        get () {
          return this.layer.grayBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.grayBand = Number(value)
          updatedLayer.grayBandMin = this.layer.bandOptions[updatedLayer.grayBand].min
          updatedLayer.grayBandMax = this.layer.bandOptions[updatedLayer.grayBand].max
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      grayBandMin: {
        get () {
          return this.layer.grayBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'grayBandMin')
        }
      },
      grayBandMax: {
        get () {
          return this.layer.grayBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'grayBandMax')
        }
      },
      paletteBand: {
        get () {
          return this.layer.paletteBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.paletteBand = Number(value)
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      alphaBand: {
        get () {
          return this.layer.alphaBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.alphaBand = Number(value)
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      grayScaleColorGradient: {
        get () {
          return this.layer.grayScaleColorGradient
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.grayScaleColorGradient = Number(value)
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      enableGlobalNoDataValue: {
        get () {
          return this.layer.enableGlobalNoDataValue
        },
        set () {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.enableGlobalNoDataValue = !this.layer.enableGlobalNoDataValue
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      enableGlobalOpacity: {
        get () {
          return this.layer.enableGlobalOpacity
        },
        set () {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.enableGlobalOpacity = !this.layer.enableGlobalOpacity
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      renderMethods () {
        let methods = []
        if (this.layer.colorMap) {
          methods.push({name: 'Palette', value: 2})
        } else {
          methods.push({name: 'Gray Scale', value: 0})
          methods.push({name: 'RGB', value: 1})
        }
        return methods
      },
      stretchToMinMax: {
        get () {
          return this.layer.stretchToMinMax
        },
        set () {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.stretchToMinMax = !this.layer.stretchToMinMax
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateLayer: 'Projects/updateProjectLayer'
      }),
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      },
      openDetail () {
        this.expanded = !this.expanded
      }
    },
    watch: {
      globalNoDataValue (value) {
        this.debounceLayerField(Number(value), 'globalNoDataValue')
      },
      globalOpacity (value) {
        this.debounceLayerField(Number(value), 'globalOpacity')
      }
    }
  }
</script>

<style scoped>
  .flex-column {
    display: flex;
    flex-direction: column;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
  }
  .layer__face__stats {
    color: #777;
    text-transform: uppercase;
    font-size: 12px;
  }
  .layer__face__stats p {
    font-size: 15px;
    color: #777;
    font-weight: bold;
  }
  .option-block {
    width: 100%;
  }
  .preset-select {
    display:flex;
    flex-direction: column;
    justify-content: center;
    border-width: 4px;
    border-style: solid;
    margin: 10px;
    color: #222;
  }
  .preset-select select {
    display: flex;
    flex-direction: row;
    font-weight: bold;
    font-size: 20px;
    border: none;
    background: transparent;
    width: 100%;
    text-align-last: center;
  }
  .preset-select select:focus {
    outline: none;
  }
  .color-band-name {
    font-size: 8px;
    text-align: center;
  }
  .red-color, .red-color select {
    border-color: #C21807;
    color: #C21807;
  }
  .green-color, .green-color select {
    border-color: #0b6623;
    color: #0b6623;
  }
  .blue-color, .blue-color select {
    border-color: #1034A6;
    color: #1034A6;
  }
  .alpha-color, .alpha-color select {
    border-color: rgba(0, 0, 0, .3);
    color: rgba(0, 0, 0, .3);
  }
  .palette-color, .palette-color select {
    border-color: black;
    color: black;
  }
  .gray-color, .gray-color select {
    border-color: gray;
    color: gray;
  }
  .text-box {
    height: 32px;
    font-size: 15px;
  }
  .text-box-label {
    font-size: 12px;
    text-align: center;
    padding-right: 8px;
    padding-bottom: 8px;
    padding-top: 8px;
    margin-bottom: 8px;
  }
</style>
