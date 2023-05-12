<template>
  <v-sheet>
    <v-list class="pa-0" lines="three" v-if="items">
      <template v-for="item in items" :key="item.id + 'list-item'">
        <v-list-item
            @click="item.click"
        >
          <template v-slot:prepend>
            <v-btn
                icon
                variant="text"
                color="whitesmoke"
                @click="item.zoomTo"
            >
              <v-img v-if="item.isTile && project.dark" src="/images/white_layers.png" alt="Tile layer" width="22px" height="22px"/>
              <v-img v-else-if="project.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
              <v-img v-else-if="item.isTile" src="/images/colored_layers.png" alt="Tile layer" width="22px" height="22px"/>
              <v-img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
          </template>
          <div class="pl-2">
            <v-list-item-title :title="item.name" :style="{marginBottom: '0px', fontWeight: 500}" v-text="item.name"></v-list-item-title>
            <v-list-item-subtitle v-if="item.type != null" v-text="item.type"></v-list-item-subtitle>
            <v-list-item-subtitle v-if="item.subtitle != null" v-text="item.subtitle"></v-list-item-subtitle>
            <v-list-item-subtitle v-if="item.count != null">{{ item.count + ' features' }}</v-list-item-subtitle>
          </div>
          <template v-slot:append>
            <data-source-warning v-if="sources[item.id] && sources[item.id].warning" :source="sources[item.id]"></data-source-warning>
            <data-source-troubleshooting v-if="item.error" :project-id="project.id" :source="sources[item.id]"></data-source-troubleshooting>
            <geo-t-i-f-f-troubleshooting v-if="item.missingRaster" :project-id="project.id" :source-or-base-map="sources[item.id]"></geo-t-i-f-f-troubleshooting>
            <source-visibility-switch :disabled="item.missingRaster" :model-value="item.visible" :project-id="project.id" :source="sources[item.id]"></source-visibility-switch>
          </template>
        </v-list-item>
        <v-divider/>
      </template>
    </v-list>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import SourceVisibilitySwitch from './SourceVisibilitySwitch.vue'
import DataSourceTroubleshooting from './DataSourceTroubleshooting.vue'
import DataSourceWarning from './DataSourceWarning.vue'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting.vue'
import { zoomToSource } from '../../lib/leaflet/map/ZoomUtilities'
import { getDisplayText } from '../../lib/layer/LayerTypes'

export default {
  components: {
    GeoTIFFTroubleshooting,
    DataSourceTroubleshooting,
    DataSourceWarning,
    SourceVisibilitySwitch
  },
  props: {
    sources: Object,
    project: Object,
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
          missingRaster: window.mapcache.isRasterMissing(source.layerType, source.rasterFile),
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
