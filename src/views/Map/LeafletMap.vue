<template>
  <div v-show="visible" :style="{width: '100%', height: '100%', zIndex: 0, position: 'relative', display: 'flex'}">
    <div id="map" :style="{width: '100%',  zIndex: 0, flex: 1, backgroundColor: mapBackground}">
      <div id='tooltip' :style="{top: project.displayAddressSearchBar ? '54px' : '10px'}"></div>
      <v-dialog
        v-model="geopackageExistsDialog"
        max-width="400"
        persistent
        @keydown.esc="cancelDrawing">
        <v-card>
          <v-card-title>
            <v-icon color="orange" class="pr-2">{{mdiAlert}}</v-icon>
            Create GeoPackage warning
          </v-card-title>
          <v-card-text>
            <v-card-subtitle>
              The name of the geopackage you tried to create already exists. Would you like try another file name?
            </v-card-subtitle>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="cancelDrawing">
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              text
              @click="confirmGeoPackageFeatureLayerSelection">
              OK
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="layerSelectionVisible"
        max-width="450"
        persistent
        @keydown.esc="cancelDrawing">
        <v-card v-if="layerSelectionVisible">
          <v-card-title>
            Add feature
          </v-card-title>
          <v-card-text>
            Add feature to the selected GeoPackage and feature layer.
            <v-row no-gutters class="mt-4">
              <v-col cols="12">
                <v-select v-model="geoPackageSelection" :items="geoPackageChoices" label="GeoPackage" dense>
                </v-select>
              </v-col>
            </v-row>
            <v-row v-if="geoPackageSelection !== 0" no-gutters>
              <v-col cols="12">
                <v-select v-model="geoPackageFeatureLayerSelection" :items="geoPackageFeatureLayerChoices" label="Feature layer" dense>
                </v-select>
              </v-col>
            </v-row>
            <v-form ref="featureTableNameForm" v-on:submit.prevent v-if="geoPackageSelection === 0 || geoPackageFeatureLayerSelection === 0" v-model="featureTableNameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                      autofocus
                      v-model="featureTableName"
                      :rules="featureTableNameRules"
                      label="Feature layer name"
                      required
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="cancelDrawing">
              Cancel
            </v-btn>
            <v-btn
              v-if="geoPackageFeatureLayerSelection !== 0 || featureTableNameValid"
              color="primary"
              text
              @click="confirmGeoPackageFeatureLayerSelection">
              Confirm
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="showAddFeatureDialog"
        max-width="500"
        scrollable
        persistent
        @keydown.esc="cancelAddFeature">
        <feature-editor v-if="showAddFeatureDialog" :projectId="projectId" :id="featureToAddGeoPackage.id" :save-new-feature="saveFeature" :geopackage-path="featureToAddGeoPackage.path" :tableName="featureToAddTableName" :columns="featureToAddColumns" :feature="featureToAdd" :close="cancelAddFeature" :is-geo-package="true"></feature-editor>
      </v-dialog>
    </div>
    <div v-show="contextMenuPopup != null" id="context-menu-popup" ref="contextMenuPopup">
      <v-list>
        <v-list-item dense @click="() => {copyText(contextMenuCoordinate.lat.toFixed(6) + ', ' + contextMenuCoordinate.lng.toFixed(6))}">
          {{contextMenuCoordinate ? (contextMenuCoordinate.lat.toFixed(6) + ', ' + contextMenuCoordinate.lng.toFixed(6)) : ''}}
        </v-list-item>
        <v-list-item dense @click="() => {copyText(convertToDms(contextMenuCoordinate.lat, false) + ', ' + convertToDms(contextMenuCoordinate.lng, true))}">
          {{contextMenuCoordinate ? (convertToDms(contextMenuCoordinate.lat, false) + ', ' + convertToDms(contextMenuCoordinate.lng, true)) : ''}}
        </v-list-item>
        <v-list-item dense @click="performReverseQuery">
          What's here?
        </v-list-item>
      </v-list>
    </div>
    <v-snackbar
      v-if="copiedToClipboard"
      v-model="copiedToClipboard"
      timeout="1500"
      absolute
    >
      Copied to clipboard.
    </v-snackbar>
    <v-expand-transition>
      <v-card
        tile
        id="feature-table-ref"
        ref="featureTableRef"
        v-show="showFeatureTable"
        class="mx-auto"
        style="max-height: 385px; overflow-y: auto; position: absolute; bottom: 0; z-index: 0; width: 100%">
        <v-card-text class="pa-0 ma-0 mb-2">
          <feature-table :projectId="projectId" :geopackages="geopackages" :sources="sources" :tableFeatures="tableFeatures" :zoomToFeature="zoomToFeature" :close="hideFeatureTable"></feature-table>
        </v-card-text>
      </v-card>
    </v-expand-transition>
    <v-card outlined v-if="showLayerOrderingDialog" class="reorder-card" :style="{top: getReorderCardOffset()}">
      <v-card-title>
        Layer Order
      </v-card-title>
      <v-card-text>
        <v-card-subtitle class="pt-1 pb-1">
          Drag layers to specify the map rendering order.
        </v-card-subtitle>
        <draggable
          v-model="layerOrder"
          class="list-group pl-0 card-content"
          ghost-class="ghost"
          tag="ul"
          v-bind="dragOptions"
          @start="drag = true"
          @end="drag = false">
          <transition-group type="transition" :name="!drag ? 'flip-list' : null" :class="`v-list v-sheet ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'} v-list--dense`">
            <li v-for="(item) in layerOrder" :key="item.id" :class="`layer-order-list-item v-list-item ${drag ? '' : 'v-item--active v-list-item--link'} ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'}`">
              <v-list-item-icon>
                <v-btn icon @click.stop="item.zoomTo">
                  <img :style="{verticalAlign: 'middle'}" v-if="item.type === 'tile' && $vuetify.theme.dark" src="/images/white_layers.png" alt="Tile layer" width="20px" height="20px"/>
                  <img :style="{verticalAlign: 'middle'}" v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                  <img :style="{verticalAlign: 'middle'}" v-else-if="item.type === 'tile'" src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
                  <img :style="{verticalAlign: 'middle'}" v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
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
    <v-card outlined v-if="showBaseMapSelection" class="basemap-card">
      <v-card-title class="pb-2">
        Base maps
      </v-card-title>
      <v-card-text class="pb-2">
        <v-card-subtitle class="pt-1 pb-1">
          Select a base map.
        </v-card-subtitle>
        <v-list dense class="pa-0" style="max-height: 200px; overflow-y: auto;">
          <v-list-item-group v-model="selectedBaseMapId" mandatory>
            <v-list-item v-for="item of baseMapItems" :key="item.id" :value="item.id">
              <v-list-item-icon style="margin-right: 16px;">
                <v-btn style="width: 24px; height: 24px;" icon @click.stop="(e) => item.zoomTo(e)">
                  <v-icon small>{{mdiMapOutline}}</v-icon>
                </v-btn>
              </v-list-item-icon>
              <v-list-item-title>{{item.name}}</v-list-item-title>
              <base-map-troubleshooting v-if="item.baseMap.error" :base-map="item.baseMap"></base-map-troubleshooting>
              <geo-t-i-f-f-troubleshooting v-if="item.missingRaster" :source-or-base-map="item.baseMap"></geo-t-i-f-f-troubleshooting>
              <v-progress-circular
                v-if="item.id == selectedBaseMapId && connectingToBaseMap"
                indeterminate
                color="primary"
              ></v-progress-circular>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
    </v-card>
    <v-card v-if="project.displayAddressSearchBar" outlined class="nominatim-card ma-0 pa-0 transparent">
      <nominatim-search :project="project" :map-bounds="mapBounds"/>
    </v-card>
    <div v-show="false">
      <nominatim-result-map-popup ref="searchResultPopup" :result="hoveredSearchResult" :mouseover="cancelSearchResultPopupClose" :mouseleave="searchResultClose"></nominatim-result-map-popup>
    </div>
  </div>
</template>

