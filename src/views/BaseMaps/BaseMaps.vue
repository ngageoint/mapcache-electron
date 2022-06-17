<template>
  <add-base-map v-if="addBaseMapDialog" :base-maps="baseMaps" :project="project"
                :close="() => {addBaseMapDialog = false}"></add-base-map>
  <base-map v-else-if="selectedBaseMap !== null && selectedBaseMap !== undefined" :project="project"
            :base-map="selectedBaseMap" :base-maps="baseMaps" :back="hideBaseMap"></base-map>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        dark
        flat
        class="sticky-toolbar"
    >
      <v-btn icon @click="back">
        <v-icon large>{{ mdiChevronLeft }}</v-icon>
      </v-btn>
      <v-toolbar-title>Base maps</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <v-list class="pa-0">
        <template v-for="item in baseMapItems">
          <v-list-item :key="item.id + '-base-map'" @click="() => showBaseMap(item.id)">
            <v-list-item-icon class="mt-auto mb-auto">
              <v-btn
                  icon
                  color="whitesmoke"
                  @click="(e) => item.zoomTo(e, project.id)"
              >
                <v-icon>{{ mdiMapOutline }}</v-icon>
              </v-btn>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :title="item.name" :style="{marginBottom: '0px'}" v-text="item.name"></v-list-item-title>
              <v-list-item-subtitle v-if="item.type != null" v-text="item.type"></v-list-item-subtitle>
              <v-list-item-subtitle v-if="item.subtitle != null" v-text="item.subtitle"></v-list-item-subtitle>
              <v-list-item-subtitle v-if="item.count != null">{{ item.count + ' features' }}</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-icon class="mt-auto mb-auto" v-if="item.baseMap.error">
              <base-map-troubleshooting :base-map="item.baseMap"></base-map-troubleshooting>
            </v-list-item-icon>
            <v-list-item-icon class="mt-auto mb-auto" v-if="item.missingRaster">
              <geo-t-i-f-f-troubleshooting :source-or-base-map="item.baseMap"></geo-t-i-f-f-troubleshooting>
            </v-list-item-icon>
          </v-list-item>
          <v-divider :key="item.id + 'divider'"></v-divider>
        </template>
      </v-list>
    </v-sheet>
    <v-tooltip right :disabled="!project.showToolTips">
      <template v-slot:activator="{ on, attrs }">
        <div class="fab-position" v-bind="attrs" v-on="on">
          <v-btn
              :disabled="projectLayerCount === 0"
              fab
              color="primary"
              @click.stop="showAddBaseMapDialog">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                 preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24">
              <defs>
                <path
                    d="M20.35 14.85L20.35 14.85L20.36 14.85L20.36 14.86L20.37 14.86L20.37 14.86L20.38 14.86L20.39 14.86L20.39 14.87L20.4 14.87L20.4 14.87L20.4 14.87L20.41 14.88L20.41 14.88L20.42 14.88L20.42 14.89L20.43 14.89L20.43 14.89L20.43 14.9L20.44 14.9L20.44 14.91L20.44 14.91L20.45 14.91L20.45 14.92L20.45 14.92L20.46 14.93L20.46 14.93L20.46 14.94L20.46 14.94L20.46 14.95L20.47 14.95L20.47 14.96L20.47 14.97L20.47 14.97L20.47 14.98L20.47 14.98L20.47 14.99L20.47 14.99L20.47 17.83L23.31 17.83L23.31 17.83L23.32 17.83L23.32 17.83L23.33 17.83L23.33 17.83L23.34 17.83L23.34 17.83L23.35 17.83L23.36 17.84L23.36 17.84L23.37 17.84L23.37 17.84L23.37 17.85L23.38 17.85L23.38 17.85L23.39 17.85L23.39 17.86L23.4 17.86L23.4 17.86L23.41 17.87L23.41 17.87L23.41 17.88L23.42 17.88L23.42 17.89L23.42 17.89L23.43 17.89L23.43 17.9L23.43 17.9L23.43 17.91L23.44 17.91L23.44 17.92L23.44 17.92L23.44 17.93L23.44 17.93L23.44 17.94L23.44 17.95L23.45 17.95L23.45 17.96L23.45 17.96L23.45 17.97L23.45 20.24L23.45 20.24L23.45 20.25L23.45 20.25L23.44 20.26L23.44 20.26L23.44 20.27L23.44 20.27L23.44 20.28L23.44 20.29L23.44 20.29L23.43 20.3L23.43 20.3L23.43 20.31L23.43 20.31L23.42 20.31L23.42 20.32L23.42 20.32L23.41 20.33L23.41 20.33L23.41 20.34L23.4 20.34L23.4 20.34L23.39 20.35L23.39 20.35L23.38 20.35L23.38 20.36L23.37 20.36L23.37 20.36L23.37 20.36L23.36 20.37L23.36 20.37L23.35 20.37L23.34 20.37L23.34 20.37L23.33 20.37L23.33 20.38L23.32 20.38L23.32 20.38L23.31 20.38L23.31 20.38L20.47 20.38L20.47 23.21L20.47 23.22L20.47 23.22L20.47 23.23L20.47 23.23L20.47 23.24L20.47 23.24L20.47 23.25L20.46 23.26L20.46 23.26L20.46 23.27L20.46 23.27L20.46 23.28L20.45 23.28L20.45 23.28L20.45 23.29L20.44 23.29L20.44 23.3L20.44 23.3L20.43 23.31L20.43 23.31L20.43 23.31L20.42 23.32L20.42 23.32L20.41 23.32L20.41 23.33L20.4 23.33L20.4 23.33L20.4 23.34L20.39 23.34L20.39 23.34L20.38 23.34L20.37 23.34L20.37 23.35L20.36 23.35L20.36 23.35L20.35 23.35L20.35 23.35L20.34 23.35L20.34 23.35L20.33 23.35L18.06 23.35L18.06 23.35L18.05 23.35L18.05 23.35L18.04 23.35L18.03 23.35L18.03 23.35L18.02 23.35L18.02 23.34L18.01 23.34L18.01 23.34L18 23.34L18 23.34L17.99 23.33L17.99 23.33L17.98 23.33L17.98 23.32L17.98 23.32L17.97 23.32L17.97 23.31L17.96 23.31L17.96 23.31L17.96 23.3L17.95 23.3L17.95 23.29L17.95 23.29L17.94 23.28L17.94 23.28L17.94 23.28L17.94 23.27L17.93 23.27L17.93 23.26L17.93 23.26L17.93 23.25L17.93 23.24L17.92 23.24L17.92 23.23L17.92 23.23L17.92 23.22L17.92 23.22L17.92 23.21L17.92 20.38L15.09 20.38L15.08 20.38L15.08 20.38L15.07 20.38L15.07 20.38L15.06 20.37L15.05 20.37L15.05 20.37L15.04 20.37L15.04 20.37L15.03 20.37L15.03 20.36L15.02 20.36L15.02 20.36L15.01 20.36L15.01 20.35L15 20.35L15 20.35L15 20.34L14.99 20.34L14.99 20.34L14.98 20.33L14.98 20.33L14.98 20.32L14.97 20.32L14.97 20.31L14.97 20.31L14.97 20.31L14.96 20.3L14.96 20.3L14.96 20.29L14.96 20.29L14.95 20.28L14.95 20.27L14.95 20.27L14.95 20.26L14.95 20.26L14.95 20.25L14.95 20.25L14.95 20.24L14.95 20.24L14.95 17.97L14.95 17.96L14.95 17.96L14.95 17.95L14.95 17.95L14.95 17.94L14.95 17.93L14.95 17.93L14.95 17.92L14.96 17.92L14.96 17.91L14.96 17.91L14.96 17.9L14.97 17.9L14.97 17.89L14.97 17.89L14.97 17.89L14.98 17.88L14.98 17.88L14.98 17.87L14.99 17.87L14.99 17.86L15 17.86L15 17.86L15 17.85L15.01 17.85L15.01 17.85L15.02 17.85L15.02 17.84L15.03 17.84L15.03 17.84L15.04 17.84L15.04 17.83L15.05 17.83L15.05 17.83L15.06 17.83L15.07 17.83L15.07 17.83L15.08 17.83L15.08 17.83L15.09 17.83L17.92 17.83L17.92 14.99L17.92 14.99L17.92 14.98L17.92 14.98L17.92 14.97L17.92 14.97L17.93 14.96L17.93 14.95L17.93 14.95L17.93 14.94L17.93 14.94L17.94 14.93L17.94 14.93L17.94 14.92L17.94 14.92L17.95 14.91L17.95 14.91L17.95 14.91L17.96 14.9L17.96 14.9L17.96 14.89L17.97 14.89L17.97 14.89L17.98 14.88L17.98 14.88L17.98 14.88L17.99 14.87L17.99 14.87L18 14.87L18 14.87L18.01 14.86L18.01 14.86L18.02 14.86L18.02 14.86L18.03 14.86L18.03 14.85L18.04 14.85L18.05 14.85L18.05 14.85L18.06 14.85L18.06 14.85L20.33 14.85L20.34 14.85L20.34 14.85L20.34 14.85L20.35 14.85ZM20.61 2.95L20.65 2.96L20.69 2.97L20.72 2.99L20.75 3.01L20.78 3.03L20.81 3.05L20.84 3.07L20.87 3.1L20.89 3.12L20.91 3.15L20.93 3.19L20.95 3.22L20.96 3.25L20.98 3.29L20.99 3.32L20.99 3.36L21 3.4L21 3.44L21 13.28L20.91 13.25L20.82 13.22L20.73 13.19L20.64 13.16L20.54 13.14L20.45 13.11L20.36 13.09L20.26 13.07L20.17 13.05L20.07 13.03L19.98 13.02L19.88 13L19.79 12.99L19.69 12.98L19.59 12.97L19.49 12.96L19.4 12.95L19.3 12.94L19.2 12.94L19.1 12.94L19 12.94L19 5.64L16 6.8L16 13.74L15.89 13.81L15.77 13.88L15.66 13.95L15.55 14.02L15.45 14.1L15.34 14.18L15.24 14.26L15.13 14.35L15.03 14.43L14.94 14.52L14.84 14.61L14.75 14.7L14.65 14.8L14.56 14.89L14.48 14.99L14.39 15.09L14.31 15.19L14.23 15.3L14.15 15.4L14.07 15.51L14 15.62L14 6.81L10 5.41L10 17.07L13.05 18.14L13 18.94L13 19L13 19.07L13 19.13L13.01 19.2L13.01 19.27L13.01 19.33L13.02 19.4L13.02 19.46L13.03 19.53L13.03 19.59L13.04 19.66L13.05 19.72L13.06 19.78L13.07 19.85L13.08 19.91L13.09 19.98L13.1 20.04L13.11 20.1L13.12 20.16L13.14 20.23L13.15 20.29L9 18.84L3.66 20.91L3.5 20.94L3.46 20.94L3.42 20.93L3.39 20.92L3.35 20.91L3.31 20.9L3.28 20.89L3.25 20.87L3.22 20.85L3.19 20.83L3.16 20.8L3.13 20.78L3.11 20.75L3.09 20.72L3.07 20.69L3.05 20.66L3.04 20.62L3.02 20.59L3.01 20.55L3.01 20.51L3 20.48L3 20.44L3 5.32L3 5.28L3 5.25L3.01 5.22L3.02 5.19L3.02 5.16L3.03 5.13L3.05 5.11L3.06 5.08L3.08 5.05L3.09 5.03L3.11 5.01L3.13 4.98L3.15 4.96L3.17 4.94L3.2 4.92L3.22 4.91L3.25 4.89L3.27 4.87L3.3 4.86L3.33 4.85L3.36 4.84L9 2.94L15 5.04L20.34 2.97L20.5 2.94L20.54 2.94L20.58 2.94L20.58 2.94L20.61 2.95ZM8 17.09L8 5.39L5 6.4L5 18.25L5 18.25L8 17.09Z"
                    id="d4Lnycg7d"></path>
              </defs>
              <g>
                <g>
                  <g>
                    <use xlink:href="#d4Lnycg7d" opacity="1" :fill="projectLayerCount === 0 ? '#000000' : '#ffffff'"
                         :fill-opacity="projectLayerCount === 0 ? .26 : 1"></use>
                    <g>
                      <use xlink:href="#d4Lnycg7d" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1"
                           stroke-opacity="0"></use>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </v-btn>
        </div>
      </template>
      <span>{{ projectLayerCount === 0 ? 'No data sources or GeoPackage layers found' : 'Add base map' }}</span>
    </v-tooltip>
  </v-sheet>
