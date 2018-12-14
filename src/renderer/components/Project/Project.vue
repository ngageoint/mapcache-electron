<template>
  <div id="project" class="container">
    <div id="source-drop-zone" class="project-sidebar">
      <strong><p id="project-name">{{project.name}}</p></strong>
      <div class="add-data-button">
        <div class="major-button-text">Add Data To Project</div>
        <div class="major-button-detail">Data formats accepted are: GeoPackage, GeoJSON, GeoTIFF, Shapefile, MBTiles, or zip files of XYZ tiles</div>
      </div>
      <div id="source-container">
        <source-view v-for="source in project.sources" :source="source" :key="source.id" @zoom-to="zoomToExtent" @toggle-layer="toggleLayer"></source-view>
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

  import SourceView from './Source'

  let map
  const projectId = new URL(location.href).searchParams.get('id')
  let project = Projects.getProject(projectId)
  console.log({project})
  let mapLayers = {}

  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }

  document.body.ondrop = (ev) => {
    console.log(ev.dataTransfer.files[0])
    let file = ev.dataTransfer.files[0]
    addSource(file)
  }

  async function addExistingSouces () {
    for (let sourceId in project.sources) {
      let source = project.sources[sourceId]
      console.log({source})
      await addSource(source)
    }
  }

  async function addSource (source) {
    let mapSource = await SourceFactory.constructSource(source, project)
    mapSource.map = map
    let layer = mapSource.mapLayer
    let layerArray = Array.isArray(layer) ? layer : [layer]
    layerArray.forEach(function (layer) {
      console.log('layer', layer)
      layer.addTo(map)
      console.log('add map layer with id', layer.id)
      mapLayers[layer.id] = layer
    })
  }

  export default {
    data () {
      return {
        project
      }
    },
    components: {
      SourceView
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
        console.log('toggle layer', layer)
        let mapLayer = mapLayers[layer.id]
        console.log({mapLayers})
        if (!layer.hidden) {
          mapLayer.addTo(map)
        } else {
          mapLayer.remove()
        }
      }
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
