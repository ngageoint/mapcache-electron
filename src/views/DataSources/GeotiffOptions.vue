<template>
  <v-sheet>
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title><b class="ml-2">{{displayName}}</b> Style Editor</v-toolbar-title>
    </v-toolbar>
    <v-card>
      <v-card-text>
        <v-list two-line subheader>
          <v-subheader>Rendering Method</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-select v-model="renderingMethod" :items="renderMethods" label="Rendering Method" dense>
              </v-select>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list two-line subheader v-if="renderingMethod === 0">
          <v-subheader>Gray Scale Options</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-row no-gutters class="ma-0 pa-0">
                <v-select v-model="grayBand" :items="bandOptions" label="Gray Scale Band" dense>
                </v-select>
              </v-row>
              <v-row no-gutters v-if="grayBand > 0">
                <v-col class="ma-0 pr-1">
                  <v-text-field type="number" label="Min" v-model="grayBandMin" dense></v-text-field>
                </v-col>
                <v-col class="ma-0 pl-1">
                  <v-text-field type="number" label="Max" v-model="grayBandMax" dense></v-text-field>
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-select v-model="grayScaleColorGradient" :items="grayScaleColorGradientItems" label="Color Gradient" dense>
                </v-select>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Stretch Bands to Min/Max
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="stretchToMinMax"></v-switch>
            </v-list-item-action>
          </v-list-item>
        </v-list>
        <v-list two-line subheader v-if="renderingMethod === 1">
          <v-subheader>RGB Options</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-row no-gutters class="ma-0 pa-0">
                <v-select v-model="redBand" :items="bandOptions" label="Red Band" dense>
                </v-select>
              </v-row>
              <v-row no-gutters v-if="redBand > 0">
                <v-col class="ma-0 pr-1">
                  <v-text-field type="number" label="Min" v-model="redBandMin" dense></v-text-field>
                </v-col>
                <v-col class="ma-0 pl-1">
                  <v-text-field type="number" label="Max" v-model="redBandMax" dense></v-text-field>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-row no-gutters class="ma-0 pa-0">
                <v-select v-model="greenBand" :items="bandOptions" label="Green Band" dense>
                </v-select>
              </v-row>
              <v-row no-gutters v-if="greenBand > 0">
                <v-col class="ma-0 pr-1">
                  <v-text-field type="number" label="Min" v-model="greenBandMin" dense></v-text-field>
                </v-col>
                <v-col class="ma-0 pl-1">
                  <v-text-field type="number" label="Max" v-model="greenBandMax" dense></v-text-field>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-row no-gutters class="ma-0 pa-0">
                <v-select v-model="blueBand" :items="bandOptions" label="Blue Band" dense>
                </v-select>
              </v-row>
              <v-row no-gutters v-if="blueBand > 0">
                <v-col class="ma-0 pr-1">
                  <v-text-field type="number" label="Min" v-model="blueBandMin" dense></v-text-field>
                </v-col>
                <v-col class="ma-0 pl-1">
                  <v-text-field type="number" label="Max" v-model="blueBandMax" dense></v-text-field>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Stretch Bands to Min/Max
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="stretchToMinMax"></v-switch>
            </v-list-item-action>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list two-line subheader v-if="renderingMethod === 2">
          <v-subheader>Palette Options</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-select v-model="paletteBand" :items="bandOptions" label="Palette Band" dense>
              </v-select>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list two-line subheader>
          <v-subheader>Transparency Options</v-subheader>
          <v-list-item v-if="renderingMethod < 2">
            <v-list-item-content style="padding-right: 12px;">
              <v-select v-model="alphaBand" :items="bandOptions" label="Alpha Band" dense>
              </v-select>
            </v-list-item-content>
          </v-list-item>
          <v-list-item v-if="renderingMethod < 2">
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Specify No Data Value
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="enableGlobalNoDataValue"></v-switch>
            </v-list-item-action>
          </v-list-item>
          <v-list-item v-if="renderingMethod < 2 && enableGlobalNoDataValue">
            <v-list-item-content style="padding-right: 12px;">
              <v-text-field type="number" label="NO_DATA Value" v-model="globalNoDataValue" dense hide-details></v-text-field>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Enable opacity
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="enableGlobalOpacity"></v-switch>
            </v-list-item-action>
          </v-list-item>
          <v-list-item v-if="enableGlobalOpacity">
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Opacity Mask
            </v-list-item-content>
            <v-slider class="mx-auto" hide-details dense v-model="globalOpacity" :min="0" :max="100" :interval="1"></v-slider>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-sheet>
