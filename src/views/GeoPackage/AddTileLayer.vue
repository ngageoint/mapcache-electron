<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>{{geopackage.name + ': Add Tile Layer'}}</v-toolbar-title>
    </v-toolbar>
    <v-sheet v-if="processing" class="mapcache-sheet-content detail-bg">
      <v-card flat tile class="ma-0 pa-0">
        <v-card-title>{{'Adding ' + layerName}}</v-card-title>
        <v-card-text>
          <v-card-subtitle :class="index === 0 ? 'mt-2 mb-0 pa-0' : 'mt-1 mb-0 pa-0'" v-for="(text, index) in status.message.split('\n')" :key="index">
            {{ text }}
          </v-card-subtitle>
          <p v-if="status.error">
            {{ status.error }}
          </p>
          <v-progress-linear class="mt-4" :indeterminate="status.progress === -1" :value="status.error ? 100 : status.progress" :color="status.error ? 'warning' : 'primary'"></v-progress-linear>
        </v-card-text>
        <v-card-actions class="mt-8">
          <v-spacer></v-spacer>
          <v-btn
            v-if="!done"
            text
            :disabled="cancelling"
            color="warning"
            @click.stop="cancelAddTileLayer">
            {{cancelling ? 'Cancelling' : 'Cancel'}}
          </v-btn>
          <v-btn
            v-if="done"
            color="primary"
            text
            @click.stop="cancel">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
      <v-divider/>
    </v-sheet>
    <v-sheet v-else class="mapcache-sheet-content">
      <v-stepper v-model="step" class="background" non-linear vertical :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => layerNameValid]" color="primary">
          Name the layer
          <small class="pt-1">{{layerName}}</small>
        </v-stepper-step>
        <v-stepper-content step="1">
          <v-card flat tile>
            <v-card-subtitle>
              Specify a name for the new GeoPackage tile layer.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="layerNameForm" v-model="layerNameValid">
                <v-text-field
                  autofocus
                  v-model="layerName"
                  :rules="layerNameRules"
                  label="Layer Name"
                  required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 2" v-if="layerNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" color="primary">
          Select Data Sources
          <small class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile>
            <v-card-subtitle>
              Select imagery and features from <b>Data Sources</b> to populate the <b>{{layerName}}</b> tile layer.
            </v-card-subtitle>
            <v-card-text>
              <v-list dense>
                <v-list-item-group multiple color="primary" v-model="selectedDataSourceLayers" v-on:change="filterErroredLayers">
                  <template v-for="(item, i) in dataSourceLayers">
                    <v-list-item
                      :key="`data-source-item-${i}`"
                      :value="item.id"
                      @click.stop.prevent="item.changeVisibility">
                      <template v-slot:default="{ active }">
                        <v-list-item-icon class="mr-4">
                          <v-btn icon @click.stop="item.zoomTo">
                            <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark" src="../../assets/white_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="../../assets/colored_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                          </v-btn>
                        </v-list-item-icon>
                        <v-list-item-content>
                          <v-list-item-title v-text="item.title"></v-list-item-title>
                        </v-list-item-content>
                        <data-source-troubleshooting v-if="item.source.error" :source="item.source" :project-id="project.id"></data-source-troubleshooting>
                        <v-list-item-action>
                          <source-visibility-switch :input-value="active" :project-id="project.id" :source="project.sources[item.id]"></source-visibility-switch>
                        </v-list-item-action>
                      </template>
                    </v-list-item>
                    <v-divider
                      v-if="i < dataSourceLayers.length - 1"
                      :key="'data_source_layer_divider_' + i"
                    ></v-divider>
                  </template>
                </v-list-item-group>
              </v-list>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 3">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 3" step="3" color="primary">
          Select GeoPackage layers
          <small class="pt-1">{{selectedGeoPackageLayers.length === 0 ? 'None' : selectedGeoPackageLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Select imagery and features from existing <b>GeoPackage</b> layers to populate the <b>{{layerName}}</b> tile layer.
            </v-card-subtitle>
            <v-card-text>
              <v-list dense>
                <v-list-item-group multiple color="primary" v-model="selectedGeoPackageLayers">
                  <template v-for="(item, i) in geopackageLayers">
                    <v-list-item
                      :key="`geopackage-layer-item-${i}`"
                      :value="item.id"
                      @click.stop="item.changeVisibility">
                      <template v-slot:default="{ active }">
                        <v-list-item-icon>
                          <v-btn icon @click.stop="item.zoomTo">
                            <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark" src="../../assets/white_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="../../assets/colored_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                          </v-btn>
                        </v-list-item-icon>
                        <v-list-item-content>
                          <v-list-item-title v-text="item.title"></v-list-item-title>
                          <v-list-item-subtitle v-text="item.subtitle"></v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                          <v-switch
                            dense
                            @click.stop="item.changeVisibility"
                            :input-value="active"
                            color="primary"
                          ></v-switch>
                        </v-list-item-action>
                      </template>
                    </v-list-item>
                    <v-divider
                      v-if="i < geopackageLayers.length - 1"
                      :key="'geopackage_layer_divider_' + i"
                    ></v-divider>
                  </template>
                </v-list-item-group>
              </v-list>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 4" step="4" color="primary">
          Layer rendering order
          <small class="pt-1">{{selectedGeoPackageLayers.length + selectedDataSourceLayers.length === 0 ? 'No layers selected' : ''}}</small>
        </v-stepper-step>
        <v-stepper-content step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Drag layers in the list to specify the rendering order. Layers at the top of the list will be rendered on top.
            </v-card-subtitle>
            <v-card-text>
              <draggable
                v-model="sortedLayers"
                class="list-group pl-0"
                ghost-class="ghost"
                tag="ul"
                v-bind="dragOptions"
                @start="drag = true"
                @end="drag = false">
                <transition-group type="transition" :name="!drag ? 'flip-list' : null" :class="`v-list v-sheet ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'} v-list--dense`">
                  <li v-for="(item) in sortedLayers" :key="item.id" :class="`list-item v-list-item ${drag ? '' : 'v-item--active v-list-item--link'} ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'}`">
                    <v-list-item-icon>
                      <v-btn icon @click.stop="item.zoomTo">
                        <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark" src="../../assets/white_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                        <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                        <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="../../assets/colored_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                        <img :style="{verticalAlign: 'middle'}" v-else src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                      </v-btn>
                    </v-list-item-icon>
                    <v-list-item-content>
                      <v-list-item-title v-text="item.title"></v-list-item-title>
                      <v-list-item-subtitle v-if="item.subtitle" v-text="item.subtitle"></v-list-item-subtitle>
                    </v-list-item-content>
                  </li>
                </transition-group>
              </draggable>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 5" step="5" :rules="[() => (project.boundingBoxFilter || Number(step) < 6) && (!project.boundingBoxFilterEditing || (Number(step) === 5 && project.boundingBoxFilterEditingEnabled))]" color="primary">
          Specify tile bounds
          <small class="pt-1">{{project.boundingBoxFilterEditing ? 'Setting bounds' : (project.boundingBoxFilter ? 'Bounds set' : 'Bounds not set')}}</small>
        </v-stepper-step>
        <v-stepper-content step="5">
          <v-card flat tile>
            <v-card-subtitle>
              Provide a bounding box to restrict content from selected data sources and GeoPackage feature layers
            </v-card-subtitle>
            <v-card-text>
              <v-row no-gutters justify="end">
                <v-btn class="mr-2" outlined v-if="!project.boundingBoxFilterEditing && project.boundingBoxFilter" color="red" @click.stop="resetBoundingBox">
                  Clear
                </v-btn>
                <v-btn v-if="project.boundingBoxFilterEditing" outlined color="warning" @click.stop="stopEditingBoundingBox">
                  Finish
                </v-btn>
                <v-menu
                  v-else
                  top
                  close-on-click
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      color="primary"
                      dark
                      v-bind="attrs"
                      v-on="on"
                    >
                      {{project.boundingBoxFilter ? 'Edit bounds' : 'Set bounds'}}
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item-group>
                      <v-list-item @click="() => editBoundingBox('manual')">
                        <v-list-item-title>Manual</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="setBoundingBoxFilterToExtent">
                        <v-list-item-title>Use Extent</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="() => editBoundingBox('grid')">
                        <v-list-item-title>Use Grid</v-list-item-title>
                      </v-list-item>
                    </v-list-item-group>
                  </v-list>
                </v-menu>
              </v-row>
            </v-card-text>
          </v-card>
          <v-btn
            text
            color="primary"
            @click="step = 6">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 6" step="6" color="primary" :rules="[() => areZoomsValid()]">
          Zoom Levels and Tile Scaling
        </v-stepper-step>
        <v-stepper-content step="6">
          <v-card flat tile>
            <v-card-subtitle>
              Specify the zoom levels you wish to view your content at. Enable tile scaling to reduce the number of tiles generated.
            </v-card-subtitle>
            <v-card-text>
              <v-container>
                <v-row no-gutters>
                  <number-picker ref="minZoom" :number="Number(minZoom)" @update-number="updateMinZoom" label="Min Zoom" :min="Number(0)" :max="Number(20)" :step="Number(1)"/>
                </v-row>
                <v-row no-gutters>
                  <number-picker ref="maxZoom" :number="Number(maxZoom)" @update-number="updateMaxZoom" label="Max Zoom" :min="Number(0)" :max="Number(20)" :step="Number(1)"/>
                </v-row>
                <v-row no-gutters justify="start" align="center">
                  <v-container class="ma-0 pa-0">
                    <v-switch v-model="tileScaling"
                              color="primary"
                              class="v-input--reverse v-input--expand"
                              hint="Tile scaling reduces the number of tiles by allowing geopackage to search for tiles at nearby zoom levels and scale them"
                              persistent-hint
                              label="Tile Scaling">
                    </v-switch>
                  </v-container>
                </v-row>
              </v-container>
            </v-card-text>
          </v-card>
          <v-btn
            text
            color="primary"
            @click="step = 7">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable step="7" color="primary">
          Summary
        </v-stepper-step>
        <v-stepper-content step="7">
          <v-card flat tile>
            <v-card-text>
              <v-card-subtitle>
                <b :class="estimatedTileCount > tileWarningThreshold ? 'warning-text' : ''">{{prettyEstimatedTileCount}}</b>{{' tiles from ' + dataSourceLayers.filter(item => item.visible).length + ' Data Source' + (dataSourceLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' and ' + geopackageLayers.filter(item => item.visible).length + ' GeoPackage layer' + (geopackageLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' will be generated and added to the '}}<b>{{geopackage.name + ' GeoPackage'}}</b>{{' as the '}}<b>{{layerName}}</b>{{' tile layer.'}}
              </v-card-subtitle>
              <v-card-subtitle class="pt-0 mt-0" v-if="estimatedTileCount > tileWarningThreshold" color="warning">
                {{'This configuration will generate a large number of tiles. Consider enabling tile scaling, reducing the bounding box, or decreasing the max zoom.'}}
              </v-card-subtitle>
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
    </v-sheet>

    <div v-if="!processing" class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          text
          @click.stop="cancel">
          Cancel
        </v-btn>
        <v-btn
          v-if="Number(step) === 7 && !done && !processing && project.boundingBoxFilter && layerNameValid && ((dataSourceLayers.filter(item => item.visible).length + geopackageLayers.filter(item => item.visible).length) > 0)"
          color="primary"
          text
          @click.stop="addTileLayer">
          Add
        </v-btn>
      </v-card-actions>
    </div>
  </v-sheet>
</template>

<script>
import {mapState} from 'vuex'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import debounce from 'lodash/debounce'
import draggable from 'vuedraggable'
import NumberPicker from '../Common/NumberPicker'
import EventBus from '../../lib/vue/EventBus'
import SourceVisibilitySwitch from '../DataSources/SourceVisibilitySwitch'
import DataSourceTroubleshooting from '../DataSources/DataSourceTroubleshooting'

export default {
    props: {
      project: Object,
      geopackage: Object,
      back: Function
    },
    components: {
      DataSourceTroubleshooting,
      SourceVisibilitySwitch,
      NumberPicker,
      draggable
    },
    data () {
      return {
        step: 1,
        layerNameValid: true,
        layerName: 'New Tile Layer',
        layerNameRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        status: {
          message: 'Starting...',
          progress: 0.0
        },
        processing: false,
        done: false,
        tileScaling: false,
        minZoom: 0,
        maxZoom: 10,
        tileWarningThreshold: 1000,
        configuration: null,
        cancelling: false,
        drag: false,
        internalRenderingOrder: []
      }
    },
    methods: {
      filterErroredLayers (layers) {
        this.selectedDataSourceLayers = layers.filter(layerId => isNil(this.project.sources[layerId].error))
      },
      async cancelAddTileLayer () {
        const self = this
        this.cancelling = true
        window.mapcache.cancelAddTileLayer(this.configuration).then(() => {
          setTimeout(() => {
            window.mapcache.deleteGeoPackageTable(self.geopackage.path, self.configuration.table).then(() => {
              self.done = true
              self.cancelling = false
              self.status.message = 'Cancelled'
              self.status.progress = 100
              window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
            }).catch(() => {
              // table may not have been created yet
              self.done = true
              self.cancelling = false
              self.status.message = 'Cancelled'
              self.status.progress = 100
              window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
            })
          }, 500)
        })
        this.status.message = 'Cancelling...'
        this.status.progress = -1
      },
      async addTileLayer () {
        this.processing = true
        this.configuration = {
          id: window.mapcache.createUniqueID(),
          path: this.geopackage.path,
          projectId: this.project.id,
          table: this.layerName,
          sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.id]),
          boundingBoxFilter: this.project.boundingBoxFilter,
          geopackageLayers: this.geopackageLayers.filter(item => item.visible).map(item => {
            return {geopackage: this.project.geopackages[item.geopackageId], table: item.tableName, type: item.type}
          }),
          minZoom: this.minZoom,
          maxZoom: this.maxZoom,
          tileScaling: this.tileScaling,
          renderingOrder: this.sortedLayers.map(sortedLayer => sortedLayer.id)
        }

        window.mapcache.addTileLayer(this.configuration, (status) => {
          if (!this.done) {
            this.status = status
          }
        }).then(() => {
          this.done = true
          window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
          window.mapcache.notifyTab({projectId: this.project.id, tabId: 0})
        })
      },
      cancel () {
        if (!isNil(this.project.boundingBoxFilterEditing)) {
          window.mapcache.clearBoundingBoxFilter({projectId: this.project.id})
        }
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
      setBoundingBoxFilterToExtent () {
        // eslint-disable-next-line no-unused-vars
        window.mapcache.setBoundingBoxFilterToExtent(this.project.id).catch((e) => {
          // eslint-disable-next-line no-console
          console.error('Failed to set bounding box filter to the extent of visible layers.')
        })
      },
      resetBoundingBox () {
        window.mapcache.clearBoundingBoxFilter({projectId: this.project.id})
      },
      editBoundingBox (mode) {
        window.mapcache.setBoundingBoxFilterEditingEnabled({projectId: this.project.id, mode})
      },
      stopEditingBoundingBox () {
        window.mapcache.setBoundingBoxFilterEditingDisabled({projectId: this.project.id})
      },
      areZoomsValid () {
        return (this.$refs.minZoom === null || this.$refs.minZoom === undefined || this.$refs.minZoom.isValid()) && (this.$refs.maxZoom === null || this.$refs.maxZoom === undefined || this.$refs.maxZoom.isValid())
      },
      getEstimatedTileCount () {
        const dataSources = this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.id])
        const geopackageLayers = this.geopackageLayers.filter(item => item.visible).map(item => {
          return {geopackage: this.project.geopackages[item.geopackageId], table: item.tableName, type: item.type}
        })
        let tiles = 0
        if (this.areZoomsValid()) {
          tiles = window.mapcache.estimatedTileCount(this.project.boundingBoxFilter, dataSources, geopackageLayers, this.tileScaling, this.minZoom, this.maxZoom).estimatedNumberOfTiles
        }
        return tiles
      },
      async getGeoPackageLayerItems () {
        const projectId = this.project.id
        const items = []
        const geopackageKeys = keys(this.project.geopackages)
        for (let i = 0; i < geopackageKeys.length; i++) {
          const geopackage = this.project.geopackages[geopackageKeys[i]]
          if (await window.mapcache.isHealthy(geopackage)) {
            Object.keys(geopackage.tables.tiles).forEach(table => {
              const tableName = table
              const visible = geopackage.tables.tiles[table].visible
              const geopackageId = geopackage.id
              items.push({
                id: geopackageId + '_' + tableName,
                geopackageId: geopackageId,
                tableName: tableName,
                title: geopackage.name,
                subtitle: table,
                visible,
                type: 'tile',
                changeVisibility: debounce(() => {
                  window.mapcache.setGeoPackageTileTableVisible({projectId, geopackageId, tableName, visible: !visible})
                }, 100),
                zoomTo: debounce((e) => {
                  e.stopPropagation()
                  window.mapcache.getBoundingBoxForTable(geopackage.path, tableName).then(extent => {
                    window.mapcache.zoomToExtent({projectId, extent})
                  })
                }, 100)
              })
            })
            Object.keys(geopackage.tables.features).forEach(table => {
              const tableName = table
              const visible = geopackage.tables.features[table].visible
              const geopackageId = geopackage.id
              items.push({
                id: geopackageId + '_' + tableName,
                geopackageId: geopackageId,
                tableName: tableName,
                title: geopackage.name,
                subtitle: table,
                visible,
                type: 'feature',
                changeVisibility: debounce(() => {
                  window.mapcache.setGeoPackageFeatureTableVisible({projectId, geopackageId, tableName, visible: !visible})
                }, 100),
                zoomTo: debounce((e) => {
                  e.stopPropagation()
                  window.mapcache.getBoundingBoxForTable(geopackage.path, tableName).then(extent => {
                    window.mapcache.zoomToExtent({projectId, extent})
                  })
                }, 100)
              })
            })
          }
        }
        return items
      },
      async getDataSourceLayers () {
        const projectId = this.project.id
        return Object.values(this.project.sources).map(source => {
          return {
            title: source.displayName ? source.displayName : source.name,
            source: source,
            error: source.error,
            id: source.id,
            visible: source.visible,
            type: source.pane === 'vector' ? 'feature' : 'tile',
            changeVisibility: debounce(() => {
              if (isNil(source.error)) {
                window.mapcache.setDataSourceVisible({projectId, sourceId: source.id, visible: !source.visible})
              }
            }, 100),
            zoomTo: debounce((e) => {
              e.stopPropagation()
              window.mapcache.zoomToExtent({projectId, extent: source.extent})
            }, 100)
          }
        })
      },
      fireReorderMapLayers: debounce((layers) => {
        EventBus.$emit(EventBus.EventTypes.REORDER_MAP_LAYERS, layers)
      }, 100)
    },
    asyncComputed: {
      geopackageLayers: {
        async get () {
          return this.getGeoPackageLayerItems()
        },
        default: []
      },
      dataSourceLayers: {
        async get () {
          return this.getDataSourceLayers()
        },
        default: []
      },
      selectedGeoPackageLayers: {
        async get () {
          return (await this.getGeoPackageLayerItems()).filter(item => item.visible).map(item => item.id)
        },
        default: []
      },
      selectedDataSourceLayers: {
        async get () {
          return (await this.getDataSourceLayers()).filter(item => item.visible).map(item => item.id)
        },
        default: []
      }
    },
    computed: {
      ...mapState({
        mapZoom (state) {
          let mapZoom = 3
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          if (!isNil(project)) {
            mapZoom = project.mapZoom
          }
          return mapZoom
        }
      }),
      prettyEstimatedTileCount () {
        return this.getEstimatedTileCount().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      },
      estimatedTileCount () {
        return this.getEstimatedTileCount()
      },
      boundingBoxText () {
        let boundingBoxText = 'Not specified'
        if (!isNil(this.project.boundingBoxFilter)) {
          const bbox = this.project.boundingBoxFilter
          boundingBoxText = '(' + bbox[1].toFixed(4) + ',' + bbox[0].toFixed(4) + '), (' + bbox[3].toFixed(4) + ',' + bbox[2].toFixed(4) + ')'
        }
        return boundingBoxText
      },
      sortedLayers: {
        get () {
          return this.internalRenderingOrder

        },
        set (layers) {
          this.internalRenderingOrder = layers
          const newMapRenderingOrder = []
          layers.forEach(item => {
            newMapRenderingOrder.push(item.id)
          })
          this.fireReorderMapLayers(newMapRenderingOrder)
        }
      },
      dragOptions () {
        return {
          animation: 200,
          group: 'layers'
        }
      }
    },
    watch: {
      project: {
        async handler () {
          this.dataSourceLayers = await this.getDataSourceLayers()
          this.selectedDataSourceLayers = this.dataSourceLayers.filter(item => item.visible).map(item => item.id)
          this.geopackageLayers = await this.getGeoPackageLayerItems()
          this.selectedGeoPackageLayers = this.geopackageLayers.filter(item => item.visible).map(item => item.id)
          const items = this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageLayers.filter(item => item.visible))
          this.internalRenderingOrder = this.project.mapRenderingOrder.map(id => items.find(item => item.id === id)).filter(item => !isNil(item))
        },
        deep: true
      }
    },
    mounted () {
      this.$nextTick(() => {
        this.$refs.layerNameForm.validate()
      })
      window.mapcache.clearBoundingBoxFilter({projectId: this.project.id})
      const mapZoom = isNil(this.mapZoom) ? 3 : this.mapZoom
      this.minZoom = Math.min(20, Math.max(0, mapZoom))
      this.maxZoom = Math.min(20, Math.max(0, (this.minZoom + 2)))
      const items = this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageLayers.filter(item => item.visible))
      this.internalRenderingOrder = this.project.mapRenderingOrder.map(id => items.find(item => item.id === id)).filter(item => !isNil(item))
    },
    beforeUnmount () {
      window.mapcache.resetBoundingBox()
    }
  }
</script>

<style scoped>
  .ghost {
    opacity: 0.5 !important;
    background-color: var(--v-primary-lighten2) !important;
  }
  .flip-list-move {
    transition: transform 0.5s;
  }
  .no-move {
    transition: transform 0s;
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
  ul {
    list-style-type: none !important;
  }
  .list-item {
    min-height: 50px !important;
    cursor: move !important;
    background: var(--v-background-base) !important;
  }
  .list-item i {
    cursor: pointer !important;
  }
</style>
