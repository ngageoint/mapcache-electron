<template>
  <div id="project" class="container">
    <div id="source-drop-zone" class="project-sidebar">
      <strong><p id="project-name">{{project.name}}</p></strong>
      <div class="add-data-button">
        <div class="major-button-text">Add Data To Project</div>
        <div class="major-button-detail">Data formats accepted are: GeoPackage, GeoJSON, GeoTIFF, Shapefile, MBTiles, or zip files of XYZ tiles</div>
      </div>
      <div id="source-container">
        <ul class="sources" id="source-list" v-for="source in project.sources" @click="zoomToExtent(source.extent)">
          {{source.name}}
        </ul>
      </div>
    </div>

    <div class="work-area">
      <div id="map" style="width: 100%; height: 100%;"></div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */

  import path from 'path'
  import Vue from 'vue'
  import * as Projects from '../../../lib/projects'
  // eslint-disable-next-line no-unused-vars
  import * as vendor from '../../../lib/vendor'
  import { remote } from 'electron'
  import SourceFactory from '../../../lib/source/SourceFactory'


  let map
  const projectId = new URL(location.href).searchParams.get('id')
  let project = Projects.getProjectConfiguration(projectId)

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
      await addSource(source)
    }
  }

  async function addSource (source) {
    let mapSource = await SourceFactory.constructSource(source, project)
    let layer = mapSource.mapLayer
    console.log('layer', layer)
    let layerArray = Array.isArray(layer) ? layer : [layer]
    layerArray.forEach(function (layer) {
      layer.addTo(map)
    })
  }

  export default {
    data () {
      return {
        project
      }
    },
    methods: {
      openProject (id) {
        console.log('open project', id)
      },
      zoomToExtent (extent) {
        console.log({extent})
        map.fitBounds([
          [extent[1], extent[0]],
          [extent[3], extent[2]]
        ])
      }
    },
    mounted: function () {
      map = vendor.L.map('map')
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 13
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
    margin: 10px;
    text-align: center;
    width: 300px;
  }

  .add-data-button {
    border-color: #333;
    border-width: 1px;
    border-style: dashed;
    border-radius: 5px;
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
