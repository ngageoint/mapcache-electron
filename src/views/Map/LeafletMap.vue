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
            <v-icon color="orange" class="pr-2">mdi-alert</v-icon>
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
          <v-btn class="mr-1" small @click.stop.prevent="closePopup" icon><v-icon>mdi-close</v-icon></v-btn>
        </v-row>
        <v-card-text class="pa-0 ma-0">
          <v-card-text class="pt-1 pb-1 pr-0">
            <v-row no-gutters justify="space-between" align="center">
              <v-col>
                {{dialogCoordinate ? (dialogCoordinate.lat.toFixed(6) + ', ' + dialogCoordinate.lng.toFixed(6)) : ''}}
              </v-col>
              <v-btn icon color="primary" @click="() => {copyText(dialogCoordinate.lat.toFixed(6) + ', ' + dialogCoordinate.lng.toFixed(6))}"><v-icon>mdi-content-copy</v-icon></v-btn>
            </v-row>
            <v-row no-gutters  justify="space-between" align="center">
              <v-col>
                {{dialogCoordinate ? (convertToDms(dialogCoordinate.lat, false) + ', ' + convertToDms(dialogCoordinate.lng, true)) : ''}}
              </v-col>
              <v-btn icon color="primary" @click="() => {copyText(convertToDms(dialogCoordinate.lat, false) + ', ' + convertToDms(dialogCoordinate.lng, true))}"><v-icon>mdi-content-copy</v-icon></v-btn>
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
            <v-list-item v-for="item of baseMapItems" :key="item.id + '-basemap'" :value="item.id">
              <v-list-item-icon style="margin-right: 16px;">
                <v-btn style="width: 24px; height: 24px;" icon @click.stop="(e) => item.zoomTo(e, map)">
                  <v-icon small>mdi-map-outline</v-icon>
                </v-btn>
              </v-list-item-icon>
              <v-list-item-title>{{item.name}}</v-list-item-title>
              <base-map-troubleshooting v-if="item.baseMap.error" :base-map="item.baseMap"></base-map-troubleshooting>
              <v-progress-circular
                v-if="baseMapLayers[item.id] !== undefined && baseMapLayers[item.id].initializing"
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
  import { remote, clipboard } from 'electron'
  import { mapState } from 'vuex'
  import _ from 'lodash'
  import * as vendor from '../../lib/vendor'
  import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch'
  import 'leaflet-geosearch/dist/geosearch.css'
  import jetpack from 'fs-jetpack'
  import { GeoPackageDataType } from '@ngageoint/geopackage'
  import EventBus from '../../EventBus'
  import LeafletActiveLayersTool from './LeafletActiveLayersTool'
  import DrawBounds from './DrawBounds'
  import GridBounds from './GridBounds'
  import FeatureTable from './FeatureTable'
  import LeafletZoomIndicator from './LeafletZoomIndicator'
  import LeafletEdit from './LeafletEdit'
  import LeafletDraw from './LeafletDraw'
  import LayerFactory from '../../lib/source/layer/LayerFactory'
  import LeafletMapLayerFactory from '../../lib/map/mapLayers/LeafletMapLayerFactory'
  import UniqueIDUtilities from '../../lib/UniqueIDUtilities'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import FeatureEditor from '../Common/FeatureEditor'
  import ActionUtilities from '../../lib/ActionUtilities'
  import draggable from 'vuedraggable'
  import LeafletBaseMapTool from './LeafletBaseMapTool'
  import offline from '../../assets/ne_50m_countries.geo'
  import GeoTiffLayer from '../../lib/source/layer/tile/GeoTiffLayer'
  import MBTilesLayer from '../../lib/source/layer/tile/MBTilesLayer'
  import BaseMapTroubleshooting from '../Settings/BaseMaps/BaseMapTroubleshooting'
  import XYZServerLayer from '../../lib/source/layer/tile/XYZServerLayer'
  import WMSLayer from '../../lib/source/layer/tile/WMSLayer'
  import ServiceConnectionUtils from '../../lib/ServiceConnectionUtils'

  const NEW_GEOPACKAGE_OPTION = {text: 'New GeoPackage', value: 0}
  const NEW_FEATURE_LAYER_OPTION = {text: 'New Feature Layer', value: 0}
  // objects for storing state
  const sourceLayers = {}
  const geopackageLayers = {}
  let initializedGeoPackageTables = {}
  let visibleGeoPackageTables = {}

  function generateLayerOrderItemForSource (source, map) {
    return {
      title: source.displayName ? source.displayName : source.name,
      id: source.id,
      type: source.pane === 'vector' ? 'feature' : 'tile',
      zoomTo: _.debounce((e) => {
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
      zoomTo: _.debounce((e) => {
        e.stopPropagation()
        GeoPackageUtilities.getBoundingBoxForTable(geopackage.path, tableName).then(extent => {
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
              baseMap: baseMapConfig,
              name: baseMapConfig.name,
              zoomTo: _.debounce((e, map) => {
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
        baseMapLayers: {},
        selectedBaseMapId: 0,
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
          v => (this.geoPackageSelection === 0 || _.keys(this.geopackages[this.geoPackageSelection].tables.features).map(table => table.toLowerCase()).findIndex(table => table === v.toLowerCase()) === -1) || 'Layer name already exists'
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
        const sourceLayer = sourceLayers[sourceId]
        if (sourceLayer) {
          if (sourceLayer.initializing) {
            EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZING(sourceId))
          } else if (!_.isNil(sourceLayer.initializedSource)) {
            EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZED(sourceId))
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
        this.layerOrder.push(item)
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
        clipboard.writeText(text)
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
        if (!_.isNil(this.createdLayer._mRadius)) {
          feature.properties.radius = this.createdLayer._mRadius
        }
        switch (feature.geometry.type.toLowerCase()) {
          case 'point': {
            feature.geometry.coordinates[0] = GeoPackageUtilities.normalizeLongitude(feature.geometry.coordinates[0])
            break
          }
          case 'linestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              feature.geometry.coordinates[i][0] = GeoPackageUtilities.normalizeLongitude(feature.geometry.coordinates[i][0])
            }
            break
          }
          case 'polygon':
          case 'multilinestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j][0] = GeoPackageUtilities.normalizeLongitude(feature.geometry.coordinates[i][j][0])
              }
            }
            break
          }
          case 'multipolygon': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                for (let k = 0; k < feature.geometry.coordinates[i][j].length; k++) {
                  feature.geometry.coordinates[i][j][k][0] = GeoPackageUtilities.normalizeLongitude(feature.geometry.coordinates[i][j][k][0])
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
          remote.dialog.showSaveDialog({
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
                  GeoPackageUtilities.getOrCreateGeoPackage(filePath).then(gp => {
                    GeoPackageUtilities._createFeatureTable(gp, featureTableName, featureCollection, true).then(() => {
                      ActionUtilities.addGeoPackage({projectId: self.projectId, filePath: filePath})
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
            ActionUtilities.addFeatureTableToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: featureTableName, featureCollection: featureCollection})
            this.cancelDrawing()
          } else {
            const self = this
            const featureTable = this.geoPackageFeatureLayerChoices[this.geoPackageFeatureLayerSelection].text
            GeoPackageUtilities.getFeatureColumns(geopackage.path, featureTable).then(columns => {
              if (!_.isNil(columns) && !_.isNil(columns._columns) && columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id').length > 0) {
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
                ActionUtilities.addFeatureToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: featureTable, feature: feature})
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
        GeoPackageUtilities.getBoundingBoxForFeature(path, table, featureId).then(function (extent) {
          if (extent) {
            let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            map.fitBounds(boundingBox, {maxZoom: 20})
          }
        })
      },
      addDataSource (sourceConfiguration, map) {
        let self = this
        const sourceId = sourceConfiguration.id
        sourceLayers[sourceId] = {
          configuration: _.cloneDeep(sourceConfiguration),
          visible: sourceConfiguration.visible
        }
        if (sourceLayers[sourceId].configuration.visible) {
          sourceLayers[sourceId].initializing = true
          let source = LayerFactory.constructLayer(sourceConfiguration)
          source._maxFeatures = this.project.maxFeatures
          EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZING(sourceId))
          source.initialize().then(function () {
            // update style just in case during the initialization the layer was modified
            if (!_.isNil(sourceLayers[sourceId])) {
              if (source.layerType === GeoTiffLayer.LAYER_TYPE || source.layerType === MBTilesLayer.LAYER_TYPE) {
                source.updateStyle(sourceLayers[sourceId].configuration)
              }
              let mapLayer = LeafletMapLayerFactory.constructMapLayer(source)
              self.addLayerToMap(map, mapLayer, generateLayerOrderItemForSource(source, map))
              sourceLayers[sourceId].initializedSource = source
              sourceLayers[sourceId].mapLayer = mapLayer
              sourceLayers[sourceId].initializing = false
              EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZED(sourceId))
            }
          })
        }
      },
      addBaseMap (baseMap, map) {
        let self = this
        const baseMapId = baseMap.id
        self.baseMapLayers[baseMapId] = {
          layerConfiguration: _.cloneDeep(baseMap.layerConfiguration),
          initializing: true
        }
        if (baseMap.layerConfiguration.filePath === 'offline') {
          self.baseMapLayers[baseMapId].initializedLayer = baseMap.layerConfiguration
          self.baseMapLayers[baseMapId].mapLayer = vendor.L.geoJson(offline, {
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
          self.baseMapLayers[baseMapId].initializing = false
          map.addLayer(self.baseMapLayers[baseMapId].mapLayer)
          // updating initializing to false is not always updating the UI
          self.$forceUpdate()
        } else {
          let layer = LayerFactory.constructLayer(baseMap.layerConfiguration)
          layer._maxFeatures = self.project.maxFeatures
          layer.initialize().then(function () {
            // update style just in case during the initialization the layer was modified
            if (!_.isNil(self.baseMapLayers[baseMapId])) {
              if (layer.layerType === GeoTiffLayer.LAYER_TYPE || layer.layerType === MBTilesLayer.LAYER_TYPE) {
                layer.updateStyle(self.baseMapLayers[baseMapId].layerConfiguration)
              }
              let mapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
              self.baseMapLayers[baseMapId].initializedLayer = layer
              self.baseMapLayers[baseMapId].mapLayer = mapLayer
              self.baseMapLayers[baseMapId].initializing = false
              if (self.selectedBaseMapId === baseMapId) {
                map.addLayer(mapLayer)
              }
              // updating initializing to false is not always updating the UI
              self.$forceUpdate()
            }
          })
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
        if (!_.isNil(id) && !_.isNil(tableName) && ((isGeoPackage && !_.isNil(this.geopackages[id]) && !_.isNil(this.geopackages[id].tables.features[tableName])) || (!isGeoPackage && !_.isNil(this.sources[id])))) {
          try {
            this.lastShowFeatureTableEvent = {
              id,
              tableName,
              isGeoPackage
            }
            this.tableFeaturesLatLng = null
            if (isGeoPackage) {
              const geopackage = this.geopackages[id]
              const features = await GeoPackageUtilities.getAllFeaturesAsGeoJSON(geopackage.path, tableName)
              this.tableFeatures = {
                geopackageTables: [{
                  id: geopackage.id + '_' + tableName,
                  tabName: geopackage.name + ': ' + tableName,
                  geopackageId: geopackage.id,
                  tableName: tableName,
                  columns: await GeoPackageUtilities.getFeatureColumns(geopackage.path, tableName),
                  features: features,
                  featureStyleAssignments: await GeoPackageUtilities.getStyleAssignmentForFeatures(geopackage.path, tableName),
                  featureAttachmentCounts: await GeoPackageUtilities.getMediaAttachmentsCounts(geopackage.path, tableName)
                }],
                sourceTables: []
              }
            } else {
              const sourceLayerConfig = this.sources[id]
              const features = await GeoPackageUtilities.getAllFeaturesAsGeoJSON(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
              this.tableFeatures = {
                geopackageTables: [],
                sourceTables: [{
                  id: sourceLayerConfig.id,
                  tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
                  sourceId: sourceLayerConfig.id,
                  tableName: sourceLayerConfig.sourceLayerName,
                  columns: await GeoPackageUtilities.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                  features: features,
                  featureStyleAssignments: await GeoPackageUtilities.getStyleAssignmentForFeatures(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                  featureAttachmentCounts: await GeoPackageUtilities.getMediaAttachmentsCounts(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
                }]
              }
            }
            this.displayFeatureTable()
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
            this.hideFeatureTable()
          }
        } else {
          this.hideFeatureTable()
        }
      },
      removeDataSource (sourceId) {
        const sourceLayer = sourceLayers[sourceId]
        if (!_.isNil(sourceLayer)) {
          if (sourceLayer.mapLayer) {
            this.removeLayerFromMap(sourceLayer.mapLayer, sourceId)
          }
          if (!_.isNil(sourceLayer.initializedSource) && Object.prototype.hasOwnProperty.call(sourceLayer.initializedSource, 'close')) {
            sourceLayer.initializedSource.close()
          }
          delete sourceLayers[sourceId]
        }
      },
      addGeoPackageToMap (geopackage, map) {
        this.removeGeoPackage(geopackage.id)
        geopackageLayers[geopackage.id] = _.cloneDeep(geopackage)
        _.keys(geopackage.tables.tiles).filter(tableName => geopackage.tables.tiles[tableName].visible).forEach(tableName => {
          this.addGeoPackageTileTable(geopackage, map, tableName)
        })
        _.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible).forEach(tableName => {
          this.addGeoPackageFeatureTable(geopackage, map, tableName)
        })
      },
      removeGeoPackage (geopackageId) {
        const geopackage = geopackageLayers[geopackageId]
        if (!_.isNil(geopackage)) {
          _.keys(geopackage.tables.tiles).forEach(tileTable => {
            this.removeGeoPackageTileTable(geopackage, tileTable)
          })
          _.keys(geopackage.tables.features).forEach(tableName => {
            this.removeGeoPackageFeatureTable(geopackage, tableName)
          })
          delete geopackageLayers[geopackageId]
        }
      },
      addGeoPackageTileTable (geopackage, map, tableName) {
        let self = this
        let layer = LayerFactory.constructLayer({id: geopackage.id + '_tile_' + tableName, filePath: geopackage.path, sourceLayerName: tableName, layerType: 'GeoPackage'})
        layer.initialize().then(function () {
          if (geopackage.tables.tiles[tableName].visible) {
            let mapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
            self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, true, map))
            if (!visibleGeoPackageTables[geopackage.id]) {
              visibleGeoPackageTables[geopackage.id] = {
                tileTables: {},
                featureTables: {}
              }
            }
            visibleGeoPackageTables[geopackage.id].tileTables[tableName] = mapLayer
          }
          if (!initializedGeoPackageTables[geopackage.id]) {
            initializedGeoPackageTables[geopackage.id] = {
              tileTables: {},
              featureTables: {}
            }
          }
          initializedGeoPackageTables[geopackage.id].tileTables[tableName] = layer
        })
      },
      removeGeoPackageTileTable (geopackage, tableName) {
        if (!_.isNil(visibleGeoPackageTables[geopackage.id])) {
          let mapLayer = visibleGeoPackageTables[geopackage.id].tileTables[tableName]
          if (mapLayer) {
            this.removeLayerFromMap(mapLayer, geopackage.id + '_' + tableName)
          }
          delete visibleGeoPackageTables[geopackage.id].tileTables[tableName]
        }
        if (!_.isNil(initializedGeoPackageTables[geopackage.id])) {
          const layer = initializedGeoPackageTables[geopackage.id].tileTables[tableName]
          if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
            layer.close()
          }
          delete initializedGeoPackageTables[geopackage.id].tileTables[tableName]
        }
      },
      addGeoPackageFeatureTable (geopackage, map, tableName) {
        let self = this
        let layer = LayerFactory.constructLayer({
          id: geopackage.id + '_feature_' + tableName,
          geopackageFilePath: geopackage.path,
          sourceDirectory: geopackage.path,
          sourceLayerName: tableName,
          sourceType: 'GeoPackage',
          layerType: 'Vector',
          maxFeatures: this.project.maxFeatures
        })
        layer.initialize().then(function () {
          if (geopackage.tables.features[tableName].visible) {
            let mapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
            self.addLayerToMap(map, mapLayer, generateLayerOrderItemForGeoPackageTable(geopackage, tableName, false, map))
            if (!visibleGeoPackageTables[geopackage.id]) {
              visibleGeoPackageTables[geopackage.id] = {
                tileTables: {},
                featureTables: {}
              }
            }
            visibleGeoPackageTables[geopackage.id].featureTables[tableName] = mapLayer
          }
          if (!initializedGeoPackageTables[geopackage.id]) {
            initializedGeoPackageTables[geopackage.id] = {
              tileTables: {},
              featureTables: {}
            }
          }
          initializedGeoPackageTables[geopackage.id].featureTables[tableName] = layer
        })
      },
      removeGeoPackageFeatureTable (geopackage, tableName) {
        if (!_.isNil(visibleGeoPackageTables[geopackage.id])) {
          let mapLayer = visibleGeoPackageTables[geopackage.id].featureTables[tableName]
          if (mapLayer) {
            this.removeLayerFromMap(mapLayer, geopackage.id + '_' + tableName)
          }
          delete visibleGeoPackageTables[geopackage.id].featureTables[tableName]
        }
        if (!_.isNil(initializedGeoPackageTables[geopackage.id])) {
          const layer = initializedGeoPackageTables[geopackage.id].featureTables[tableName]
          if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
            layer.close()
          }
          delete initializedGeoPackageTables[geopackage.id].featureTables[tableName]
        }
      },
      async zoomToContent () {
        let self = this
        self.getExtentForVisibleGeoPackagesAndLayers().then((extent) => {
          if (!_.isNil(extent)) {
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
        let keys = Object.keys(visibleGeoPackageTables)
        for (let i = 0; i < keys.length; i++) {
          const geopackageId = keys[i]
          const geopackage = geopackageLayers[geopackageId]
          const tablesToZoomTo = _.keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(_.keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
          const extentForGeoPackage = await GeoPackageUtilities.performSafeGeoPackageOperation(geopackage.path, function (gp) {
            let extent = null
            tablesToZoomTo.forEach(table => {
              const ext = GeoPackageUtilities._getBoundingBoxForTable(gp, table)
              if (!_.isNil(ext)) {
                if (_.isNil(extent)) {
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
          if (!_.isNil(extentForGeoPackage)) {
            if (_.isNil(overallExtent)) {
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
        keys = Object.keys(sourceLayers).filter(key => sourceLayers[key].configuration.visible)
        for (let i = 0; i < keys.length; i++) {
          const layerExtent = sourceLayers[keys[i]].configuration.extent
          if (!_.isNil(layerExtent)) {
            if (_.isNil(overallExtent)) {
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
        if (_.isNil(this.project.boundingBoxFilterEditing) && !this.drawingControl.isDrawing) {
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
              const geopackageTables = await GeoPackageUtilities.performSafeGeoPackageOperation(geopackage.path, (gp) => {
                const geopackageTables = []
                for (let i = 0; i < tables.length; i++) {
                  const tableName = tables[i]
                  const features = GeoPackageUtilities._queryForFeaturesAt(gp, tableName, e.latlng, this.map.getZoom())
                  if (!_.isEmpty(features)) {
                    featuresFound = true
                    const tableId = geopackage.id + '_' + tableName
                    geopackageTables.push({
                      id: tableId,
                      tabName: geopackage.name + ': ' + tableName,
                      geopackageId: geopackage.id,
                      tableName: tableName,
                      columns: GeoPackageUtilities._getFeatureColumns(gp, tableName),
                      features: features,
                      featureStyleAssignments: GeoPackageUtilities._getStyleAssignmentForFeatures(gp, tableName),
                      featureAttachmentCounts: GeoPackageUtilities._getMediaAttachmentsCounts(gp, tableName)
                    })
                  }
                }
                return geopackageTables
              })
              tableFeatures.geopackageTables = tableFeatures.geopackageTables.concat(geopackageTables)
            }
          }
          for (let sourceId in sourceLayers) {
            const sourceLayerConfig = sourceLayers[sourceId].configuration
            if (sourceLayerConfig.visible) {
              if (!_.isNil(sourceLayerConfig.geopackageFilePath)) {
                const features = await GeoPackageUtilities.queryForFeaturesAt(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName, e.latlng, this.map.getZoom())
                if (!_.isEmpty(features)) {
                  featuresFound = true
                  tableFeatures.sourceTables.push({
                    id: sourceLayerConfig.id,
                    tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
                    sourceId: sourceLayerConfig.id,
                    tableName: sourceLayerConfig.sourceLayerName,
                    columns: await GeoPackageUtilities.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                    features: features,
                    featureStyleAssignments: await GeoPackageUtilities.getStyleAssignmentForFeatures(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                    featureAttachmentCounts: await GeoPackageUtilities.getMediaAttachmentsCounts(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
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
      displayNetworkErrorMessage () {
        this.displayNetworkError = true
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
        ActionUtilities.setMapZoom({projectId: this.project.id, mapZoom: defaultZoom})
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
        await this.addBaseMap(this.baseMaps[0], this.map)
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
          ActionUtilities.clearActiveLayers({projectId: self.projectId})
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
        const checkFeatureCount = _.throttle(async function (e) {
          if (!self.drawingControl.isDrawing && _.isNil(self.project.boundingBoxFilterEditing)) {
            let count = 0
            // TODO: add support for querying tiles if a feature tile link exists (may need to implement feature tile link in geopackage-js first!
            const geopackageValues = Object.values(this.geopackages)
            for (let i = 0; i < geopackageValues.length; i++) {
              const geopackage = geopackageValues[i]
              const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
              if (tables.length > 0) {
                count += await GeoPackageUtilities.countOfFeaturesAt(geopackage.path, tables, e.latlng, this.map.getZoom())
              }
            }
            for (let sourceId in sourceLayers) {
              const sourceLayerConfig = sourceLayers[sourceId].configuration
              if (sourceLayerConfig.visible) {
                if (!_.isNil(sourceLayerConfig.geopackageFilePath)) {
                  count += await GeoPackageUtilities.countOfFeaturesAt(sourceLayerConfig.geopackageFilePath, [sourceLayerConfig.sourceLayerName], e.latlng, this.map.getZoom())
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
            if (!_.isNil(self.project.activeGeoPackage)) {
              if (!_.isNil(self.project.activeGeoPackage.geopackageId)) {
                const index = self.geoPackageChoices.findIndex(choice => choice.value === self.project.activeGeoPackage.geopackageId)
                if (index > 0) {
                  self.geoPackageSelection = self.geoPackageChoices[index].value
                }
              }
            }
            self.layerSelectionVisible = true
            self.$nextTick(() => {
              if (!_.isNil(self.$refs.featureTableNameForm)) {
                self.$refs.featureTableNameForm.validate()
              }
            })
          }
        })
        this.map.on('zoomend', () => {
          ActionUtilities.setMapZoom({projectId: self.project.id, mapZoom: self.map.getZoom()})
        })
      },
      addLayersToMap () {
        for (const sourceId in this.sources) {
          this.addDataSource(this.sources[sourceId], this.map)
        }
        for (const geopackageId in this.geopackages) {
          this.addGeoPackageToMap(this.geopackages[geopackageId], this.map)
        }
      }
    },
    watch: {
      baseMaps: {
        async handler (newBaseMaps) {
          const self = this
          const selectedBaseMapId = this.selectedBaseMapId

          const oldBaseMapConfig = self.baseMapLayers[selectedBaseMapId].layerConfiguration
          // update the layer config stored for each base map
          newBaseMaps.forEach(baseMap => {
            if (self.baseMapLayers[baseMap.id]) {
              self.baseMapLayers[baseMap.id].layerConfiguration = baseMap.layerConfiguration
              if (self.baseMapLayers[baseMap.id].initializedLayer) {
                self.baseMapLayers[baseMap.id].initializedLayer.error = baseMap.error
              }
            }
          })
          const selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === selectedBaseMapId)
          // if currently selected baseMapId is no longer available, be sure to remove it and close out the layer if possible
          if (_.isNil(selectedBaseMap)) {
            if (newBaseMaps.length - 1 < this.baseMapIndex) {
              this.baseMapIndex = newBaseMaps.length - 1
            }
            if (self.baseMapLayers[selectedBaseMapId] && self.baseMapLayers[selectedBaseMapId].mapLayer) {
              self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
            }
            const initializedLayer = self.baseMapLayers[selectedBaseMapId].initializedLayer
            if (initializedLayer && Object.prototype.hasOwnProperty.call(initializedLayer, 'close')) {
              initializedLayer.close()
            }
            delete self.baseMapLayers[selectedBaseMapId]
            self.selectedBaseMapId = newBaseMaps[self.baseMapIndex].id
          } else {
            if (!_.isNil(selectedBaseMap) && !_.isNil(selectedBaseMap.layerConfiguration) && !_.isNil(self.baseMapLayers[selectedBaseMapId]) && !_.isNil(self.baseMapLayers[selectedBaseMapId].initializedLayer)) {
              if (selectedBaseMap.layerConfiguration.layerType === GeoTiffLayer.LAYER_TYPE || selectedBaseMap.layerConfiguration.layerType === MBTilesLayer.LAYER_TYPE) {
                self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                self.baseMapLayers[selectedBaseMapId].initializedLayer.updateStyle(selectedBaseMap.layerConfiguration)
                self.baseMapLayers[selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[selectedBaseMapId].initializedLayer)
                self.map.addLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
              } else if (!_.isEqual(selectedBaseMap.layerConfiguration.styleKey, oldBaseMapConfig.styleKey) && selectedBaseMap.layerConfiguration.pane === 'vector') {
                self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                await self.baseMapLayers[selectedBaseMapId].initializedLayer.updateStyle(this.project.maxFeatures)
                self.baseMapLayers[selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[selectedBaseMapId].initializedLayer)
                self.map.addLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
              } else {
                try {
                  if (self.baseMapLayers[selectedBaseMapId].mapLayer && self.baseMapLayers[selectedBaseMapId].mapLayer.hasError() && _.isNil(selectedBaseMap.error)) {
                    self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                    self.baseMapLayers[selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[selectedBaseMapId].initializedLayer)
                    self.map.addLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                  }
                  // eslint-disable-next-line no-empty
                } catch (e) {}
              }
              try {
                self.baseMapLayers[selectedBaseMapId].mapLayer.setOpacity(selectedBaseMap.layerConfiguration.opacity)
                // eslint-disable-next-line no-empty
              } catch (e) {}
              try {
                self.baseMapLayers[selectedBaseMapId].mapLayer.setError(selectedBaseMap.error)
                // eslint-disable-next-line no-empty
              } catch (e) {}
              this.mapBackground = selectedBaseMap.background || '#ddd'
            }
          }
        }
      },
      selectedBaseMapId: {
        async handler (newBaseMapId, oldBaseMapId) {
          const self = this
          const oldBaseMapIndex = oldBaseMapId
          self.$nextTick(async () => {
            this.baseMapIndex = self.baseMaps.findIndex(baseMap => baseMap.id === newBaseMapId)
            const newBaseMap = self.baseMaps[this.baseMapIndex]

            let success = true
            if (!newBaseMap.readonly && !_.isNil(newBaseMap.layerConfiguration) && (newBaseMap.layerConfiguration.layerType === WMSLayer.LAYER_TYPE || newBaseMap.layerConfiguration.layerType === XYZServerLayer.LAYER_TYPE)) {
              success = await ServiceConnectionUtils.connectToBaseMap(newBaseMap, ActionUtilities.editBaseMap)
            }

            if (success) {
              if (self.baseMapLayers[oldBaseMapId] && self.baseMapLayers[oldBaseMapId].mapLayer) {
                self.map.removeLayer(self.baseMapLayers[oldBaseMapId].mapLayer)
              }

              // check to see if base map has already been initialized
              if (_.isNil(self.baseMapLayers[newBaseMapId])) {
                await self.addBaseMap(newBaseMap, self.map)
              } else {
                try {
                  self.baseMapLayers[newBaseMapId].mapLayer.setError(newBaseMap.error)
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                try {
                  self.baseMapLayers[newBaseMapId].mapLayer.setOpacity(newBaseMap.layerConfiguration.opacity)
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                if (newBaseMap.layerConfiguration.layerType === GeoTiffLayer.LAYER_TYPE || newBaseMap.layerConfiguration.layerType === MBTilesLayer.LAYER_TYPE && !_.isNil(self.baseMapLayers[newBaseMapId].initializedLayer)) {
                  self.baseMapLayers[newBaseMapId].initializedLayer.updateStyle(newBaseMap.layerConfiguration)
                  self.baseMapLayers[newBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[newBaseMapId].initializedLayer)
                }

                try {
                  if (self.baseMapLayers[newBaseMapId].mapLayer.hasError()) {
                    self.baseMapLayers[newBaseMapId].initializedLayer.error = newBaseMap.error
                    self.baseMapLayers[newBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[newBaseMapId].initializedLayer)
                  }
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                self.map.addLayer(self.baseMapLayers[newBaseMapId].mapLayer)
              }
              this.mapBackground = newBaseMap.background || '#ddd'
            } else {
              this.selectedBaseMapId = oldBaseMapIndex
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
            if (!_.isNil(layer.geopackageId) && visibleGeoPackageTables[layer.geopackageId] && visibleGeoPackageTables[layer.geopackageId].featureTables) {
              if (visibleGeoPackageTables[layer.geopackageId] && visibleGeoPackageTables[layer.geopackageId].featureTables) {
                mapLayer = visibleGeoPackageTables[layer.geopackageId].featureTables[layer.tableName]
              }
            } else if (_.isNil(layer.geopackageId) && !_.isNil(sourceLayers[layer.id])) {
              mapLayer = sourceLayers[layer.id].mapLayer
            }
            if (!_.isNil(mapLayer)) {
              mapLayer.bringToFront()
            }
          })
          ActionUtilities.setMapRenderingOrder({projectId: this.projectId, mapRenderingOrder: layers.map(l => l.id)})
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
          let existingSourceIds = Object.keys(sourceLayers)

          // layer configs that have been removed completely
          existingSourceIds.filter((i) => updatedSourceIds.indexOf(i) < 0).forEach(sourceId => {
            self.removeDataSource(sourceId)
          })

          // new layer configs
          updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) < 0).forEach(sourceId => {
            let sourceConfig = updatedSources[sourceId]
            self.removeDataSource(sourceId)
            self.addDataSource(sourceConfig, map)
          })

          // see if any of the layers have changed
          updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) >= 0).forEach(sourceId => {
            let updatedSource = updatedSources[sourceId]
            let oldLayerConfig = sourceLayers[sourceId].configuration
            // something other than sourceKey, maxFeatures, visible, or feature assignments changed
            if (!_.isEqual(_.omit(updatedSource, ['styleKey', 'visible']), _.omit(oldLayerConfig, ['styleKey', 'visible']))) {
              if (updatedSource.layerType === GeoTiffLayer.LAYER_TYPE || updatedSource.layerType === MBTilesLayer.LAYER_TYPE) {
                sourceLayers[sourceId].configuration = _.cloneDeep(updatedSource)
                if (!_.isNil(sourceLayers[sourceId].initializedSource)) {
                  sourceLayers[sourceId].initializedSource.updateStyle(sourceLayers[sourceId].configuration)
                  if (sourceLayers[sourceId].configuration.visible) {
                    let mapLayer = sourceLayers[sourceId].mapLayer
                    if (mapLayer) {
                      self.removeLayerFromMap(mapLayer, sourceId)
                      delete sourceLayers[sourceId].mapLayer
                    }
                    mapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                    self.addLayerToMap(map, mapLayer, generateLayerOrderItemForSource(sourceLayers[sourceId].configuration, map))
                    sourceLayers[sourceId].mapLayer = mapLayer
                  }
                }
              } else {
                self.removeDataSource(sourceId)
                self.addDataSource(updatedSource, map)
              }
            } else if (!_.isEqual(updatedSource.visible, oldLayerConfig.visible)) {
              // copy configuration for source
              sourceLayers[sourceId].configuration = _.cloneDeep(updatedSource)
              // if visible, ensure it is initialized
              if (updatedSource.visible) {
                if (_.isNil(sourceLayers[sourceId].initializedSource) && !sourceLayers[sourceId].initializing) {
                  sourceLayers[sourceId].initializing = true
                  let source = LayerFactory.constructLayer(sourceLayers[sourceId].configuration)
                  source._maxFeatures = this.project.maxFeatures
                  EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZING(sourceId))
                  source.initialize().then(function () {
                    // update style just in case during the initialization the layer was modified
                    if (!_.isNil(sourceLayers[sourceId])) {
                      sourceLayers[sourceId].initializedSource = source
                      if (source.layerType === GeoTiffLayer.LAYER_TYPE || source.layerType === MBTilesLayer.LAYER_TYPE) {
                        sourceLayers[sourceId].initializedSource.updateStyle(sourceLayers[sourceId].configuration)
                      }
                      // it is possible that the user could have disabled the source while waiting, or cleared sources...
                      if (sourceLayers[sourceId].configuration.visible) {
                        let mapLayer = LeafletMapLayerFactory.constructMapLayer(source)
                        self.addLayerToMap(map, mapLayer, generateLayerOrderItemForSource(source, map))
                        sourceLayers[sourceId].mapLayer = mapLayer
                        sourceLayers[sourceId].initializing = false
                      }
                    }
                    EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZED(sourceId))
                  })
                } else if (!_.isNil(sourceLayers[sourceId].initializedSource)) {
                  if (sourceLayers[sourceId].initializedSource.layerType === GeoTiffLayer.LAYER_TYPE || sourceLayers[sourceId].initializedSource.layerType === MBTilesLayer.LAYER_TYPE) {
                    sourceLayers[sourceId].initializedSource.updateStyle(sourceLayers[sourceId].configuration)
                  }
                  if (!_.isNil(sourceLayers[sourceId].mapLayer)) {
                    let mapLayer = sourceLayers[sourceId].mapLayer
                    if (mapLayer) {
                      self.removeLayerFromMap(mapLayer, sourceId)
                      delete sourceLayers[sourceId].mapLayer
                    }
                  }
                  let mapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                  self.addLayerToMap(map, mapLayer, generateLayerOrderItemForSource(sourceLayers[sourceId].configuration, map))
                  sourceLayers[sourceId].mapLayer = mapLayer
                  EventBus.$emit(EventBus.EventTypes.SOURCE_INITIALIZED(sourceId))
                }
              } else {
                // hide and remove the map layer
                let mapLayer = sourceLayers[sourceId].mapLayer
                if (mapLayer) {
                  self.removeLayerFromMap(mapLayer, sourceId)
                  delete sourceLayers[sourceId].mapLayer
                }
              }
            } else if (!_.isEqual(updatedSource.styleKey, oldLayerConfig.styleKey) && updatedSource.pane === 'vector' && !_.isNil(sourceLayers[sourceId].initializedSource)) {
              sourceLayers[sourceId].configuration = _.cloneDeep(updatedSource)
              // only style has changed, let's just update style
              sourceLayers[sourceId].initializedSource.updateStyle(this.project.maxFeatures).then(function () {
                // remove layer from map if it is currently being visible
                let mapLayer = sourceLayers[sourceId].mapLayer
                if (mapLayer) {
                  self.removeLayerFromMap(mapLayer, sourceId)
                }
                delete sourceLayers[sourceId].mapLayer
                // if layer is set to be visible, display it on the map
                if (updatedSource.visible) {
                  let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                  self.addLayerToMap(map, updateMapLayer, generateLayerOrderItemForSource(sourceLayers[sourceId].configuration, map))
                  sourceLayers[sourceId].mapLayer = updateMapLayer
                }
              })
            }
          })

          // geopackages changed, so let's ensure the content in the table is updated
          if (this.showFeatureTable && !_.isNil(this.tableFeaturesLatLng)) {
            this.queryForFeatures({latlng: this.tableFeaturesLatLng})
            // the feature table is showing because a user clicked the view features button in the feature layer view
            // this requires the active geopackage to be set with a valid geopackageId and tableName
          } else if (this.showFeatureTable && !_.isNil(this.lastShowFeatureTableEvent)) {
            this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
          } else {
            // clear out any feature tables
            this.hideFeatureTable()
          }
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
            if (!_.isEqual(updatedGeoPackage.tables, oldGeoPackage.tables)) {
              const oldVisibleFeatureTables = _.keys(oldGeoPackage.tables.features).filter(table => oldGeoPackage.tables.features[table].visible)
              const oldVisibleTileTables = _.keys(oldGeoPackage.tables.tiles).filter(table => oldGeoPackage.tables.tiles[table].visible)
              const newVisibleFeatureTables = _.keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible)
              const newVisibleTileTables = _.keys(updatedGeoPackage.tables.tiles).filter(table => updatedGeoPackage.tables.tiles[table].visible)

              // tables removed
              const featureTablesRemoved = _.difference(_.keys(oldGeoPackage.tables.features), _.keys(updatedGeoPackage.tables.features))
              const tileTablesRemoved = _.difference(_.keys(oldGeoPackage.tables.tiles), _.keys(updatedGeoPackage.tables.tiles))

              // tables turned on
              const featureTablesTurnedOn = _.difference(newVisibleFeatureTables, oldVisibleFeatureTables)
              const tileTablesTurnedOn = _.difference(newVisibleTileTables, oldVisibleTileTables)

              // tables turned off
              const featureTablesTurnedOff = _.difference(oldVisibleFeatureTables, newVisibleFeatureTables)
              const tileTablesTurnedOff = _.difference(oldVisibleTileTables, newVisibleTileTables)

              // remove feature and tile tables that were turned off or deleted
              tileTablesRemoved.concat(tileTablesTurnedOff).forEach(tableName => {
                this.removeGeoPackageTileTable(updatedGeoPackage, tableName)
              })
              featureTablesRemoved.concat(featureTablesTurnedOff).forEach(tableName => {
                this.removeGeoPackageFeatureTable(updatedGeoPackage, tableName)
              })

              geopackageLayers[updatedGeoPackage.id] = _.cloneDeep(updatedGeoPackage)
              // add feature and tile tables that were turned on
              tileTablesTurnedOn.forEach(tableName => {
                this.addGeoPackageTileTable(updatedGeoPackage, map, tableName)
              })
              featureTablesTurnedOn.forEach(tableName => {
                this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
              })

              // tables with updated style key
              const featureTablesStyleUpdated = _.keys(updatedGeoPackage.tables.features).filter(table => updatedGeoPackage.tables.features[table].visible && oldGeoPackage.tables.features[table] && featureTablesTurnedOn.indexOf(table) === -1 && updatedGeoPackage.tables.features[table].styleKey !== oldGeoPackage.tables.features[table].styleKey)
              featureTablesStyleUpdated.forEach(tableName => {
                this.removeGeoPackageFeatureTable(updatedGeoPackage, tableName)
                this.addGeoPackageFeatureTable(updatedGeoPackage, map, tableName)
              })
            }
          })

          // geopackages changed, so let's ensure the content in the table is updated
          if (this.showFeatureTable && !_.isNil(this.tableFeaturesLatLng)) {
            this.queryForFeatures({latlng: this.tableFeaturesLatLng})
            // the feature table is showing because a user clicked the view features button in the feature layer view
            // this requires the active geopackage to be set with a valid geopackageId and tableName
          } else if (this.showFeatureTable && !_.isNil(this.lastShowFeatureTableEvent)) {
            this.displayFeaturesForTable(this.lastShowFeatureTableEvent.id, this.lastShowFeatureTableEvent.tableName, this.lastShowFeatureTableEvent.isGeoPackage)
          } else {
            // clear out any feature tables
            this.hideFeatureTable()
          }
        },
        deep: true
      },
      geoPackageFeatureLayerSelection: {
        handler () {
          // check if it has editable fields, instead of confirm, it will say continue and display the edit fields dialog
          this.$nextTick(() => {
            if (!_.isNil(this.$refs.featureTableNameForm)) {
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
          if (!_.isNil(this.project.activeGeoPackage) && !_.isNil(this.project.activeGeoPackage.geopackageId) && this.project.activeGeoPackage.geopackageId === updatedGeoPackageSelection && !_.isNil(this.project.activeGeoPackage.tableName)) {
            const tableNameIndex = layers.findIndex(choice => choice.text === this.project.activeGeoPackage.tableName)
            if (tableNameIndex > 0) {
              geoPackageFeatureLayerSelection = layers[tableNameIndex].value
            }
          }
          this.geoPackageFeatureLayerSelection = geoPackageFeatureLayerSelection
          this.geoPackageFeatureLayerChoices = layers
          this.$nextTick(() => {
            if (!_.isNil(this.$refs.featureTableNameForm)) {
              this.$refs.featureTableNameForm.validate()
            }
          })
        }
      },
      project: {
        async handler (updatedProject) {
          let self = this
          let map = this.map
          updatedProject.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
          updatedProject.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
          updatedProject.displayAddressSearchBar ? this.addressSearchBarControl.container.style.display = '' : this.addressSearchBarControl.container.style.display = 'none'
          if (updatedProject.maxFeatures !== this.maxFeatures) {
            for (const gp of Object.values(updatedProject.geopackages)) {
              for (const tableName of Object.keys(gp.tables.features)) {
                if (initializedGeoPackageTables[gp.id] && initializedGeoPackageTables[gp.id].featureTables) {
                  const layer = initializedGeoPackageTables[gp.id].featureTables[tableName]
                  if (!_.isNil(layer)) {
                    await layer.updateStyle(updatedProject.maxFeatures)
                    if (visibleGeoPackageTables[gp.id] && visibleGeoPackageTables[gp.id].featureTables) {
                      const mapLayer = visibleGeoPackageTables[gp.id].featureTables[tableName]
                      if (mapLayer) {
                        self.removeLayerFromMap(mapLayer, gp.id + '_' + tableName)
                        delete visibleGeoPackageTables[gp.id].featureTables[tableName]
                        let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
                        self.addLayerToMap(map, updateMapLayer, generateLayerOrderItemForGeoPackageTable(gp, tableName, false, map))
                        visibleGeoPackageTables[gp.id].featureTables[tableName] = updateMapLayer
                      }
                    }
                  }
                }
              }
            }
            for (const sourceId of _.keys(sourceLayers)) {
              // only style has changed, let's just update style
              if (!_.isNil(sourceLayers[sourceId].initializedSource) && sourceLayers[sourceId].initializedSource.pane === 'vector') {
                await sourceLayers[sourceId].initializedSource.updateStyle(updatedProject.maxFeatures)
                // remove layer from map if it is currently being visible
                let mapLayer = sourceLayers[sourceId].mapLayer
                if (mapLayer) {
                  self.removeLayerFromMap(mapLayer, sourceId)
                  delete sourceLayers[sourceId].mapLayer
                  let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                  self.addLayerToMap(map, updateMapLayer, generateLayerOrderItemForSource(sourceLayers[sourceId].configuration, map))
                  sourceLayers[sourceId].mapLayer = updateMapLayer
                }
              }
            }
            for (const baseMapId of _.keys(self.baseMapLayers)) {
              if (!_.isNil(self.baseMapLayers[baseMapId].initializedLayer) && self.baseMapLayers[baseMapId].initializedLayer.pane === 'vector') {
                if (self.selectedBaseMapId === baseMapId) {
                  self.map.removeLayer(self.baseMapLayers[self.selectedBaseMapId].mapLayer)
                }
                await self.baseMapLayers[self.selectedBaseMapId].initializedLayer.updateStyle(updatedProject.maxFeatures)
                self.baseMapLayers[self.selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[self.selectedBaseMapId].initializedLayer)
                if (self.selectedBaseMapId === baseMapId) {
                  self.map.addLayer(self.baseMapLayers[self.selectedBaseMapId].mapLayer)
                }
              }
            }
          }
          this.maxFeatures = updatedProject.maxFeatures
          if (!_.isNil(updatedProject.zoomToExtent) && !_.isEqual(updatedProject.zoomToExtent.key, this.zoomToExtentKey)) {
            this.zoomToExtentKey = updatedProject.zoomToExtent.key
            let boundingBox = [[updatedProject.zoomToExtent.extent[1], updatedProject.zoomToExtent.extent[0]], [updatedProject.zoomToExtent.extent[3], updatedProject.zoomToExtent.extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            this.map.fitBounds(boundingBox, {maxZoom: 20})
          }
          if (_.isNil(updatedProject.boundingBoxFilterEditing)) {
            this.drawingControl.enableDrawingLinks()
          } else {
            this.drawingControl.disableDrawingLinks()
          }

          let clearEditing = true
          if (!_.isNil(updatedProject.editingFeature)) {
            let id = updatedProject.editingFeature.id
            let isGeoPackage = updatedProject.editingFeature.isGeoPackage
            let tableName = updatedProject.editingFeature.tableName
            let featureId = updatedProject.editingFeature.featureToEdit.id
            let geoPackageObject = isGeoPackage ? updatedProject.geopackages[id] : updatedProject.sources[id]
            // did geopackage or data source get deleted
            if (!_.isNil(geoPackageObject)) {
              let exists = await GeoPackageUtilities.featureExists(isGeoPackage ? geoPackageObject.path : geoPackageObject.geopackageFilePath, tableName, featureId)
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
      ActionUtilities.clearEditFeatureGeometry({projectId: this.project.id})
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
      _.keys(initializedGeoPackageTables).forEach(geopackageId => {
        _.keys(initializedGeoPackageTables[geopackageId].featureTables).forEach(table => {
          let layer = initializedGeoPackageTables[geopackageId].featureTables[table]
          if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
            layer.close()
          }
        })
        _.keys(initializedGeoPackageTables[geopackageId].tileTables).forEach(table => {
          let layer = initializedGeoPackageTables[geopackageId].tileTables[table]
          if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
            layer.close()
          }
        })
      })
      _.keys(sourceLayers).forEach(key => {
        let layer = sourceLayers[key].initializedSource
        if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
          layer.close()
        }
      })
      _.keys(self.baseMapLayers).forEach(key => {
        let layer = self.baseMapLayers[key].initializedLayer
        if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
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