<script>
import { L } from '../../lib/leaflet/vendor'
import { mapState } from 'vuex'
import EventBus from '../../lib/vue/EventBus'
import isNil from 'lodash/isNil'
import debounce from 'lodash/debounce'
import cloneDeep from 'lodash/cloneDeep'
import keys from 'lodash/keys'
import isEqual from 'lodash/isEqual'
import difference from 'lodash/difference'
import pick from 'lodash/pick'
import throttle from 'lodash/throttle'
import 'leaflet-geosearch/dist/geosearch.css'
import LeafletActiveLayersTool from '../../lib/leaflet/map/controls/LeafletActiveLayersTool'
import DrawBounds from './mixins/DrawBounds'
import GridBounds from './mixins/GridBounds'
import FeatureTable from './FeatureTable'
import LeafletZoomIndicator from '../../lib/leaflet/map/controls/LeafletZoomIndicator'
import LeafletEdit from '../../lib/leaflet/map/controls/LeafletEdit'
import LeafletDraw from '../../lib/leaflet/map/controls/LeafletDraw'
import FeatureEditor from '../Common/FeatureEditor'
import draggable from 'vuedraggable'
import LeafletBaseMapTool from '../../lib/leaflet/map/controls/LeafletBaseMapTool'
import BaseMapTroubleshooting from '../BaseMaps/BaseMapTroubleshooting'
import { constructMapLayer } from '../../lib/leaflet/map/layers/LeafletMapLayerFactory'
import { constructLayer } from '../../lib/layer/LayerFactory'
import { getDefaultBaseMaps, getOfflineBaseMapId } from '../../lib/util/basemaps/BaseMapUtilities'
import { isRemote } from '../../lib/layer/LayerTypes'
import { connectToBaseMap } from '../../lib/network/ServiceConnectionUtils'
import {
  GRID_SELECTION_PANE,
  BASE_MAP_PANE,
  EDITING_PANE,
  SEARCH_RESULTS_PANE,
  SEARCH_RESULT_POINTS_ONLY_PANE
} from '../../lib/leaflet/map/panes/MapPanes'
import { mdiAlert, mdiClose, mdiContentCopy, mdiMapOutline, mdiMagnify } from '@mdi/js'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import {
  zoomToBaseMap,
  zoomToExtent,
  zoomToGeoPackageFeature,
  zoomToGeoPackageTable,
  zoomToSource
} from '../../lib/util/ZoomUtilities'
import NominatimSearch from '../Nominatim/NominatimSearch'
import NominatimResultMapPopup from '../Nominatim/NominatimResultMapPopup'
import SearchResult from './mixins/SearchResults'
import { getDefaultIcon } from '../../lib/util/style/BrowserStyleUtilities'
import { getDefaultMapCacheStyle } from '../../lib/util/style/CommonStyleUtilities'
import { reverseQueryNominatim } from '../../lib/util/nominatim/NominatimUtilities'

const NEW_GEOPACKAGE_OPTION = {text: 'New GeoPackage', value: 0}
const NEW_FEATURE_LAYER_OPTION = {text: 'New feature layer', value: 0}
// millisecond threshold for double clicks, if user single clicks, there will be a 200ms delay in running a feature query
const DOUBLE_CLICK_THRESHOLD = 200

// objects for storing state
const geopackageLayers = {}

function generateLayerOrderItemForSource (source) {
  return {
    title: source.displayName ? source.displayName : source.name,
    id: source.id,
    type: source.pane === 'vector' ? 'feature' : 'tile',
    zoomTo: debounce((e) => {
      e.stopPropagation()
      zoomToSource(source)
    }, 100)
  }
}

function generateLayerOrderItemForGeoPackageTable (geopackage, tableName, isTile) {
  return {
    id: geopackage.id + '_' + tableName,
    geopackageId: geopackage.id,
    tableName: tableName,
    title: geopackage.name,
    subtitle: tableName,
    type: isTile ? 'tile' : 'vector',
    zoomTo: debounce((e) => {
      e.stopPropagation()
      zoomToGeoPackageTable(geopackage, tableName)
    }, 100)
  }
}

