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
          <v-subheader>Rendering method</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-select v-model="renderingMethod" :items="renderMethods" label="Rendering Method" dense>
              </v-select>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list two-line subheader v-if="renderingMethod === 0">
          <v-subheader>Gray scale options</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-row no-gutters class="ma-0 pa-0">
                <v-select v-model="grayBand" :items="bandOptions" label="Gray scale band" dense>
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
                <v-select v-model="grayScaleColorGradient" :items="grayScaleColorGradientItems" label="Color gradient" dense>
                </v-select>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Stretch bands to min/max
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="stretchToMinMax"></v-switch>
            </v-list-item-action>
          </v-list-item>
        </v-list>
        <v-list two-line subheader v-if="renderingMethod === 1">
          <v-subheader>RGB options</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-row no-gutters class="ma-0 pa-0">
                <v-select v-model="redBand" :items="bandOptions" label="Red band" dense>
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
                <v-select v-model="greenBand" :items="bandOptions" label="Green band" dense>
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
                <v-select v-model="blueBand" :items="bandOptions" label="Blue band" dense>
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
              Stretch bands to min/max
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="stretchToMinMax"></v-switch>
            </v-list-item-action>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list two-line subheader v-if="renderingMethod === 2">
          <v-subheader>Palette options</v-subheader>
          <v-list-item>
            <v-list-item-content style="padding-right: 12px;">
              <v-select v-model="paletteBand" :items="bandOptions" label="Palette band" dense>
              </v-select>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <v-divider></v-divider>
        <v-list two-line subheader>
          <v-subheader>Transparency options</v-subheader>
          <v-list-item v-if="renderingMethod < 2">
            <v-list-item-content style="padding-right: 12px;">
              <v-select v-model="alphaBand" :items="bandOptions" label="Alpha band" dense>
              </v-select>
            </v-list-item-content>
          </v-list-item>
          <v-list-item v-if="renderingMethod < 2">
            <v-list-item-content style="padding-right: 12px; padding-top: 0; padding-bottom: 0;">
              Specify No Data value
            </v-list-item-content>
            <v-list-item-action>
              <v-switch color="primary" v-model="enableGlobalNoDataValue"></v-switch>
            </v-list-item-action>
          </v-list-item>
          <v-list-item v-if="renderingMethod < 2 && enableGlobalNoDataValue">
            <v-list-item-content style="padding-right: 12px;">
              <v-text-field type="number" label="NO_DATA value" v-model="globalNoDataValue" dense hide-details></v-text-field>
            </v-list-item-content>
          </v-list-item>
          <v-list-item class="pt-2">
            <v-list-item-content style="max-width: 100px; padding-right: 0px; padding-top: 0; padding-bottom: 0;">
              Opacity
            </v-list-item-content>
            <v-slider class="mx-auto" thumb-label="always" hide-details dense v-model="opacity" :min="0" :max="100" :interval="1">
              <template v-slot:thumb-label="{ value }">
                {{ value / 100.0 }}
              </template>
            </v-slider>
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
        globalNoDataValue: this.source.globalNoDataValue
      }
    },
    created () {
      this.debounceLayerField = _.debounce((value, key) => {
        if (!_.isNil(value)) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer[key] = value
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      }, 250)
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
      opacity: {
        get () {
          return (this.source.opacity === null || this.source.opacity === undefined ? 1.0 : this.source.opacity) * 100.0
        },
        set (value) {
          this.debounceLayerField(Number(value) / 100.0, 'opacity')
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
      renderMethods () {
        let methods = []
        if (this.source.colorMap) {
          methods.push({text: 'Palette', value: 2})
        } else if (this.source.photometricInterpretation === 6) {
          methods.push({text: 'YCbCr', value: 3})
        } else if (this.source.photometricInterpretation === 5) {
          methods.push({text: 'CMYK', value: 4})
        } else if (this.source.photometricInterpretation === 8) {
          methods.push({text: 'CIELab', value: 5})
        } else {
          methods.push({text: 'Gray scale', value: 0})
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
      }
    }
  }
</script>

<style scoped>
</style>
