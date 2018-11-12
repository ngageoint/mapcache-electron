<template>
  <div id="project" class="container">
    <div id="source-drop-zone" class="project-sidebar">
      <strong><p id="project-name">{{project.name}}</p></strong>
      <div class="add-data-button">
        <div class="major-button-text">Add Data To Project</div>
        <div class="major-button-detail">Data formats accepted are: GeoPackage, GeoJSON, GeoTIFF, Shapefile, MBTiles, or zip files of XYZ tiles</div>
      </div>
      <div id="source-container">
        <ul class="sources" id="source-list" v-for="source in project.sources">
        </ul>
      </div>
    </div>

    <div class="work-area">
      <div id="map" style="width: 100%; height: 100%;"></div>
    </div>
  </div>
</template>

<script>
  import * as Projects from '../../projects'
  import L from 'leaflet'
  // eslint-disable-next-line no-unused-vars
  import vendor from '../../vendor'

  const projectId = new URL(location.href).searchParams.get('id')
  console.log('projectId', projectId)

  let project = Projects.getProjectConfiguration(projectId)

  export default {
    data () {
      return {
        project
      }
    },
    methods: {
      openProject (id) {
        console.log('open project', id)
      }
    },
    mounted: function () {
      const map = L.map('map')
      const defaultCenter = [38.889269, -77.050176]
      const defaultZoom = 2
      const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      })

      map.setView(defaultCenter, defaultZoom)

      basemap.addTo(map)

      L.marker([38.889269, -77.0501769]).addTo(map)
        .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
        .openPopup()
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

/* .sources li.checked {
  list-style: url('../images/check.png');
} */

</style>