export default {
  mixins: [
    DrawBounds,
    GridBounds,
    SearchResult
  ],
  props: {
    sources: Object,
    geopackages: Object,
    projectId: String,
    project: Object,
    resizeListener: Number,
    visible: Boolean
  },
  computed: {
    dragOptions () {
      return {
        animation: 200,
        group: 'layers'
      }
    },
    ...mapState({
      baseMapItems: state => {
        return  getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || []).map(baseMapConfig => {
          return {
            id: baseMapConfig.id,
            updateKey: 0,
            baseMap: baseMapConfig,
            name: baseMapConfig.name,
            missingRaster: window.mapcache.isRasterMissing(baseMapConfig.layerConfiguration),
            zoomTo: debounce((e) => {
              e.stopPropagation()
              zoomToBaseMap(baseMapConfig)
            }, 100)
          }
        })
      },
      baseMaps: state => {
        return  getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || [])
      }
    })
  },
  components: {
    NominatimResultMapPopup,
    NominatimSearch,
    GeoTIFFTroubleshooting,
    BaseMapTroubleshooting,
    FeatureEditor,
    FeatureTable,
    draggable
  },
  data () {
    return {
      mapBounds: [-180, -90, 180, 90],
      consecutiveClicks: 0,
      mdiAlert: mdiAlert,
      mdiClose: mdiClose,
      mdiMagnify: mdiMagnify,
      mdiContentCopy: mdiContentCopy,
      mdiMapOutline: mdiMapOutline,
      geoPackageMapLayers: {},
      baseMapLayers: {},
      offlineBaseMapId: getOfflineBaseMapId(),
      defaultBaseMapIds: getDefaultBaseMaps().map(bm => bm.id),
      dataSourceMapLayers: {},
      notReadOnlyBaseMapFilter: baseMap => !baseMap.readonly,
      geopackageMapLayers: {},
      selectedBaseMapId: '0',
      isDrawing: false,
      maxFeatures: undefined,
      NEW_GEOPACKAGE_OPTION,
      NEW_FEATURE_LAYER_OPTION,
      layerSelectionVisible: false,
      geoPackageChoices: [NEW_GEOPACKAGE_OPTION],
      popup: null,
      showFeatureTable: false,
      tableFeatures: {
        geopackageTables: [],
        sourceTables: []
      },
      tableFeaturesLatLng: null,
      geoPackageFeatureLayerChoices: [NEW_FEATURE_LAYER_OPTION],
      geoPackageSelection: 0,
      geoPackageFeatureLayerSelection: 0,
      geoPackageFeatureLayerSelectionHasEditableFields: false,
      lastCreatedFeature: null,
      featureTableNameValid: false,
      featureTableName: 'Feature layer',
      featureTableNameRules: [
        v => !!v || 'Layer name is required',
        v => /^[\w,\s-]+$/.test(v) || 'Layer name is not valid',
        v => (this.geoPackageSelection === 0 || keys(this.geopackages[this.geoPackageSelection].tables.features).map(table => table.toLowerCase()).findIndex(table => table === v.toLowerCase()) === -1) || 'Layer name already exists'
      ],
      showAddFeatureDialog: false,
      featureToAdd: null,
      featureToAddColumns: null,
      featureToAddGeoPackage: null,
      featureToAddTableName: null,
      lastShowFeatureTableEvent: null,
      geopackageExistsDialog: false,
      dialogCoordinate: null,
      copiedToClipboard: false,
      isEditing: false,
      showLayerOrderingDialog: false,
      showBaseMapSelection: false,
      drag: false,
      layerOrder: [],
      mapBackground: '#ddd',
      displayNetworkError: false,
      connectingToBaseMap: false,
      manualBoundingBoxDialog: false,
      nominatimReverseQueryResultsReturned: false,
      contextMenuCoordinate: null,
      contextMenuPopup: null,
      performingReverseQuery: false
    }
  },
  methods: {
    getMapCenterAndZoom () {
      return {center: this.map.getCenter(), zoom: this.map.getZoom()}
    },
    getReorderCardOffset () {
      let yOffset = 234
      if (!this.project.zoomControlEnabled) {
        yOffset -= 74
      }
      if (!this.project.displayZoomEnabled) {
        yOffset -= 44
      }
      return yOffset + 'px !important'
    },
    addLayerToMap (map, layer, item) {
      layer.addTo(map)
      if (this.layerOrder.findIndex(i => i.id === item.id) === -1) {
        this.layerOrder.unshift(item)
      }
    },
    removeLayerFromMap (layer, id) {
      layer.remove()
      const index = this.layerOrder.findIndex(l => l.id === id)
      if (index !== -1) {
        this.layerOrder.splice(index, 1)
      }
    },
    hideFeatureTable () {
      this.showFeatureTable = false
      this.tableFeatures = {
        geopackageTables: [],
        sourceTables: []
      }
    },
    displayFeatureTable () {
      this.$nextTick(() => {
        this.showFeatureTable = true
      })
    },
    copyText (text) {
      window.mapcache.copyToClipboard(text)
      this.closePopup()
      setTimeout(() => {
        this.copiedToClipboard = true
      }, 100)
    },
    async confirmGeoPackageFeatureLayerSelection () {
      this.geopackageExistsDialog = false
      this.featureToAdd = null
      this.featureToAddColumns = null
      this.featureToAddGeoPackage = null
      this.featureToAddTableName = null
      let self = this
      let feature = null
      let additionalFeature = null
      if (this.createdLayer != null) {
        feature = this.createdLayer.toGeoJSON()
        feature.id = window.mapcache.createUniqueID()
        if (!isNil(this.createdLayer._mRadius)) {
          feature.properties.radius = this.createdLayer._mRadius
        }
        if (feature.geometry.type === 'Point') {
          feature.style = {
            icon: await getDefaultIcon('Default', 'Default icon for MapCache')
          }
        } else {
          feature.style = {
            style: getDefaultMapCacheStyle()
          }
        }
        // normalize longitudes for drawings
        switch (feature.geometry.type.toLowerCase()) {
          case 'point': {
            feature.geometry.coordinates[0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[0])
            break
          }
          case 'linestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              feature.geometry.coordinates[i][0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[i][0])
            }
            break
          }
          case 'polygon':
          case 'multilinestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j][0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[i][j][0])
              }
            }
            break
          }
          case 'multipolygon': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                for (let k = 0; k < feature.geometry.coordinates[i][j].length; k++) {
                  feature.geometry.coordinates[i][j][k][0] = window.mapcache.normalizeLongitude(feature.geometry.coordinates[i][j][k][0])
                }
              }
            }
            break
          }
        }
      } else if (this.searchResultToSave != null) {
        feature = this.searchResultToSave.feature
        feature.id = window.mapcache.createUniqueID()
        additionalFeature = this.searchResultToSave.pointFeature
      }

      const featureTableName = this.featureTableName
      let featureCollection = {
        type: 'FeatureCollection',
        features: [feature]
      }
      if (additionalFeature != null) {
        additionalFeature.id = window.mapcache.createUniqueID()
        featureCollection.features.push(additionalFeature)
      }

      if (this.geoPackageSelection === 0) {
        window.mapcache.showSaveDialog({
          title: 'New GeoPackage'
        }).then(({canceled, filePath}) => {
          if (!canceled) {
            if (!filePath.endsWith('.gpkg')) {
              filePath = filePath + '.gpkg'
            }
            if (window.mapcache.fileExists(filePath)) {
              this.geopackageExistsDialog = true
            } else {
              this.cancelDrawing()
              this.$nextTick(() => {
                window.mapcache.createGeoPackageWithFeatureTable(self.projectId, filePath, featureTableName, featureCollection).then(() => {
                  window.mapcache.notifyTab({projectId: self.projectId, tabId: 0})
                })
              })
            }
          } else {
            this.cancelDrawing()
          }
        })
      } else {
        const self = this
        const geopackage = this.geopackages[this.geoPackageSelection]
        if (this.geoPackageFeatureLayerSelection === 0) {
          window.mapcache.addFeatureTableToGeoPackage({projectId: self.projectId, geopackageId: geopackage.id, tableName: featureTableName, featureCollection: featureCollection}).then(() => {
            window.mapcache.notifyTab({projectId: self.projectId, tabId: 0})
          })
          this.cancelDrawing()
        } else {
          const featureTable = self.geoPackageFeatureLayerChoices[self.geoPackageFeatureLayerSelection].text
          const columns = await window.mapcache.getFeatureColumns(geopackage.path, featureTable)
          if (!isNil(columns) && !isNil(columns._columns) && columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id').length > 0) {
            self.featureToAdd = feature
            self.additionalFeatureToAdd = additionalFeature
            self.featureToAddGeoPackage = geopackage
            self.featureToAddTableName = featureTable
            self.featureToAddColumns = columns
            self.$nextTick(() => {
              self.showAddFeatureDialog = true
              self.$nextTick(() => {
                self.cancelDrawing()
              })
            })
          } else {
            self.additionalFeatureToAdd = additionalFeature
            await self.saveFeature(self.project.id, geopackage.id, featureTable, feature)
            self.cancelDrawing()
          }
        }
      }
    },
    async saveFeature (projectId, geopackageId, tableName, feature) {
      await window.mapcache.addFeatureToGeoPackage({projectId: projectId, geopackageId: geopackageId, tableName: tableName, feature: feature})
      if (this.additionalFeatureToAdd) {
        this.additionalFeatureToAdd.properties = Object.assign({}, feature.properties)
        await window.mapcache.addFeatureToGeoPackage({projectId: projectId, geopackageId: geopackageId, tableName: tableName, feature: this.additionalFeatureToAdd})
        this.additionalFeatureToAdd = null
      }
      window.mapcache.notifyTab({projectId: projectId, tabId: 0})
    },
    cancelDrawing () {
      this.$nextTick(() => {
        this.geopackageExistsDialog = false
        this.layerSelectionVisible = false
        if (this.createdLayer != null) {
          this.map.removeLayer(this.createdLayer)
          this.createdLayer = null
        }
        this.featureTableName = 'Feature layer'
        this.geoPackageFeatureLayerSelection = 0
        this.geoPackageSelection = 0
      })
    },
    zoomToFeature (path, table, featureId) {
      zoomToGeoPackageFeature(path, table, featureId)
    },
    addDataSource (sourceConfiguration, map) {
      const self = this
      const sourceId = sourceConfiguration.id
      let source = constructLayer(sourceConfiguration)
      self.dataSourceMapLayers[sourceId] = constructMapLayer({layer: source, maxFeatures: this.project.maxFeatures})
      // if it is visible, try to initialize it
      if (source.visible) {
        this.addLayerToMap(map, this.dataSourceMapLayers[sourceId], generateLayerOrderItemForSource(this.dataSourceMapLayers[sourceId].getLayer()))
      }
    },
    removeDataSource (sourceId) {
      if (!isNil(this.dataSourceMapLayers[sourceId])) {
        this.removeLayerFromMap(this.dataSourceMapLayers[sourceId], sourceId)
        delete this.dataSourceMapLayers[sourceId]
      }
    },
    addBaseMap (baseMap, map) {
      let self = this
      const baseMapId = baseMap.id
      const defaultBaseMap = getDefaultBaseMaps().find(bm => bm.id === baseMapId)
      if (baseMapId === getOfflineBaseMapId()) {
        self.baseMapLayers[baseMapId] = L.geoJSON(window.mapcache.getOfflineMap(), {
          pane: BASE_MAP_PANE.name,
          zIndex: BASE_MAP_PANE.zIndex,
          style: function() {
            return {
              color: '#000000',
              weight: 0.5,
              fill: true,
              fillColor: '#F9F9F6',
              fillOpacity: 1
            }
          }
        })
        if (self.selectedBaseMapId === baseMapId) {
          map.addLayer(self.baseMapLayers[baseMapId])
          this.setAttribution(baseMap.attribution)
          self.baseMapLayers[baseMapId].bringToBack()
        }
      } else if (!isNil(defaultBaseMap)) {
        self.baseMapLayers[baseMapId] = L.tileLayer(defaultBaseMap.layerConfiguration.url, {
          pane: BASE_MAP_PANE.name,
          zIndex: BASE_MAP_PANE.zIndex,
          subdomains: defaultBaseMap.layerConfiguration.subdomains || [],
          attribution: defaultBaseMap.layerConfiguration.attribution || '',
          minZoom: 0,
          maxZoom: 20
        })
        if (self.selectedBaseMapId === baseMapId) {
          map.addLayer(self.baseMapLayers[baseMapId])
          this.setAttribution(baseMap.attribution)
          self.baseMapLayers[baseMapId].bringToBack()
        }
      } else {
        let layer = constructLayer(baseMap.layerConfiguration)
        self.baseMapLayers[baseMapId] = constructMapLayer({layer: layer, maxFeatures: self.project.maxFeatures})
        if (self.selectedBaseMapId === baseMapId) {
          map.addLayer(self.baseMapLayers[baseMapId])
          this.setAttribution(baseMap.attribution)
          self.baseMapLayers[baseMapId].bringToBack()
        }
      }
    },
    closePopup() {
      this.map.removeLayer(this.contextMenuPopup)
      this.$nextTick(() => {
        this.copiedToClipboard = false
      })

    },
    convertToDms (dd, isLng) {
      const dir = dd < 0
        ? isLng ? 'W' : 'S'
        : isLng ? 'E' : 'N'

      const absDd = Math.abs(dd)
      const deg = absDd | 0
      const frac = absDd - deg
      const min = (frac * 60) | 0
      let sec = frac * 3600 - min * 60
      // Round it to 2 decimal points.
      sec = Math.round(sec * 100) / 100
      return deg + "°" + min + "'" + sec + '"' + dir
    },
    cancelAddFeature () {
      this.$nextTick(() => {
        this.showAddFeatureDialog = false
        this.cancelDrawing()
      })
    },
    async displayFeaturesForTable (id, tableName, isGeoPackage) {
      if (!isNil(id) && !isNil(tableName) && ((isGeoPackage && !isNil(this.geopackages[id]) && !isNil(this.geopackages[id].tables.features[tableName])) || (!isGeoPackage && !isNil(this.sources[id])))) {
        try {
          this.lastShowFeatureTableEvent = {
            id,
            tableName,
            isGeoPackage
          }
          this.tableFeaturesLatLng = null
          if (isGeoPackage) {
            const geopackage = this.geopackages[id]
            const features = await window.mapcache.getAllFeaturesAsGeoJSON(geopackage.path, tableName)
            this.tableFeatures = {
              geopackageTables: [{
                id: geopackage.id + '_' + tableName,
                tabName: geopackage.name + ': ' + tableName,
                geopackageId: geopackage.id,
                tableName: tableName,
                columns: await window.mapcache.getFeatureColumns(geopackage.path, tableName),
                features: features,
                featureStyleAssignments: await window.mapcache.getStyleAssignmentForFeatures(geopackage.path, tableName),
                featureAttachmentCounts: await window.mapcache.getMediaAttachmentsCounts(geopackage.path, tableName)
              }],
              sourceTables: []
            }
          } else {
            const sourceLayerConfig = this.sources[id]
            const features = await window.mapcache.getAllFeaturesAsGeoJSON(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
            this.tableFeatures = {
              geopackageTables: [],
              sourceTables: [{
                id: sourceLayerConfig.id,
                tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
                sourceId: sourceLayerConfig.id,
                tableName: sourceLayerConfig.sourceLayerName,
                columns: await window.mapcache.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                features: features,
                featureStyleAssignments: await window.mapcache.getStyleAssignmentForFeatures(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                featureAttachmentCounts: await window.mapcache.getMediaAttachmentsCounts(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
              }]
            }
          }
          this.displayFeatureTable()
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to retrieve features.')
          this.hideFeatureTable()
        }
      } else {
        this.hideFeatureTable()
      }
    },
    addGeoPackageToMap (geopackage, map) {
      this.removeGeoPackage(geopackage.id)
      this.geopackageMapLayers[geopackage.id] = {}
      geopackageLayers[geopackage.id] = cloneDeep(geopackage)
      keys(geopackage.tables.tiles).filter(tableName => geopackage.tables.tiles[tableName].visible).forEach(tableName => {
        this.addGeoPackageTileTable(geopackage, map, tableName)
      })
      keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible).forEach(tableName => {
        this.addGeoPackageFeatureTable(geopackage, map, tableName)
      })
    },
    removeGeoPackageTable (geopackageId, tableName) {
      if (!isNil(this.geopackageMapLayers[geopackageId]) && !isNil(this.geopackageMapLayers[geopackageId][tableName])) {
        const layer = this.geopackageMapLayers[geopackageId][tableName]
        this.removeLayerFromMap(layer, geopackageId + '_' + tableName)
        delete this.geopackageMapLayers[geopackageId][tableName]
      }
    },
    removeGeoPackage (geopackageId) {
      for (let tableName of keys(this.geopackageMapLayers[geopackageId])) {
        this.removeGeoPackageTable(geopackageId, tableName)
      }
      delete this.geopackageMapLayers[geopackageId]
    },
    addGeoPackageTileTable (geopackage, map, tableName) {
      let self = this
      let layer = constructLayer({
        id: geopackage.id + '_' + tableName,
        filePath: geopackage.path,
        sourceLayerName: tableName,
        layerType: 'GeoPackage',
        extent: geopackage.tables.tiles[tableName].extent,
        minZoom: geopackage.tables.tiles[tableName].minZoom,
        maxZoom: geopackage.tables.tiles[tableName].maxZoom
      })
      let mapLayer = constructMapLayer({layer: layer})
      if (geopackage.tables.tiles[tableName].visible) {
        self.geopackageMapLayers[geopackage.id][tableName] = mapLayer
        self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, true))
      }
    },
    addGeoPackageFeatureTable (geopackage, map, tableName) {
      let self = this
      let layer = constructLayer({
        id: geopackage.id + '_' + tableName,
        geopackageFilePath: geopackage.path,
        sourceDirectory: geopackage.path,
        sourceLayerName: tableName,
        sourceType: 'GeoPackage',
        layerType: 'Vector',
        styleKey: geopackage.tables.features[tableName].styleKey,
        count: geopackage.tables.features[tableName].featureCount,
        extent: geopackage.tables.features[tableName].extent,
      })
      let mapLayer = constructMapLayer({layer: layer, maxFeatures: this.project.maxFeatures})
      if (geopackage.tables.features[tableName].visible) {
        self.geopackageMapLayers[geopackage.id][tableName] = mapLayer
        self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, false))
      }
    },
    async zoomToContent () {
      let self = this
      self.getExtentForVisibleGeoPackagesAndLayers().then((extent) => {
        if (!isNil(extent)) {
          zoomToExtent(extent)
        }
      })
    },
    updateExtent (overallExtent, layerExtent) {
      if (isNil(overallExtent)) {
        overallExtent = layerExtent.slice()
      } else {
        if (layerExtent[0] < overallExtent[0]) {
          overallExtent[0] = layerExtent[0]
        }
        if (layerExtent[1] < overallExtent[1]) {
          overallExtent[1] = layerExtent[1]
        }
        if (layerExtent[2] > overallExtent[2]) {
          overallExtent[2] = layerExtent[2]
        }
        if (layerExtent[3] > overallExtent[3]) {
          overallExtent[3] = layerExtent[3]
        }
      }
      return overallExtent
    },
    async getExtentForVisibleGeoPackagesAndLayers () {
      let overallExtent = null
      let geopackageKeys = keys(geopackageLayers)
      for (let i = 0; i < geopackageKeys.length; i++) {
        const geopackageId = geopackageKeys[i]
        const geopackage = geopackageLayers[geopackageId]
        const tablesToZoomTo = keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
        const extentForGeoPackage = await window.mapcache.getExtentOfGeoPackageTables(geopackage.path, tablesToZoomTo)
        if (!isNil(extentForGeoPackage)) {
          overallExtent = this.updateExtent(overallExtent, extentForGeoPackage)
        }
      }
      const visibleSourceKeys = keys(this.dataSourceMapLayers).filter(key => this.dataSourceMapLayers[key].getLayer().visible)
      for (let i = 0; i < visibleSourceKeys.length; i++) {
        const layerExtent = this.dataSourceMapLayers[visibleSourceKeys[i]].getLayer().extent
        if (!isNil(layerExtent)) {
          overallExtent = this.updateExtent(overallExtent, layerExtent)
        }
      }

      if (this.searchResultLayers != null) {
        const bounds = this.searchResultLayers.pointFeatures.getBounds().extend(this.searchResultLayers.nonPointFeatures.getBounds()).pad(0.5)
        overallExtent = this.updateExtent(overallExtent, [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()])
      }

      return overallExtent
    },
    async queryForFeatures (e) {
      if (!this.editingControl.isEditing() && !this.drawingControl.isDrawing && !this.layerSelectionVisible && !this.showAddFeatureDialog && isNil(this.drawBoundsId) && isNil(this.gridBoundsId)) {
        let tableFeatures = {
          geopackageTables: [],
          sourceTables: []
        }
        const geopackageValues = Object.values(this.geopackages)
        for (let i = 0; i < geopackageValues.length; i++) {
          const geopackage = geopackageValues[i]
          const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
          if (tables.length > 0) {
            const geopackageTables = await window.mapcache.getFeaturesForTablesAtLatLngZoom(geopackage.name, geopackage.id, geopackage.path, tables, e.latlng, this.map.getZoom())
            tableFeatures.geopackageTables = tableFeatures.geopackageTables.concat(geopackageTables)
          }
        }
        for (let sourceId in this.dataSourceMapLayers) {
          const sourceLayer = this.dataSourceMapLayers[sourceId].getLayer()._configuration
          if (sourceLayer.visible) {
            if (!isNil(sourceLayer.geopackageFilePath)) {
              const sourceTables = await window.mapcache.getFeaturesForTablesAtLatLngZoom(sourceLayer.displayName ? sourceLayer.displayName : sourceLayer.name, sourceLayer.id, sourceLayer.geopackageFilePath, [sourceLayer.sourceLayerName], e.latlng, this.map.getZoom(), false)
              tableFeatures.sourceTables = tableFeatures.sourceTables.concat(sourceTables)
            }
          }
        }
        if (tableFeatures.geopackageTables.length > 0 || tableFeatures.sourceTables.length > 0) {
          this.lastShowFeatureTableEvent = null
          this.tableFeaturesLatLng = e.latlng
          this.tableFeatures = tableFeatures
          this.displayFeatureTable()
        } else {
          this.hideFeatureTable()
        }
      }
    },
    reorderMapLayers (sortedLayers) {
      let newLayerOrder = []
      sortedLayers.forEach(layerId => {
        newLayerOrder.push(this.layerOrder.find(l => l.id === layerId))
      })
      this.layerOrder = newLayerOrder
    },
    registerResizeObserver () {
      let self = this
      if (this.observer) {
        this.observer.disconnect()
      }
      this.observer = new ResizeObserver(() => {
        const height = document.getElementById('feature-table-ref').offsetHeight
        const map = document.getElementById('map')
        map.style.maxHeight = `calc(100% - ${height}px)`
        self.map.invalidateSize()
      })
      this.observer.observe(document.getElementById('feature-table-ref'))
    },
    setAttribution (attribution) {
      if (this.attributionControl) {
        this.map.removeControl(this.attributionControl)
      }
      this.attributionControl = L.control.attribution({
        prefix: false,
        position: 'bottomright',
      })
      this.attributionControl.addAttribution('<a onclick="window.mapcache.openExternal(\'https://leafletjs.com/\')" href="#">Leaflet</a>')
      if (attribution != null) {
        this.attributionControl.addAttribution(attribution)
      }
      this.map.addControl(this.attributionControl)
    },
    initializeMap () {
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 3
      this.map = L.map('map', {
        editable: true,
        attributionControl: false,
        editOptions: {
          zIndex: 502,
        },
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom: 2,
        maxZoom: 20
      })
      window.mapcache.setMapZoom({projectId: this.project.id, mapZoom: defaultZoom})
      this.map.createPane(GRID_SELECTION_PANE.name)
      this.map.getPane(GRID_SELECTION_PANE.name).style.zIndex = GRID_SELECTION_PANE.zIndex
      this.map.createPane(BASE_MAP_PANE.name)
      this.map.getPane(BASE_MAP_PANE.name).style.zIndex = BASE_MAP_PANE.zIndex
      this.map.createPane(EDITING_PANE.name)
      this.map.getPane(EDITING_PANE.name).style.zIndex = EDITING_PANE.zIndex
      this.map.createPane(SEARCH_RESULTS_PANE.name)
      this.map.getPane(SEARCH_RESULTS_PANE.name).style.zIndex = SEARCH_RESULTS_PANE.zIndex
      this.map.createPane(SEARCH_RESULT_POINTS_ONLY_PANE.name)
      this.map.getPane(SEARCH_RESULT_POINTS_ONLY_PANE.name).style.zIndex = SEARCH_RESULT_POINTS_ONLY_PANE.zIndex

      this.map.setView(defaultCenter, defaultZoom)
      this.setupControls()
      this.map.setView(defaultCenter, defaultZoom)
      this.setupEventHandlers()
    },
    performReverseQuery () {
      const self = this
      const zoom = self.map.getZoom()
      self.closePopup()
      self.performingReverseQuery = true
      document.getElementById('map').style.cursor = 'wait'
      self.$nextTick(() => {
        reverseQueryNominatim(self.contextMenuCoordinate.lat, self.contextMenuCoordinate.lng, zoom).then(result => {
          result.fitMapToData = false
          EventBus.$emit(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, result)
          self.$nextTick(() => {
            if (result.featureCollection.features.length > 0) {
              EventBus.$emit(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, result.featureCollection.features[0].properties.osm_id)
            }
          })
        }).catch(() => {
          console.error('Error retrieving nominatim reverse query results.')
        }).finally(() => {
          self.$nextTick(() => {
            document.getElementById('map').style.cursor = ''
            self.performingReverseQuery = false
          })
        })
      })
    },
    setupBaseMaps () {
      for (let i = 0; i < this.baseMaps.length; i++) {
        this.addBaseMap(this.baseMaps[i], this.map)
      }
    },
    setupAndDisplayGeoPackageSelection () {
      this.$nextTick(() => {
        const NEW_GEOPACKAGE_OPTION = {text: 'New GeoPackage', value: 0}
        let layers = [NEW_GEOPACKAGE_OPTION]
        Object.values(this.geopackages).forEach((geopackage) => {
          layers.push({text: geopackage.name, value: geopackage.id})
        })
        this.geoPackageChoices = layers
        if (!isNil(this.project.activeGeoPackage)) {
          if (!isNil(this.project.activeGeoPackage.geopackageId)) {
            const index = this.geoPackageChoices.findIndex(choice => choice.value === this.project.activeGeoPackage.geopackageId)
            if (index > 0) {
              this.geoPackageSelection = this.geoPackageChoices[index].value
            }
          }
        }
        this.layerSelectionVisible = true
        this.$nextTick(() => {
          if (!isNil(this.$refs.featureTableNameForm)) {
            this.$refs.featureTableNameForm.validate()
          }
        })
      })
    },
    setupControls () {
      const self = this
      this.basemapControl = new LeafletBaseMapTool({}, function () {
        self.showBaseMapSelection = !self.showBaseMapSelection
        if (self.showBaseMapSelection) {
          self.showLayerOrderingDialog = false
        }
      })
      this.map.addControl(this.basemapControl)
      this.setupBaseMaps()
      this.map.zoomControl.setPosition('topright')
      this.displayZoomControl = new LeafletZoomIndicator()
      this.map.addControl(this.displayZoomControl)
      this.activeLayersControl = new LeafletActiveLayersTool({}, function () {
        self.zoomToContent()
      }, function () {
        window.mapcache.clearActiveLayers({projectId: self.projectId})
      }, function () {
        self.showLayerOrderingDialog = !self.showLayerOrderingDialog
        if (self.showLayerOrderingDialog) {
          self.showBaseMapSelection = false
        }
      })

      L.control.scale().addTo(this.map)
      this.map.addControl(this.activeLayersControl)
      this.drawingControl = new LeafletDraw()
      this.editingControl = new LeafletEdit()
      this.map.addControl(this.drawingControl)
      this.map.addControl(this.editingControl)
      this.project.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
      this.project.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
    },
    debounceClickHandler: debounce(function (e) {
      if (this.consecutiveClicks === 1) {
        this.queryForFeatures(e)
      }
      this.consecutiveClicks = 0
    }, DOUBLE_CLICK_THRESHOLD),
    setupEventHandlers () {
      const self = this
      const checkFeatureCount = throttle(async function (e) {
        if (!this.editingControl.isEditing() && !self.drawingControl.isDrawing && !self.layerSelectionVisible && !self.showAddFeatureDialog && isNil(self.drawBoundsId) && isNil(self.gridBoundsId) && !self.performingReverseQuery) {
          let count = 0
          // TODO: add support for querying tiles if a feature tile link exists (may need to implement feature tile link in geopackage-js first!
          const geopackageValues = Object.values(this.geopackages)
          for (let i = 0; i < geopackageValues.length; i++) {
            const geopackage = geopackageValues[i]
            const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
            if (tables.length > 0) {
              count += await window.mapcache.countOfFeaturesAt(geopackage.path, tables, e.latlng, this.map.getZoom())
            }
          }
          for (let sourceId in this.dataSourceMapLayers) {
            const sourceLayer = this.dataSourceMapLayers[sourceId].getLayer()
            if (sourceLayer.visible) {
              if (!isNil(sourceLayer.geopackageFilePath)) {
                count += await window.mapcache.countOfFeaturesAt(sourceLayer.geopackageFilePath, [sourceLayer.sourceLayerName], e.latlng, this.map.getZoom())
              }
            }
          }
          if (count > 0) {
            document.getElementById('map').style.cursor = 'pointer'
          } else {
            document.getElementById('map').style.cursor = ''
          }
        }
      }.bind(this), 100)
      this.map.on('click', (e) => {
        this.showLayerOrderingDialog = false
        this.showBaseMapSelection = false
        if (!this.nominatimReverseQueryResultsReturned) {
          this.consecutiveClicks++
          if (this.searchResultLayers != null) {
            EventBus.$emit(EventBus.EventTypes.DESELECT_NOMINATIM_SEARCH_RESULT)
          }
          this.debounceClickHandler(e)
        }
        this.nominatimReverseQueryResultsReturned = false
      })
      this.map.on('moveend', () => {
        if (this.map != null) {
          const bounds = this.map.getBounds()
          this.mapBounds = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
        }
      })
      this.map.on('mousemove', (e) => {
        checkFeatureCount(e)
      })
      this.map.on('contextmenu', e => {
        if (!this.editingControl.isEditing() && !this.drawingControl.isDrawing) {
          this.contextMenuCoordinate = e.latlng
          if (this.contextMenuPopup && this.contextMenuPopup.isOpen()) {
            this.contextMenuPopup.setLatLng(e.latlng)
          } else {
            this.$nextTick(() => {
              this.contextMenuPopup = L.popup({minWidth: 226, maxWidth: 226, maxHeight: 137, closeButton: false, className: 'search-popup', offset: L.point(113, 157)})
                .setLatLng(e.latlng)
                .setContent(this.$refs['contextMenuPopup'])
                .openOn(this.map)
            })
          }
        }
      })
      this.map.on('editable:drawing:end', function (e) {
        if (!self.drawingControl.isDrawing && !self.drawingControl.cancelled) {
          e.layer.toggleEdit()
          self.setupAndDisplayGeoPackageSelection()
        }
      })
      this.map.on('zoomend', () => {
        window.mapcache.setMapZoom({projectId: self.project.id, mapZoom: self.map.getZoom()})
      })
    },
    addLayersToMap () {
      for (const sourceId in this.sources) {
        this.addDataSource(this.sources[sourceId], this.map)
      }
      for (const geopackageId in this.geopackages) {
        this.addGeoPackageToMap(this.geopackages[geopackageId], this.map)
      }
    },
    refreshFeatureTable () {
      // geopackages changed, so let's ensure the content in the table is updated
      if (this.showFeatureTable && !isNil(this.tableFeaturesLatLng)) {
        this.queryForFeatures({latlng: this.tableFeaturesLatLng})
        // the feature table is showing because a user clicked the view features button in the feature layer view
        // this requires the active geopackage to be set with a valid geopackageId and tableName
      } else if (this.showFeatureTable && !isNil(this.lastShowFeatureTableEvent)) {
        this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
      } else {
        // clear out any feature tables
        this.hideFeatureTable()
      }
    }
  },
  watch: {
    baseMaps: {
      handler (newBaseMaps) {
        const self = this
        const selectedBaseMapId = this.selectedBaseMapId
        const isDefaultBaseMap = self.defaultBaseMapIds.indexOf(selectedBaseMapId) !== -1

        let oldConfig
        if (!isNil(self.baseMapLayers[selectedBaseMapId]) && !isDefaultBaseMap) {
          oldConfig = self.baseMapLayers[selectedBaseMapId].getLayer()._configuration
        }
        // update the layer config stored for each base map
        newBaseMaps.filter(self.notReadOnlyBaseMapFilter).forEach(baseMap => {
          if (self.baseMapLayers[baseMap.id]) {
            self.baseMapLayers[baseMap.id].update(baseMap.layerConfiguration)
            self.baseMapLayers[baseMap.id].getLayer().error = baseMap.error
          }
        })
        const selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === selectedBaseMapId)
        if (!isDefaultBaseMap) {
          // if currently selected baseMapId is no longer available, be sure to remove it and close out the layer if possible
          if (isNil(selectedBaseMap)) {
            if (newBaseMaps.length - 1 < this.baseMapIndex) {
              this.baseMapIndex = newBaseMaps.length - 1
            }
            const layer = self.baseMapLayers[selectedBaseMapId]
            if (layer) {
              self.map.removeLayer(self.baseMapLayers[selectedBaseMapId])
            }
            delete self.baseMapLayers[selectedBaseMapId]
            self.selectedBaseMapId = newBaseMaps[self.baseMapIndex].id
          } else if (!isNil(oldConfig)) {
            const newConfig = selectedBaseMap.layerConfiguration
            const repaintFields = self.baseMapLayers[selectedBaseMapId].getLayer().getRepaintFields()
            const repaintRequired = !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))
            if (repaintRequired) {
              self.baseMapLayers[selectedBaseMapId].redraw()
            }
            this.mapBackground = selectedBaseMap.background || '#ddd'
          }
        }
      }
    },
    selectedBaseMapId: {
      handler (newBaseMapId, oldBaseMapId) {
        const self = this
        self.connectingToBaseMap = false
        self.$nextTick(async () => {
          this.baseMapIndex = self.baseMaps.findIndex(baseMap => baseMap.id === newBaseMapId)
          const newBaseMap = self.baseMaps[self.baseMapIndex]

          let success = true
          if (!newBaseMap.readonly && !isNil(newBaseMap.layerConfiguration) && isRemote(newBaseMap.layerConfiguration)) {
            this.connectingToBaseMap = true
            success = await connectToBaseMap(newBaseMap, window.mapcache.editBaseMap, newBaseMap.layerConfiguration.timeoutMs)
            this.connectingToBaseMap = false
          }

          // remove old map layer
          if (self.baseMapLayers[oldBaseMapId]) {
            self.map.removeLayer(self.baseMapLayers[oldBaseMapId])
          }

          if (success && !window.mapcache.isRasterMissing(newBaseMap.layerConfiguration)) {
            // check to see if base map has already been added
            if (isNil(self.baseMapLayers[newBaseMapId])) {
              self.addBaseMap(newBaseMap, self.map)
            } else {
              // do not update read only base maps id
              if (!newBaseMap.readonly) {
                self.baseMapLayers[newBaseMapId].update(newBaseMap.layerConfiguration)
              }
              self.map.addLayer(self.baseMapLayers[newBaseMapId])
              this.setAttribution(newBaseMap.attribution)
              self.baseMapLayers[newBaseMapId].bringToBack()
            }
            self.mapBackground = newBaseMap.background || '#ddd'
          } else {
            self.map.addLayer(self.baseMapLayers[self.offlineBaseMapId])
            this.setAttribution(newBaseMap.attribution)
            self.baseMapLayers[self.offlineBaseMapId].bringToBack()
            self.selectedBaseMapId = self.offlineBaseMapId
          }
        })
      }
    },
    visible: {
      handler() {
        const self = this
        self.$nextTick(() => {
          if (self.map) {
            self.map.invalidateSize()
          }
        })
      }
    },
    resizeListener: {
      handler (newValue, oldValue) {
        if (newValue !== oldValue) {
          const self = this
          self.$nextTick(() => {
            if (self.map) {
              self.map.invalidateSize()
            }
          })
        }
      }
    },
    isEditing: {
      handler (newValue) {
        if (newValue) {
          this.drawingControl.hide()
          this.editingControl.show()
        } else {
          this.drawingControl.show()
          this.editingControl.hide()
        }
      }
    },
    layerOrder: {
      handler (layers) {
        layers.forEach(layer => {
          let mapLayer
          if (!isNil(layer.geopackageId) && this.geopackageMapLayers[layer.geopackageId] && this.geopackageMapLayers[layer.geopackageId][layer.tableName]) {
            mapLayer = this.geopackageMapLayers[layer.geopackageId][layer.tableName]
          } else if (isNil(layer.geopackageId) && !isNil(this.dataSourceMapLayers[layer.id])) {
            mapLayer = this.dataSourceMapLayers[layer.id]
          }
          if (!isNil(mapLayer)) {
            mapLayer.bringToBack()
          }
        })
        this.baseMapLayers[this.selectedBaseMapId].bringToBack()
        window.mapcache.setMapRenderingOrder({projectId: this.projectId, mapRenderingOrder: layers.map(l => l.id)})
        if (layers.length > 0 || this.searchResultLayers != null) {
          this.activeLayersControl.enable(this.layerOrder.length)
        } else {
          this.activeLayersControl.disable()
          this.showLayerOrderingDialog = false
        }
      }
    },
    sources: {
      async handler (updatedSources) {
        let self = this
        let map = this.map
        let updatedSourceIds = Object.keys(updatedSources)
        let existingSourceIds = Object.keys(this.dataSourceMapLayers)

        // handle deletion of a data source
        existingSourceIds.filter((i) => updatedSourceIds.indexOf(i) < 0).forEach(sourceId => {
          self.removeDataSource(sourceId)
        })

        // handle a new data source being added
        updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) < 0).forEach(sourceId => {
          let sourceConfig = updatedSources[sourceId]
          self.removeDataSource(sourceId)
          self.addDataSource(sourceConfig, map)
        })

        // update existing data sources, some may have not been initialized yet
        this.$nextTick(async () => {
          const changedSourceIds = updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) >= 0)
          for (let i = 0; i < changedSourceIds.length; i++) {
            const sourceId = changedSourceIds[i]
            const newConfig = cloneDeep(updatedSources[sourceId])
            const oldConfig = this.dataSourceMapLayers[sourceId].getLayer()._configuration

            const enablingLayer = !oldConfig.visible && newConfig.visible
            const disablingLayer = oldConfig.visible && !newConfig.visible
            const repaintFields = this.dataSourceMapLayers[sourceId].getLayer().getRepaintFields()
            const repaintRequired = oldConfig.visible && !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))

            // update layer
            this.dataSourceMapLayers[sourceId].update(newConfig)

            // disabling layer, so remove it from the map
            if (disablingLayer) {
              this.removeLayerFromMap(this.dataSourceMapLayers[sourceId], sourceId)
            } else if (enablingLayer) {
              // test if remote source is healthy
              let valid = true
              if (isRemote(newConfig)) {
                try {
                  await this.dataSourceMapLayers[sourceId].testConnection()
                } catch (e) {
                  window.mapcache.setSourceError({id: sourceId, error: e})
                  valid = false
                }
              }
              if (valid && this.dataSourceMapLayers[sourceId].getLayer().visible) {
                // enabling map layer, if this has been initialized, we are good to go
                this.addLayerToMap(map, this.dataSourceMapLayers[sourceId], generateLayerOrderItemForSource(this.dataSourceMapLayers[sourceId].getLayer()))
              }
            } else if (repaintRequired) {
              this.dataSourceMapLayers[sourceId].redraw()
            }
          }
        })

        this.refreshFeatureTable()
      },
      deep: true
    },
    geopackages: {
      handler (updatedGeoPackages) {
        let self = this
        let map = this.map
        let updatedGeoPackageKeys = Object.keys(updatedGeoPackages)
        let existingGeoPackageKeys = Object.keys(geopackageLayers)

        // remove geopackages that were removed
        existingGeoPackageKeys.filter((i) => updatedGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
          self.removeGeoPackage(geoPackageId)
        })

        // new source configs
        updatedGeoPackageKeys.filter((i) => existingGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
          self.removeGeoPackage(geoPackageId)
          self.addGeoPackageToMap(updatedGeoPackages[geoPackageId], map)
        })

        updatedGeoPackageKeys.filter((i) => existingGeoPackageKeys.indexOf(i) >= 0).forEach(geoPackageId => {
          let updatedGeoPackage = updatedGeoPackages[geoPackageId]
          let oldGeoPackage = geopackageLayers[geoPackageId]

          if (!isEqual(updatedGeoPackage.path, oldGeoPackage.path)) {
            const newVisibleFeatureTables = keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible)
            const newVisibleTileTables = keys(updatedGeoPackage.tables.tiles).filter(table => updatedGeoPackage.tables.tiles[table].visible)
            newVisibleTileTables.forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
              this.addGeoPackageTileTable(updatedGeoPackage, map, tableName)
            })
            newVisibleFeatureTables.forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
              this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
            })
          } else if (!isEqual(updatedGeoPackage.tables, oldGeoPackage.tables)) {
            const oldVisibleFeatureTables = keys(oldGeoPackage.tables.features).filter(table => oldGeoPackage.tables.features[table].visible)
            const oldVisibleTileTables = keys(oldGeoPackage.tables.tiles).filter(table => oldGeoPackage.tables.tiles[table].visible)
            const newVisibleFeatureTables = keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible)
            const newVisibleTileTables = keys(updatedGeoPackage.tables.tiles).filter(table => updatedGeoPackage.tables.tiles[table].visible)

            // tables removed
            const featureTablesRemoved = difference(keys(oldGeoPackage.tables.features), keys(updatedGeoPackage.tables.features))
            const tileTablesRemoved = difference(keys(oldGeoPackage.tables.tiles), keys(updatedGeoPackage.tables.tiles))

            // tables turned on
            const featureTablesTurnedOn = difference(newVisibleFeatureTables, oldVisibleFeatureTables)
            const tileTablesTurnedOn = difference(newVisibleTileTables, oldVisibleTileTables)

            // tables turned off
            const featureTablesTurnedOff = difference(oldVisibleFeatureTables, newVisibleFeatureTables)
            const tileTablesTurnedOff = difference(oldVisibleTileTables, newVisibleTileTables)

            // remove feature and tile tables that were turned off or deleted
            tileTablesRemoved.concat(tileTablesTurnedOff).concat(featureTablesRemoved).concat(featureTablesTurnedOff).forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
            })

            // add feature and tile tables that were turned on
            tileTablesTurnedOn.forEach(tableName => {
              this.addGeoPackageTileTable(updatedGeoPackage, map, tableName)
            })
            featureTablesTurnedOn.forEach(tableName => {
              this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
            })

            // tables with updated style key
            const featureTablesStyleUpdated = keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible && oldGeoPackage.tables.features[table] && featureTablesTurnedOn.indexOf(table) === -1 && updatedGeoPackage.tables.features[table].styleKey !== oldGeoPackage.tables.features[table].styleKey)
            featureTablesStyleUpdated.forEach(tableName => {
              this.removeGeoPackageTable(geoPackageId, tableName)
              this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
            })
          }

          geopackageLayers[updatedGeoPackage.id] = cloneDeep(updatedGeoPackage)
        })

        this.refreshFeatureTable()
      },
      deep: true
    },
    geoPackageFeatureLayerSelection: {
      handler () {
        // check if it has editable fields, instead of confirm, it will say continue and display the edit fields dialog
        this.$nextTick(() => {
          if (!isNil(this.$refs.featureTableNameForm)) {
            this.$refs.featureTableNameForm.validate()
          }
        })
      }
    },
    geoPackageSelection: {
      handler (updatedGeoPackageSelection) {
        let layers = [NEW_FEATURE_LAYER_OPTION]
        if (updatedGeoPackageSelection !== 0) {
          Object.keys(this.geopackages[updatedGeoPackageSelection].tables.features).forEach((tableName, index) => {
            layers.push({text: tableName, value: index + 1})
          })
        }
        let geoPackageFeatureLayerSelection = 0
        if (!isNil(this.project.activeGeoPackage) && !isNil(this.project.activeGeoPackage.geopackageId) && this.project.activeGeoPackage.geopackageId === updatedGeoPackageSelection && !isNil(this.project.activeGeoPackage.tableName)) {
          const tableNameIndex = layers.findIndex(choice => choice.value !== 0 && choice.text === this.project.activeGeoPackage.tableName)
          if (tableNameIndex !== -1) {
            geoPackageFeatureLayerSelection = layers[tableNameIndex].value
          }
        }
        this.geoPackageFeatureLayerSelection = geoPackageFeatureLayerSelection
        this.geoPackageFeatureLayerChoices = layers
        this.$nextTick(() => {
          if (!isNil(this.$refs.featureTableNameForm)) {
            this.$refs.featureTableNameForm.validate()
          }
        })
      }
    },
    project: {
      async handler (updatedProject) {
        let self = this
        updatedProject.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
        updatedProject.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
        // max features setting changed
        if (updatedProject.maxFeatures !== this.maxFeatures) {
          for (const gp of Object.values(updatedProject.geopackages)) {
            for (const tableName of Object.keys(gp.tables.features)) {
              if (self.geopackageMapLayers[gp.id] && self.geopackageMapLayers[gp.id][tableName] && self.geopackageMapLayers[gp.id][tableName]) {
                const layer = self.geopackageMapLayers[gp.id][tableName]
                if (!isNil(layer)) {
                  layer.updateMaxFeatures(updatedProject.maxFeatures)
                  if (gp.tables.features[tableName].visible) {
                    layer.redraw()
                  }
                }
              }
            }
          }
          for (const sourceId of keys(self.dataSourceMapLayers)) {
            // if this is a vector layer, update it
            if (self.dataSourceMapLayers[sourceId].getLayer().pane === 'vector') {
              // update max features
              self.dataSourceMapLayers[sourceId].updateMaxFeatures(updatedProject.maxFeatures)
              // if visible, we need to toggle the layer
              if (self.dataSourceMapLayers[sourceId].getLayer().visible) {
                self.dataSourceMapLayers[sourceId].redraw()
              }
            }
          }
          for (const baseMapId of keys(self.baseMapLayers)) {
            // if this is a vector layer, update it
            if (self.defaultBaseMapIds.indexOf(baseMapId) === -1 && self.baseMapLayers[baseMapId].getLayer().pane === 'vector') {
              // update max features
              self.baseMapLayers[baseMapId].updateMaxFeatures(updatedProject.maxFeatures)
              // if visible, we need to toggle the layer
              if (baseMapId === self.selectedBaseMapId) {
                self.baseMapLayers[baseMapId].redraw()
              }
            }
          }
        }
        this.maxFeatures = updatedProject.maxFeatures
        if (isNil(updatedProject.boundingBoxFilterEditing) || updatedProject.boundingBoxFilterEditing !== 'manual') {
          this.drawingControl.enableDrawingLinks()
        } else {
          this.drawingControl.disableDrawingLinks()
        }

        this.manualBoundingBoxDialog = !isNil(updatedProject.boundingBoxFilterEditing) && updatedProject.boundingBoxFilterEditing === 'manual'

        let clearEditing = true
        if (!isNil(updatedProject.editingFeature)) {
          let id = updatedProject.editingFeature.id
          let isGeoPackage = updatedProject.editingFeature.isGeoPackage
          let tableName = updatedProject.editingFeature.tableName
          let featureId = updatedProject.editingFeature.featureToEdit.id
          let geoPackageObject = isGeoPackage ? updatedProject.geopackages[id] : updatedProject.sources[id]
          // did geopackage or data source get deleted
          if (!isNil(geoPackageObject)) {
            let exists = await window.mapcache.featureExists(isGeoPackage ? geoPackageObject.path : geoPackageObject.geopackageFilePath, tableName, featureId)
            if (exists) {
              clearEditing = false
              this.editingControl.editFeature(this.map, updatedProject.id, updatedProject.editingFeature)
              this.isEditing = true
            }
          }
        }
        if (clearEditing) {
          this.editingControl.cancelEdit()
          this.isEditing = false
        }
      },
      deep: true
    }
  },
  mounted: function () {
    window.mapcache.clearEditFeatureGeometry({projectId: this.project.id})
    EventBus.$on(EventBus.EventTypes.SHOW_FEATURE_TABLE, payload => this.displayFeaturesForTable(payload.id, payload.tableName, payload.isGeoPackage))
    EventBus.$on(EventBus.EventTypes.REORDER_MAP_LAYERS, this.reorderMapLayers)
    EventBus.$on(EventBus.EventTypes.ZOOM_TO, (extent, minZoom = 0, maxZoom = 20) => {
      let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
      let bounds = L.latLngBounds(boundingBox)
      bounds = bounds.pad(0.05)
      const target = this.map._getBoundsCenterZoom(bounds, {minZoom: minZoom, maxZoom: maxZoom});
      this.map.setView(target.center, Math.max(minZoom, target.zoom), {minZoom: minZoom, maxZoom: maxZoom});
    })
    this.maxFeatures = this.project.maxFeatures
    this.registerResizeObserver()
    this.initializeMap()
    this.addLayersToMap()
  },
  beforeDestroy: function () {
    EventBus.$off([EventBus.EventTypes.SHOW_FEATURE_TABLE, EventBus.EventTypes.REORDER_MAP_LAYERS, EventBus.EventTypes.ZOOM_TO])
  },
  beforeUpdate: function () {
    const self = this
    self.$nextTick(() => {
      if (self.map) {
        self.map.invalidateSize()
      }
    })
  }
}
</script>

