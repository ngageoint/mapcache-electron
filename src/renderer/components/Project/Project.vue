<template>
  <div id="project" class="container">
    <div id="source-drop-zone" class="project-sidebar">
      <strong><p id="project-name">{{project.name}}</p></strong>
      <div @dragover.prevent="onDragOver" @drop.prevent="onDrop" @dragleave.prevent="onDragLeave" class="add-data-button" v-bind:class="{dragover: processing.dataDragOver}">
        <div class="major-button-text">Drag File Here To Add Data To Project</div>
        <div class="major-button-detail">Data formats accepted are: GeoPackage, GeoJSON, GeoTIFF, Shapefile, MBTiles, or zip files of XYZ tiles</div>
        <div v-if="processing.dragging" class="major-button-text">{{processing.dragging}}</div>
      </div>
      <div id="source-container">
        <processing-source v-for="source in processing.sources" :source="source" class="sources processing-source" @clear-processing="clearProcessing"/>
        <layer-card v-for="sourceLayer in layers" :key="sourceLayer.zIndex" class="sources" :layer="sourceLayer.layer" :source="sourceLayer.source" @zoom-to="zoomToExtent" @toggle-layer="toggleLayer" @delete-layer="deleteLayer"/>
      </div>
    </div>

    <div class="work-area">
      <div id="map" style="width: 100%; height: 100%;"></div>
    </div>
  </div>
</template>

<script>
  import * as Projects from '../../../lib/projects'
  // eslint-disable-next-line no-unused-vars
  import * as vendor from '../../../lib/vendor'
  import SourceFactory from '../../../lib/source/SourceFactory'
  import Vue from 'vue'

  import LayerCard from './LayerCard'
  import ProcessingSource from './ProcessingSource'

  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }

  let map
  const projectId = new URL(location.href).searchParams.get('id')
  let project = Projects.getProject(projectId)
  let mapLayers = {}
  let processing = {
    dataDragOver: false,
    sources: [],
    dragging: undefined
  }

  async function addExistingSouces () {
    for (let sourceId in project.sources) {
      let source = project.sources[sourceId]
      await addSource(source)
    }
  }

  async function addSource (source) {
    try {
      let mapSource = await SourceFactory.constructSource(source, project, function (status) {
        source.status = status
      })
      mapSource.map = map
      let layer = mapSource.mapLayer
      console.log('map layer', layer)
      let layerArray = Array.isArray(layer) ? layer : [layer]
      layerArray.forEach(function (layer) {
        console.log('layer', layer)
        layer.addTo(map)
        console.log('add map layer with id', layer.id)
        mapLayers[layer.id] = layer
      })
      clearProcessing(source)
    } catch (e) {
      console.log('source', source)
      console.log('setting source error to', e)
      source.error = e.toString()
    }
  }

  function clearProcessing (processingSource) {
    console.log('processingSource', processingSource)
    for (let i = 0; i < processing.sources.length; i++) {
      let source = processing.sources[i]
      console.log('source', source)
      if (source.file.path === processingSource.file.path) {
        processing.sources.splice(i, 1)
        break
      }
    }
  }

  export default {
    data () {
      return {
        project,
        processing
      }
    },
    computed: {
      layers () {
        let sourceLayers = []
        for (let sourceId in this.project.sources) {
          let source = this.project.sources[sourceId]
          source.layers.forEach(function (layer) {
            sourceLayers.push({layer, source})
          })
        }
        sourceLayers.sort(function (a, b) {
          return b.layer.zIndex - a.layer.zIndex
        })
        return sourceLayers
      }
    },
    components: {
      LayerCard,
      ProcessingSource
    },
    methods: {
      zoomToExtent (extent) {
        console.log({extent})
        map.fitBounds([
          [extent[1], extent[0]],
          [extent[3], extent[2]]
        ])
      },
      toggleLayer (layer) {
        let mapLayer = mapLayers[layer.id]
        if (!layer.hidden) {
          mapLayer.addTo(map)
        } else {
          mapLayer.remove()
        }
      },
      deleteLayer (layer, source) {
        let layerIndex = source.layers.findIndex(function (sourceLayer) {
          return sourceLayer.id === layer.id
        })
        source.layers.splice(layerIndex, 1)
        if (!source.layers.length) {
          Vue.delete(this.project.sources, source.id)
        }
        let mapLayer = mapLayers[layer.id]
        mapLayer.remove()
        Projects.saveProject(this.project)
      },
      onDragOver (ev) {
        let item = ev.dataTransfer.items[0]
        let kind = item.kind
        let type = item.type
        processing.dragging = ev.dataTransfer.items.length + ' ' + type + ' ' + kind
        processing.dataDragOver = true
      },
      onDrop (ev) {
        processing.dragging = undefined
        processing.dataDragOver = false
        let file = ev.dataTransfer.files[0]
        let sourceToProcess = {
          file: {
            lastModified: file.lastModified,
            lastModifiedDate: file.lastModifiedDate,
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.path
          },
          status: undefined,
          error: undefined
        }
        processing.sources.push(sourceToProcess)
        console.log({file})
        setTimeout(function () {
          addSource(sourceToProcess)
        }, 0)
      },
      onDragLeave (ev) {
        processing.dataDragOver = false
        processing.dragging = undefined
      },
      clearProcessing
    },
    mounted: function () {
      map = vendor.L.map('map')
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 4
      const basemap = vendor.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      })

      map.setView(defaultCenter, defaultZoom)
      basemap.addTo(map)
      addExistingSouces()
    }
  }
</script>

<style scoped>

  @import '~leaflet/dist/leaflet.css';

  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: sans-serif;
    color: #525252;
  }

  .container {
    display:flex;
    flex-direction: row;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
  }

  .work-area {
    flex: 1;
    background: #FAFAFA;
  }

  .project-sidebar {
    margin: 15px;
    text-align: center;
    width: 350px;
    height: 100vh;
    overflow-y: scroll;
  }

  .add-data-button {
    border-color: #333;
    border-width: 1px;
    border-style: dashed;
    border-radius: 5px;
    margin-top: 10px;
    margin-bottom: 15px;
  }

  .dragover {
    background-color: #3556ce;
    color: #FFF;
  }

  .major-button-text {
    font-size: 1.1em;
    font-weight: bold;
  }

  .major-button-detail {
    font-size: .7em;
  }

  .sources {
    list-style: none;
    text-align: left;
  }

  .sources li.checked {
    list-style: url('../../assets/check.png');
  }

</style>
