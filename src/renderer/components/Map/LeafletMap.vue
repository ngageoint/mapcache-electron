<template>
  <div id="map" style="width: 100%; height: 100%;">
    <modal
      v-if="layerSelectionVisible"
      header="Select Drawing Layer"
      footer="Confirm Selection"
      :ok="confirmLayerSelection">
      <div slot="body">
        <label for="layerSelect">Select Drawing Layer</label>
        <select id="layerSelect" v-model="layerSelection">
          <option v-for="choice in layerChoices" v-bind:value="choice.value">
            {{ choice.text }}
          </option>
        </select>
      </div>
    </modal>
  </div>
</template>

<script>
  import { mapActions, mapState } from 'vuex'
  import * as vendor from '../../../lib/vendor'
  import ZoomToExtent from './ZoomToExtent'
  import DrawBounds from './DrawBounds'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import LeafletZoomIndicator from '../../../lib/map/LeafletZoomIndicator'
  import LeafletDraw from '../../../lib/map/LeafletDraw'
  import DrawingLayer from '../../../lib/source/layer/vector/DrawingLayer'
  import Source from '../../../lib/source/Source'
  import _ from 'lodash'
  import Modal from '../Modal'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import VectorStyleUtilities from '../../../lib/VectorStyleUtilities'
  import { userDataDir } from '../../../lib/settings/Settings'
  import path from 'path'

  let initializedLayers = {}
  let shownMapLayers = {}
  let layerConfigs = {}
  let layerSelectionVisible = false
  let layerChoices = []

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
      activeGeopackage: Object,
      projectId: String,
      project: Object
    },
    computed: {
      ...mapState({
        isDrawingBounds (state) {
          return state.UIState[this.projectId].activeCount > 0
        }
      })
    },
    components: {
      Modal
    },
    data () {
      return {
        layerSelectionVisible,
        layerChoices,
        layerSelection: 0,
        lastCreatedFeature: null,
        deleteEnabled: false
      }
    },
    methods: {
      ...mapActions({
        addProjectLayer: 'Projects/addProjectLayer',
        removeProjectLayer: 'Projects/removeProjectLayer',
        addProjectLayerFeatureRow: 'Projects/addProjectLayerFeatureRow',
        deleteProjectLayerFeatureRow: 'Projects/deleteProjectLayerFeatureRow',
        updateProjectLayerFeatureRow: 'Projects/updateProjectLayerFeatureRow'
      }),
      activateGeoPackageAOI () {

      },
      async confirmLayerSelection () {
        let feature = this.createdLayer.toGeoJSON()
        feature.id = Source.createId()
        feature.properties.radius = this.createdLayer._mRadius
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
        let drawingLayers = Object.values(this.layerConfigs).filter(layerConfig => layerConfig.layerType === 'Drawing')
        if (this.layerSelection === 0) {
          let name = 'Drawing Layer ' + (drawingLayers.length + 1)
          let id = Source.createId()
          let fileName = name + '.gpkg'
          let filePath = userDataDir().dir(id).file(fileName).path()
          let fullFile = path.join(filePath, fileName)
          let featureCollection = {
            type: 'FeatureCollection',
            features: [feature]
          }
          let gp = await GeoPackageUtilities.buildGeoPackage(fullFile, name, featureCollection, VectorStyleUtilities.defaultLeafletStyle())
          let layer = new DrawingLayer({
            id: id,
            name: name,
            geopackageFilePath: fullFile,
            sourceFilePath: this.filePath,
            sourceLayerName: name,
            sourceType: 'Drawing',
            tablePointIconRowId: GeoPackageUtilities.getTableIconId(gp, name, 'Point')
          })
          await layer.initialize()
          let config = layer.configuration
          this.addProjectLayer({project: this.project, layerId: layer.id, config: config})
        } else {
          let drawingConfig = drawingLayers.find(drawingLayer => drawingLayer.id === this.layerSelection)
          if (drawingConfig) {
            this.addProjectLayerFeatureRow({projectId: this.projectId, layerId: drawingConfig.id, feature: feature})
          }
        }
        this.layerSelectionVisible = false
        this.layerChoices = []
        this.layerSelection = 0
        this.map.removeLayer(this.createdLayer)
        this.createdLayer = null
      },
      addLayer (layerConfig, map, deleteEnabled) {
        layerConfigs[layerConfig.id] = _.cloneDeep(layerConfig)
        let layer = LayerFactory.constructLayer(layerConfig)
        layer.initialize().then(function () {
          if (layerConfig.shown) {
            let mapLayer = layer.mapLayer
            mapLayer.addTo(map)
            shownMapLayers[layerConfig.id] = mapLayer
            if (deleteEnabled) {
              map.fire('delete:enable')
            }
          }
          initializedLayers[layerConfig.id] = layer
        })
      },
      removeLayer (layerId) {
        delete layerConfigs[layerId]
        let mapLayer = shownMapLayers[layerId]
        if (mapLayer) {
          mapLayer.remove()
        }
        delete shownMapLayers[layerId]
        delete initializedLayers[layerId]
      }
    },
    watch: {
      drawBounds: {
        handler (value, oldValue) {
          this.setupDrawing(value)
        },
        deep: true
      },
      layerConfigs: {
        async handler (updatedLayerConfigs, oldValue) {
          let _this = this
          let map = this.map
          let updatedLayerIds = Object.keys(updatedLayerConfigs)
          let existingLayerIds = Object.keys(layerConfigs)

          // layer configs that have been removed completely
          existingLayerIds.filter((i) => updatedLayerIds.indexOf(i) < 0).forEach(layerId => {
            _this.removeLayer(layerId)
          })

          // new layer configs
          updatedLayerIds.filter((i) => existingLayerIds.indexOf(i) < 0).forEach(layerId => {
            let layerConfig = updatedLayerConfigs[layerId]
            _this.removeLayer(layerId)
            _this.addLayer(layerConfig, map, _this.deleteEnabled)
          })

          // see if any of the layers have changed
          updatedLayerIds.filter((i) => existingLayerIds.indexOf(i) >= 0).forEach(layerId => {
            let updatedLayerConfig = updatedLayerConfigs[layerId]
            let oldLayerConfig = layerConfigs[layerId]
            // something other than layerKey, maxFeatures, shown, or feature assignments changed
            if (!_.isEqual(_.omit(updatedLayerConfig, ['layerKey', 'maxFeatures', 'shown', 'styleAssignmentFeature', 'iconAssignmentFeature']), _.omit(oldLayerConfig, ['layerKey', 'maxFeatures', 'shown', 'styleAssignmentFeature', 'iconAssignmentFeature']))) {
              layerConfigs[updatedLayerConfig.id] = _.cloneDeep(updatedLayerConfig)
              _this.removeLayer(layerId)
              _this.addLayer(updatedLayerConfig, map, _this.deleteEnabled)
            } else if (!_.isEqual(updatedLayerConfig.shown, oldLayerConfig.shown)) {
              layerConfigs[updatedLayerConfig.id] = _.cloneDeep(updatedLayerConfig)
              // display it
              if (updatedLayerConfig.shown) {
                let mapLayer = initializedLayers[updatedLayerConfig.id].mapLayer
                mapLayer.addTo(map)
                shownMapLayers[updatedLayerConfig.id] = mapLayer
              } else {
                // hide it
                let mapLayer = shownMapLayers[layerId]
                if (mapLayer) {
                  mapLayer.remove()
                  delete shownMapLayers[layerId]
                }
              }
            } else if ((!_.isEqual(updatedLayerConfig.layerKey, oldLayerConfig.layerKey) || !_.isEqual(updatedLayerConfig.maxFeatures, oldLayerConfig.maxFeatures)) && updatedLayerConfig.pane === 'vector') {
              layerConfigs[updatedLayerConfig.id] = _.cloneDeep(updatedLayerConfig)
              // only style has changed, let's just update style
              initializedLayers[updatedLayerConfig.id].updateStyle(updatedLayerConfig.maxFeatures).then(function () {
                // remove layer from map if it is currently being shown
                let mapLayer = shownMapLayers[layerId]
                if (mapLayer) {
                  mapLayer.remove()
                }
                // if layer is set to be shown, display it on the map
                if (updatedLayerConfig.shown) {
                  let updateMapLayer = initializedLayers[updatedLayerConfig.id].mapLayer
                  updateMapLayer.addTo(map)
                  shownMapLayers[updatedLayerConfig.id] = updateMapLayer
                }
              })
            } else if (!_.isEqual(updatedLayerConfig.styleAssignmentFeature, oldLayerConfig.styleAssignmentFeature) && updatedLayerConfig.pane === 'vector') {
              layerConfigs[updatedLayerConfig.id] = _.cloneDeep(updatedLayerConfig)
              GeoPackageUtilities.getBoundingBoxForFeature(updatedLayerConfig.geopackageFilePath, updatedLayerConfig.sourceLayerName, updatedLayerConfig.styleAssignmentFeature).then(function (extent) {
                map.fitBounds([
                  [extent[1], extent[0]],
                  [extent[3], extent[2]]
                ])
              })
            } else if (!_.isEqual(updatedLayerConfig.iconAssignmentFeature, oldLayerConfig.iconAssignmentFeature) && updatedLayerConfig.pane === 'vector') {
              layerConfigs[updatedLayerConfig.id] = _.cloneDeep(updatedLayerConfig)
              GeoPackageUtilities.getBoundingBoxForFeature(updatedLayerConfig.geopackageFilePath, updatedLayerConfig.sourceLayerName, updatedLayerConfig.iconAssignmentFeature).then(function (extent) {
                map.fitBounds([
                  [extent[1], extent[0]],
                  [extent[3], extent[2]]
                ])
              })
            }
          })
        },
        deep: true
      }
    },
    mounted: async function () {
      let _this = this
      this.map = vendor.L.map('map', {editable: true, attributionControl: false})
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 4
      const osmbasemap = vendor.L.tileLayer('https://osm-{s}.geointservices.io/tiles/default/{z}/{x}/{y}.png', {
        subdomains: ['1', '2', '3', '4']
      })
      this.map.setView(defaultCenter, defaultZoom)
      osmbasemap.addTo(this.map)
      this.map.addControl(new LeafletZoomIndicator())
      this.map.addControl(new LeafletDraw())
      this.map.on('layeradd', function (e) {
        if (!_this.isDrawingBounds && !this.r && (e.layer instanceof vendor.L.Path || e.layer instanceof vendor.L.Marker)) {
          e.layer.on('dblclick', vendor.L.DomEvent.stop).on('dblclick', () => {
            if (e.layer.editEnabled()) {
              e.layer.disableEdit()
            } else {
              e.layer.enableEdit()
            }
          })
        }
      })
      this.map.on('delete:enable', () => {
        this.deleteEnabled = true
        this.map.eachLayer((layer) => {
          if (layer instanceof vendor.L.Path || layer instanceof vendor.L.Marker) {
            layer.on('click', () => {
              const deleteLayer = async () => {
                let feature = layer.toGeoJSON()
                if (!feature.id) {
                  feature.id = layer.id
                }
                let layerId = feature.properties.layerId
                let featureId = feature.properties.featureId
                if (!_.isNil(layerId) && !_.isNil(featureId)) {
                  delete feature.properties.layerId
                  delete feature.properties.featureId
                  _this.deleteProjectLayerFeatureRow({projectId: _this.projectId, layerId: layerId, featureId: featureId})
                }
              }
              let popup = vendor.L.DomUtil.create('div', 'popup')
              let popupHeader = vendor.L.DomUtil.create('div', 'popup_header', popup)
              let popupBody = vendor.L.DomUtil.create('div', 'popup_body', popup)
              let popupFooter = vendor.L.DomUtil.create('div', 'popup_footer ', popup)
              let popupHeaderTitle = vendor.L.DomUtil.create('span', '', popupHeader)
              popupHeaderTitle.innerHTML = 'Delete Drawing'
              let popupBodyParagraph = vendor.L.DomUtil.create('p', '', popupBody)
              popupBodyParagraph.innerHTML = 'Are you sure you want to delete this drawing?'
              let confirmBtn = vendor.L.DomUtil.create('button', 'layer__request-btn', popupFooter)
              vendor.L.DomUtil.addClass(confirmBtn, 'layer__request-btn__confirm')
              confirmBtn.setAttribute('type', 'button')
              confirmBtn.innerHTML = '<span class="layer__request-btn__text-1">Delete</span>'
              vendor.L.DomEvent.on(confirmBtn, 'click', deleteLayer)
              let cancelBtn = vendor.L.DomUtil.create('button', 'layer__request-btn', popupFooter)
              cancelBtn.setAttribute('type', 'button')
              cancelBtn.innerHTML = '<span class="layer__request-btn__text-1">Cancel</span>'
              layer.bindPopup(popup).openPopup()
              vendor.L.DomEvent.on(cancelBtn, 'click', () => {
                layer.closePopup()
              })
            })
          }
        })
      })
      this.map.on('delete:disable', () => {
        this.deleteEnabled = false
        this.map.eachLayer((layer) => {
          if (layer instanceof vendor.L.Path || layer instanceof vendor.L.Marker) {
            layer.off('click')
          }
        })
      })
      this.map.on('editable:drawing:end', function (e) {
        console.log('editable:disable')
        if (!_this.isDrawingBounds && !_this.r) {
          e.layer.toggleEdit()
          let layers = [{text: 'New Layer', value: 0}]
          Object.values(_this.layerConfigs).filter(layerConfig => layerConfig.layerType === 'Drawing').forEach((layerConfig) => {
            layers.push({text: layerConfig.name, value: layerConfig.id})
          })
          _this.createdLayer = e.layer
          _this.layerChoices = layers
          _this.layerSelectionVisible = true
        }
      })
      this.map.on('editable:disable', async (e) => {
        console.log('editable:disable')
        if (!this.isDrawingBounds && !this.r) {
          let feature = e.layer.toGeoJSON()
          if (!feature.id) {
            feature.id = e.layer.id
          }
          let layerId = feature.properties.layerId
          let featureId = feature.properties.featureId
          feature.properties.radius = e.layer._mRadius
          if (!_.isNil(layerId) && !_.isNil(featureId)) {
            delete feature.properties.layerId
            delete feature.properties.featureId
            _this.updateProjectLayerFeatureRow({projectId: _this.projectId, layerId: layerId, featureRowId: featureId, feature: feature})
          }
        }
      })
      for (const layerId in this.layerConfigs) {
        this.addLayer(this.layerConfigs[layerId], this.map, false)
      }
      this.setupDrawing(this.drawBounds)
      if (this.activeGeopackage) {
        this.activateGeoPackageAOI()
      }
    }
  }
</script>

<style>

  @import '~leaflet/dist/leaflet.css';

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

</style>
