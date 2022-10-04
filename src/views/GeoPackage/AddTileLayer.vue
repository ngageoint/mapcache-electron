<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
        dark
        flat
        class="sticky-toolbar"
    >
      <v-toolbar-title>{{ geopackage.name + ': Add tile layer' }}</v-toolbar-title>
    </v-toolbar>
    <v-sheet v-if="processing" class="mapcache-sheet-content detail-bg">
      <v-card flat tile class="ma-0 pa-0">
        <v-card-title>{{ 'Adding ' + layerName }}</v-card-title>
        <v-card-text>
          <v-card-subtitle :class="index === 0 ? 'mt-2 mb-0 pa-0' : 'mt-1 mb-0 pa-0'"
                           v-for="(text, index) in status.message.split('\n')" :key="index">
            {{ text }}
          </v-card-subtitle>
          <p v-if="status.error">
            {{ status.error }}
          </p>
          <v-progress-linear class="mt-4" :indeterminate="status.progress === -1"
                             :value="status.error ? 100 : status.progress"
                             :color="status.error ? 'warning' : 'primary'"></v-progress-linear>
        </v-card-text>
        <v-card-actions class="mt-8">
          <v-spacer></v-spacer>
          <v-btn
              v-if="!done"
              text
              :disabled="cancelling"
              color="warning"
              @click.stop="cancelAddTileLayer">
            {{ cancelling ? 'Cancelling' : 'Cancel' }}
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
      <v-stepper v-model="step" class="background" non-linear vertical
                 :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => layerNameValid]" color="primary">
          Name the layer
          <small class="pt-1">{{ layerName }}</small>
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
                    label="Layer name"
                    required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 2" :disabled="!layerNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" color="primary">
          Select data sources
          <small class="pt-1">{{ selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length }}
            selected</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile>
            <v-card-subtitle>
              Select imagery and features from <b>data sources</b> to populate the <b>{{ layerName }}</b> tile layer.
            </v-card-subtitle>
            <v-card-text>
              <v-list dense>
                <v-list-item-group multiple color="primary" v-model="selectedDataSourceLayers"
                                   v-on:change="filterErroredLayers">
                  <template v-for="(item, i) in dataSourceLayers">
                    <v-list-item
                        :key="`data-source-item-${i}`"
                        :value="item.id"
                        @click.stop.prevent="item.changeVisibility">
                      <template v-slot:default="{ active }">
                        <v-list-item-icon class="mr-4">
                          <v-btn icon @click.stop="item.zoomTo">
                            <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark"
                                 src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark"
                                 src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'"
                                 src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png" alt="Feature layer"
                                 width="20px" height="20px"/>
                          </v-btn>
                        </v-list-item-icon>
                        <v-list-item-content>
                          <v-list-item-title v-text="item.title"></v-list-item-title>
                        </v-list-item-content>
                        <data-source-troubleshooting v-if="item.source.error" :source="item.source"
                                                     :project-id="project.id"></data-source-troubleshooting>
                        <v-list-item-action>
                          <source-visibility-switch :input-value="active" :project-id="project.id"
                                                    :source="project.sources[item.id]"></source-visibility-switch>
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
          <small class="pt-1">{{ selectedGeoPackageLayers.length === 0 ? 'None' : selectedGeoPackageLayers.length }}
            selected</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Select imagery and features from existing <b>GeoPackage</b> layers to populate the <b>{{ layerName }}</b>
              tile layer.
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
                            <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark"
                                 src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark"
                                 src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'"
                                 src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                            <img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png" alt="Feature layer"
                                 width="20px" height="20px"/>
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
          Order layers
          <small
              class="pt-1">{{
              selectedGeoPackageLayers.length + selectedDataSourceLayers.length === 0 ? 'No layers selected' : ''
            }}</small>
        </v-stepper-step>
        <v-stepper-content step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Drag the layers to specify the rendering order. Layers at the top of the list will be rendered on top.
            </v-card-subtitle>
            <v-card-text>
              <v-list
                  id="sortable-list"
                  style="max-height: 350px !important; width: 100% !important; overflow-y: auto !important;"
                  v-sortable-list="{onEnd:updateSortedLayerOrder}"
                  dense>
                <v-list-item
                    v-for="item in sortedLayers"
                    class="sortable-list-item"
                    :key="item.id">
                  <v-list-item-icon class="mt-1">
                    <v-btn icon @click.stop="item.zoomTo">
                      <img v-if="item.type === 'tile' && $vuetify.theme.dark" src="/images/white_layers.png"
                           alt="Tile layer" width="20px" height="20px"/>
                      <img v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer"
                           width="20px" height="20px"/>
                      <img v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer"
                           width="20px" height="20px"/>
                      <img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                    </v-btn>
                  </v-list-item-icon>
                  <v-list-item-content class="pa-0 ma-0">
                    <v-list-item-title v-text="item.title"></v-list-item-title>
                    <v-list-item-subtitle v-if="item.subtitle" v-text="item.subtitle"></v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-icon class="sortHandle" style="vertical-align: middle !important;">
                    <v-icon>{{ mdiDragHorizontalVariant }}</v-icon>
                  </v-list-item-icon>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 5" step="5" color="primary">
          Set layer's projection
          <small
              class="pt-1">{{
              targetProjection
            }}</small>
        </v-stepper-step>
        <v-stepper-content step="5">
          <v-card flat tile>
            <v-card-subtitle>
              Specify the layer's target projection. <br><small>Note: {{ WEB_MERCATOR_DISPLAY_TEXT }} is recommended for mobile maps.</small>
            </v-card-subtitle>
            <v-card-text>
              <v-radio-group
                  v-model="targetProjection"
                  mandatory
              >
                <v-radio
                    :label=WEB_MERCATOR_DISPLAY_TEXT
                    :value=WEB_MERCATOR
                ></v-radio>
                <v-radio
                    :label=WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT
                    :value=WORLD_GEODETIC_SYSTEM
                ></v-radio>
              </v-radio-group>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 6">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 6" step="6"
                        :rules="[() => (boundingBoxFilter || Number(step) < 6) && (!isEditingBoundingBox() || (Number(step) === 6))]"
                        color="primary">
          Specify bounding box
          <small
              class="pt-1">{{
              isEditingBoundingBox() ? 'Editing bounding box' : (boundingBoxFilter ? 'Bounding box set' : 'Bounding box not set')
            }}</small>
        </v-stepper-step>
        <v-stepper-content step="6">
          <v-card flat tile>
            <v-card-subtitle>
              Provide a bounding box to restrict content from the selected data sources and GeoPackage feature layers
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" allow-extent :project="project"
                                 :boundingBox="boundingBoxFilter"
                                 :update-bounding-box="updateBoundingBox"></bounding-box-editor>
          </v-card>
          <v-btn
              text
              color="primary"
              @click="step = 7">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 7" step="7" color="primary" :rules="[() => areZoomsValid()]">
          Specify zoom levels
        </v-stepper-step>
        <v-stepper-content step="7">
          <v-card flat tile>
            <v-card-subtitle>
              Specify the minimum and maximum zoom levels.
            </v-card-subtitle>
            <v-card-text>
              <v-container>
                <v-row no-gutters>
                  <number-picker ref="minZoom" :number="Number(minZoom)" @update-number="updateMinZoom" label="Min zoom"
                                 :min="Number(0)" :max="Number(20)" :step="Number(1)"/>
                </v-row>
                <v-row no-gutters>
                  <number-picker ref="maxZoom" :number="Number(maxZoom)" @update-number="updateMaxZoom" label="Max zoom"
                                 :min="Number(0)" :max="Number(20)" :step="Number(1)"/>
                </v-row>
              </v-container>
            </v-card-text>
          </v-card>
          <v-btn
              text
              color="primary"
              @click="step = 8">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 8" step="8" color="primary">
          Enable tile scaling
        </v-stepper-step>
        <v-stepper-content step="8">
          <v-card flat tile>
            <v-card-subtitle>
              Tile scaling reduces the number of tiles by searching for tiles at nearby zoom levels and scaling them.
              This in turn reduces the size of the tile layer, but is at the cost of tile quality.
            </v-card-subtitle>
            <v-card-subtitle v-if="geopackageLayers.filter(item => item.type === 'feature' && item.visible).length > 0"
                             class="pt-0 mt-0" style="color:orange;">
              Scaled feature layers may result in visual artifacts in your tile layer.
            </v-card-subtitle>
            <v-card-text>
              <v-container>
                <v-row no-gutters justify="space-between" align="center">
                  <v-col>
                    <p>Enable tile scaling</p>
                  </v-col>
                  <v-col cols="2">
                    <v-switch color="primary" v-model="scalingEnabled"></v-switch>
                  </v-col>
                </v-row>
                <v-row no-gutters>
                  <v-card-subtitle class="pa-0 ma-0">
                    {{ 'Approx. ' }}<b
                      :class="estimatedTileCount > tileWarningThreshold ? 'warning-text' : ''">{{
                      prettify(estimatedTileCount)
                    }}</b>{{ ' tiles will be generated using the selected layers.' }}
                  </v-card-subtitle>
                </v-row>
              </v-container>
            </v-card-text>
          </v-card>
          <v-btn
              text
              color="primary"
              @click="step = 9">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable step="9" color="primary">
          Summary
        </v-stepper-step>
        <v-stepper-content step="9">
          <v-card-text class="ma-0 pa-0">
            <p v-if="(dataSourceLayers.filter(item => item.visible).length + geopackageLayers.filter(item => item.visible).length) === 0"
               class="warning-text">At least one layer is required for import.</p>
            <p v-else-if="boundingBoxFilter == null" class="warning-text">A bounding box is required for import.</p>
            <v-card-subtitle>
              {{ 'Approx. ' }}<b
                :class="estimatedTileCount > tileWarningThreshold ? 'warning-text' : ''">{{
                prettify(estimatedTileCount)
              }}</b>{{ ' tiles will be added to the ' }}<b>{{ geopackage.name + ' GeoPackage' }}</b>{{ ' as the ' }}<b>{{
                layerName
              }}</b>{{ ' tile layer.' }}
            </v-card-subtitle>
            <v-card-subtitle class="pt-0 mt-0 warning-text" v-if="estimatedTileCount > tileWarningThreshold">
              {{
                'This configuration will generate a large number of tiles and may take several minutes to complete. To decrease the number of tiles, you can enable tile scaling, reduce the size of the bounding box, or decrease the maximum zoom level.'
              }}
            </v-card-subtitle>
          </v-card-text>
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
            v-if="!done && !processing"
            :disabled="Number(step) !== 9 || !boundingBoxFilter || !layerNameValid || ((dataSourceLayers.filter(item => item.visible).length + geopackageLayers.filter(item => item.visible).length) === 0)"
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
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import debounce from 'lodash/debounce'
import NumberPicker from '../Common/NumberPicker'
import EventBus from '../../lib/vue/EventBus'
import SourceVisibilitySwitch from '../DataSources/SourceVisibilitySwitch'
import DataSourceTroubleshooting from '../DataSources/DataSourceTroubleshooting'
import BoundingBoxEditor from '../Common/BoundingBoxEditor'
import { zoomToGeoPackageTable, zoomToSource } from '../../lib/leaflet/map/ZoomUtilities'
import { getTileCount } from '../../lib/util/tile/TileUtilities'
import Sortable from 'sortablejs'
import { mdiDragHorizontalVariant } from '@mdi/js'
import {
  WEB_MERCATOR,
  WEB_MERCATOR_DISPLAY_TEXT, WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT
} from '../../lib/projection/ProjectionConstants'
import { DEFAULT_TILE_SIZE } from '../../lib/util/tile/TileConstants'

