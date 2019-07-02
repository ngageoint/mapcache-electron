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
  import DrawingLayer from '../../../lib/source/layer/DrawingLayer'
  import Source from '../../../lib/source/Source'
  import _ from 'lodash'
  import Modal from '../Modal'

  let shownMapLayers = {}
  let shownLayerConfigs = {}
  let layerSelectionVisible = false
  let layerChoices = []

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
        updateProjectLayer: 'Projects/updateProjectLayer'
      }),
      activateGeoPackageAOI () {

      },
      async confirmLayerSelection () {
        let feature = this.createdLayer.toGeoJSON()
        feature.id = Source.createId()
        feature.properties.radius = this.createdLayer._mRadius
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
          let existingLayerIds = Object.keys(shownMapLayers)
          // layers that have been removed from the list or are no longer being shown
          let removed = existingLayerIds.filter((i) => currentLayerIds.indexOf(i) < 0 || !value[i].shown)
          // layers that have been added and are being shown
          let added = currentLayerIds.filter((i) => existingLayerIds.indexOf(i) < 0 && value[i].shown)
          // layers that still exist may have changed. check if the rgb has changed...
          let same = existingLayerIds.filter((i) => currentLayerIds.indexOf(i) >= 0 && value[i].shown)

          for (const layerId of removed) {
            let mapLayer = shownMapLayers[layerId]
            mapLayer.remove()
            delete shownMapLayers[layerId]
            delete shownLayerConfigs[layerId]
          }

          for (const layerId of added) {
            let layerConfig = value[layerId]
            let layer = LayerFactory.constructLayer(layerConfig)
            await layer.initialize()
            let mapLayer = layer.mapLayer
            mapLayer.addTo(this.map)
            shownMapLayers[mapLayer.id] = mapLayer
            shownLayerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
          }

          for (const layerId of same) {
            let layerConfig = value[layerId]
            let oldLayerConfig = shownLayerConfigs[layerId]

            if (!_.isEqual(layerConfig, oldLayerConfig)) {
              let existingMapLayer = shownMapLayers[layerId]
              existingMapLayer.remove()
              delete shownMapLayers[layerId]
              delete shownLayerConfigs[layerId]
              let layer = LayerFactory.constructLayer(layerConfig)
              await layer.initialize()
              let updateMapLayer = layer.mapLayer
              updateMapLayer.addTo(this.map)
              shownMapLayers[updateMapLayer.id] = updateMapLayer
              shownLayerConfigs[updateMapLayer.id] = _.cloneDeep(layerConfig)
            }
          }
        },
        deep: true
      }
    },
    mounted: async function () {
      this.map = vendor.L.map('map', {editable: true})
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 4
      const osmbasemap = vendor.L.tileLayer('https://osm-{s}.geointservices.io/tiles/default/{z}/{x}/{y}.png', {
        subdomains: ['1', '2', '3', '4']
      })
      this.map.setView(defaultCenter, defaultZoom)
      osmbasemap.addTo(this.map)
      let _this = this

      this.map.addControl(new LeafletZoomIndicator())
      this.map.addControl(new LeafletDraw())
      this.map.on('layeradd', function (e) {
        if (!this.isDrawingBounds && (e.layer instanceof vendor.L.Path || e.layer instanceof vendor.L.Marker)) {
          e.layer.on('dblclick', vendor.L.DomEvent.stop).on('dblclick', () => {
            if (e.layer.editEnabled()) {
              e.layer.disableEdit()
            } else {
              e.layer.enableEdit()
            }
          })
          let layer = e.layer
          e.layer.on('contextmenu', () => {
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
                let layer = LayerFactory.constructLayer(newLayerConfig)
                await layer.initialize()
                _this.updateProjectLayer({projectId: _this.projectId, layer: layer.configuration})
              }
            }
            let container = vendor.L.DomUtil.create('div')
            let btn = vendor.L.DomUtil.create('button', '', container)
            btn.setAttribute('type', 'button')
            btn.innerHTML = 'Delete Shape'
            vendor.L.DomEvent.on(btn, 'click', deleteLayer)
            e.layer.bindPopup(container).openPopup()
          })
        }
      })

      this.map.on('editable:drawing:end', (e) => {
        if (!this.isDrawingBounds) {
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
            await layer.initialize()
            this.updateProjectLayer({projectId: this.projectId, layer: layer.configuration})
          }
        }
      })
      for (const layerId in this.layerConfigs) {
        let layerConfig = this.layerConfigs[layerId]
        if (!layerConfig.shown) continue
        let layer = LayerFactory.constructLayer(layerConfig)
        await layer.initialize()
        let mapLayer = layer.mapLayer
        mapLayer.addTo(this.map)
        shownMapLayers[mapLayer.id] = mapLayer
        shownLayerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
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
  .leaflet-control-draw-trash {
    background: url('../../assets/trash.svg') no-repeat;
  }

</style>
