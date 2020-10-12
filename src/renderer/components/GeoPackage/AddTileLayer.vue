<template>
  <v-container class="ma-0 pa-0">
    <v-toolbar
      color="primary"
      dark
      flat
      class="sticky-toolbar"
    >
      <!--      <v-btn icon @click="cancel"><v-icon large>mdi-chevron-left</v-icon></v-btn>-->
      <v-toolbar-title>{{geopackage.name + ': Add Tile Layer'}}</v-toolbar-title>
    </v-toolbar>
    <v-card flat class="ma-0 pa-0" style="padding-bottom: 56px !important;" v-if="processing">
      <v-card-title>{{'Creating ' + layerName + ' Tile Layer'}}</v-card-title>
      <v-card-text>
        <v-card-subtitle>{{status.message}}</v-card-subtitle>
        <v-progress-linear :value="error ? 100 : status.progress"
                           :color="error ? 'warning' : 'primary'"></v-progress-linear>
      </v-card-text>
    </v-card>
    <v-card flat class="ma-0 pa-0" v-else>
      <v-card-text>
        <v-form v-on:submit.prevent ref="layerNameForm" v-model="layerNameValid">
          <v-container>
            <v-row no-gutters>
              <v-text-field
                v-model="layerName"
                :rules="layerNameRules"
                label="Tile Layer Name"
                required
              ></v-text-field>
            </v-row>
          </v-container>
        </v-form>
        <v-card-title>
          Tile Layer Content Selection
        </v-card-title>
        <v-card-subtitle>
          Select imagery and features from <b>Data Sources</b> and existing <b>GeoPackges</b> to populate your new GeoPackage
          tile layer.
        </v-card-subtitle>
        <v-container v-if="dataSourceLayers.length > 0" class="ma-0 pa-0">
          <v-card-title class="pb-0" style="font-size: 1rem;">
            Data Source Layers
          </v-card-title>
          <v-card-text>
            <v-list style="max-height: 150px" class="overflow-y-auto">
              <v-list-item-group
                multiple
              >
                <template v-for="(item, i) in dataSourceLayers">
                  <v-list-item
                    :key="`data-source-item-${i}`"
                    :value="item.value"
                  >
                    <template>
                      <v-list-item-icon>
                        <img v-if="item.type === 'feature'" :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
                        <img v-else :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Feature Layer" width="20px" height="20px">
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title style="color: rgba(0, 0, 0, .6)" v-text="item.text"></v-list-item-title>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-checkbox
                          @click.stop="item.changeVisibility"
                          :input-value="item.visible"
                          color="primary"
                        ></v-checkbox>
                      </v-list-item-action>
                    </template>
                  </v-list-item>
                </template>
              </v-list-item-group>
            </v-list>
          </v-card-text>
        </v-container>
        <v-container v-if="geopackageLayers.length > 0" class="ma-0 pa-0">
          <v-card-title class="pb-0" style="font-size: 1rem;">
            GeoPackage Layers
          </v-card-title>
          <v-card-text>
            <v-list style="max-height: 150px" class="overflow-y-auto">
              <v-list-item-group
                multiple
              >
                <template v-for="(item, i) in geopackageLayers">
                  <v-list-item
                    :key="`geopackage-tile-layer-item-${i}`"
                    :value="item.value"
                  >
                    <template>
                      <v-list-item-icon>
                        <img v-if="item.type === 'feature'" :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
                        <img v-else :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Feature Layer" width="20px" height="20px">
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title style="color: rgba(0, 0, 0, .6)" v-text="item.text"></v-list-item-title>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-checkbox
                          @click.stop="item.changeVisibility"
                          :input-value="item.visible"
                          color="primary"
                        ></v-checkbox>
                      </v-list-item-action>
                    </template>
                  </v-list-item>
                </template>
              </v-list-item-group>
            </v-list>
          </v-card-text>
        </v-container>
        <v-container v-if="sortedLayers.length > 0" class="ma-0 pa-0">
          <v-card-title>
            Layer Rendering Order
          </v-card-title>
          <v-card-subtitle>
            Drag layers in the list to specify the rendering order. Layers at the top of the list will be rendered first.
          </v-card-subtitle>
          <v-card-text>
            <draggable
              v-model="sortedLayers"
              ghost-class="ghost">
              <v-list-item
                v-for="(item, i) in sortedLayers"
                :key="`sorted-item-${i}`"
                :value="item.value"
                class="v-list-item--link">
                <v-list-item-icon>
                  <img v-if="item.type === 'feature'" :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
                  <img v-else :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Feature Layer" width="20px" height="20px">
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title style="color: rgba(0, 0, 0, .6)" v-text="item.text"></v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </draggable>
          </v-card-text>
        </v-container>
        <v-container class="ma-0 pa-0 mt-4">
          <v-card-title>
            Bounding Box Filter
          </v-card-title>
          <v-card-subtitle>
            Provide a bounding box to specify the area to pull content from selected data sources and GeoPackage layers
          </v-card-subtitle>
          <v-card-text>
            <v-row no-gutters justify="end">
              <v-btn class="mr-2" outlined v-if="!project.boundingBoxFilterEditingEnabled && project.boundingBoxFilter" color="red" @click.stop="resetBoundingBox">
                Clear
              </v-btn>
              <v-btn outlined :color="project.boundingBoxFilterEditingEnabled ? 'warning' : 'primary'" @click.stop="editBoundingBox">
                {{project.boundingBoxFilterEditingEnabled ? 'Finish' : (project.boundingBoxFilter ? 'Edit bounds' : 'Set bounds')}}
              </v-btn>
            </v-row>
          </v-card-text>
        </v-container>
        <v-container class="ma-0 pa-0 mt-4">
          <v-card-title>
            Zoom Levels and Tile Scaling
          </v-card-title>
          <v-card-subtitle>
            Specify the zoom levels you wish to view your content at. Enable tile scaling to reduce the number of tiles generated.
          </v-card-subtitle>
          <v-card-text>
            <v-container>
              <v-row no-gutters>
                <number-picker :number="Number(minZoom)" @update-number="updateMinZoom" label="Min Zoom" :min="Number(0)" :max="Number(20)" :step="Number(1)" arrows-only/>
              </v-row>
              <v-row no-gutters>
                <number-picker :number="Number(maxZoom)" @update-number="updateMaxZoom" label="Max Zoom" :min="Number(0)" :max="Number(20)" :step="Number(1)" arrows-only/>
              </v-row>
              <v-row no-gutters justify="start" align="center">
                <v-container class="ma-0 pa-0">
                  <v-switch v-model="tileScaling"
                            class="v-input--reverse v-input--expand"
                            hint="Tile scaling reduces the number of tiles by allowing geopackage to search for tiles at nearby zoom levels and scale them"
                            persistent-hint
                            label="Tile Scaling">
                  </v-switch>
                </v-container>
              </v-row>
            </v-container>
          </v-card-text>
        </v-container>
        <v-container
          class="ma-0 pa-0 mt-2"
          v-if="!project.boundingBoxFilterEditingEnabled && layerNameValid && ((dataSourceLayers.filter(item => item.visible).length + geopackageLayers.filter(item => item.visible).length) > 0)">
          <v-card-title>
            Summary
          </v-card-title>
          <v-card-subtitle>
            <b :style="estimatedTileCount > tileWarningThreshold ? 'color: #A12D0F;' : 'color: black;'">{{prettyEstimatedTileCount}}</b>{{' tiles from ' + dataSourceLayers.filter(item => item.visible).length + ' Data Sources and ' + geopackageLayers.filter(item => item.visible).length + ' GeoPackage layers will be generated and added to the '}}<b>{{geopackage.name + ' GeoPackage'}}</b>{{' as the '}}<b>{{layerName}}</b>{{' tile layer.'}}
          </v-card-subtitle>
          <v-card-subtitle class="pt-0 mt-0" v-if="estimatedTileCount > tileWarningThreshold" color="warning">
            {{'This configuration will generate a large number of tiles. Consider enabling tile scaling, reducing the bounding box, or decreasing the max zoom.'}}
          </v-card-subtitle>
        </v-container>
      </v-card-text>
    </v-card>

    <div v-if="!processing || done" class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="done || !processing"
          color="primary"
          text
          @click.stop="cancel">
          {{done ? 'Close' : 'Cancel'}}
        </v-btn>
        <v-btn
          v-if="!done && !processing && project.boundingBoxFilter && layerNameValid && ((dataSourceLayers.filter(item => item.visible).length + geopackageLayers.filter(item => item.visible).length) > 0)"
          color="primary"
          text
          @click.stop="addTileLayer">
          Add
        </v-btn>
      </v-card-actions>
    </div>
  </v-container>
