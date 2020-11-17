<template>
  <div :style="{width: '100%', height: '100%', zIndex: 0, position: 'relative', display: 'flex'}">
    <div id="map" :style="{width: '100%', zIndex: 0, flex: 1}">
      <div id='tooltip' :style="{top: project.displayAddressSearchBar ? '54px' : '10px'}"></div>
      <v-dialog
        v-model="layerSelectionVisible"
        max-width="500"
        persistent>
        <v-card>
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
                <v-select v-model="geoPackageFeatureLayerSelection" :items="geoPackageFeatureLayerChoices" label="Select Feature Layer" dense>
                </v-select>
              </v-col>
            </v-row>
            <v-form ref="featureTableNameForm" v-on:submit.prevent v-if="geoPackageSelection === 0 || geoPackageFeatureLayerSelection === 0" v-model="featureTableNameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
        persistent>
        <feature-editor v-if="showAddFeatureDialog" :projectId="projectId" :id="featureToAddGeoPackage.id" :geopackage-path="featureToAddGeoPackage.path" :tableName="featureToAddTableName" :columns="featureToAddColumns" :feature="featureToAdd" :close="cancelAddFeature" :is-geo-package="true"></feature-editor>
      </v-dialog>
    </div>
    <transition name="slide-up">
      <v-card
        tile
        v-show="showFeatureTable"
        ref="featuresPopup"
        class="mx-auto"
        style="max-height: 350px; overflow-y: auto; position: absolute; bottom: 0; z-index: 400; width: 100%">
        <v-card-text>
          <feature-table :projectId="projectId" :geopackages="geopackages" :sources="sources" :tableFeatures="tableFeatures" :zoomToFeature="zoomToFeature" :close="hideFeatureTable"></feature-table>
        </v-card-text>
      </v-card>
    </transition>
  </div>
</template>