</template>

<script>
  import _ from 'lodash'
  import ActionUtilities from '../../lib/ActionUtilities'

  export default {
    data () {
      return {
        globalNoDataValue: this.source.globalNoDataValue,
        globalOpacity: this.source.globalOpacity
      }
    },
    created () {
      this.debounceLayerField = _.debounce((value, key) => {
        if (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer[key] = value
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      }, 500)
    },
    props: {
      source: Object,
      projectId: String,
      back: Function
    },
    computed: {
      grayScaleColorGradientItems () {
        return [{text: 'White is zero', value: 0}, {text: 'Black is zero', value: 1}]
      },
      displayName () {
        return this.source.displayName ? this.source.displayName : this.source.name
      },
      bandOptions () {
        return this.source.bandOptions.map(band => {
          return {text: band.name, value: band.value}
        })
      },
      renderingMethod: {
        get () {
          return this.source.renderingMethod
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.renderingMethod = value
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      redBand: {
        get () {
          return this.source.redBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.redBand = Number(value)
          updatedLayer.redBandMin = this.source.bandOptions[updatedLayer.redBand].min
          updatedLayer.redBandMax = this.source.bandOptions[updatedLayer.redBand].max
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      redBandMin: {
        get () {
          return this.source.redBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'redBandMin')
        }
      },
      redBandMax: {
        get () {
          return this.source.redBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'redBandMax')
        }
      },
      greenBand: {
        get () {
          return this.source.greenBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.greenBand = Number(value)
          updatedLayer.greenBandMin = this.source.bandOptions[updatedLayer.greenBand].min
          updatedLayer.greenBandMax = this.source.bandOptions[updatedLayer.greenBand].max
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      greenBandMin: {
        get () {
          return this.source.greenBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'greenBandMin')
        }
      },
      greenBandMax: {
        get () {
          return this.source.greenBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'greenBandMax')
        }
      },
      blueBand: {
        get () {
          return this.source.blueBand
        },
        set (value) {
          let updatedLayer = _.cloneDeep(this.source)
          updatedLayer.blueBand = Number(value)
          updatedLayer.blueBandMin = this.source.bandOptions[updatedLayer.blueBand].min
          updatedLayer.blueBandMax = this.source.bandOptions[updatedLayer.blueBand].max
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      blueBandMin: {
        get () {
          return this.source.blueBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'blueBandMin')
        }
      },
      blueBandMax: {
        get () {
          return this.source.blueBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'blueBandMax')
        }
      },
      grayBand: {
        get () {
          return this.source.grayBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.grayBand = Number(value)
          updatedLayer.grayBandMin = this.source.bandOptions[updatedLayer.grayBand].min
          updatedLayer.grayBandMax = this.source.bandOptions[updatedLayer.grayBand].max
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      grayBandMin: {
        get () {
          return this.source.grayBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'grayBandMin')
        }
      },
      grayBandMax: {
        get () {
          return this.source.grayBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'grayBandMax')
        }
      },
      paletteBand: {
        get () {
          return this.source.paletteBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.paletteBand = Number(value)
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      alphaBand: {
        get () {
          return this.source.alphaBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.alphaBand = Number(value)
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      grayScaleColorGradient: {
        get () {
          return this.source.grayScaleColorGradient
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.grayScaleColorGradient = Number(value)
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      enableGlobalNoDataValue: {
        get () {
          return this.source.enableGlobalNoDataValue
        },
        set () {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.enableGlobalNoDataValue = !this.source.enableGlobalNoDataValue
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      enableGlobalOpacity: {
        get () {
          return this.source.enableGlobalOpacity
        },
        set () {
          let updatedLayer = _.cloneDeep(this.source)
          updatedLayer.enableGlobalOpacity = !this.source.enableGlobalOpacity
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      },
      renderMethods () {
        let methods = []
        if (this.source.colorMap) {
          methods.push({text: 'Palette', value: 2})
        } else {
          methods.push({text: 'Gray Scale', value: 0})
          methods.push({text: 'RGB', value: 1})
        }
        return methods
      },
      stretchToMinMax: {
        get () {
          return this.source.stretchToMinMax
        },
        set () {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer.stretchToMinMax = !this.source.stretchToMinMax
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      }
    },
    methods: {
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
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
</style>