export default {
  props: {
    project: Object,
    geopackage: Object,
    allowNotifications: Boolean,
    back: Function
  },
  directives: {
    'sortable-list': {
      inserted: (el, binding) => {
        Sortable.create(el, binding.value ? {
          ...binding.value,
          handle: '.sortHandle',
          ghostClass: 'ghost',
          dragClass: 'detail-bg',
          forceFallback: true,
          onChoose: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onStart: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onUnchoose: function () {
            document.body.style.cursor = 'default'
          }, // Dragging started
        } : {})
      },
    },
  },
  components: {
    BoundingBoxEditor,
    DataSourceTroubleshooting,
    SourceVisibilitySwitch,
    NumberPicker
  },
  data () {
    return {
      mdiDragHorizontalVariant: mdiDragHorizontalVariant,
      scalingEnabled: false,
      step: 1,
      layerNameValid: true,
      layerName: 'New tile layer',
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
      minZoom: 0,
      maxZoom: 10,
      tileWarningThreshold: 1000,
      configuration: null,
      cancelling: false,
      internalRenderingOrder: [],
      boundingBoxFilter: null,
      targetProjection: WEB_MERCATOR,
      WEB_MERCATOR_DISPLAY_TEXT,
      WEB_MERCATOR,
      WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT,
      WORLD_GEODETIC_SYSTEM
    }
  },
  methods: {
    updateSortedLayerOrder (evt) {
      document.body.style.cursor = 'default'
      const layerOrderTmp = this.sortedLayers.slice()
      const oldIndex = evt.oldIndex
      let newIndex = Math.max(0, evt.newIndex)
      if (newIndex >= layerOrderTmp.length) {
        let k = newIndex - layerOrderTmp.length + 1
        while (k--) {
          layerOrderTmp.push(undefined)
        }
      }
      layerOrderTmp.splice(newIndex, 0, layerOrderTmp.splice(oldIndex, 1)[0])
      this.sortedLayers = layerOrderTmp
    },
    prettify (value) {
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    },
    filterErroredLayers (layers) {
      this.selectedDataSourceLayers = layers.filter(layerId => isNil(this.project.sources[layerId].error))
    },
    async cancelAddTileLayer () {
      const self = this
      this.cancelling = true
      window.mapcache.cancelAddTileLayer(this.configuration).then(() => {
        setTimeout(() => {
          window.mapcache.deleteGeoPackageTable({
            filePath: self.geopackage.path,
            tableName: self.configuration.table,
            silent: true
          }).then(() => {
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100
            window.mapcache.synchronizeGeoPackage({ projectId: this.project.id, geopackageId: this.geopackage.id })
          }).catch(() => {
            // table may not have been created yet
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100
            window.mapcache.synchronizeGeoPackage({ projectId: this.project.id, geopackageId: this.geopackage.id })
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
        sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => {
          const source = Object.assign({}, this.project.sources[item.id])
          source.drawOverlap = item.drawOverlap
          return source
        }),
        boundingBoxFilter: this.boundingBoxFilter,
        geopackageLayers: this.geopackageLayers.filter(item => item.visible).map(item => {
          return {
            geopackage: this.project.geopackages[item.geopackageId],
            table: item.tableName,
            type: item.type,
            drawOverlap: item.drawOverlap
          }
        }),
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        tileScalingEnabled: this.scalingEnabled,
        renderingOrder: this.sortedLayers.map(sortedLayer => sortedLayer.id),
        targetProjection: this.targetProjection,
        size: {x: DEFAULT_TILE_SIZE, y: DEFAULT_TILE_SIZE}
      }

      window.mapcache.addTileLayer(this.configuration, (status) => {
        if (!this.done) {
          this.status = status
        }
      }).then(() => {
        this.done = true
        window.mapcache.synchronizeGeoPackage({ projectId: this.project.id, geopackageId: this.geopackage.id })
        window.mapcache.notifyTab({ projectId: this.project.id, tabId: 0 })
        if (this.status == null || this.status.error == null) {
          window.mapcache.notifyTab({ projectId: this.project.id, tabId: 0 })
          if (this.allowNotifications) {
            new Notification('GeoPackage tile layer created', {
              body: 'Finished building the "' + this.layerName + '" tile layer',
            }).onclick = () => {
              window.mapcache.sendWindowToFront()
            }
          }
        } else {
          if (this.allowNotifications) {
            new Notification('Failed to create tile layer', {
              body: 'Failed to build the "' + this.layerName + '" tile layer.\r\n' + this.status.error,
            }).onclick = () => {
              window.mapcache.sendWindowToFront()
            }
          }
        }
      })
    },
    cancel () {
      if (this.isEditingBoundingBox()) {
        this.$refs.boundingBoxEditor.stopEditing()
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
    isEditingBoundingBox () {
      if (this.$refs.boundingBoxEditor) {
        return this.$refs.boundingBoxEditor.isEditing()
      }
      return false
    },
    updateBoundingBox (boundingBox) {
      this.boundingBoxFilter = boundingBox
    },
    areZoomsValid () {
      return (this.$refs.minZoom === null || this.$refs.minZoom === undefined || this.$refs.minZoom.isValid()) && (this.$refs.maxZoom === null || this.$refs.maxZoom === undefined || this.$refs.maxZoom.isValid())
    },
    getEstimatedTileCount () {
      const dataSources = this.dataSourceLayers.filter(item => item.visible).map(item => {
        const dataSourceCopy = Object.assign({}, this.project.sources[item.id])
        dataSourceCopy.drawOverlap = item.drawOverlap
        return dataSourceCopy
      })
      const geopackageLayers = this.geopackageLayers.filter(item => item.visible).map(item => {
        return {
          geopackage: this.project.geopackages[item.geopackageId],
          table: item.tableName,
          type: item.type,
          drawOverlap: item.drawOverlap
        }
      })
      let tiles = 0
      if (this.areZoomsValid()) {
        try {
          tiles = getTileCount(this.boundingBoxFilter, dataSources, geopackageLayers, this.scalingEnabled, this.minZoom, this.maxZoom, this.targetProjection, {x: DEFAULT_TILE_SIZE, y: DEFAULT_TILE_SIZE})
        } catch (e) {
          tiles = 0
        }
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
                window.mapcache.setGeoPackageTileTableVisible({ projectId, geopackageId, tableName, visible: !visible })
              }, 100),
              zoomTo: debounce((e) => {
                e.stopPropagation()
                zoomToGeoPackageTable(geopackage, tableName)
              }, 100)
            })
          })
          const featureTableKeys = Object.keys(geopackage.tables.features)
          for (let i = 0; i < featureTableKeys.length; i++) {
            const tableName = featureTableKeys[i]
            const visible = geopackage.tables.features[tableName].visible
            const geopackageId = geopackage.id
            items.push({
              id: geopackageId + '_' + tableName,
              geopackageId: geopackageId,
              tableName: tableName,
              title: geopackage.name,
              drawOverlap: await window.mapcache.getStyleDrawOverlap(geopackage.path, tableName),
              subtitle: tableName,
              visible,
              type: 'feature',
              changeVisibility: debounce(() => {
                window.mapcache.setGeoPackageFeatureTableVisible({
                  projectId,
                  geopackageId,
                  tableName,
                  visible: !visible
                })
              }, 100),
              zoomTo: debounce((e) => {
                e.stopPropagation()
                zoomToGeoPackageTable(geopackage, tableName)
              }, 100)
            })
          }
        }
      }
      return items
    },
    async getDataSourceLayers () {
      const projectId = this.project.id
      const sourceValues = Object.values(this.project.sources)
      const dataSourceLayers = []
      for (let i = 0; i < sourceValues.length; i++) {
        const source = sourceValues[i]
        const dataSourceLayer = {
          title: source.displayName ? source.displayName : source.name,
          source: source,
          error: source.error,
          id: source.id,
          visible: source.visible,
          type: source.pane === 'vector' ? 'feature' : 'tile',
          changeVisibility: debounce(() => {
            if (isNil(source.error)) {
              window.mapcache.setDataSourceVisible({ projectId, sourceId: source.id, visible: !source.visible })
            }
          }, 100),
          zoomTo: debounce((e) => {
            e.stopPropagation()
            zoomToSource(source)
          }, 100)
        }

        if (source.pane === 'vector') {
          dataSourceLayer.drawOverlap = await window.mapcache.getStyleDrawOverlap(source.geopackageFilePath, source.sourceLayerName)
        }

        dataSourceLayers.push(dataSourceLayer)
      }
      return dataSourceLayers
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
    },
    internalRenderingOrder: {
      async get () {
        const items = this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageLayers.filter(item => item.visible))
        return this.project.mapRenderingOrder.map(id => items.find(item => item.id === id)).filter(item => !isNil(item))
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
    estimatedTileCount () {
      return this.getEstimatedTileCount()
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
    const mapZoom = Math.floor(isNil(this.mapZoom) ? 3 : this.mapZoom)
    this.minZoom = Math.min(20, Math.max(0, mapZoom))
    this.maxZoom = Math.min(20, Math.max(0, (this.minZoom + 2)))
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
