<template>
  <v-sheet>
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
              <v-text-field type="number" label="Min" v-model="grayBandMin" dense @keydown="handleKeyDown($event)"></v-text-field>
            </v-col>
            <v-col class="ma-0 pl-1">
              <v-text-field type="number" label="Max" v-model="grayBandMax" dense @keydown="handleKeyDown($event)"></v-text-field>
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
              <v-text-field type="number" label="Min" v-model="redBandMin" dense @keydown="handleKeyDown($event)"></v-text-field>
            </v-col>
            <v-col class="ma-0 pl-1">
              <v-text-field type="number" label="Max" v-model="redBandMax" dense @keydown="handleKeyDown($event)"></v-text-field>
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
              <v-text-field type="number" label="Min" v-model="greenBandMin" dense @keydown="handleKeyDown($event)"></v-text-field>
            </v-col>
            <v-col class="ma-0 pl-1">
              <v-text-field type="number" label="Max" v-model="greenBandMax" dense @keydown="handleKeyDown($event)"></v-text-field>
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
              <v-text-field type="number" label="Min" v-model="blueBandMin" dense @keydown="handleKeyDown($event)"></v-text-field>
            </v-col>
            <v-col class="ma-0 pl-1">
              <v-text-field type="number" label="Max" v-model="blueBandMax" dense @keydown="handleKeyDown($event)"></v-text-field>
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
          <v-text-field type="number" label="NO_DATA value" v-model="globalNoDataValue" dense hide-details @keydown="handleKeyDown($event)"></v-text-field>
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
  </v-sheet>
</template>

<script>
import debounce from 'lodash/debounce'
import cloneDeep from 'lodash/cloneDeep'
import isNil from 'lodash/isNil'

export default {
    data () {
      return {
        globalNoDataValue: this.configuration.globalNoDataValue
      }
    },
    created () {
      this.debounceLayerField = debounce((value, key) => {
        if (!isNil(value)) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration[key] = value
          this.updateConfiguration(updatedConfiguration)
        }
      }, 250)
    },
    props: {
      configuration: Object,
      updateConfiguration: Function
    },
    computed: {
      grayScaleColorGradientItems () {
        return [{text: 'White is zero', value: 0}, {text: 'Black is zero', value: 1}]
      },
      bandOptions () {
        return this.configuration.bandOptions.map(band => {
          return {text: band.name, value: band.value}
        })
      },
      renderingMethod: {
        get () {
          return this.configuration.renderingMethod
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.renderingMethod = value
          this.updateConfiguration(updatedConfiguration)
        }
      },
      opacity: {
        get () {
          return (this.configuration.opacity === null || this.configuration.opacity === undefined ? 1.0 : this.configuration.opacity) * 100.0
        },
        set (value) {
          this.debounceLayerField(Number(value) / 100.0, 'opacity')
        }
      },
      redBand: {
        get () {
          return this.configuration.redBand
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.redBand = Number(value)
          updatedConfiguration.redBandMin = this.configuration.bandOptions[updatedConfiguration.redBand].min
          updatedConfiguration.redBandMax = this.configuration.bandOptions[updatedConfiguration.redBand].max
          this.updateConfiguration(updatedConfiguration)
        }
      },
      redBandMin: {
        get () {
          return this.configuration.redBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'redBandMin')
        }
      },
      redBandMax: {
        get () {
          return this.configuration.redBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'redBandMax')
        }
      },
      greenBand: {
        get () {
          return this.configuration.greenBand
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.greenBand = Number(value)
          updatedConfiguration.greenBandMin = this.configuration.bandOptions[updatedConfiguration.greenBand].min
          updatedConfiguration.greenBandMax = this.configuration.bandOptions[updatedConfiguration.greenBand].max
          this.updateConfiguration(updatedConfiguration)
        }
      },
      greenBandMin: {
        get () {
          return this.configuration.greenBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'greenBandMin')
        }
      },
      greenBandMax: {
        get () {
          return this.configuration.greenBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'greenBandMax')
        }
      },
      blueBand: {
        get () {
          return this.configuration.blueBand
        },
        set (value) {
          let updatedConfiguration = cloneDeep(this.configuration)
          updatedConfiguration.blueBand = Number(value)
          updatedConfiguration.blueBandMin = this.configuration.bandOptions[updatedConfiguration.blueBand].min
          updatedConfiguration.blueBandMax = this.configuration.bandOptions[updatedConfiguration.blueBand].max
          this.updateConfiguration(updatedConfiguration)
        }
      },
      blueBandMin: {
        get () {
          return this.configuration.blueBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'blueBandMin')
        }
      },
      blueBandMax: {
        get () {
          return this.configuration.blueBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'blueBandMax')
        }
      },
      grayBand: {
        get () {
          return this.configuration.grayBand
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.grayBand = Number(value)
          updatedConfiguration.grayBandMin = this.configuration.bandOptions[updatedConfiguration.grayBand].min
          updatedConfiguration.grayBandMax = this.configuration.bandOptions[updatedConfiguration.grayBand].max
          this.updateConfiguration(updatedConfiguration)
        }
      },
      grayBandMin: {
        get () {
          return this.configuration.grayBandMin
        },
        set (value) {
          this.debounceLayerField(value, 'grayBandMin')
        }
      },
      grayBandMax: {
        get () {
          return this.configuration.grayBandMax
        },
        set (value) {
          this.debounceLayerField(value, 'grayBandMax')
        }
      },
      paletteBand: {
        get () {
          return this.configuration.paletteBand
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.paletteBand = Number(value)
          this.updateConfiguration(updatedConfiguration)
        }
      },
      alphaBand: {
        get () {
          return this.configuration.alphaBand
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.alphaBand = Number(value)
          this.updateConfiguration(updatedConfiguration)
        }
      },
      grayScaleColorGradient: {
        get () {
          return this.configuration.grayScaleColorGradient
        },
        set (value) {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.grayScaleColorGradient = Number(value)
          this.updateConfiguration(updatedConfiguration)
        }
      },
      enableGlobalNoDataValue: {
        get () {
          return this.configuration.enableGlobalNoDataValue
        },
        set () {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.enableGlobalNoDataValue = !this.configuration.enableGlobalNoDataValue
          this.updateConfiguration(updatedConfiguration)
        }
      },
      renderMethods () {
        let methods = []
        if (this.configuration.colorMap) {
          methods.push({text: 'Palette', value: 2})
        } else if (this.configuration.photometricInterpretation === 6) {
          methods.push({text: 'YCbCr', value: 3})
        } else if (this.configuration.photometricInterpretation === 5) {
          methods.push({text: 'CMYK', value: 4})
        } else if (this.configuration.photometricInterpretation === 8) {
          methods.push({text: 'CIELab', value: 5})
        } else {
          methods.push({text: 'Gray scale', value: 0})
          methods.push({text: 'RGB', value: 1})
        }
        return methods
      },
      stretchToMinMax: {
        get () {
          return this.configuration.stretchToMinMax
        },
        set () {
          let updatedConfiguration = Object.assign({}, this.configuration)
          updatedConfiguration.stretchToMinMax = !this.configuration.stretchToMinMax
          this.updateConfiguration(updatedConfiguration)
        }
      }
    },
    methods: {
      handleKeyDown: (e) => {
        if (e.keyCode === 69) {
          e.stopPropagation()
          e.preventDefault()
          return false
        }
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