<style>
  @import '~leaflet/dist/leaflet.css';
  .popup {
    display: flex;
    flex-direction: column;
    min-height: 16vh;
    min-width: 30vh;
  }
  .popup_body {
    flex: 1 0 8vh;
    font-family: Roboto, sans-serif;
    font-size: 16px;
    font-weight: 500;
  }
  .popup_header {
    flex: 1 0 4vh;
    font-family: Roboto, sans-serif;
    font-size: 28px;
    font-weight: 700;
  }
  .popup_footer {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    flex: 1 0 4vh;
  }
  .results {
    color: black;
  }

  .leaflet-geosearch-bar {
    margin-left: 10px !important;
    margin-top: 10px !important;
  }
  .overlay-tooltip {
    position: absolute;
    display: flex;
    width: 200px;
    border: none;
  }
  .card-content {
    overflow-y: auto;
    max-width: 268px!important;
    max-height: 250px;
  }
  .basemap-card {
    top: 10px;
    min-width: 250px;
    max-width: 250px !important;
    position: absolute !important;
    right: 50px !important;
    max-height: 350px !important;
    border: 2px solid rgba(0,0,0,0.2) !important;
  }
  .nominatim-card {
    top: 10px;
    min-width: 350px;
    max-width: 350px !important;
    position: absolute !important;
    left: 10px !important;
    max-height: 350px !important;
    border: 2px solid rgba(0,0,0,0.2) !important;
  }
  .reorder-card {
    max-width: 300px !important;
    position: absolute !important;
    right: 50px !important;
    max-height: 480px !important;
    border: 2px solid rgba(0,0,0,0.2) !important;
    ul {
      list-style-type: none !important;
    }
  }
  .layer-order-list-item {
    min-height: 50px !important;
    cursor: move !important;
    background: var(--v-background-base) !important;
  }
  .layer-order-list-item i {
    cursor: pointer !important;
  }
  .flip-list-move {
    transition: transform 0.5s;
  }
  .no-move {
    transition: transform 0s;
  }
  .ghost {
    opacity: 0.5 !important;
    background-color: var(--v-primary-lighten2) !important;
  }
  .leaflet-popup-content-wrapper {
    color: var(--v-text-base) !important;
    div {
      color: var(--v-text-base) !important;
    }
  }
  .address-control {
    position: absolute;
    top: 8px;
    left: 16px;
    z-index: 10000;
  }
  .search-popup .leaflet-popup {
    margin: 0 !important;
    padding: 0 !important;
  }
  .search-popup .leaflet-popup-content-wrapper {
    margin: 0 !important;
    padding: 0 !important;
  }
  .search-popup .leaflet-popup-content {
    margin: 0 !important;
    padding: 0 !important;
  }
  .search-popup .leaflet-popup-tip-container {
    display: none !important;
  }
</style>
