<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title><b class="ml-2">{{displayName}}</b> Style Editor</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-dialog
        v-model="showPointStyleEditor"
        max-width="400"
        persistent
        @keydown.esc="showPointStyleEditor = false">
        <m-b-style-editor title="Point Style" :geometryType="1" :styleObject="source.pointStyle" :save="updatePointStyle" :close="() => {showPointStyleEditor = false}"></m-b-style-editor>
      </v-dialog>
      <v-dialog
        v-model="showLineStringStyleEditor"
        max-width="400"
        persistent
        @keydown.esc="showLineStringStyleEditor = false">
        <m-b-style-editor title="Point Style" :geometryType="2" :styleObject="source.lineStyle" :save="updateLineStringStyle" :close="() => {showLineStringStyleEditor = false}"></m-b-style-editor>
      </v-dialog>
      <v-dialog
        v-model="showPolygonStyleEditor"
        max-width="400"
        persistent
        @keydown.esc="showPolygonStyleEditor = false">
        <m-b-style-editor title="Point Style" :geometryType="3" :styleObject="source.polygonStyle" :save="updatePolygonStyle" :close="() => {showPolygonStyleEditor = false}"></m-b-style-editor>
      </v-dialog>
      <v-card flat tile v-if="source.format === 'pbf'">
        <v-card-text>
          <v-list subheader>
            <v-subheader>Vector Styling</v-subheader>
            <v-list-item class="pt-2">
              <v-list-item-content>
                <v-row no-gutters justify="space-between" align="center">
                  <v-col cols="8">
                    Point
                  </v-col>
                  <v-btn icon @click="showPointStyleEditor = true"><geometry-style-svg :geometry-type="1" :color="source.pointStyle.color" :fill-color="source.pointStyle.fillColor" :fill-opacity="source.pointStyle.fillOpacity"/></v-btn>
                </v-row>
              </v-list-item-content>
            </v-list-item>
            <v-list-item class="pt-2">
              <v-list-item-content>
                <v-row no-gutters justify="space-between" align="center">
                  <v-col cols="8">
                    Line
                  </v-col>
                  <v-btn icon @click="showLineStringStyleEditor = true"><geometry-style-svg :geometry-type="2" :color="source.lineStyle.color" :fill-color="source.lineStyle.fillColor" :fill-opacity="source.lineStyle.fillOpacity"/></v-btn>
                </v-row>
              </v-list-item-content>
            </v-list-item>
            <v-list-item class="pt-2">
              <v-list-item-content>
                <v-row no-gutters justify="space-between" align="center">
                  <v-col cols="8">
                    Polygon
                  </v-col>
                  <v-btn icon @click="showPolygonStyleEditor = true"><geometry-style-svg :geometry-type="3" :color="source.polygonStyle.color" :fill-color="source.polygonStyle.fillColor" :fill-opacity="source.polygonStyle.fillOpacity"/></v-btn>
                </v-row>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
      <v-card flat tile>
        <v-card-text>
          <v-list two-line subheader>
            <v-subheader>Transparency</v-subheader>
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
  </v-sheet>
</template>

<script>
  import _ from 'lodash'
  import ActionUtilities from '../../lib/ActionUtilities'
  import MBStyleEditor from './MBStyleEditor'
  import GeometryStyleSvg from '../Common/GeometryStyleSvg'

  export default {
    components: {
      GeometryStyleSvg,
      MBStyleEditor
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
    data () {
      return {
        showPointStyleEditor: false,
        showLineStringStyleEditor: false,
        showPolygonStyleEditor: false,
      }
    },
    props: {
      source: Object,
      projectId: String,
      back: Function
    },
    computed: {
      displayName () {
        return this.source.displayName ? this.source.displayName : this.source.name
      },
      opacity: {
        get () {
          return (this.source.opacity === null || this.source.opacity === undefined ? 1.0 : this.source.opacity) * 100.0
        },
        set (value) {
          this.debounceLayerField(Number(value) / 100.0, 'opacity')
        }
      }
    },
    methods: {
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      },
      updatePointStyle (style) {
        let updatedLayer = Object.assign({}, this.source)
        updatedLayer.pointStyle = style
        ActionUtilities.setDataSource({
          projectId: this.projectId,
          source: updatedLayer
        })
        this.$nextTick(() => {
          this.showPointStyleEditor = false
        })
      },
      updateLineStringStyle (style) {
        let updatedLayer = Object.assign({}, this.source)
        updatedLayer.lineStyle = style
        ActionUtilities.setDataSource({
          projectId: this.projectId,
          source: updatedLayer
        })
        this.$nextTick(() => {
          this.showLineStringStyleEditor = false
        })
      },
      updatePolygonStyle (style) {
        let updatedLayer = Object.assign({}, this.source)
        updatedLayer.polygonStyle = style
        ActionUtilities.setDataSource({
          projectId: this.projectId,
          source: updatedLayer
        })
        this.$nextTick(() => {
          this.showPolygonStyleEditor = false
        })
      }
    }
  }
</script>

<style scoped>
</style>