</template>

<script>
  import Vue from 'vue'
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import ViewEditText from '../Common/ViewEditText'
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import NumberPicker from '../Common/NumberPicker'
  import draggable from 'vuedraggable'

  export default {
    props: {
      project: Object,
      geopackage: Object,
      back: Function
    },
    components: {
      ViewEditText,
      NumberPicker,
      draggable
    },
    data () {
      return {
        layerNameValid: false,
        layerName: 'New Tile Layer',
        layerNameRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        status: {
          message: 'Starting',
          progress: 0.0
        },
        processing: false,
        error: false,
        done: false,
        dataSourceLayers: this.getDataSourceLayers(),
        tileScaling: false,
        minZoom: 0,
        maxZoom: 20,
        tileWarningThreshold: 1000,
        sortedRenderingLayers: undefined
      }
    },
    methods: {
      ...mapActions({
        synchronizeGeoPackage: 'Projects/synchronizeGeoPackage',
        setDataSourceVisible: 'Projects/setDataSourceVisible',
        setGeoPackageTileTableVisible: 'Projects/setGeoPackageTileTableVisible',
        setGeoPackageFeatureTableVisible: 'Projects/setGeoPackageFeatureTableVisible',
        setBoundingBoxFilterEditingEnabled: 'Projects/setBoundingBoxFilterEditingEnabled',
        clearBoundingBoxFilter: 'Projects/clearBoundingBoxFilter'
      }),
      async addTileLayer () {
        this.processing = true
        const configuration = {
          id: UniqueIDUtilities.createUniqueID(),
          path: this.geopackage.path,
          projectId: this.project.id,
          table: this.layerName,
          sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.value]),
          boundingBoxFilter: this.project.boundingBoxFilter,
          geopackageLayers: this.geopackageLayers.filter(item => item.visible).map(({value, type}) => {
            return {geopackage: this.project.geopackages[value.geopackageId], table: value.table, type}
          }),
          minZoom: this.minZoom,
          maxZoom: this.maxZoom,
          tileScaling: this.tileScaling,
          renderingOrder: this.sortedLayers
        }

        this.$electron.ipcRenderer.once('build_tile_layer_completed_' + configuration.id, (event, result) => {
          this.done = true
          if (result && result.error) {
            this.status.message = result.error
            this.error = true
          } else {
            this.status.message = 'Completed'
            this.status.progress = 100
          }
          this.$electron.ipcRenderer.removeAllListeners('build_tile_layer_status_' + configuration.id)
          this.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
        })
        this.$electron.ipcRenderer.on('build_tile_layer_status_' + configuration.id, (event, status) => {
          if (!this.done) {
            this.status = status
          }
        })
        this.$electron.ipcRenderer.send('build_tile_layer', {configuration: configuration})
      },
      cancel () {
        this.back()
      },
      updateMinZoom (val) {
        if (val > this.maxZoom) {
          this.maxZoom = val
        }
        this.minZoom = val
      },
      updateMaxZoom (val) {
        if (val < this.minZoom) {
          this.minZoom = val
        }
        this.maxZoom = val
      },
      resetBoundingBox () {
        this.clearBoundingBoxFilter({projectId: this.project.id})
      },
      editBoundingBox () {
        this.setBoundingBoxFilterEditingEnabled({projectId: this.project.id, enabled: !this.project.boundingBoxFilterEditingEnabled})
      },
      getEstimatedTileCount () {
        const dataSources = this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.value])
        const geopackageLayers = this.geopackageLayers.filter(item => item.visible).map(({value, type}) => {
          return {geopackage: this.project.geopackages[value.geopackageId], table: value.table, type}
        })
        return GeoPackageUtilities.estimatedTileCount(this.project.boundingBoxFilter, dataSources, geopackageLayers, this.tileScaling, this.minZoom, this.maxZoom).estimatedNumberOfTiles
      },
      async getGeoPackageLayerItems () {
        const self = this
        const projectId = this.project.id
        const items = []
        const keys = _.keys(this.project.geopackages)
        for (let i = 0; i < keys.length; i++) {
          const geopackage = this.project.geopackages[keys[i]]
          if (await GeoPackageUtilities.isHealthy(geopackage)) {
            _.keys(geopackage.tables.tiles).forEach(table => {
              const tableName = table
              const visible = geopackage.tables.tiles[table].visible
              const geopackageId = geopackage.id
              items.push({
                id: geopackageId + '_' + tableName,
                value: {geopackageId: geopackage.id, table: table},
                text: geopackage.name + ': ' + table,
                visible,
                type: 'tile',
                changeVisibility: () => {
                  self.setGeoPackageTileTableVisible({projectId, geopackageId, tableName, visible: !visible})
                }
              })
            })
            _.keys(geopackage.tables.features).forEach(table => {
              const tableName = table
              const visible = geopackage.tables.features[table].visible
              const geopackageId = geopackage.id
              items.push({
                id: geopackageId + '_' + tableName,
                value: {geopackageId: geopackage.id, table: table},
                text: geopackage.name + ': ' + table,
                visible,
                type: 'feature',
                changeVisibility: () => {
                  self.setGeoPackageFeatureTableVisible({projectId, geopackageId, tableName, visible: !visible})
                }
              })
            })
          }
        }
        return items
      },
      getDataSourceLayers () {
        const self = this
        const projectId = this.project.id
        return Object.values(this.project.sources).map(source => {
          const sourceId = source.id
          const visible = !source.visible
          return {
            id: source.id,
            text: source.displayName ? source.displayName : source.name,
            value: source.id,
            visible: source.visible,
            type: source.pane === 'vector' ? 'feature' : 'tile',
            changeVisibility: () => {
              self.setDataSourceVisible({projectId, sourceId, visible})
            }
          }
        })
      },
      getRenderingLayers () {
        return this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageLayers.filter(item => item.visible))
      }
    },
    asyncComputed: {
      geopackageLayers: {
        async get () {
          return this.getGeoPackageLayerItems()
        },
        default: []
      }
    },
    computed: {
      prettyEstimatedTileCount () {
        return this.getEstimatedTileCount().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      },
      estimatedTileCount () {
        return this.getEstimatedTileCount()
      },
      boundingBoxText () {
        let boundingBoxText = 'Not specified'
        if (!_.isNil(this.project.boundingBoxFilter)) {
          const bbox = this.project.boundingBoxFilter
          boundingBoxText = '(' + bbox[1].toFixed(4) + ',' + bbox[0].toFixed(4) + '), (' + bbox[3].toFixed(4) + ',' + bbox[2].toFixed(4) + ')'
        }
        return boundingBoxText
      },
      sortedLayers: {
        get () {
          return this.sortedRenderingLayers || this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageLayers.filter(item => item.visible))
        },
        set (val) {
          this.sortedRenderingLayers = val
        }
      }
    },
    watch: {
      project: {
        async handler () {
          this.dataSourceLayers = this.getDataSourceLayers()
          this.geopackageLayers = await this.getGeoPackageLayerItems()
          if (!_.isNil(this.sortedRenderingLayers)) {
            const sortedRenderingLayersCopy = this.sortedRenderingLayers.slice()
            const newRenderingLayers = this.getRenderingLayers()

            const idsRemoved = _.difference(sortedRenderingLayersCopy.map(item => item.id), newRenderingLayers.map(item => item.id))
            const idsAdded = _.difference(newRenderingLayers.map(item => item.id), sortedRenderingLayersCopy.map(item => item.id))

            idsRemoved.forEach(id => {
              const index = sortedRenderingLayersCopy.findIndex(item => item.id === id)
              if (index !== -1) {
                sortedRenderingLayersCopy.splice(index, 1)
              }
            })

            idsAdded.forEach(id => {
              const index = newRenderingLayers.findIndex(item => item.id === id)
              if (index !== -1) {
                sortedRenderingLayersCopy.push(newRenderingLayers[index])
              }
            })

            this.sortedLayers = sortedRenderingLayersCopy
          }
        },
        deep: true
      }
    },
    mounted () {
      Vue.nextTick(() => {
        this.$refs.layerNameForm.validate()
      })
    },
    beforeDestroy () {
      this.resetBoundingBox()
    }
  }
</script>

<style scoped>
  .ghost {
    opacity: 0.5;
    background: #3b779a;
  }
  .v-input--reverse .v-input__slot {
    flex-direction: row-reverse;
    justify-content: flex-end;
    .v-input--selection-controls__input {
      margin-left: 0;
      margin-right: 8px;
    }
  }
  .v-input--expand .v-input__slot {
    .v-label {
      display: block;
      flex: 1;
    }
  }
</style>
