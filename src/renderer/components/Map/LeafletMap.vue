<template>
  <div style="width: 100%; height: 100%; z-index: 0; position: relative;">
    <div id="map" style="width: 100%; height: 100%; z-index: 0;">
      <v-dialog
        v-model="layerSelectionVisible"
        max-width="500">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              Add Drawing
            </v-row>
          </v-card-title>
          <v-card-text>
            Add drawing to selected GeoPackage and feature layer.
            <v-row no-gutters class="mt-4">
              <v-col cols="12">
                <v-select v-model="geoPackageSelection" :items="geoPackageChoices" label="Select GeoPackage" dense>
                </v-select>
              </v-col>
            </v-row>
            <v-row v-if="geoPackageSelection !== 0" no-gutters>
              <v-col cols="12">
                <v-select v-model="geoPackageFeatureLayerSelection" :items="geoPackageFeatureLayerChoices" label="Select Feature Layer" dense>
                </v-select>
              </v-col>
            </v-row>
            <v-form v-if="geoPackageSelection === 0 || geoPackageFeatureLayerSelection === 0" v-model="featureTableNameValid">
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
              color="#3b779a"
              text
              @click="cancelDrawing">
              cancel
            </v-btn>
            <v-btn
              v-if="geoPackageFeatureLayerSelection !== NEW_FEATURE_LAYER_OPTION || featureTableNameValid"
              color="#3b779a"
              text
              @click="confirmGeoPackageFeatureLayerSelection">
              confirm
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
    <transition name="slide-up">
      <v-card
        v-show="features && features.length > 0"
        ref="featuresPopup"
        class="mx-auto"
        style="max-height: 350px; overflow-y: auto; position: absolute; bottom: 0; z-index: 30303; width: 100%;"
        tile>
        <v-card-title>
          Features
        </v-card-title>
        <v-card-text>
          <feature-table :projectId="projectId" :geopackages="geopackages" :features="features" :zoomToFeature="zoomToFeature"></feature-table>
        </v-card-text>
      </v-card>
    </transition>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import { remote } from 'electron'
  import _ from 'lodash'
  import * as vendor from '../../../lib/vendor'

  import Modal from '../Modal'
  import ZoomToExtent from './ZoomToExtent'
  import LeafletActiveLayersTool from './LeafletActiveLayersTool'
  import DrawBounds from './DrawBounds'
  import FeatureTable from './FeatureTable'
  import LeafletZoomIndicator from './LeafletZoomIndicator'
  import LeafletDraw from './LeafletDraw'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import LeafletMapLayerFactory from '../../../lib/map/mapLayers/LeafletMapLayerFactory'
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'

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
      ZoomToExtent,
      DrawBounds
    ],
    props: {
      layerConfigs: Object,
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
      Modal,
      FeatureTable
    },
    data () {
      return {
        isDrawing,
        maxFeatures,
        NEW_GEOPACKAGE_OPTION,
        NEW_FEATURE_LAYER_OPTION,
        layerSelectionVisible,
        geoPackageChoices,
        popup: null,
        features: [],
        geoPackageFeatureLayerChoices,
        geoPackageSelection: 0,
        geoPackageFeatureLayerSelection: 0,
        lastCreatedFeature: null,
        featureTableNameValid: false,
        featureTableName: 'Feature Layer',
        featureTableNameRules: [
          v => !!v || 'Layer name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Layer name is not valid',
          v => (this.geoPackageSelection === 0 || _.isNil(this.geopackages[this.geoPackageSelection].tables.features[v])) || 'Layer name already exists'
        ]
      }
    },
    methods: {
      ...mapActions({
        addFeatureTableToGeoPackage: 'Projects/addFeatureTableToGeoPackage',
        addGeoPackage: 'Projects/addGeoPackage',
        removeProjectLayer: 'Projects/removeProjectLayer',
        addFeatureToGeoPackage: 'Projects/addFeatureToGeoPackage',
        deleteProjectLayerFeatureRow: 'Projects/deleteProjectLayerFeatureRow',
        updateProjectLayerFeatureRow: 'Projects/updateProjectLayerFeatureRow',
        clearActiveLayers: 'Projects/clearActiveLayers'
      }),
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
          remote.dialog.showSaveDialog((filePath) => {
            if (!filePath.endsWith('.gpkg')) {
              filePath = filePath + '.gpkg'
            }
            GeoPackageUtilities.getOrCreateGeoPackage(filePath).then(gp => {
              GeoPackageUtilities._createFeatureTable(gp, featureTableName, featureCollection, true).then(() => {
                _this.addGeoPackage({projectId: _this.projectId, filePath: filePath})
              })
            })
          })
        } else {
          const geopackage = this.geopackages[this.geoPackageSelection]
          if (this.geoPackageFeatureLayerSelection === 0) {
            this.addFeatureTableToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: featureTableName, featureCollection: featureCollection})
          } else {
            // add to existing table
            this.addFeatureToGeoPackage({projectId: this.projectId, geopackageId: geopackage.id, tableName: this.geoPackageFeatureLayerChoices[this.geoPackageFeatureLayerSelection].text, feature: feature})
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
            map.fitBounds([
              [extent[1], extent[0]],
              [extent[3], extent[2]]
            ])
          }
        })
      },
      addLayer (layerConfig, map) {
        let layer = LayerFactory.constructLayer(layerConfig)
        layer.initialize().then(function () {
          let mapLayer
          if (layerConfig.visible) {
            mapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
            mapLayer.addTo(map)
          }
          sourceLayers[layerConfig.id] = {
            configuration: _.cloneDeep(layerConfig),
            initializedLayer: layer,
            visible: layerConfig.visible,
            mapLayer: mapLayer
          }
        })
      },
      removeLayer (layerId) {
        const sourceLayer = sourceLayers[layerId]
        if (!_.isNil(sourceLayer)) {
          if (sourceLayer.mapLayer) {
            sourceLayer.mapLayer.remove()
          }
          if (!_.isNil(sourceLayer.initializedLayer) && sourceLayer.initializedLayer.hasOwnProperty('close')) {
            sourceLayer.initializedLayer.close()
          }
          delete sourceLayers[layerId]
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
          if (!_.isNil(layer) && layer.hasOwnProperty('close')) {
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
          if (!_.isNil(layer) && layer.hasOwnProperty('close')) {
            layer.close()
          }
          delete initializedGeoPackageTables[geopackage.id].featureTables[tableName]
        }
      },
      async zoomToContent () {
        let _this = this
        _this.getExtentForVisibleGeoPackagesAndLayers().then((extent) => {
          if (!_.isNil(extent)) {
            _this.map.fitBounds([
              [extent[1], extent[0]],
              [extent[3], extent[2]]
            ])
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
      layerConfigs: {
        async handler (updatedLayerConfigs, oldValue) {
          let _this = this
          let map = this.map
          let updatedLayerIds = Object.keys(updatedLayerConfigs)
          let existingLayerIds = Object.keys(sourceLayers)

          let zoomToExtentOfAllContent = false

          // layer configs that have been removed completely
          existingLayerIds.filter((i) => updatedLayerIds.indexOf(i) < 0).forEach(layerId => {
            _this.removeLayer(layerId)
          })

          // new layer configs
          updatedLayerIds.filter((i) => existingLayerIds.indexOf(i) < 0).forEach(layerId => {
            let layerConfig = updatedLayerConfigs[layerId]
            _this.removeLayer(layerId)
            _this.addLayer(layerConfig, map)
            zoomToExtentOfAllContent = zoomToExtentOfAllContent || layerConfig.visible
          })

          // see if any of the layers have changed
          updatedLayerIds.filter((i) => existingLayerIds.indexOf(i) >= 0).forEach(layerId => {
            let updatedLayerConfig = updatedLayerConfigs[layerId]
            let oldLayerConfig = sourceLayers[layerId].configuration
            // something other than layerKey, maxFeatures, visible, or feature assignments changed
            if (!_.isEqual(_.omit(updatedLayerConfig, ['layerKey', 'visible', 'styleAssignmentFeature', 'iconAssignmentFeature']), _.omit(oldLayerConfig, ['layerKey', 'visible', 'styleAssignmentFeature', 'iconAssignmentFeature']))) {
              _this.removeLayer(layerId)
              _this.addLayer(updatedLayerConfig, map)
            } else if (!_.isEqual(updatedLayerConfig.visible, oldLayerConfig.visible)) {
              sourceLayers[layerId].configuration = _.cloneDeep(updatedLayerConfig)
              if (updatedLayerConfig.visible) {
                let mapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[layerId].initializedLayer)
                mapLayer.addTo(map)
                sourceLayers[layerId].mapLayer = mapLayer
                zoomToExtentOfAllContent = true
              } else {
                // hide it
                let mapLayer = sourceLayers[layerId].mapLayer
                if (mapLayer) {
                  mapLayer.remove()
                  delete sourceLayers[layerId].mapLayer
                }
              }
            } else if (!_.isEqual(updatedLayerConfig.layerKey, oldLayerConfig.layerKey) && updatedLayerConfig.pane === 'vector') {
              sourceLayers[layerId].configuration = _.cloneDeep(updatedLayerConfig)
              // only style has changed, let's just update style
              sourceLayers[layerId].initializedLayer.updateStyle(updatedLayerConfig.maxFeatures).then(function () {
                // remove layer from map if it is currently being visible
                let mapLayer = sourceLayers[layerId].mapLayer
                if (mapLayer) {
                  mapLayer.remove()
                }
                delete sourceLayers[layerId].mapLayer
                // if layer is set to be visible, display it on the map
                if (updatedLayerConfig.visible) {
                  let updateMapLayer = LeafletMapLayerFactory.constructMapLayer(sourceLayers[layerId].initializedLayer)
                  updateMapLayer.addTo(map)
                  sourceLayers[layerId].mapLayer = updateMapLayer
                }
              })
            } else if (!_.isEqual(updatedLayerConfig.styleAssignmentFeature, oldLayerConfig.styleAssignmentFeature) && updatedLayerConfig.pane === 'vector') {
              sourceLayers[layerId].configuration = _.cloneDeep(updatedLayerConfig)
              GeoPackageUtilities.getBoundingBoxForFeature(updatedLayerConfig.geopackageFilePath, updatedLayerConfig.sourceLayerName, updatedLayerConfig.styleAssignmentFeature).then(function (extent) {
                map.fitBounds([
                  [extent[1], extent[0]],
                  [extent[3], extent[2]]
                ])
              })
              zoomToExtentOfAllContent = false
            } else if (!_.isEqual(updatedLayerConfig.iconAssignmentFeature, oldLayerConfig.iconAssignmentFeature) && updatedLayerConfig.pane === 'vector') {
              sourceLayers[layerId].configuration = _.cloneDeep(updatedLayerConfig)
              GeoPackageUtilities.getBoundingBoxForFeature(updatedLayerConfig.geopackageFilePath, updatedLayerConfig.sourceLayerName, updatedLayerConfig.iconAssignmentFeature).then(function (extent) {
                map.fitBounds([
                  [extent[1], extent[0]],
                  [extent[3], extent[2]]
                ])
              })
              zoomToExtentOfAllContent = false
            }
          })

          if (zoomToExtentOfAllContent) {
            this.zoomToContent()
          }
        },
        deep: true
      },
      geopackages: {
        handler (updatedGeoPackages, oldValue) {
          let _this = this
          let map = this.map
          let updatedGeoPackageKeys = Object.keys(updatedGeoPackages)
          let existingGeoPackageKeys = Object.keys(geopackageLayers)

          let zoomToExtentOfAllContent = false

          // remove geopackages that were removed
          existingGeoPackageKeys.filter((i) => updatedGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
            _this.removeGeoPackage(geoPackageId)
          })

          // new layer configs
          updatedGeoPackageKeys.filter((i) => existingGeoPackageKeys.indexOf(i) < 0).forEach(geoPackageId => {
            _this.removeGeoPackage(geoPackageId)
            _this.addGeoPackageToMap(updatedGeoPackages[geoPackageId], map)
            zoomToExtentOfAllContent = zoomToExtentOfAllContent ||
              (Object.keys(updatedGeoPackages[geoPackageId].tables.features).filter(table => updatedGeoPackages[geoPackageId].tables.features[table].visible).length > 0 ||
              Object.keys(updatedGeoPackages[geoPackageId].tables.tiles).filter(table => updatedGeoPackages[geoPackageId].tables.tiles[table].visible).length > 0)
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
              zoomToExtentOfAllContent = zoomToExtentOfAllContent || (featureTablesTurnedOn.length + tileTablesTurnedOn.length) > 0
            } else if (!_.isEqual(updatedGeoPackage.styleAssignment, oldGeoPackage.styleAssignment)) {
              this.zoomToFeature(updatedGeoPackage.path, updatedGeoPackage.styleAssignment.table, updatedGeoPackage.styleAssignment.featureId)
              zoomToExtentOfAllContent = false
            } else if (!_.isEqual(updatedGeoPackage.iconAssignment, oldGeoPackage.iconAssignment)) {
              this.zoomToFeature(updatedGeoPackage.path, updatedGeoPackage.iconAssignment.table, updatedGeoPackage.iconAssignment.featureId)
              zoomToExtentOfAllContent = false
            }
            if (zoomToExtentOfAllContent) {
              this.zoomToContent()
            }
          })
          // -----------------------------------------------
          // let config
          // Object.values(updatedGeoPackages).forEach(gp => {
          //   // check vector configs
          //   let editingConfigIdx = Object.values(gp.vectorConfigurations).findIndex(vc => vc.boundingBoxEditingEnabled)
          //   if (editingConfigIdx > -1) {
          //     config = Object.values(gp.vectorConfigurations)[editingConfigIdx]
          //     if (this.activeGeoPakageId !== gp.id || this.activeConfigurationId !== config.id) {
          //       if (config.boundingBox) {
          //         this.map.fitBounds([
          //           [config.boundingBox[0][0], config.boundingBox[0][1]],
          //           [config.boundingBox[1][0], config.boundingBox[1][1]]
          //         ])
          //       }
          //       this.enableBoundingBoxDrawing(gp, config)
          //     }
          //   }
          //   // check tile configs
          //   editingConfigIdx = Object.values(gp.tileConfigurations).findIndex(vc => vc.boundingBoxEditingEnabled)
          //   if (editingConfigIdx > -1) {
          //     config = Object.values(gp.tileConfigurations)[editingConfigIdx]
          //     if (this.activeGeoPakageId !== gp.id || this.activeConfigurationId !== config.id) {
          //       if (config.boundingBox) {
          //         this.map.fitBounds([
          //           [config.boundingBox[0][0], config.boundingBox[0][1]],
          //           [config.boundingBox[1][0], config.boundingBox[1][1]]
          //         ])
          //       }
          //       this.enableBoundingBoxDrawing(gp, config)
          //     }
          //   }
          // })
          // if (_.isNil(config)) {
          //   this.disableBoundingBoxDrawing()
          // }
        },
        deep: true
      },
      geoPackageSelection: {
        handler (updatedGeoPackageSelection, oldValue) {
          this.geoPackageFeatureLayerSelection = 0
          let layers = [NEW_FEATURE_LAYER_OPTION]
          if (updatedGeoPackageSelection !== 0) {
            Object.keys(this.geopackages[updatedGeoPackageSelection].tables.features).forEach((tableName, index) => {
              layers.push({text: tableName, value: index + 1})
            })
          }
          this.geoPackageFeatureLayerChoices = layers
        }
      },
      project: {
        async handler (updatedProject, oldValue) {
          updatedProject.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
          updatedProject.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
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
          }
          this.maxFeatures = updatedProject.maxFeatures
        },
        deep: true
      }
    },
    mounted: async function () {
      let _this = this
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
        _this.clearActiveLayers({projectId: _this.projectId})
      })
      this.map.addControl(this.activeLayersControl)
      this.drawingControl = new LeafletDraw()
      this.map.addControl(this.drawingControl)
      this.project.zoomControlEnabled ? this.map.zoomControl.getContainer().style.display = '' : this.map.zoomControl.getContainer().style.display = 'none'
      this.project.displayZoomEnabled ? this.displayZoomControl.getContainer().style.display = '' : this.displayZoomControl.getContainer().style.display = 'none'
      this.map.on('click', async function (e) {
        let features = []
        // TODO: add support for querying tiles if a feature tile link exists (may need to implement feature tile link in geopackage-js first!
        const geopackageValues = Object.values(this.geopackages)
        for (let i = 0; i < geopackageValues.length; i++) {
          const geopackage = geopackageValues[i]
          const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
          if (tables.length > 0) {
            features = features.concat(await GeoPackageUtilities.queryForFeaturesAt(geopackage.path, geopackage.id, geopackage.name, tables, e.latlng, this.map.getZoom()))
          }
        }
        // for (let layerId in sourceLayers) {
        //   const sourceLayerConfig = sourceLayers[layerId].configuration
        //   if (sourceLayerConfig.visible) {
        //     if (!_.isNil(sourceLayerConfig.geopackageFilePath)) {
        //       features = features.concat(await GeoPackageUtilities.queryForFeaturesAt(sourceLayerConfig.geopackageFilePath, layerId, sourceLayerConfig.displayName || sourceLayerConfig.name, [sourceLayerConfig.sourceLayerName], e.latlng, this.map.getZoom()))
        //     }
        //   }
        // }
        if (features.length > 0) {
          this.features = features
        } else {
          this.features = []
        }
      }.bind(this))
      const checkFeatureCount = _.throttle(async function (e) {
        if (!_this.drawingControl.isDrawing) {
          let count = 0
          // TODO: add support for querying tiles if a feature tile link exists (may need to implement feature tile link in geopackage-js first!
          const geopackageValues = Object.values(this.geopackages)
          for (let i = 0; i < geopackageValues.length; i++) {
            const geopackage = geopackageValues[i]
            const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
            if (tables.length > 0) {
              count += await GeoPackageUtilities.countOfFeaturesAt(geopackage.path, geopackage.id, geopackage.name, tables, e.latlng, this.map.getZoom())
            }
          }
          // for (let layerId in sourceLayers) {
          //   const sourceLayerConfig = sourceLayers[layerId].configuration
          //   if (sourceLayerConfig.visible) {
          //     if (!_.isNil(sourceLayerConfig.geopackageFilePath)) {
          //       count += await GeoPackageUtilities.countOfFeaturesAt(sourceLayerConfig.geopackageFilePath, layerId, sourceLayerConfig.displayName || sourceLayerConfig.name, [sourceLayerConfig.sourceLayerName], e.latlng, this.map.getZoom())
          //     }
          //   }
          // }
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
        if (!_this.isDrawingBounds) {
          e.layer.toggleEdit()
          let layers = [NEW_GEOPACKAGE_OPTION]
          Object.values(_this.geopackages).forEach((geopackage) => {
            layers.push({text: geopackage.name, value: geopackage.id})
          })
          _this.createdLayer = e.layer
          _this.geoPackageChoices = layers
          _this.layerSelectionVisible = true
        }
      })
      this.map.on('editable:disable', async (e) => {
        if (!this.isDrawingBounds) {
          let feature = e.layer.toGeoJSON()
          if (!feature.id) {
            feature.id = e.layer.id
          }
          let layerId = feature.properties.layerId
          let featureId = feature.properties.featureId
          if (!_.isNil(e.layer._mRadius)) {
            feature.properties.radius = e.layer._mRadius
          }
          if (!_.isNil(layerId) && !_.isNil(featureId)) {
            delete feature.properties.layerId
            delete feature.properties.featureId
            _this.updateProjectLayerFeatureRow({projectId: _this.projectId, layerId: layerId, featureRowId: featureId, feature: feature})
          }
        }
      })
      // add sources to map
      for (const layerId in this.layerConfigs) {
        this.addLayer(this.layerConfigs[layerId], this.map, false)
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
          if (!_.isNil(layer) && layer.hasOwnProperty('close')) {
            layer.close()
          }
        })
        _.keys(initializedGeoPackageTables[geopackageId].tileTables).forEach(table => {
          let layer = initializedGeoPackageTables[geopackageId].tileTables[table]
          if (!_.isNil(layer) && layer.hasOwnProperty('close')) {
            layer.close()
          }
        })
      })
      _.keys(sourceLayers).forEach(key => {
        let layer = sourceLayers[key].initializedLayer
        if (!_.isNil(layer) && layer.hasOwnProperty('close')) {
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
  .leaflet-control-draw-circle {
    background: url('../../assets/circle.svg') no-repeat;
  }
  .leaflet-control-draw-trash-enabled {
    background: url('../../assets/trash_red.svg') no-repeat;
  }
  .leaflet-control-draw-trash-disabled {
    background: url('../../assets/trash.svg') no-repeat;
  }
  .leaflet-control-draw-settings {
    background: url('../../assets/settings.svg') no-repeat;
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
</style>
