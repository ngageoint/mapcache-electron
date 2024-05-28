<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-toolbar-title>Add base map</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content">
      <v-card flat tile>
        <v-card-text>
          <v-form v-on:submit.prevent="() => {}" ref="baseMapNameForm" v-model="baseMapNameValid">
            <v-text-field
                variant="underlined"
                autofocus
                v-model="baseMapName"
                :rules="baseMapNameRules"
                label="Basemap name"
                required
            ></v-text-field>
          </v-form>
        </v-card-text>
      </v-card>
      <v-card flat tile v-if="layers.length > 0">
            <v-card-subtitle style="overflow-x:hidden !important;">
              Select a GeoPackage layer or data source
            </v-card-subtitle>
            <v-card-text>
              <v-list style="max-height: 350px !important; width: 100% !important;" density="compact">
                <template v-for="(item, i) in layers" :key="`layer-${i}`">
                  <v-list-item
                      lines="two"
                      :value="i">
                    <template v-slot:prepend style="margin-top: 12px;">
                      <v-btn variant="text" icon @click.stop="item.zoomTo">
                        <v-img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && dark"
                                src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                        <v-img :style="{verticalAlign: 'middle'}" v-else-if="dark"
                                src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                        <v-img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'"
                                src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                        <v-img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png"
                                alt="Feature layer" width="20px" height="20px"/>
                      </v-btn>
                    </template>
                    <div>
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
                    </div>
                    <v-list-item-action>
                      <data-source-warning v-if="item.source && item.source.warning" :source="item.source"></data-source-warning>
                    </v-list-item-action>
                    <v-list-item-action>
                      <data-source-troubleshooting v-if="item.source && item.error" :source="item.source"
                                                    :project-id="project.id"></data-source-troubleshooting>
                    </v-list-item-action>
                  </v-list-item>
                </template>
              </v-list>
            </v-card-text>
          </v-card>
          <v-card flat tile v-else>
            <v-card-subtitle>
              No layers available for base map.
            </v-card-subtitle>
          </v-card>
          <v-card flat tile>
            <v-card-subtitle>
              Select a background color for your tile
            </v-card-subtitle>
            <v-card-text>
              <color-picker :color="backgroundColor" v-model="backgroundColor" label="Tile background"/>
            </v-card-text>
          </v-card>
    </v-sheet>
    <div class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            variant="text"
            @click="close">
          Cancel
        </v-btn>
        <v-btn
            :disabled="!baseMapNameValid || layers.length === 0"
            variant="text"
            color="primary"
            @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </div>
  </v-sheet>
</template>

<script>
import { mapActions } from 'vuex'
import values from 'lodash/values'
import keys from 'lodash/keys'
import debounce from 'lodash/debounce'
import ColorPicker from '../Common/ColorPicker.vue'
import DataSourceTroubleshooting from '../DataSources/DataSourceTroubleshooting.vue'
import DataSourceWarning from '../DataSources/DataSourceWarning.vue'
import { zoomToGeoPackageTable, zoomToSource } from '../../../../lib/leaflet/map/ZoomUtilities'
import { getDisplayText } from '../../../../lib/layer/LayerTypes'
import { addBaseMap } from '../../../../lib/vue/vuex/ProjectActions'

export default {
  components: {
    DataSourceTroubleshooting,
    DataSourceWarning,
    ColorPicker
  },
  props: {
    baseMaps: Array,
    project: Object,
    dark: {
      type: Boolean,
      default: false
    },
    close: Function
  },
  data () {
    return {
      step: 1,
      baseMapNameValid: true,
      baseMapName: 'New base map',
      baseMapNameRules: [
        v => !!v || 'Base map name is required',
        v => this.baseMaps.map(baseMap => baseMap.name).indexOf(v) === -1 || 'Base map name must be unique'
      ],
      baseMapToDelete: null,
      deleteBaseMapDialog: false,
      addBaseMapDialog: false,
      selectedLayer: 0,
      backgroundColor: '#DDDDDD',
      layers: []
    }
  },
  methods: {
    async updateItems () {
      let items = []
      const sources = values(this.project.sources)
      for (let i = 0; i < sources.length; i++) {
        let source = sources[i]
        items.push({
          id: source.id,
          source: source,
          error: source.error,
          name: source.displayName ? source.displayName : source.name,
          title: source.displayName ? source.displayName : source.name,
          subtitle: getDisplayText(source.sourceType) || getDisplayText(source.layerType),
          isGeoPackage: false,
          type: source.pane === 'vector' ? 'feature' : 'tile',
          zoomTo: debounce((e) => {
            e.stopPropagation()
            zoomToSource(source)
          }, 100)
        })
      }
      const geopackages = values(this.project.geopackages)
      for (let i = 0; i < geopackages.length; i++) {
        const geopackage = geopackages[i]
        if (await window.mapcache.isHealthy(geopackage.path, geopackage.modifiedDate)) {
          const tiles = keys(geopackage.tables.tiles)
          for (let j = 0; j < tiles.length; j++) {
            const table = tiles[j]
            items.push({
              id: geopackage.id + '_' + table,
              geopackageId: geopackage.id,
              name: table,
              tableName: table,
              title: geopackage.name,
              subtitle: table,
              type: 'tile',
              isGeoPackage: true,
              zoomTo: debounce((e) => {
                e.stopPropagation()
                zoomToGeoPackageTable(geopackage, table)
              }, 100)
            })
          }
          const features = keys(geopackage.tables.features)
          for (let j = 0; j < features.length; j++) {
            const table = features[j]
            items.push({
              id: geopackage.id + '_' + table,
              geopackageId: geopackage.id,
              name: table,
              tableName: table,
              title: geopackage.name,
              subtitle: table,
              type: 'feature',
              isGeoPackage: true,
              zoomTo: debounce((e) => {
                e.stopPropagation()
                zoomToGeoPackageTable(geopackage, table)
              }, 100)
            })
          }
        }
      }
      this.items = items
      this.layers = items
    },
    save () {
      let configuration = {}
      let layer = this.layers[this.selectedLayer]
      if (layer.isGeoPackage) {
        configuration.geopackage = this.project.geopackages[layer.geopackageId]
        configuration.tableName = layer.tableName
        configuration.type = layer.type
        configuration.maxFeatures = this.project.maxFeatures
      } else {
        configuration = this.project.sources[layer.id]
      }
      window.mapcache.saveBaseMap(this.baseMapName, window.deproxy(configuration), this.backgroundColor).then((baseMap) => {
        addBaseMap(baseMap).finally(this.close)
      })
    }
  },
  created () {
    this.updateItems()
  },
  watch: {
    project: {
      async handler () {
        await this.updateItems()
      },
      deep: true
    }
  }
}
</script>

<style scoped>
</style>
