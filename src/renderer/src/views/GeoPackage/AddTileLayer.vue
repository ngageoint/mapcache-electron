<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
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
          <v-card-subtitle class="red--text" v-if="status.warning">
            {{ status.warning }}  
          </v-card-subtitle>
        </v-card-text>
        <v-card-actions class="mt-8">
          <v-spacer></v-spacer>
          <v-btn
              v-if="!done"
              variant="text"
              :disabled="cancelling"
              color="warning"
              @click.stop="cancelAddTileLayer">
            {{ cancelling ? 'Cancelling' : 'Cancel' }}
          </v-btn>
          <v-btn
              v-if="done"
              color="primary"
              variant="text"
              @click.stop="cancel">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
      <v-divider/>
    </v-sheet>
    <v-sheet v-else class="mapcache-sheet-content">
      <v-stepper :items="['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Step 6', 'Step 7']" class="background" non-linear vertical
                 :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}" :mobile=true>
        
        <template v-slot:item.1 editable :complete="step > 1" :rules="[() => layerNameValid]" color="primary">
          <v-card flat tile>
            <v-card-subtitle>
              Specify a name for the new GeoPackage tile layer.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent="() => {}" ref="layerNameForm" v-model="layerNameValid">
                <v-text-field
                    variant="underlined"
                    autofocus
                    v-model="layerName"
                    :rules="layerNameRules"
                    label="Layer name"
                    required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
        </template>
        
        <template v-slot:item.2 editable :complete="step > 2" step="2" color="primary">
          Select data sources
          <v-card flat tile>
            <v-card-subtitle>
              <div class="pt-1">{{ selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length }}
                selected</div>
            </v-card-subtitle>
            <v-card-text>
              <div class="text-medium-emphasis">
              Select imagery and features from <b>data sources</b> to populate the <b>{{ layerName }}</b> tile layer.
              </div>
            </v-card-text>
            <v-card-text>
              <v-list density="compact">
                  <template v-for="(item, i) in dataSourceLayers" :key="`data-source-item-${i}`">
                    <v-list-item class=""
                        :value="item.id"
                        @click.stop.prevent="item.changeVisibility"
                        :class="{ 'v-list-item--active': selectedDataSourceLayers.includes(item.id) }"
                        @click="toggleSelection(item.id)">
                      <template v-slot:prepend>
                        <v-btn icon @click.stop="item.zoomTo">
                          <v-img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && dark" src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                          <v-img :style="{verticalAlign: 'middle'}" v-else-if="dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                          <v-img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                          <v-img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                        </v-btn>
                      </template>
                      <template v-slot:default="{ active }">
                        <div>
                          <v-list-item-title class="pl-3">{{ item.title }}</v-list-item-title>
                        </div>
                        <v-list-item-action>
                          <source-visibility-switch class="pl-4" :model-value="active" :project-id="project.id"
                                                    :source="project.sources[item.id]"></source-visibility-switch>
                        </v-list-item-action>
                      </template>
                      <template v-slot:append>
                        <data-source-warning v-if="item.source.warning" :source="item.source"></data-source-warning>
                        <data-source-troubleshooting v-if="item.source.error" :source="item.source"
                                                     :project-id="project.id"></data-source-troubleshooting>
                      </template>
                    </v-list-item>
                    <v-divider
                        v-if="i < dataSourceLayers.length - 1"
                        :key="'data_source_layer_divider_' + i"
                    ></v-divider>
                  </template>
              </v-list>
            </v-card-text>
          </v-card>

          <v-expansion-panels>
            <v-expansion-panel title="Select GeoPackage Layers">
              <v-expansion-panel-text>
                <div class="text-medium-emphasis pt-1 text-subtitle-2">{{ selectedGeoPackageLayers.length === 0 ? 'None' : selectedGeoPackageLayers.length }}
                  selected</div>
                <v-card flat tile>
                    <div class="text-medium-emphasis pt-2 text-subtitle-2">
                      Select imagery and features from existing <b>GeoPackage</b> layers to populate the <b>{{ layerName }}</b>
                      tile layer.
                    </div>
                    <v-list density="compact">
                      <v-list-item-group multiple color="primary" v-model="selectedGeoPackageLayers">
                        <template v-for="(item, i) in geopackageLayers" :key="`geopackage-layer-item-${i}`">
                          <v-list-item
                              :value="item.id"
                              @click.stop="item.changeVisibility">
                            <template v-slot:prepend>
                              <v-btn icon @click.stop="item.zoomTo">
                                <v-img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && dark" src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                                <v-img :style="{verticalAlign: 'middle'}" v-else-if="dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                                <v-img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                                <v-img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                              </v-btn>
                            </template>
                            <template v-slot:default="{ active }">
                              <div>
                                <v-list-item-title class="pl-3">{{ item.title }}</v-list-item-title>
                                <v-list-item-subtitle class="pl-3">{{ item.subtitle }}</v-list-item-subtitle>
                              </div>
                              <v-list-item-action>
                                <v-switch
                                    density="compact"
                                    @click.stop="item.changeVisibility"
                                    :model-value="active"
                                    color="primary"
                                    class="pl-3"
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
                </v-card>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>



          
          <v-card v-if="showSelectableGeoPacakgeLayers">
            Select GeoPackage layers
            <small class="pt-1">{{ selectedGeoPackageLayers.length === 0 ? 'None' : selectedGeoPackageLayers.length }}
              selected</small>
            <v-card flat tile>
              <v-card-subtitle>
                Select imagery and features from existing <b>GeoPackage</b> layers to populate the <b>{{ layerName }}</b>
                tile layer.
              </v-card-subtitle>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item-group multiple color="primary" v-model="selectedGeoPackageLayers">
                    <template v-for="(item, i) in geopackageLayers" :key="`geopackage-layer-item-${i}`">
                      <v-list-item
                          :value="item.id"
                          @click.stop="item.changeVisibility">
                        <template v-slot:prepend>
                          <v-btn icon @click.stop="item.zoomTo">
                            <v-img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && dark" src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                            <v-img :style="{verticalAlign: 'middle'}" v-else-if="dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                            <v-img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                            <v-img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                          </v-btn>
                        </template>
                        <template v-slot:default="{ active }">
                          <div>
                            <v-list-item-title>{{ item.title }}</v-list-item-title>
                            <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
                          </div>
                          <v-list-item-action>
                            <v-switch
                                density="compact"
                                @click.stop="item.changeVisibility"
                                :model-value="active"
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
          </v-card>
        </template>
        <template v-slot:item.3 editable :complete="step > 3" color="primary">
          Order layers
          <small
              class="pt-1">{{
              selectedGeoPackageLayers.length + selectedDataSourceLayers.length === 0 ? 'No layers selected' : ''
            }}
          </small>
          <v-card flat tile>
            <v-card-subtitle>
              Drag the layers to specify the rendering order. Layers at the top of the list will be rendered on top.
            </v-card-subtitle>
            <v-card-text>
              <v-list
                  style="max-height: 350px !important; width: 100% !important; overflow-y: auto !important;"
                  v-sortable="{onEnd:updateSortedLayerOrder}"
                  density="compact">
                <v-list-item
                    v-for="item in sortedLayers"
                    class="sortable-list-item px-0"
                    :key="item.id">
                  <template v-slot:prepend>
                    <v-btn icon @click.stop="item.zoomTo">
                      <v-img v-if="item.type === 'tile' && dark" src="/images/white_layers.png"
                           alt="Tile layer" width="20px" height="20px"/>
                      <v-img v-else-if="dark" src="/images/white_polygon.png" alt="Feature layer"
                           width="20px" height="20px"/>
                      <v-img v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer"
                           width="20px" height="20px"/>
                      <v-img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                    </v-btn>
                  </template>
                  <div class="pl-2 ma-0">
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                    <v-list-item-subtitle v-if="item.subtitle">{{ item.subtitle }}</v-list-item-subtitle>
                  </div>
                  <template v-slot:append class="sortHandle" style="vertical-align: middle !important;">
                    <v-icon @click.sort.prevent icon="mdi-drag-horizontal-variant"/>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </template>
        
        <template v-slot:item.4 editable :complete="step > 4" :rules="[() => (boundingBoxFilter || Number(step) < 7) && (!isEditingBoundingBox() || (Number(step) === 6))]"
        color="primary">
          Specify bounding box
          <small class="pt-1">
            {{
              isEditingBoundingBox() ? 'Editing bounding box' : (boundingBoxFilter ? 'Bounding box set' : 'Bounding box not set')
            }}
          </small>
          <v-card flat tile>
            <v-card-subtitle>
              Provide a bounding box to restrict content from the selected data sources and GeoPackage feature layers
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" allow-extent :project="project"
                                 :boundingBox="boundingBoxFilter"
                                 :update-bounding-box="updateBoundingBox"></bounding-box-editor>
          </v-card>
        </template>
        
        <template v-slot:item.5 editable :complete="step > 5" color="primary" :rules="[() => areZoomsValid()]">
          Specify zoom levels
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
        </template>
        
        <template v-slot:item.6 editable :complete="step > 6" color="primary">
          Set layer's projection
          <small class="pt-1">
            {{ targetProjection }}
          </small>
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
          
          Enable tile scaling
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
        </template>
        
        <template v-slot:item.7 editable color="primary" step="7">
          Summary
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
        </template>
      </v-stepper>
    </v-sheet>

    <div v-if="!processing" class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            color="primary"
            variant="text"
            @click.stop="cancel">
          Cancel
        </v-btn>
        <v-btn
            v-if="!done && !processing"
            :disabled="!boundingBoxFilter || !layerNameValid || ((dataSourceLayers.filter(item => item.visible).length + geopackageLayers.filter(item => item.visible).length) === 0)" 
            color="primary"
            variant="text"
            @click.stop="addTileLayer">
          Add
        </v-btn> <!-- Number(step) !== 9 || -->
      </v-card-actions>
    </div>
  </v-sheet>
