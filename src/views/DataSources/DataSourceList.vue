<template>
  <v-sheet>
    <v-list class="pa-0" v-if="items">
      <template v-for="item in items">
        <v-list-item
          :key="item.id + 'list-item'"
          @click="item.click"
        >
          <v-list-item-icon class="mt-auto mb-auto">
            <v-btn
              icon
              color="whitesmoke"
              @click="item.zoomTo"
            >
              <img v-if="item.isTile && $vuetify.theme.dark" src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
              <img v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
              <img v-else-if="item.isTile" src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
              <img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title :title="item.name" :style="{marginBottom: '0px', fontWeight: 500}" v-html="item.name"></v-list-item-title>
            <v-list-item-subtitle v-if="item.type != null" v-html="item.type"></v-list-item-subtitle>
            <v-list-item-subtitle v-if="item.subtitle != null" v-html="item.subtitle"></v-list-item-subtitle>
            <v-list-item-subtitle v-if="item.count != null">{{item.count + ' features'}}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-icon class="mt-auto mb-auto" v-if="item.error">
            <data-source-troubleshooting :project-id="projectId" :source="sources[item.id]"></data-source-troubleshooting>
          </v-list-item-icon>
          <v-list-item-icon class="mt-auto mb-auto" v-if="item.missingRaster">
            <geo-t-i-f-f-troubleshooting :project-id="projectId" :source-or-base-map="sources[item.id]"></geo-t-i-f-f-troubleshooting>
          </v-list-item-icon>
          <v-list-item-action>
            <source-visibility-switch :disabled="item.missingRaster" :input-value="item.visible" :project-id="projectId" :source="sources[item.id]"></source-visibility-switch>
          </v-list-item-action>
        </v-list-item>
        <v-divider :key="item.id + 'divider'"></v-divider>
      </template>
    </v-list>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import SourceVisibilitySwitch from './SourceVisibilitySwitch'
import DataSourceTroubleshooting from './DataSourceTroubleshooting'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import { zoomToSource } from '../../lib/leaflet/map/ZoomUtilities'
import { getDisplayText } from '../../lib/layer/LayerTypes'

export default {
    components: {
      GeoTIFFTroubleshooting,
      DataSourceTroubleshooting,
      SourceVisibilitySwitch
    },
    props: {
      sources: Object,
      projectId: String,
      sourceSelected: Function
    },
    computed: {
      items () {
        const _this = this
        const items = []
        Object.keys(this.sources).forEach(key => {
          const source = this.sources[key]
          const sourceId = key
          const zoomTo = (e) => {
            e.stopPropagation()
            zoomToSource(source)
          }
          let subtitle = null
          if (source.layers != null) {
            subtitle = source.layers.filter(l => l.enabled).length === 0 ? 'No layers enabled' : (source.layers.filter(l => l.enabled).length === source.layers.length ? 'All layers enabled' : (source.layers.filter(l => l.enabled).length + ' of ' + source.layers.length + ' layers enabled'))
          }
          items.push({
            id: key,
            missingRaster: window.mapcache.isRasterMissing(source),
            error: source.error,
            visible: source.visible,
            name: isNil(source.displayName) ? source.name : source.displayName,
            path: source.filePath,
            isTile: source.pane === 'tile',
            count: source.count,
            type: getDisplayText(source.sourceType) || getDisplayText(source.layerType),
            subtitle: subtitle,
            click: function () {
              _this.sourceSelected(sourceId)
            },
            zoomTo
          })
        })
        return items
      }
    }
  }
</script>

<style scoped>
</style>