</template>

<script>
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import values from 'lodash/values'
import keys from 'lodash/keys'
import AddBaseMap from './AddBaseMap'
import BaseMap from './BaseMap'
import BaseMapTroubleshooting from './BaseMapTroubleshooting'
import { mdiChevronLeft, mdiMapOutline } from '@mdi/js'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import { zoomToBaseMap } from '../../lib/leaflet/map/ZoomUtilities'
import { getDefaultBaseMaps } from '../../lib/util/basemaps/BaseMapUtilities'
import { getDisplayText } from '../../lib/layer/LayerTypes'

export default {
  components: {
    GeoTIFFTroubleshooting,
    BaseMapTroubleshooting,
    AddBaseMap,
    BaseMap
  },
  props: {
    project: Object,
    back: Function
  },
  computed: {
    ...mapState({
      baseMaps: state => {
        return getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || [])
      },
      baseMapItems: state => {
        return getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || []).map(baseMap => {
          let subtitle = null
          let count = null
          let type = null
          if (baseMap.layerConfiguration != null) {
            count = baseMap.layerConfiguration.count
            if (baseMap.layerConfiguration.layers != null) {
              subtitle = baseMap.layerConfiguration.layers.filter(l => l.enabled).length === 0 ? 'No layers enabled' : (baseMap.layerConfiguration.layers.filter(l => l.enabled).length === baseMap.layerConfiguration.layers.length ? 'All layers enabled' : (baseMap.layerConfiguration.layers.filter(l => l.enabled).length + ' of ' + baseMap.layerConfiguration.layers.length + ' layers enabled'))
            }
            type = getDisplayText(baseMap.layerConfiguration.sourceType) || getDisplayText(baseMap.layerConfiguration.layerType)
          }
          return {
            id: baseMap.id,
            baseMap: baseMap,
            name: baseMap.name,
            subtitle: subtitle,
            count: count,
            type: type,
            readonly: baseMap.readonly,
            missingRaster: window.mapcache.isRasterMissing(baseMap.layerConfiguration),
            background: baseMap.background || '#ddd',
            zoomTo: function (e) {
              e.stopPropagation()
              e.preventDefault()
              zoomToBaseMap(baseMap)
            }
          }
        })
      }
    }),
    projectLayerCount () {
      return keys(this.project.geopackages).reduce((accumulator, geopackage) => accumulator + keys(this.project.geopackages[geopackage].tables.features).length + keys(this.project.geopackages[geopackage].tables.tiles).length, 0) + values(this.project.sources).length
    }
  },
  data () {
    return {
      mdiChevronLeft: mdiChevronLeft,
      mdiMapOutline: mdiMapOutline,
      addBaseMapDialog: false,
      selectedBaseMap: null
    }
  },
  methods: {
    async showAddBaseMapDialog () {
      this.addBaseMapDialog = true
    },
    showBaseMap (baseMapId) {
      this.selectedBaseMap = this.baseMaps.find(baseMap => baseMap.id === baseMapId)
    },
    hideBaseMap () {
      this.selectedBaseMap = null
    }
  },
  watch: {
    baseMaps: {
      handler (newBaseMaps) {
        if (!isNil(this.selectedBaseMap)) {
          this.selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === this.selectedBaseMap.id)
        }
      }
    }
  }
}
</script>

<style scoped>
</style>