<script>
  import { remote, ipcRenderer } from 'electron'
  import Vue from 'vue'
  import _ from 'lodash'
  import * as vendor from '../../lib/vendor'
  import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch'
  import 'leaflet-geosearch/dist/geosearch.css'

  import LeafletActiveLayersTool from './LeafletActiveLayersTool'
  import DrawBounds from './DrawBounds'
  import FeatureTable from './FeatureTable'
  import LeafletZoomIndicator from './LeafletZoomIndicator'
  import LeafletDraw from './LeafletDraw'
  import LayerFactory from '../../lib/source/layer/LayerFactory'
  import LeafletMapLayerFactory from '../../lib/map/mapLayers/LeafletMapLayerFactory'
  import UniqueIDUtilities from '../../lib/UniqueIDUtilities'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import FeatureEditor from '../Common/FeatureEditor'
  import ActionUtilities from '../../lib/ActionUtilities'

  const NEW_GEOPACKAGE_OPTION = {text: 'New GeoPackage', value: 0}
  const NEW_FEATURE_LAYER_OPTION = {text: 'New Feature Layer', value: 0}

  // objects for storing state
  const sourceLayers = {}
  const geopackageLayers = {}
  let initializedGeoPackageTables = {}
  let visibleGeoPackageTables = {}

  let layerSelectionVisible = false
  let geoPackageChoices = [NEW_GEOPACKAGE_OPTION]
  let geoPackageFeatureLayerChoices = [NEW_FEATURE_LAYER_OPTION]
  let maxFeatures
  let isDrawing = false

  function normalize (longitude) {
    let lon = longitude
    while (lon < -180) {
      lon += 360
    }
    while (lon > 180) {
      lon -= 360
    }
    return lon
  }

  export default {
    mixins: [
      DrawBounds
    ],
    props: {
      sources: Object,
      geopackages: Object,
      projectId: String,
      project: Object,
      resizeListener: Number
    },
    computed: {
      isDrawingBounds () {
        return !_.isNil(this.r)
      }
    },
    components: {
      FeatureEditor,
      FeatureTable
    },
    data () {
      return {
        zoomToExtentKey: this.project && this.project.zoomToExtent ? this.project.zoomToExtent.key || 0 : 0,
        isDrawing,
        maxFeatures,
        NEW_GEOPACKAGE_OPTION,
        NEW_FEATURE_LAYER_OPTION,
        layerSelectionVisible,
        geoPackageChoices,
        popup: null,
        showFeatureTable: false,
        tableFeatures: {
          geopackageTables: [],
          sourceTables: []
        },
        tableFeaturesLatLng: null,
        geoPackageFeatureLayerChoices,
        geoPackageSelection: 0,
        geoPackageFeatureLayerSelection: 0,
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
        lastShowFeatureTableEvent: null
      }
    },
    methods: {
      hideFeatureTable () {
        this.showFeatureTable = false
        this.tableFeatures = {
          geopackageTables: [],
          sourceTables: []
        }
      },
      async confirmGeoPackageFeatureLayerSelection () {
        let _this = this
        let feature = this.createdLayer.toGeoJSON()
        feature.id = UniqueIDUtilities.createUniqueID()
        if (!_.isNil(this.createdLayer._mRadius)) {
          feature.properties.radius = this.createdLayer._mRadius
        }
        switch (feature.geometry.type.toLowerCase()) {
          case 'point': {
            feature.geometry.coordinates[0] = normalize(feature.geometry.coordinates[0])
            break
          }
          case 'linestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              feature.geometry.coordinates[i][0] = normalize(feature.geometry.coordinates[i][0])
            }
            break
          }
          case 'polygon':
          case 'multilinestring': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                feature.geometry.coordinates[i][j][0] = normalize(feature.geometry.coordinates[i][j][0])
              }
            }
            break
          }
          case 'multipolygon': {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
              for (let j = 0; j < feature.geometry.coordinates[i].length; j++) {
                for (let k = 0; k < feature.geometry.coordinates[i][j].length; k++) {
                  feature.geometry.coordinates[i][j][k][0] = normalize(feature.geometry.coordinates[i][j][k][0])
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
          remote.dialog.showSaveDialog().then(({filePath}) => {
            if (!filePath.endsWith('.gpkg')) {
              filePath = filePath + '.gpkg'
            }
            GeoPackageUtilities.getOrCreateGeoPackage(filePath).then(gp => {
              GeoPackageUtilities._createFeatureTable(gp, featureTableName, featureCollection, true).then(() => {
                ActionUtilities.addGeoPackage({projectId: _this.projectId, filePath: filePath})
              })
            })
          })
        } else {
          const geopackage = this.geopackages[this.geoPackageSelection]
          if (this.geoPackageFeatureLayerSelection === 0) {
            ActionUtilities.addFeatureTableToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: featureTableName, featureCollection: featureCollection})
          } else {
            const self = this
            this.featureToAdd = feature
            this.featureToAddTableName = this.geoPackageFeatureLayerChoices[this.geoPackageFeatureLayerSelection].text
            this.featureToAddGeoPackage = geopackage
            GeoPackageUtilities.getFeatureColumns(geopackage.path, this.featureToAddTableName).then(columns => {
              self.featureToAddColumns = columns
              this.showAddFeatureDialog = true
            })
          }
        }
        this.layerSelectionVisible = false
        this.geoPackageChoices = [NEW_GEOPACKAGE_OPTION]
        this.geoPackageFeatureLayerChoices = [NEW_FEATURE_LAYER_OPTION]
        this.geoPackageSelection = 0
        this.geoPackageFeatureLayerSelection = 0
        this.map.removeLayer(this.createdLayer)
        this.createdLayer = null
        this.featureTableName = 'Feature layer'
      },
      cancelDrawing () {
        this.layerSelectionVisible = false
        this.geoPackageChoices = [NEW_GEOPACKAGE_OPTION]
        this.geoPackageFeatureLayerChoices = [NEW_FEATURE_LAYER_OPTION]
        this.geoPackageSelection = 0
        this.geoPackageFeatureLayerSelection = 0
        this.map.removeLayer(this.createdLayer)
        this.createdLayer = null
        this.featureTableName = 'Feature layer'
      },
      zoomToFeature (path, table, featureId) {
        const map = this.map
        GeoPackageUtilities.getBoundingBoxForFeature(path, table, featureId).then(function (extent) {
          if (extent) {
            let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            map.fitBounds(boundingBox)
          }
        })
      },
      addDataSource (sourceConfiguration, map) {
        let source = LayerFactory.constructLayer(sourceConfiguration)
        source._maxFeatures = this.project.maxFeatures
        source.initialize().then(function () {
          let mapLayer
          if (sourceConfiguration.visible) {
            mapLayer = LeafletMapLayerFactory.constructMapLayer(source)
            mapLayer.addTo(map)
          }
          sourceLayers[sourceConfiguration.id] = {
            configuration: _.cloneDeep(sourceConfiguration),
            initializedSource: source,
            visible: sourceConfiguration.visible,
            mapLayer: mapLayer
          }
        })
      },
      cancelAddFeature () {
        this.showAddFeatureDialog = false
        this.featureToAdd = null
        this.featureToAddColumns = null
        this.featureToAddGeoPackage = null
        this.featureToAddTableName = null
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
              this.tableFeatures = {
                geopackageTables: [{
                  id: geopackage.id + '_' + tableName,
                  tabName: geopackage.name + ': ' + tableName,
                  geopackageId: geopackage.id,
                  tableName: tableName,
                  columns: await GeoPackageUtilities.getFeatureColumns(geopackage.path, tableName),
                  features: await GeoPackageUtilities.getAllFeaturesAsGeoJSON(geopackage.path, tableName)
                }],
                sourceTables: []
              }
            } else {
              const sourceLayerConfig = this.sources[id]
              this.tableFeatures = {
                geopackageTables: [],
                sourceTables: [{
                  id: sourceLayerConfig.id,
                  tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
                  sourceId: sourceLayerConfig.id,
                  tableName: sourceLayerConfig.sourceLayerName,
                  columns: await GeoPackageUtilities.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                  features: await GeoPackageUtilities.getAllFeaturesAsGeoJSON(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName)
                }]
              }
            }
            this.showFeatureTable = true
          } catch (e) {
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
            sourceLayer.mapLayer.remove()
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
        let layer = LayerFactory.constructLayer({id: geopackage.id + '_tile_' + tableName, filePath: geopackage.path, sourceLayerName: tableName, layerType: 'GeoPackage'})
        layer.initialize().then(function () {
          if (geopackage.tables.tiles[tableName].visible) {
            let mapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
            mapLayer.addTo(map)
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
            mapLayer.remove()
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
            mapLayer.addTo(map)
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
            mapLayer.remove()
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
        let _this = this
        _this.getExtentForVisibleGeoPackagesAndLayers().then((extent) => {
          if (!_.isNil(extent)) {
            let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
            let bounds = vendor.L.latLngBounds(boundingBox)
            bounds = bounds.pad(0.05)
            boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
            _this.map.fitBounds(boundingBox)
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
                    features: features
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
                  features: features
                })
              }
            }
          }
        }
        if (featuresFound) {
          this.lastShowFeatureTableEvent = null
          this.tableFeaturesLatLng = e.latlng
          this.tableFeatures = tableFeatures
          this.showFeatureTable = true
        } else {
          this.hideFeatureTable()
        }
      }
    },
    watch: {
      resizeListener: {
        handler (newValue, oldValue) {
          if (newValue !== oldValue) {
            const _this = this
            this.$nextTick(() => {
              if (_this.map) {
                _this.map.invalidateSize()
              }
            })
          }
        }
      },
      sources: {
        async handler (updatedSources) {
          let _this = this
          let map = this.map
          let updatedSourceIds = Object.keys(updatedSources)
          let existingSourceIds = Object.keys(sourceLayers)

          // layer configs that have been removed completely
          existingSourceIds.filter((i) => updatedSourceIds.indexOf(i) < 0).forEach(sourceId => {
            _this.removeDataSource(sourceId)
          })

          // new layer configs
          updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) < 0).forEach(sourceId => {
            let sourceConfig = updatedSources[sourceId]
            _this.removeDataSource(sourceId)
            _this.addDataSource(sourceConfig, map)
          })

          // see if any of the layers have changed
          updatedSourceIds.filter((i) => existingSourceIds.indexOf(i) >= 0).forEach(sourceId => {
            let updatedSource = updatedSources[sourceId]
            let oldLayerConfig = sourceLayers[sourceId].configuration
            // something other than sourceKey, maxFeatures, visible, or feature assignments changed
            if (!_.isEqual(_.omit(updatedSource, ['styleKey', 'visible', 'styleAssignmentFeature', 'iconAssignmentFeature']), _.omit(oldLayerConfig, ['styleKey', 'visible', 'styleAssignmentFeature', 'iconAssignmentFeature']))) {
              _this.removeDataSource(sourceId)
              _this.addDataSource(updatedSource, map)
            } else if (!_.isEqual(updatedSource.visible, oldLayerConfig.visible)) {
              sourceLayers[sourceId].configuration = _.cloneDeep(updatedSource)
              if (updatedSource.visible) {
                let mapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                mapLayer.addTo(map)
                sourceLayers[sourceId].mapLayer = mapLayer
              } else {
                // hide it
                let mapLayer = sourceLayers[sourceId].mapLayer
                if (mapLayer) {
                  mapLayer.remove()
                  delete sourceLayers[sourceId].mapLayer
                }
              }
            } else if (!_.isEqual(updatedSource.styleKey, oldLayerConfig.styleKey) && updatedSource.pane === 'vector') {
              sourceLayers[sourceId].configuration = _.cloneDeep(updatedSource)
              // only style has changed, let's just update style
              sourceLayers[sourceId].initializedSource.updateStyle(this.project.maxFeatures).then(function () {
                // remove layer from map if it is currently being visible
                let mapLayer = sourceLayers[sourceId].mapLayer
                if (mapLayer) {
                  mapLayer.remove()
                }
                delete sourceLayers[sourceId].mapLayer
                // if layer is set to be visible, display it on the map
                if (updatedSource.visible) {
                  let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                  updateMapLayer.addTo(map)
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
          let _this = this
          let map = this.map
          let updatedGeoPackageKeys = Object.keys(updatedGeoPackages)
          let existingGeoPackageKeys = Object.keys(geopackageLayers)

          // remove geopackages that were removed
          existingGeoPackageKeys.filter((i) => updatedGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
            _this.removeGeoPackage(geoPackageId)
          })

          // new source configs
          updatedGeoPackageKeys.filter((i) => existingGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
            _this.removeGeoPackage(geoPackageId)
            _this.addGeoPackageToMap(updatedGeoPackages[geoPackageId], map)
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
          Vue.nextTick(() => {
            this.$refs.featureTableNameForm.validate()
          })
        }
      },
      project: {
        async handler (updatedProject) {
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
                        mapLayer.remove()
                        delete visibleGeoPackageTables[gp.id].featureTables[tableName]
                        let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
                        updateMapLayer.addTo(this.map)
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
                  mapLayer.remove()
                  delete sourceLayers[sourceId].mapLayer
                  let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[sourceId].initializedSource)
                  updateMapLayer.addTo(this.map)
                  sourceLayers[sourceId].mapLayer = updateMapLayer
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
            this.map.fitBounds(boundingBox)
          }
        },
        deep: true
      }
    },
    mounted: async function () {
      let _this = this
      ipcRenderer.on('show_feature_table', (e, id, tableName, isGeoPackage) => {
        this.displayFeaturesForTable(id, tableName, isGeoPackage)
      })

      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 3
      const defaultBaseMap = vendor.L.tileLayer('https://osm-{s}.gs.mil/tiles/default/{z}/{x}/{y}.png', {subdomains: ['1', '2', '3', '4'], maxZoom: 20})
      const streetsBaseMap = vendor.L.tileLayer('https://osm-{s}.gs.mil/tiles/bright/{z}/{x}/{y}.png', {subdomains: ['1', '2', '3', '4'], maxZoom: 20})
      const satelliteBaseMap = vendor.L.tileLayer('https://osm-{s}.gs.mil/tiles/humanitarian/{z}/{x}/{y}.png', {subdomains: ['1', '2', '3', '4'], maxZoom: 20})
      const baseMaps = {
        'Default': defaultBaseMap,
        'Bright': streetsBaseMap,
        'Humanitarian': satelliteBaseMap
      }
      this.map = vendor.L.map('map', {
        editable: true,
        attributionControl: false,
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom: 3,
        layers: [defaultBaseMap]
      })
      const host = 'https://osm-nominatim.gs.mil'
      const searchUrl = `${host}/search`
      const reverseUrl = `${host}/reverse`
      const provider = new OpenStreetMapProvider({searchUrl, reverseUrl})
      this.addressSearchBarControl = new GeoSearchControl({
        provider,
        style: 'bar'
      })
      this.map.addControl(
        this.addressSearchBarControl
      )
      this.maxFeatures = this.project.maxFeatures
      this.map.setView(defaultCenter, defaultZoom)
      this.baseMapsControl = vendor.L.control.layers(baseMaps)
      this.baseMapsControl.addTo(this.map)
      this.map.zoomControl.setPosition('topright')
      this.displayZoomControl = new LeafletZoomIndicator()
      this.map.addControl(this.displayZoomControl)
      this.activeLayersControl = new LeafletActiveLayersTool({}, function () {
        _this.zoomToContent()
      }, function () {
        ActionUtilities.clearActiveLayers({projectId: _this.projectId})
      })
      this.map.addControl(this.activeLayersControl)
      this.drawingControl = new LeafletDraw()
      this.map.addControl(this.drawingControl)
      this.project.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
      this.project.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
      this.project.displayAddressSearchBar ? this.addressSearchBarControl.container.style.display = '' : this.addressSearchBarControl.container.style.display = 'none'
      this.map.on('click', this.queryForFeatures)
      const checkFeatureCount = _.throttle(async function (e) {
        if (!_this.drawingControl.isDrawing) {
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
      this.map.on('mousemove', checkFeatureCount)
      this.map.on('layeradd', function (e) {
        if (!_this.isDrawingBounds && (e.layer instanceof vendor.L.Path || e.layer instanceof vendor.L.Marker)) {
          e.layer.on('dblclick', vendor.L.DomEvent.stop).on('dblclick', () => {
            if (e.layer.editEnabled()) {
              e.layer.disableEdit()
            } else {
              e.layer.enableEdit()
            }
          })
        }
      })
      this.map.on('editable:drawing:end', function (e) {
        if (!_this.isDrawingBounds && !_this.drawingControl.cancelled) {
          e.layer.toggleEdit()
          let layers = [NEW_GEOPACKAGE_OPTION]
          Object.values(_this.geopackages).forEach((geopackage) => {
            layers.push({text: geopackage.name, value: geopackage.id})
          })
          _this.createdLayer = e.layer
          _this.geoPackageChoices = layers
          if (!_.isNil(_this.project.activeGeoPackage)) {
            if (!_.isNil(_this.project.activeGeoPackage.geopackageId)) {
              const index = _this.geoPackageChoices.findIndex(choice => choice.value === _this.project.activeGeoPackage.geopackageId)
              if (index > 0) {
                _this.geoPackageSelection = _this.geoPackageChoices[index].value
              }
            }
          }
          _this.layerSelectionVisible = true
          Vue.nextTick(() => {
            _this.$refs.featureTableNameForm.validate()
          })
        }
      })
      // add sources to map
      for (const sourceId in this.sources) {
        this.addDataSource(this.sources[sourceId], this.map, false)
      }
      // add geopackages to map on mount
      for (const geopackageId in this.geopackages) {
        this.addGeoPackageToMap(this.geopackages[geopackageId], this.map)
      }
    },
    beforeDestroy: function () {
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
    },
    beforeUpdate: function () {
      const _this = this
      this.$nextTick(() => {
        if (_this.map) {
          _this.map.invalidateSize()
        }
      })
    }
  }
</script>

<style>

  @import '~leaflet/dist/leaflet.css';

  .leaflet-control-zoom-to-active {
    background: url('../../assets/zoom-to-active.svg') no-repeat;
  }
  .leaflet-control-clear-active {
    background: url('../../assets/clear-active-layers.svg') no-repeat;
  }

  .leaflet-control-zoom-indicator {
    font-weight: bold;
  }
  .leaflet-control-draw-point {
    background: url('../../assets/point.svg') no-repeat;
  }
  .leaflet-control-draw-polygon {
    background: url('../../assets/polygon.svg') no-repeat;
  }
  .leaflet-control-draw-rectangle {
    background: url('../../assets/rectangle.svg') no-repeat;
  }
  .leaflet-control-draw-linestring {
    background: url('../../assets/linestring.svg') no-repeat;
  }
  .leaflet-control-draw-cancel {
    background: url('../../assets/close.svg') no-repeat;
  }
  .leaflet-control-disabled {
    color: currentColor;
    cursor: not-allowed;
    opacity: 0.5;
    text-decoration: none;
  }
  .layer__request-btn {
    position: relative;
    width: 10vh;
    height: 40px;
    font-size: 14px;
    font-weight: 400;
    font-family: Roboto, sans-serif;
    color: #FFFFFF;
    outline: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0;
    -webkit-transition: letter-spacing 0.3s;
    transition: letter-spacing 0.3s;
  }
  .layer__request-btn__confirm {
    background: #FF5555;
    margin-right: 1vh;
  }
  .layer__request-btn__text-1 {
    -webkit-transition: opacity 0.48s;
    transition: opacity 0.48s;
  }
  .layer.req-active1 .layer__request-btn__text-1 {
    opacity: 0;
  }
  .layer.req-active2 .layer__request-btn__text-1 {
    display: none;
  }
  .layer__request-btn:hover {
    letter-spacing: 5px;
  }
  .layer-style-container {
    display: flex;
    flex-direction: row;
  }
  .layer-style-type {
    flex: 1;
  }
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
  .leaflet-control a {
    color: black !important;
  }
  .leaflet-touch .leaflet-control-layers-toggle {
    width: 30px;
    height: 30px;
  }
  .slide-up-enter-active {
    transition: all 0.5s ease;
  }
  .slide-up-leave-active {
    transition: all .25s cubic-bezier(1.0, 0.5, 0.8, 1.0);
  }
  .slide-up-enter, .slide-up-leave-to
    /* .slide-fade-leave-active below version 2.1.8 */ {
    transform: translateY(100px);
    opacity: 0;
  }
  #tooltip {
    display: none;
    position: absolute;
    left: 10px;
    background: #666;
    color: white;
    opacity: 0.90;
    padding: 8px;
    font-family: Roboto, sans-serif;
    font-size: 12px;
    height: 34px;
    line-height: 18px;
    z-index: 2000;
    border: black 1px;
    border-radius: 4px;
  }
  .hidden {
    display: none !important;
    visibility: hidden;
  }
  .results {
    color: black;
  }

  .leaflet-geosearch-bar {
    margin-left: 10px !important;
    margin-top: 10px !important;
  }
</style>
