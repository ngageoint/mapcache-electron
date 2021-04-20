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
            Create GeoPackage Warning
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
            Add Drawing
          </v-card-title>
          <v-card-text>
            Add drawing to the selected GeoPackage and feature layer.
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
                      label="Feature Layer Name"
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
        <feature-editor v-if="showAddFeatureDialog" :projectId="projectId" :id="featureToAddGeoPackage.id" :geopackage-path="featureToAddGeoPackage.path" :tableName="featureToAddTableName" :columns="featureToAddColumns" :feature="featureToAdd" :close="cancelAddFeature" :is-geo-package="true"></feature-editor>
      </v-dialog>
    </div>
    <div v-show="coordinatePopup !== null" id="leaflet-coordinate-popup" ref="leafletCoordinatePopup" style="width: 300px; height: 132px;">
      <v-card flat>
        <v-row class="mb-2" no-gutters justify="space-between">
          <v-card-title class="pa-0 ma-0">
            Coordinate
          </v-card-title>
          <v-btn class="mr-1" small @click.stop.prevent="closePopup" icon><v-icon>{{mdiClose}}</v-icon></v-btn>
        </v-row>
        <v-card-text class="pa-0 ma-0">
          <v-card-text class="pt-1 pb-1 pr-0">
            <v-row no-gutters justify="space-between" align="center">
              <v-col>
                {{dialogCoordinate ? (dialogCoordinate.lat.toFixed(6) + ', ' + dialogCoordinate.lng.toFixed(6)) : ''}}
              </v-col>
              <v-btn icon color="primary" @click="() => {copyText(dialogCoordinate.lat.toFixed(6) + ', ' + dialogCoordinate.lng.toFixed(6))}"><v-icon>{{mdiContentCopy}}</v-icon></v-btn>
            </v-row>
            <v-row no-gutters  justify="space-between" align="center">
              <v-col>
                {{dialogCoordinate ? (convertToDms(dialogCoordinate.lat, false) + ', ' + convertToDms(dialogCoordinate.lng, true)) : ''}}
              </v-col>
              <v-btn icon color="primary" @click="() => {copyText(convertToDms(dialogCoordinate.lat, false) + ', ' + convertToDms(dialogCoordinate.lng, true))}"><v-icon>{{mdiContentCopy}}</v-icon></v-btn>
            </v-row>
          </v-card-text>
        </v-card-text>
      </v-card>
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
    <v-card outlined v-if="showBaseMapSelection" class="basemap-card">
      <v-card-title class="pb-2">
        Base Maps
      </v-card-title>
      <v-card-text class="pb-2">
        <v-card-subtitle class="pt-1 pb-1">
          Select a base map.
        </v-card-subtitle>
        <v-list dense class="pa-0" style="max-height: 200px; overflow-y: auto;">
          <v-list-item-group v-model="selectedBaseMapId" mandatory>
            <v-list-item v-for="item of baseMapItems" :key="item.id" :value="item.id">
              <v-list-item-icon style="margin-right: 16px;">
                <v-btn style="width: 24px; height: 24px;" icon @click.stop="(e) => item.zoomTo(e, map)">
                  <v-icon small>{{mdiMapOutline}}</v-icon>
                </v-btn>
              </v-list-item-icon>
              <v-list-item-title>{{item.name}}</v-list-item-title>
              <base-map-troubleshooting v-if="item.baseMap.error" :base-map="item.baseMap"></base-map-troubleshooting>
              <v-progress-circular
                v-if="baseMapLayers[item.id] !== undefined && baseMapLayers[item.id].initializationState === 1"
                indeterminate
                color="primary"
              ></v-progress-circular>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
  import { ipcRenderer } from 'electron'
  import { mapState } from 'vuex'
  import isNil from 'lodash/isNil'
  import debounce from 'lodash/debounce'
  import cloneDeep from 'lodash/cloneDeep'
  import keys from 'lodash/keys'
  import isEmpty from 'lodash/isEmpty'
  import isEqual from 'lodash/isEqual'
  import difference from 'lodash/difference'
  import pick from 'lodash/pick'
  import throttle from 'lodash/throttle'
  import * as vendor from '../../lib/leaflet/vendor'
  import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch'
  import 'leaflet-geosearch/dist/geosearch.css'
  import jetpack from 'fs-jetpack'
  import { GeoPackageDataType } from '@ngageoint/geopackage'
  import EventBus from '../../lib/vue/EventBus'
  import LeafletActiveLayersTool from './LeafletActiveLayersTool'
  import DrawBounds from './DrawBounds'
  import GridBounds from './GridBounds'
  import FeatureTable from './FeatureTable'
  import LeafletZoomIndicator from './LeafletZoomIndicator'
  import LeafletEdit from './LeafletEdit'
  import LeafletDraw from './LeafletDraw'
  import LayerFactory from '../../lib/source/layer/LayerFactory'
  import LeafletMapLayerFactory from '../../lib/map/mapLayers/LeafletMapLayerFactory'
  import UniqueIDUtilities from '../../lib/util/UniqueIDUtilities'
  import FeatureEditor from '../Common/FeatureEditor'
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import draggable from 'vuedraggable'
  import LeafletBaseMapTool from './LeafletBaseMapTool'
  import BaseMapTroubleshooting from '../BaseMaps/BaseMapTroubleshooting'
  import ServiceConnectionUtils from '../../lib/network/ServiceConnectionUtils'
  import BaseMapUtilities from '../../lib/util/BaseMapUtilities'
  import LayerTypes from '../../lib/source/layer/LayerTypes'
  import GeoPackageFeatureTableUtilities from '../../lib/geopackage/GeoPackageFeatureTableUtilities'
  import GeoPackageMediaUtilities from '../../lib/geopackage/GeoPackageMediaUtilities'
  import GeoPackageStyleUtilities from '../../lib/geopackage/GeoPackageStyleUtilities'
  import GeoPackageCommon from '../../lib/geopackage/GeoPackageCommon'
  import { mdiAlert, mdiClose, mdiContentCopy, mdiMapOutline } from '@mdi/js'
  import ElectronUtilities from '../../lib/electron/ElectronUtilities'

  const NEW_GEOPACKAGE_OPTION = {text: 'New GeoPackage', value: 0}
  const NEW_FEATURE_LAYER_OPTION = {text: 'New Feature Layer', value: 0}

  // objects for storing state
  const geopackageLayers = {}

  function generateLayerOrderItemForSource (source, map) {
    return {
      title: source.displayName ? source.displayName : source.name,
      id: source.id,
      type: source.pane === 'vector' ? 'feature' : 'tile',
      zoomTo: debounce((e) => {
        e.stopPropagation()
        let boundingBox = [[source.extent[1], source.extent[0]], [source.extent[3], source.extent[2]]]
        let bounds = vendor.L.latLngBounds(boundingBox)
        bounds = bounds.pad(0.05)
        boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
        map.fitBounds(boundingBox, {maxZoom: 20})
      }, 100)
    }
  }

  function generateLayerOrderItemForGeoPackageTable (geopackage, tableName, isTile, map) {
    return {
      id: geopackage.id + '_' + tableName,
      geopackageId: geopackage.id,
      tableName: tableName,
      title: geopackage.name,
      subtitle: tableName,
      type: isTile ? 'tile' : 'vector',
      zoomTo: debounce((e) => {
        e.stopPropagation()
        GeoPackageCommon.getBoundingBoxForTable(geopackage.path, tableName).then(extent => {
          let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
          let bounds = vendor.L.latLngBounds(boundingBox)
          bounds = bounds.pad(0.05)
          boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
          map.fitBounds(boundingBox, {maxZoom: 20})
        })
      }, 100)
    }
  }

  export default {
    mixins: [
      DrawBounds,
      GridBounds
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
          return (state.BaseMaps.baseMaps || []).map(baseMapConfig => {
            return {
              id: baseMapConfig.id,
              updateKey: 0,
              baseMap: baseMapConfig,
              name: baseMapConfig.name,
              zoomTo: debounce((e, map) => {
                e.stopPropagation()
                const extent = baseMapConfig.extent || [-180, -90, 180, 90]
                let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
                let bounds = vendor.L.latLngBounds(boundingBox)
                bounds = bounds.pad(0.05)
                boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
                map.fitBounds(boundingBox, {maxZoom: 20})
              }, 100)
            }
          })
        },
        baseMaps: state => {
          return state.BaseMaps.baseMaps || []
        }
      })
    },
    components: {
      BaseMapTroubleshooting,
      FeatureEditor,
      FeatureTable,
      draggable
    },
    data () {
      return {
        mdiAlert: mdiAlert,
        mdiClose: mdiClose,
        mdiContentCopy: mdiContentCopy,
        mdiMapOutline: mdiMapOutline,
        geoPackageMapLayers: {},
        baseMapLayers: {},
        offlineBaseMapId: BaseMapUtilities.getOfflineBaseMapId(),
        dataSourceMapLayers: {},
        offlineBaseMapFilter: baseMap => baseMap.id !== BaseMapUtilities.getOfflineBaseMapId(),
        geopackageMapLayers: {},
        selectedBaseMapId: '0',
        zoomToExtentKey: this.project && this.project.zoomToExtent ? this.project.zoomToExtent.key || 0 : 0,
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
        coordinatePopup: null,
        tableFeaturesLatLng: null,
        geoPackageFeatureLayerChoices: [NEW_FEATURE_LAYER_OPTION],
        geoPackageSelection: 0,
        geoPackageFeatureLayerSelection: 0,
        geoPackageFeatureLayerSelectionHasEditableFields: false,
        lastCreatedFeature: null,
        featureTableNameValid: false,
        featureTableName: 'Feature Layer',
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
        displayNetworkError: false
      }
    },
    methods: {
      sendSourceInitializationStatus (sourceId) {
        const sourceLayer = this.dataSourceMapLayers[sourceId]
        if (!isNil(sourceLayer)) {
          if (sourceLayer.getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_COMPLETED) {
            EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZED(sourceId))
          } else if (sourceLayer.getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_STARTED) {
            EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZING(sourceId))
          }
        }
      },
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
          this.layerOrder.push(item)
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
        setTimeout(() => {
          this.copiedToClipboard = true
        }, 250)
      },
      async confirmGeoPackageFeatureLayerSelection () {
        this.geopackageExistsDialog = false
        this.featureToAdd = null
        this.featureToAddColumns = null
        this.featureToAddGeoPackage = null
        this.featureToAddTableName = null
        let self = this
        let feature = this.createdLayer.toGeoJSON()
        feature.id = UniqueIDUtilities.createUniqueID()
        if (!isNil(this.createdLayer._mRadius)) {
          feature.properties.radius = this.createdLayer._mRadius
        }
        switch (feature.geometry.type.toLowerCase()) {
          case 'point': {
            feature.geometry.coordinates[0] = GeoPackageCommon.normalizeLongitude(feature.geometry.coordinates[0])
            break
          }
          case 'linestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              feature.geometry.coordinates[i][0] = GeoPackageCommon.normalizeLongitude(feature.geometry.coordinates[i][0])
            }
            break
          }
          case 'polygon':
          case 'multilinestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j][0] = GeoPackageCommon.normalizeLongitude(feature.geometry.coordinates[i][j][0])
              }
            }
            break
          }
          case 'multipolygon': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                for (let k = 0; k < feature.geometry.coordinates[i][j].length; k++) {
                  feature.geometry.coordinates[i][j][k][0] = GeoPackageCommon.normalizeLongitude(feature.geometry.coordinates[i][j][k][0])
                }
              }
            }
            break
          }
        }
        const featureTableName = this.featureTableName
        let featureCollection = {
          type: 'FeatureCollection',
          features: [feature]
        }
        if (this.geoPackageSelection === 0) {
          ElectronUtilities.showSaveDialog({
            title: 'New GeoPackage'
          }).then(({canceled, filePath}) => {
            if (!canceled) {
              if (!filePath.endsWith('.gpkg')) {
                filePath = filePath + '.gpkg'
              }
              const existsOnFileSystem = jetpack.exists(filePath)
              if (existsOnFileSystem) {
                this.geopackageExistsDialog = true
              } else {
                this.cancelDrawing()
                this.$nextTick(() => {
                  GeoPackageCommon.getOrCreateGeoPackage(filePath).then(gp => {
                    GeoPackageFeatureTableUtilities._createFeatureTable(gp, featureTableName, featureCollection, true).then(() => {
                      ProjectActions.addGeoPackage({projectId: self.projectId, filePath: filePath})
                    }).catch(() => {
                      gp.close()
                      gp = undefined
                    })
                  })
                })
              }
            } else {
              this.cancelDrawing()
            }
          })
        } else {
          const geopackage = this.geopackages[this.geoPackageSelection]
          if (this.geoPackageFeatureLayerSelection === 0) {
            ProjectActions.addFeatureTableToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: featureTableName, featureCollection: featureCollection})
            this.cancelDrawing()
          } else {
            const self = this
            const featureTable = this.geoPackageFeatureLayerChoices[this.geoPackageFeatureLayerSelection].text
            GeoPackageFeatureTableUtilities.getFeatureColumns(geopackage.path, featureTable).then(columns => {
              if (!isNil(columns) && !isNil(columns._columns) && columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id').length > 0) {
                this.featureToAdd = feature
                this.featureToAddGeoPackage = geopackage
                this.featureToAddTableName = featureTable
                self.featureToAddColumns = columns
                this.$nextTick(() => {
                  this.showAddFeatureDialog = true
                  this.$nextTick(() => {
                    this.cancelDrawing()
                  })
                })
              } else {
                ProjectActions.addFeatureToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: featureTable, feature: feature})
                this.cancelDrawing()
              }
            })
          }
        }
      },
      cancelDrawing () {
        this.$nextTick(() => {
          this.geopackageExistsDialog = false
          this.layerSelectionVisible = false
          this.map.removeLayer(this.createdLayer)
          this.createdLayer = null
          this.featureTableName = 'Feature layer'
          this.geoPackageFeatureLayerSelection = 0
          this.geoPackageSelection = 0
        })
      },
      zoomToFeature (path, table, featureId) {
        const map = this.map
        GeoPackageFeatureTableUtilities.getBoundingBoxForFeature(path, table, featureId).then(function (extent) {
          if (extent) {
            let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            map.fitBounds(boundingBox, {maxZoom: 20})
          }
        })
      },
      async initializeDataSource (sourceId, map) {
        EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZING(sourceId))
        await this.dataSourceMapLayers[sourceId].initializeLayer()
        // only add if the source layer was not deleted
        if (!isNil(this.dataSourceMapLayers[sourceId]) && this.dataSourceMapLayers[sourceId].getLayer().visible) {
          this.addLayerToMap(map, this.dataSourceMapLayers[sourceId], generateLayerOrderItemForSource(this.dataSourceMapLayers[sourceId].getLayer(), map))
        }
        EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZED(sourceId))
      },
      async addDataSource (sourceConfiguration, map) {
        const self = this
        const sourceId = sourceConfiguration.id
        let source = LayerFactory.constructLayer(sourceConfiguration)
        self.dataSourceMapLayers[sourceId] = LeafletMapLayerFactory.constructMapLayer({layer: source, maxFeatures: this.project.maxFeatures})
        // if it is visible, try to initialize it
        if (source.visible) {
          self.initializeDataSource(sourceId, map)
        }
      },
      removeDataSource (sourceId) {
        if (!isNil(this.dataSourceMapLayers[sourceId])) {
          if (this.dataSourceMapLayers[sourceId].getLayer()._configuration.layerType === LayerTypes.GEOTIFF && this.dataSourceMapLayers[sourceId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_STARTED) {
            ipcRenderer.send('cancel_read_raster', {id: sourceId})
          }
          this.removeLayerFromMap(this.dataSourceMapLayers[sourceId], sourceId)
          this.dataSourceMapLayers[sourceId].close()
          delete this.dataSourceMapLayers[sourceId]
        }
      },
      async initializeBaseMap (baseMapId, map) {
        await this.baseMapLayers[baseMapId].initializeLayer()
        // only add if the source layer was not deleted
        if (!isNil(this.baseMapLayers[baseMapId]) && this.selectedBaseMapId === baseMapId) {
          map.addLayer(this.baseMapLayers[baseMapId])
        }
        // updating initializing to false is not always updating the UI
        this.$forceUpdate()
      },
      addBaseMap (baseMap, map) {
        let self = this
        const baseMapId = baseMap.id
        if (baseMap.layerConfiguration.filePath === 'offline') {
          self.baseMapLayers[baseMapId] = vendor.L.geoJson(ElectronUtilities.getOfflineMap(), {
            pane: 'baseMapPane',
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
          if (this.selectedBaseMapId === baseMapId) {
            self.addLayer(self.baseMapLayers[baseMapId])
          }
          // updating initializing to false is not always updating the UI
          self.$forceUpdate()
        } else {
          let layer = LayerFactory.constructLayer(baseMap.layerConfiguration)
          self.baseMapLayers[baseMapId] = LeafletMapLayerFactory.constructMapLayer({layer: layer, maxFeatures: this.project.maxFeatures})
          if (this.selectedBaseMapId === baseMapId) {
            self.initializeBaseMap(baseMapId, map)
          }
        }
      },
      closePopup() {
        this.map.removeLayer(this.coordinatePopup)
        this.$nextTick(() => {
          this.copiedToClipboard = false
        })

      },
      convertToDms (dd, isLng) {
        const dir = dd < 0
          ? isLng ? 'W' : 'S'
          : isLng ? 'E' : 'N';

        const absDd = Math.abs(dd);
        const deg = absDd | 0;
        const frac = absDd - deg;
        const min = (frac * 60) | 0;
        let sec = frac * 3600 - min * 60;
        // Round it to 2 decimal points.
        sec = Math.round(sec * 100) / 100;
        return deg + "°" + min + "'" + sec + '"' + dir;
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
              const features = await GeoPackageFeatureTableUtilities.getAllFeaturesAsGeoJSON(geopackage.path, tableName)
              this.tableFeatures = {
                geopackageTables: [{
                  id: geopackage.id + '_' + tableName,
                  tabName: geopackage.name + ': ' + tableName,
                  geopackageId: geopackage.id,
                  tableName: tableName,
                  columns: await GeoPackageFeatureTableUtilities.getFeatureColumns(geopackage.path, tableName),
                  features: features,
                  featureStyleAssignments: await GeoPackageStyleUtilities.getStyleAssignmentForFeatures(geopackage.path, tableName),
                  featureAttachmentCounts: await GeoPackageMediaUtilities.getMediaAttachmentsCounts(geopackage.path, tableName)
                }],
                sourceTables: []
              }
            } else {
              const sourceLayerConfig = this.sources[id]
              const features = await GeoPackageFeatureTableUtilities.getAllFeaturesAsGeoJSON(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
              this.tableFeatures = {
                geopackageTables: [],
                sourceTables: [{
                  id: sourceLayerConfig.id,
                  tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
                  sourceId: sourceLayerConfig.id,
                  tableName: sourceLayerConfig.sourceLayerName,
                  columns: await GeoPackageFeatureTableUtilities.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                  features: features,
                  featureStyleAssignments: await GeoPackageStyleUtilities.getStyleAssignmentForFeatures(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                  featureAttachmentCounts: await GeoPackageMediaUtilities.getMediaAttachmentsCounts(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
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
          if (!isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
            layer.close()
          }
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
        let layer = LayerFactory.constructLayer({id: geopackage.id + '_' + tableName, filePath: geopackage.path, sourceLayerName: tableName, layerType: 'GeoPackage'})
        let mapLayer = LeafletMapLayerFactory.constructMapLayer({layer: layer})
        if (geopackage.tables.tiles[tableName].visible) {
          mapLayer.initializeLayer().then(() => {
            self.geopackageMapLayers[geopackage.id][tableName] = mapLayer
            self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, true, map))
          })
        }
      },
      addGeoPackageFeatureTable (geopackage, map, tableName) {
        let self = this
        let layer = LayerFactory.constructLayer({
          id: geopackage.id + '_' + tableName,
          geopackageFilePath: geopackage.path,
          sourceDirectory: geopackage.path,
          sourceLayerName: tableName,
          sourceType: 'GeoPackage',
          layerType: 'Vector',
          count: geopackage.tables.features[tableName].featureCount,
          extent: geopackage.tables.features[tableName].extent,
        })
        let mapLayer = LeafletMapLayerFactory.constructMapLayer({layer: layer, maxFeatures: this.project.maxFeatures})
        if (geopackage.tables.features[tableName].visible) {
          mapLayer.initializeLayer().then(() => {
            self.geopackageMapLayers[geopackage.id][tableName] = mapLayer
            self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, false, map))
          })
        }
      },
      async zoomToContent () {
        let self = this
        self.getExtentForVisibleGeoPackagesAndLayers().then((extent) => {
          if (!isNil(extent)) {
            let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            self.map.fitBounds(boundingBox, {maxZoom: 20})
          }
        })
      },
      async getExtentForVisibleGeoPackagesAndLayers () {
        let overallExtent = null
        let geopackageKeys = keys(geopackageLayers)
        for (let i = 0; i < geopackageKeys.length; i++) {
          const geopackageId = geopackageKeys[i]
          const geopackage = geopackageLayers[geopackageId]
          const tablesToZoomTo = keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
          const extentForGeoPackage = await GeoPackageCommon.performSafeGeoPackageOperation(geopackage.path, function (gp) {
            let extent = null
            tablesToZoomTo.forEach(table => {
              const ext = GeoPackageCommon._getBoundingBoxForTable(gp, table)
              if (!isNil(ext)) {
                if (isNil(extent)) {
                  extent = ext
                } else {
                  if (ext[0] < extent[0]) {
                    extent[0] = ext[0]
                  }
                  if (ext[1] < extent[1]) {
                    extent[1] = ext[1]
                  }
                  if (ext[2] > extent[2]) {
                    extent[2] = ext[2]
                  }
                  if (ext[3] > extent[3]) {
                    extent[3] = ext[3]
                  }
                }
              }
            })
            return extent
          })
          if (!isNil(extentForGeoPackage)) {
            if (isNil(overallExtent)) {
              overallExtent = extentForGeoPackage
            } else {
              if (extentForGeoPackage[0] < overallExtent[0]) {
                overallExtent[0] = extentForGeoPackage[0]
              }
              if (extentForGeoPackage[1] < overallExtent[1]) {
                overallExtent[1] = extentForGeoPackage[1]
              }
              if (extentForGeoPackage[2] > overallExtent[2]) {
                overallExtent[2] = extentForGeoPackage[2]
              }
              if (extentForGeoPackage[3] > overallExtent[3]) {
                overallExtent[3] = extentForGeoPackage[3]
              }
            }
          }
        }
        const visibleSourceKeys = keys(this.dataSourceMapLayers).filter(key => this.dataSourceMapLayers[key].getLayer().visible)
        for (let i = 0; i < visibleSourceKeys.length; i++) {
          const layerExtent = this.dataSourceMapLayers[visibleSourceKeys[i]].getLayer().extent
          if (!isNil(layerExtent)) {
            if (isNil(overallExtent)) {
              overallExtent = layerExtent
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
          }
        }
        return overallExtent
      },
      async queryForFeatures (e) {
        if (isNil(this.project.boundingBoxFilterEditing) && !this.drawingControl.isDrawing) {
          let tableFeatures = {
            geopackageTables: [],
            sourceTables: []
          }
          let featuresFound = false
          // TODO: add support for querying tiles if a feature tile link exists (may need to implement feature tile link in geopackage-js first!
          const geopackageValues = Object.values(this.geopackages)
          for (let i = 0; i < geopackageValues.length; i++) {
            const geopackage = geopackageValues[i]
            const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
            if (tables.length > 0) {
              const geopackageTables = await GeoPackageCommon.performSafeGeoPackageOperation(geopackage.path, (gp) => {
                const geopackageTables = []
                for (let i = 0; i < tables.length; i++) {
                  const tableName = tables[i]
                  const features = GeoPackageFeatureTableUtilities._queryForFeaturesAt(gp, tableName, e.latlng, this.map.getZoom())
                  if (!isEmpty(features)) {
                    featuresFound = true
                    const tableId = geopackage.id + '_' + tableName
                    geopackageTables.push({
                      id: tableId,
                      tabName: geopackage.name + ': ' + tableName,
                      geopackageId: geopackage.id,
                      tableName: tableName,
                      columns: GeoPackageFeatureTableUtilities._getFeatureColumns(gp, tableName),
                      features: features,
                      featureStyleAssignments: GeoPackageStyleUtilities._getStyleAssignmentForFeatures(gp, tableName),
                      featureAttachmentCounts: GeoPackageMediaUtilities._getMediaAttachmentsCounts(gp, tableName)
                    })
                  }
                }
                return geopackageTables
              })
              tableFeatures.geopackageTables = tableFeatures.geopackageTables.concat(geopackageTables)
            }
          }
          for (let sourceId in this.dataSourceMapLayers) {
            const sourceLayer = this.dataSourceMapLayers[sourceId].getLayer()._configuration
            if (sourceLayer.visible) {
              if (!isNil(sourceLayer.geopackageFilePath)) {
                const features = await GeoPackageFeatureTableUtilities.queryForFeaturesAt(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName, e.latlng, this.map.getZoom())
                if (!isEmpty(features)) {
                  featuresFound = true
                  tableFeatures.sourceTables.push({
                    id: sourceLayer.id,
                    tabName: sourceLayer.displayName ? sourceLayer.displayName : sourceLayer.name,
                    sourceId: sourceLayer.id,
                    tableName: sourceLayer.sourceLayerName,
                    columns: await GeoPackageFeatureTableUtilities.getFeatureColumns(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName),
                    features: features,
                    featureStyleAssignments: await GeoPackageStyleUtilities.getStyleAssignmentForFeatures(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName),
                    featureAttachmentCounts: await GeoPackageMediaUtilities.getMediaAttachmentsCounts(sourceLayer.geopackageFilePath, sourceLayer.sourceLayerName)
                  })
                }
              }
            }
          }
          if (featuresFound) {
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
        }).observe(document.getElementById('feature-table-ref'))
      },
      async initializeMap () {
        const defaultCenter = [39.658748, -104.843165]
        const defaultZoom = 3
        this.map = vendor.L.map('map', {
          editable: true,
          attributionControl: false,
          center: defaultCenter,
          zoom: defaultZoom,
          minZoom: 2,
          maxZoom: 20
        })
        ProjectActions.setMapZoom({projectId: this.project.id, mapZoom: defaultZoom})
        this.map.createPane('gridSelectionPane')
        this.map.getPane('gridSelectionPane').style.zIndex = 625
        this.map.createPane('baseMapPane')
        this.map.getPane('baseMapPane').style.zIndex = 200
        this.map.setView(defaultCenter, defaultZoom)
        await this.setupControls()
        this.map.setView(defaultCenter, defaultZoom)
        this.setupEventHandlers()
      },
      async setupBaseMaps () {
        for (let i = 0; i < this.baseMaps.length; i++) {
          await this.addBaseMap(this.baseMaps[i], this.map)
        }
      },
      async setupControls () {
        const self = this
        const host = 'https://osm-nominatim.gs.mil'
        const searchUrl = `${host}/search`
        const reverseUrl = `${host}/reverse`
        const provider = new OpenStreetMapProvider({searchUrl, reverseUrl})
        this.addressSearchBarControl = new GeoSearchControl({
          provider,
          style: 'bar'
        })
        this.map.addControl(this.addressSearchBarControl)
        this.basemapControl = new LeafletBaseMapTool({}, function () {
          self.showBaseMapSelection = !self.showBaseMapSelection
          if (self.showBaseMapSelection) {
            self.showLayerOrderingDialog = false
          }
        })
        this.map.addControl(this.basemapControl)
        await this.setupBaseMaps()
        this.map.zoomControl.setPosition('topright')
        this.displayZoomControl = new LeafletZoomIndicator()
        this.map.addControl(this.displayZoomControl)
        this.activeLayersControl = new LeafletActiveLayersTool({}, function () {
          self.zoomToContent()
        }, function () {
          ProjectActions.clearActiveLayers({projectId: self.projectId})
        }, function () {
          self.showLayerOrderingDialog = !self.showLayerOrderingDialog
          if (self.showLayerOrderingDialog) {
            self.showBaseMapSelection = false
          }
        })

        vendor.L.control.scale().addTo(this.map)
        this.map.addControl(this.activeLayersControl)
        this.drawingControl = new LeafletDraw()
        this.editingControl = new LeafletEdit()
        this.map.addControl(this.drawingControl)
        this.map.addControl(this.editingControl)
        this.project.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
        this.project.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
        this.project.displayAddressSearchBar ? this.addressSearchBarControl.container.style.display = '' : this.addressSearchBarControl.container.style.display = 'none'
      },
      setupEventHandlers () {
        const self = this
        const checkFeatureCount = throttle(async function (e) {
          if (!self.drawingControl.isDrawing && isNil(self.project.boundingBoxFilterEditing)) {
            let count = 0
            // TODO: add support for querying tiles if a feature tile link exists (may need to implement feature tile link in geopackage-js first!
            const geopackageValues = Object.values(this.geopackages)
            for (let i = 0; i < geopackageValues.length; i++) {
              const geopackage = geopackageValues[i]
              const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
              if (tables.length > 0) {
                count += await GeoPackageFeatureTableUtilities.countOfFeaturesAt(geopackage.path, tables, e.latlng, this.map.getZoom())
              }
            }
            for (let sourceId in this.dataSourceMapLayers) {
              const sourceLayer = this.dataSourceMapLayers[sourceId].getLayer()
              if (sourceLayer.visible) {
                if (!isNil(sourceLayer.geopackageFilePath)) {
                  count += await GeoPackageFeatureTableUtilities.countOfFeaturesAt(sourceLayer.geopackageFilePath, [sourceLayer.sourceLayerName], e.latlng, this.map.getZoom())
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
          this.queryForFeatures(e)
        })
        this.map.on('mousemove', checkFeatureCount)
        this.map.on('contextmenu', e => {
          if (!this.drawingControl.isDrawing) {
            if (this.coordinatePopup && this.coordinatePopup.isOpen()) {
              this.dialogCoordinate = e.latlng
              this.coordinatePopup.setLatLng(e.latlng)
            } else {
              this.dialogCoordinate = e.latlng
              this.$nextTick(() => {
                this.coordinatePopup = vendor.L.popup({minWidth: 300, closeButton: false, className: this.$vuetify.theme.dark ? 'theme--dark' : 'theme--light'})
                  .setLatLng(e.latlng)
                  .setContent(this.$refs['leafletCoordinatePopup'])
                  .openOn(this.map)
              })
            }
          }
        })
        this.map.on('editable:drawing:end', function (e) {
          if (!self.drawingControl.isDrawing && !self.drawingControl.cancelled) {
            e.layer.toggleEdit()
            let layers = [NEW_GEOPACKAGE_OPTION]
            Object.values(self.geopackages).forEach((geopackage) => {
              layers.push({text: geopackage.name, value: geopackage.id})
            })
            self.createdLayer = e.layer
            self.geoPackageChoices = layers
            if (!isNil(self.project.activeGeoPackage)) {
              if (!isNil(self.project.activeGeoPackage.geopackageId)) {
                const index = self.geoPackageChoices.findIndex(choice => choice.value === self.project.activeGeoPackage.geopackageId)
                if (index > 0) {
                  self.geoPackageSelection = self.geoPackageChoices[index].value
                }
              }
            }
            self.layerSelectionVisible = true
            self.$nextTick(() => {
              if (!isNil(self.$refs.featureTableNameForm)) {
                self.$refs.featureTableNameForm.validate()
              }
            })
          }
        })
        this.map.on('zoomend', () => {
          ProjectActions.setMapZoom({projectId: self.project.id, mapZoom: self.map.getZoom()})
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
        async handler (newBaseMaps) {
          const self = this
          const selectedBaseMapId = this.selectedBaseMapId

          let oldConfig
          if (!isNil(self.baseMapLayers[selectedBaseMapId]) && selectedBaseMapId !== self.offlineBaseMapId) {
            oldConfig = self.baseMapLayers[selectedBaseMapId].getLayer()._configuration
          }
          // update the layer config stored for each base map
          newBaseMaps.filter(self.offlineBaseMapFilter).forEach(baseMap => {
            if (self.baseMapLayers[baseMap.id]) {
              self.baseMapLayers[baseMap.id].update(baseMap.layerConfiguration)
              self.baseMapLayers[baseMap.id].getLayer().error = baseMap.error
            }
          })
          const selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === selectedBaseMapId)
          if (selectedBaseMapId !== self.offlineBaseMapId) {
            // if currently selected baseMapId is no longer available, be sure to remove it and close out the layer if possible
            if (isNil(selectedBaseMap)) {
              if (newBaseMaps.length - 1 < this.baseMapIndex) {
                this.baseMapIndex = newBaseMaps.length - 1
              }
              const layer = self.baseMapLayers[selectedBaseMapId]
              if (layer) {
                self.map.removeLayer(self.baseMapLayers[selectedBaseMapId])
                if (layer && Object.prototype.hasOwnProperty.call(layer, 'close')) {
                  layer.close()
                }
              }
              delete self.baseMapLayers[selectedBaseMapId]
              self.selectedBaseMapId = newBaseMaps[self.baseMapIndex].id
            } else if (!isNil(oldConfig)) {
              const newConfig = selectedBaseMap.layerConfiguration
              const styleKeyChanged = oldConfig.pane === 'vector' && oldConfig.styleKey !== newConfig.styleKey
              const repaintFields = self.baseMapLayers[selectedBaseMapId].getLayer().getRepaintFields()
              const repaintRequired = self.baseMapLayers[selectedBaseMapId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_COMPLETED && !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))
              // styleChanged performs an asynchronous recycling of the geopackage connection
              if (styleKeyChanged) {
                await self.baseMapLayers[selectedBaseMapId].styleChanged()
              }
              if (repaintRequired) {
                self.baseMapLayers[selectedBaseMapId].redraw()
              }
              this.mapBackground = selectedBaseMap.background || '#ddd'
            }
          }
        }
      },
      selectedBaseMapId: {
        async handler (newBaseMapId, oldBaseMapId) {
          const self = this
          self.$nextTick(async () => {
            this.baseMapIndex = self.baseMaps.findIndex(baseMap => baseMap.id === newBaseMapId)
            const newBaseMap = self.baseMaps[this.baseMapIndex]

            let success = true
            if (!newBaseMap.readonly && !isNil(newBaseMap.layerConfiguration) && LayerTypes.isRemote(newBaseMap.layerConfiguration)) {
              success = await ServiceConnectionUtils.connectToBaseMap(newBaseMap, ProjectActions.editBaseMap, true, newBaseMap.layerConfiguration.timeoutMs)
            }

            // remove old map layer
            if (self.baseMapLayers[oldBaseMapId]) {
              self.map.removeLayer(self.baseMapLayers[oldBaseMapId])
            }

            if (success) {
              // check to see if base map has already been added
              if (isNil(self.baseMapLayers[newBaseMapId])) {
                await self.addBaseMap(newBaseMap, self.map)
              } else {
                // do not update offline base map id
                if (newBaseMapId !== self.offlineBaseMapId) {
                  self.baseMapLayers[newBaseMapId].update(newBaseMap.layerConfiguration)
                }
                if (newBaseMapId === self.offlineBaseMapId || self.baseMapLayers[newBaseMapId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_COMPLETED) {
                  self.map.addLayer(self.baseMapLayers[newBaseMapId])
                }
                if (newBaseMapId !== self.offlineBaseMapId && self.baseMapLayers[newBaseMapId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_NOT_STARTED) {
                  self.initializeBaseMap(newBaseMapId, self.map)
                }
              }
              self.mapBackground = newBaseMap.background || '#ddd'
            } else {
              self.map.addLayer(self.baseMapLayers[self.offlineBaseMapId])
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
              mapLayer.bringToFront()
            }
          })
          ProjectActions.setMapRenderingOrder({projectId: this.projectId, mapRenderingOrder: layers.map(l => l.id)})
          if (layers.length > 0) {
            this.activeLayersControl.enable()
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
          const changedSourceIds = updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) >= 0)
          for (let i = 0; i < changedSourceIds.length; i++) {
            const sourceId = changedSourceIds[i]
            const newConfig = updatedSources[sourceId]
            const oldConfig = this.dataSourceMapLayers[sourceId].getLayer()._configuration

            const enablingLayer = !oldConfig.visible && newConfig.visible
            const disablingLayer = oldConfig.visible && !newConfig.visible
            const styleKeyChanged = oldConfig.pane === 'vector' && oldConfig.styleKey !== newConfig.styleKey
            const repaintFields = this.dataSourceMapLayers[sourceId].getLayer().getRepaintFields()
            const repaintRequired = this.dataSourceMapLayers[sourceId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_COMPLETED && oldConfig.visible && !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))

            // update layer
            this.dataSourceMapLayers[sourceId].update(updatedSources[sourceId])

            // styleChanged performs an asynchronous recycling of the geopackage connection
            if (styleKeyChanged) {
              await this.dataSourceMapLayers[sourceId].styleChanged()
            }

            // disabling layer, so remove it from the map
            if (disablingLayer) {
              this.removeLayerFromMap(this.dataSourceMapLayers[sourceId], sourceId)
            } else if (enablingLayer) {
              // test if remote source is healthy
              let valid = true
              if (LayerTypes.isRemote(newConfig)) {
                try {
                  await this.dataSourceMapLayers[sourceId].testConnection(true)
                } catch (e) {
                  ProjectActions.setSourceError({id: sourceId, error: e})
                  valid = false
                }
              }
              if (valid) {
                // enabling map layer, if this has been initialized, we are good to go
                if (this.dataSourceMapLayers[sourceId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_NOT_STARTED) {
                  this.initializeDataSource(sourceId, map)
                } else if (this.dataSourceMapLayers[sourceId].getInitializationState() === vendor.L.INIT_STATES.INITIALIZATION_COMPLETED) {
                  this.addLayerToMap(map, this.dataSourceMapLayers[sourceId], generateLayerOrderItemForSource(this.dataSourceMapLayers[sourceId].getLayer(), map))
                }
              }
            } else if (repaintRequired) {
              this.dataSourceMapLayers[sourceId].redraw()
            }
          }

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
            // check if the tables have changed
            if (!isEqual(updatedGeoPackage.tables, oldGeoPackage.tables)) {
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

              geopackageLayers[updatedGeoPackage.id] = cloneDeep(updatedGeoPackage)
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
          updatedProject.displayAddressSearchBar ? this.addressSearchBarControl.container.style.display = '' : this.addressSearchBarControl.container.style.display = 'none'
          // max features setting changed
          if (updatedProject.maxFeatures !== this.maxFeatures) {
            for (const gp of Object.values(updatedProject.geopackages)) {
              for (const tableName of Object.keys(gp.tables.features)) {
                if (self.geopackageMapLayers[gp.id] && self.geopackageMapLayers[gp.id][tableName] && self.geopackageMapLayers[gp.id][tableName]) {
                  const layer = self.geopackageMapLayers[gp.id][tableName]
                  if (!isNil(layer)) {
                    await layer.updateMaxFeatures(updatedProject.maxFeatures)
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
                await self.dataSourceMapLayers[sourceId].updateMaxFeatures(updatedProject.maxFeatures)
                // if visible, we need to toggle the layer
                if (self.dataSourceMapLayers[sourceId].getLayer().visible) {
                  self.dataSourceMapLayers[sourceId].redraw()
                }
              }
            }
            for (const baseMapId of keys(self.baseMapLayers)) {
              // if this is a vector layer, update it
              if (baseMapId !== self.offlineBaseMapId && self.baseMapLayers[baseMapId].getLayer().pane === 'vector') {
                // update max features
                await self.baseMapLayers[baseMapId].updateMaxFeatures(updatedProject.maxFeatures)
                // if visible, we need to toggle the layer
                if (baseMapId === self.selectedBaseMapId) {
                  self.baseMapLayers[baseMapId].redraw()
                }
              }
            }
          }
          this.maxFeatures = updatedProject.maxFeatures
          if (!isNil(updatedProject.zoomToExtent) && !isEqual(updatedProject.zoomToExtent.key, this.zoomToExtentKey)) {
            this.zoomToExtentKey = updatedProject.zoomToExtent.key
            let boundingBox = [[updatedProject.zoomToExtent.extent[1], updatedProject.zoomToExtent.extent[0]], [updatedProject.zoomToExtent.extent[3], updatedProject.zoomToExtent.extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            this.map.fitBounds(boundingBox, {maxZoom: 20})
          }
          if (isNil(updatedProject.boundingBoxFilterEditing)) {
            this.drawingControl.enableDrawingLinks()
          } else {
            this.drawingControl.disableDrawingLinks()
          }

          let clearEditing = true
          if (!isNil(updatedProject.editingFeature)) {
            let id = updatedProject.editingFeature.id
            let isGeoPackage = updatedProject.editingFeature.isGeoPackage
            let tableName = updatedProject.editingFeature.tableName
            let featureId = updatedProject.editingFeature.featureToEdit.id
            let geoPackageObject = isGeoPackage ? updatedProject.geopackages[id] : updatedProject.sources[id]
            // did geopackage or data source get deleted
            if (!isNil(geoPackageObject)) {
              let exists = await GeoPackageFeatureTableUtilities.featureExists(isGeoPackage ? geoPackageObject.path : geoPackageObject.geopackageFilePath, tableName, featureId)
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
    mounted: async function () {
      ProjectActions.clearEditFeatureGeometry({projectId: this.project.id})
      EventBus.$on(EventBus.EventTypes.SHOW_FEATURE_TABLE, payload => this.displayFeaturesForTable(payload.id, payload.tableName, payload.isGeoPackage))
      EventBus.$on(EventBus.EventTypes.REORDER_MAP_LAYERS, this.reorderMapLayers)
      EventBus.$on(EventBus.EventTypes.REQUEST_SOURCE_INIT_STATUS, this.sendSourceInitializationStatus)
      this.maxFeatures = this.project.maxFeatures
      this.registerResizeObserver()
      await this.initializeMap()
      this.addLayersToMap()
    },
    beforeDestroy: function () {
      const self = this
      EventBus.$off([EventBus.EventTypes.SHOW_FEATURE_TABLE, EventBus.EventTypes.REORDER_MAP_LAYERS, EventBus.EventTypes.REQUEST_SOURCE_INIT_STATUS])
      keys(self.geopackageMapLayers).forEach(geopackageId => {
        keys(self.geopackageMapLayers[geopackageId]).forEach(table => {
          let layer = self.geopackageMapLayers[geopackageId][table]
          if (!isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
            layer.close()
          }
        })
      })
      keys(self.dataSourceMapLayers).forEach(key => {
        let layer = self.dataSourceMapLayers[key]
        if (!isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
          layer.close()
        }
      })
      keys(self.baseMapLayers).forEach(key => {
        let layer = self.baseMapLayers[key]
        if (!isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
          layer.close()
        }
      })
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
</style>
