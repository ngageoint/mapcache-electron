<template>
  <v-list subheader>
    <v-dialog
      v-model="showPointStyleEditor"
      max-width="400"
      persistent
      @keydown.esc="showPointStyleEditor = false">
      <m-b-style-editor title="Point style" :geometryType="1" :styleObject="configuration.pointStyle" :save="updatePointStyle" :close="() => {showPointStyleEditor = false}"></m-b-style-editor>
    </v-dialog>
    <v-dialog
      v-model="showLineStringStyleEditor"
      max-width="400"
      persistent
      @keydown.esc="showLineStringStyleEditor = false">
      <m-b-style-editor title="Line style" :geometryType="2" :styleObject="configuration.lineStyle" :save="updateLineStringStyle" :close="() => {showLineStringStyleEditor = false}"></m-b-style-editor>
    </v-dialog>
    <v-dialog
      v-model="showPolygonStyleEditor"
      max-width="400"
      persistent
      @keydown.esc="showPolygonStyleEditor = false">
      <m-b-style-editor title="Polygon style" :geometryType="3" :styleObject="configuration.polygonStyle" :save="updatePolygonStyle" :close="() => {showPolygonStyleEditor = false}"></m-b-style-editor>
    </v-dialog>
    <v-subheader>Vector styling</v-subheader>
    <v-list-item class="pt-2">
      <v-list-item-content>
        <v-row no-gutters justify="space-between" align="center">
          <v-col cols="8">
            Point
          </v-col>
          <v-btn icon @click="showPointStyleEditor = true"><geometry-style-svg :geometry-type="1" :color="configuration.pointStyle.color" :fill-color="configuration.pointStyle.fillColor" :fill-opacity="configuration.pointStyle.fillOpacity"/></v-btn>
        </v-row>
      </v-list-item-content>
    </v-list-item>
    <v-list-item class="pt-2">
      <v-list-item-content>
        <v-row no-gutters justify="space-between" align="center">
          <v-col cols="8">
            Line
          </v-col>
          <v-btn icon @click="showLineStringStyleEditor = true"><geometry-style-svg :geometry-type="2" :color="configuration.lineStyle.color" :fill-color="configuration.lineStyle.fillColor" :fill-opacity="configuration.lineStyle.fillOpacity"/></v-btn>
        </v-row>
      </v-list-item-content>
    </v-list-item>
    <v-list-item class="pt-2">
      <v-list-item-content>
        <v-row no-gutters justify="space-between" align="center">
          <v-col cols="8">
            Polygon
          </v-col>
          <v-btn icon @click="showPolygonStyleEditor = true"><geometry-style-svg :geometry-type="3" :color="configuration.polygonStyle.color" :fill-color="configuration.polygonStyle.fillColor" :fill-opacity="configuration.polygonStyle.fillOpacity"/></v-btn>
        </v-row>
      </v-list-item-content>
    </v-list-item>
  </v-list>
</template>

<script>
import debounce from 'lodash/debounce'
import isNil from 'lodash/isNil'
import MBStyleEditor from './MBStyleEditor'
import GeometryStyleSvg from '../GeometryStyleSvg'

export default {
    components: {
      GeometryStyleSvg,
      MBStyleEditor
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
    data () {
      return {
        showPointStyleEditor: false,
        showLineStringStyleEditor: false,
        showPolygonStyleEditor: false,
      }
    },
    props: {
      configuration: Object,
      updateConfiguration: Function
    },
    methods: {
      updatePointStyle (style) {
        let updatedConfiguration = Object.assign({}, this.configuration)
        updatedConfiguration.pointStyle = style
        this.updateConfiguration(updatedConfiguration)
        this.$nextTick(() => {
          this.showPointStyleEditor = false
        })
      },
      updateLineStringStyle (style) {
        let updatedConfiguration = Object.assign({}, this.configuration)
        updatedConfiguration.lineStyle = style
        this.updateConfiguration(updatedConfiguration)
        this.$nextTick(() => {
          this.showLineStringStyleEditor = false
        })
      },
      updatePolygonStyle (style) {
        let updatedConfiguration = Object.assign({}, this.configuration)
        updatedConfiguration.polygonStyle = style
        this.updateConfiguration(updatedConfiguration)
        this.$nextTick(() => {
          this.showPolygonStyleEditor = false
        })
      }
    }
  }
</script>

<style scoped>
</style>
