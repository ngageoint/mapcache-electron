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
      <v-stepper v-model="step" non-linear vertical class="background"
                 :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => baseMapNameValid]" color="primary">
          Name the base map
          <small class="pt-1">{{ baseMapName }}</small>
        </v-stepper-step>
        <v-stepper-content step="1">
          <v-card flat tile>
            <v-card-subtitle>
              Specify a name for the new base map.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="baseMapNameForm" v-model="baseMapNameValid">
                <v-text-field
                    variant="underlined"
                    autofocus
                    v-model="baseMapName"
                    :rules="baseMapNameRules"
                    label="Layer name"
                    required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn variant="text" color="primary" @click="step = 2" :disabled="!baseMapNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" color="primary" :rules="[() => layers.length > 0]">
          Select layer
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile v-if="layers.length > 0">
            <v-card-subtitle>
              Select a GeoPackage layer or data source for your base map.
            </v-card-subtitle>
            <v-card-text>
              <v-list dense>
                <v-list-item-group mandatory v-model="selectedLayer">
                  <template v-for="(item, i) in layers" :key="`layer-${i}`">
                    <v-list-item
                        lines="two"
                        :value="i">
                      <v-list-item-icon style="margin-top: 12px;">
                        <v-btn variant="text"  icon @click.stop="item.zoomTo">
                          <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark"
                               src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                          <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark"
                               src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                          <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'"
                               src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                          <img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png"
                               alt="Feature layer" width="20px" height="20px"/>
                        </v-btn>
                      </v-list-item-icon>
                      <div>
                        <v-list-item-title v-text="item.title"></v-list-item-title>
                        <v-list-item-subtitle v-text="item.subtitle"></v-list-item-subtitle>
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
                </v-list-item-group>
              </v-list>
            </v-card-text>
          </v-card>
          <v-card flat tile v-else>
            <v-card-subtitle>
              No layers available for base map.
            </v-card-subtitle>
          </v-card>
          <v-btn variant="text" color="primary" @click="step = '3'">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable step="3" color="primary">
          Tile background
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Select a background color for your tile
            </v-card-subtitle>
            <v-card-text>
              <color-picker :color="backgroundColor" v-model="backgroundColor" label="Tile background"/>
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
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
            :disabled="!baseMapNameValid || layers.length === 0 || step !== '3'"
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
import { zoomToGeoPackageTable, zoomToSource } from '../../lib/leaflet/map/ZoomUtilities'
import { getDisplayText } from '../../lib/layer/LayerTypes'
import { addBaseMap } from '../../lib/vue/vuex/ProjectActions'

export default {
  components: {
    DataSourceTroubleshooting,
    DataSourceWarning,
    ColorPicker
  },
  props: {
    baseMaps: Array,
    project: Object,
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
    ...mapActions({
      editBaseMap: 'BaseMaps/editBaseMap',
    }),
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
      window.mapcache.saveBaseMap(this.baseMapName, configuration, this.backgroundColor).then((baseMap) => {
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