</template>

<script>
import { mapState } from 'vuex'
import { toRaw } from 'vue'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import debounce from 'lodash/debounce'
import NumberPicker from '../Common/NumberPicker.vue'
import EventBus from '../../../../lib/vue/EventBus'
import SourceVisibilitySwitch from '../DataSources/SourceVisibilitySwitch.vue'
import DataSourceWarning from '../DataSources/DataSourceWarning.vue'
import DataSourceTroubleshooting from '../DataSources/DataSourceTroubleshooting.vue'
import BoundingBoxEditor from '../Common/BoundingBoxEditor.vue'
import { zoomToGeoPackageTable, zoomToSource } from '../../../../lib/leaflet/map/ZoomUtilities'
import { getTileCount } from '../../../../lib/util/tile/TileUtilities'
import {
  WEB_MERCATOR,
  WEB_MERCATOR_DISPLAY_TEXT, WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT
} from '../../../../lib/projection/ProjectionConstants'
import { DEFAULT_TILE_SIZE } from '../../../../lib/util/tile/TileConstants'
import { setDataSourceVisible } from '../../../../lib/vue/vuex/CommonActions'
import {
  notifyTab,
  setGeoPackageFeatureTableVisible,
  setGeoPackageTileTableVisible,
  synchronizeGeoPackage
} from '../../../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    project: Object,
    dark: {
      type: Boolean,
      default: false
    },
    geopackage: Object,
    allowNotifications: Boolean,
    back: Function
  },
  components: {
    BoundingBoxEditor,
    DataSourceTroubleshooting,
    DataSourceWarning,
    SourceVisibilitySwitch,
    NumberPicker
  },
  data () {
    return {
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
      boundingBoxFilter: null,
      targetProjection: WEB_MERCATOR,
      WEB_MERCATOR_DISPLAY_TEXT,
      WEB_MERCATOR,
      WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT,
      WORLD_GEODETIC_SYSTEM,
      geopackageLayers: [],
      dataSourceLayers: [],
      selectedGeoPackageLayers: [],
      selectedDataSourceLayers: [],
      internalRenderingOrder: [],
      layersPreEnabled: [],
      showSelectableGeoPacakgeLayers: false,
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
    toggleSelection(itemId) {
      const index = this.selectedDataSourceLayers.indexOf(itemId);
      if (index === -1) {
        this.selectedDataSourceLayers.push(itemId);
      } else {
        this.selectedDataSourceLayers.splice(index, 1);
      }
      this.filterErroredLayers();
    },
    filterErroredLayers (layers) {
      this.selectedDataSourceLayers = this.selectedDataSourceLayers.filter(layerId => isNil(this.project.sources[layerId].error))
    },
    toggleShowSelectableGeoPacakgeLayers () {
      this.showSelectableGeoPacakgeLayers = !this.showSelectableGeoPacakgeLayers
    },
    async cancelAddTileLayer () {
      const self = this
      this.cancelling = true
      window.mapcache.cancelAddTileLayer(this.configuration).then(() => {
        setTimeout(() => {
          window.mapcache.deleteGeoPackageTable(this.project.id, self.geopackage.id, self.geopackage.path, self.configuration.table, 'tile', true).then(() => {
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100
            synchronizeGeoPackage(this.project.id, this.geopackage.id)
          }).catch(() => {
            // table may not have been created yet
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100
            synchronizeGeoPackage(this.project.id, this.geopackage.id)
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

      window.mapcache.addTileLayer(window.deproxy(this.configuration), (status) => {
        if (!this.done) {
          this.status = status
        }
      }).then(() => {
        this.done = true
        this.disableSelectedSources()
        synchronizeGeoPackage(this.project.id, this.geopackage.id).then(() => {
          notifyTab(this.project.id, 0)
          if (this.status == null || this.status.error == null) {
            notifyTab(this.project.id, 0)
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
      })
    },
    cancel () {
      this.disableSelectedSources()
      if (this.isEditingBoundingBox()) {
        this.$refs.boundingBoxEditor.stopEditing()
      }
      this.back()
    },
    disableSelectedSources () {
      const sourceValues = Object.values(this.project.sources)
      for (let i = 0; i < sourceValues.length; i++) {
        const source = sourceValues[i]
        if (!this.layersPreEnabled.includes(source.name)) {
          setDataSourceVisible(this.project.id, source.id, false)
        }
      }
    },
    savePreEnabledLayers () {
      const sourceValues = Object.values(this.project.sources)
      for (let i = 0; i < sourceValues.length; i++) {
        const source = sourceValues[i]
        if (source.visible) {
          this.layersPreEnabled.push(source.name)
        }
      }
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
        if (await window.mapcache.isHealthy(geopackage.path, geopackage.modifiedDate)) {
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
                setGeoPackageTileTableVisible(projectId, geopackageId, tableName, !visible)
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
                setGeoPackageFeatureTableVisible(projectId, geopackageId, tableName, !visible)
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
              setDataSourceVisible(projectId, source.id, !source.visible)
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
    }, 100),
    async updateProjectData (callback) {
      this.dataSourceLayers = await this.getDataSourceLayers()
      this.selectedDataSourceLayers = this.dataSourceLayers.filter(item => item.visible).map(item => item.id)
      this.geopackageLayers = await this.getGeoPackageLayerItems()
      this.selectedGeoPackageLayers = this.geopackageLayers.filter(item => item.visible).map(item => item.id)
      const items = this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageLayers.filter(item => item.visible))
      this.internalRenderingOrder = this.project.mapRenderingOrder.map(id => items.find(item => item.id === id)).filter(item => !isNil(item))
      if(callback){
        callback()
      }
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
        await this.updateProjectData()
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
  },
  created () {
    this.updateProjectData(() => {
      this.savePreEnabledLayers()
    })
  }
}
</script>

<style scoped>
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
  background: rgb(var(--v-theme-background)) !important;
}

.list-item i {
  cursor: pointer !important;
}
</style>
