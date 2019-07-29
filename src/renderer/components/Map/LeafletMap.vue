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
        lastCreatedFeature: null
      }
    },
    methods: {
      ...mapActions({
        addProjectLayer: 'Projects/addProjectLayer',
        updateProjectLayer: 'Projects/updateProjectLayer',
        removeProjectLayer: 'Projects/removeProjectLayer'
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
          let layer = new DrawingLayer({name: name, sourceLayerName: name, features: [feature]})
          await layer.initialize()
          let config = layer.configuration
          this.addProjectLayer({project: this.project, layerId: layer.id, config: config})
        } else {
          let drawingConfig = drawingLayers.find(drawingLayer => drawingLayer.id === this.layerSelection)
          if (drawingConfig) {
            let newDrawingConfig = Object.assign({}, drawingConfig)
            newDrawingConfig.features = drawingConfig.features.slice()
            newDrawingConfig.features.push(feature)
            let layer = LayerFactory.constructLayer(newDrawingConfig)
            await layer.initialize()
            this.updateProjectLayer({projectId: this.projectId, layer: layer.configuration})
          }
        }
        this.layerSelectionVisible = false
        this.layerChoices = []
        this.layerSelection = 0
        this.map.removeLayer(this.createdLayer)
        this.createdLayer = null
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
        async handler (value, oldValue) {
          let currentLayerIds = Object.keys(value)
          let existingLayerIds = Object.keys(initializedLayers)
          // layers that have been removed from the list
          let removed = existingLayerIds.filter((i) => currentLayerIds.indexOf(i) < 0)
          // layers that have been added and are being shown
          let added = currentLayerIds.filter((i) => existingLayerIds.indexOf(i) < 0)
          // layers that still exist may have changed. check if the rgb has changed...
          let same = existingLayerIds.filter((i) => currentLayerIds.indexOf(i) >= 0)
          let map = this.map
          for (const layerId of removed) {
            let mapLayer = shownMapLayers[layerId]
            if (mapLayer) {
              mapLayer.remove()
            }
            delete initializedLayers[layerId]
            delete shownMapLayers[layerId]
            delete layerConfigs[layerId]
          }

          for (const layerId of added) {
            let layerConfig = value[layerId]
            let layer = LayerFactory.constructLayer(layerConfig)
            layer.initialize().then(function () {
              let mapLayer = layer.mapLayer
              mapLayer.addTo(map)
              initializedLayers[layerConfig.id] = layer
              shownMapLayers[mapLayer.id] = mapLayer
              layerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
            })
          }

          for (const layerId of same) {
            let layerConfig = value[layerId]
            let oldLayerConfig = layerConfigs[layerId]

            if (!_.isEqual(_.omit(layerConfig, ['style', 'shown']), _.omit(oldLayerConfig, ['style', 'shown']))) {
              let existingMapLayer = shownMapLayers[layerId]
              existingMapLayer.remove()
              delete initializedLayers[layerId]
              delete shownMapLayers[layerId]
              delete layerConfigs[layerId]
              let layer = LayerFactory.constructLayer(layerConfig)
              layer.initialize().then(function () {
                let updateMapLayer = layer.mapLayer
                updateMapLayer.addTo(map)
                initializedLayers[layerConfig.id] = layer
                shownMapLayers[updateMapLayer.id] = updateMapLayer
                layerConfigs[updateMapLayer.id] = _.cloneDeep(layerConfig)
              })
            } else if (!_.isEqual(layerConfig.style, oldLayerConfig.style)) {
              initializedLayers[layerConfig.id].updateStyle(layerConfig.style).then(function () {
                let existingMapLayer = shownMapLayers[layerId]
                existingMapLayer.remove()
                let updateMapLayer = initializedLayers[layerConfig.id].mapLayer
                updateMapLayer.addTo(map)
                shownMapLayers[updateMapLayer.id] = updateMapLayer
                layerConfigs[updateMapLayer.id] = _.cloneDeep(layerConfig)
              })
            } else if (!_.isEqual(layerConfig.shown, oldLayerConfig.shown)) {
              // shown state has changed
              if (layerConfig.shown) {
                let mapLayer = initializedLayers[layerConfig.id].mapLayer
                mapLayer.addTo(this.map)
                shownMapLayers[mapLayer.id] = mapLayer
                layerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
              } else {
                let mapLayer = shownMapLayers[layerId]
                if (mapLayer) {
                  mapLayer.remove()
                }
                delete shownMapLayers[layerId]
                layerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
              }
            }
          }
        },
        deep: true
      }
    },
    mounted: async function () {
      let _this = this
      this.map = vendor.L.map('map', {editable: true})
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

      this.map.on('delete:enable', () => {
        this.map.eachLayer((layer) => {
          if (layer instanceof vendor.L.Path || layer instanceof vendor.L.Marker) {
            layer.on('click', () => {
              const deleteLayer = async () => {
                let feature = layer.toGeoJSON()
                if (!feature.id) {
                  feature.id = layer.id
                }
                let layerConfig = Object.values(_this.layerConfigs).filter(layerConfig => layerConfig.layerType === 'Drawing').find((layerConfig) => {
                  return layerConfig.features.findIndex(f => f.id === feature.id) >= 0
                })
                if (layerConfig) {
                  let newLayerConfig = Object.assign({}, layerConfig)
                  newLayerConfig.features = newLayerConfig.features.slice()
                  newLayerConfig.features.splice(newLayerConfig.features.findIndex(f => f.id === feature.id), 1)
                  if (newLayerConfig.features.length === 0) {
                    _this.removeProjectLayer({projectId: _this.projectId, layerId: newLayerConfig.id})
                  } else {
                    let layer = LayerFactory.constructLayer(newLayerConfig)
                    let _this = this
                    layer.initialize().then(function () {
                      _this.updateProjectLayer({projectId: _this.projectId, layer: layer.configuration})
                    })
                  }
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
        this.map.eachLayer((layer) => {
          if (layer instanceof vendor.L.Path || layer instanceof vendor.L.Marker) {
            layer.off('click')
          }
        })
      })
      this.map.on('editable:drawing:end', function (e) {
        if (!_this.isDrawingBounds) {
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
        if (!this.isDrawingBounds) {
          let feature = e.layer.toGeoJSON()
          if (!feature.id) {
            feature.id = e.layer.id
          }
          feature.properties.radius = e.layer._mRadius
          // find feature in layers and update it...
          let layerConfig = Object.values(_this.layerConfigs).filter(layerConfig => layerConfig.layerType === 'Drawing').find((layerConfig) => {
            return layerConfig.features.findIndex(f => f.id === feature.id) >= 0
          })
          if (layerConfig) {
            let newLayerConfig = Object.assign({}, layerConfig)
            newLayerConfig.features = newLayerConfig.features.slice()
            newLayerConfig.features.splice(newLayerConfig.features.findIndex(f => f.id === feature.id), 1)
            newLayerConfig.features.push(feature)
            let layer = LayerFactory.constructLayer(newLayerConfig)
            let _this = this
            layer.initialize().then(function () {
              _this.updateProjectLayer({projectId: _this.projectId, layer: layer.configuration})
            })
          }
        }
      })
      for (const layerId in this.layerConfigs) {
        let layerConfig = this.layerConfigs[layerId]
        if (!layerConfig.shown) continue
        let layer = LayerFactory.constructLayer(layerConfig)
        let map = this.map
        layer.initialize().then(function () {
          let mapLayer = layer.mapLayer
          mapLayer.addTo(map)
          initializedLayers[mapLayer.id] = layer
          shownMapLayers[mapLayer.id] = mapLayer
          layerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
        })
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
