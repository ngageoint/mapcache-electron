<template>
  <div id="project" class="container">
    <div id="source-drop-zone" class="project-sidebar">
      <div class="project-name-container">
        <div v-if="!editNameMode" @click.stop="editProjectName" class="project-name">
          {{project.name}}
        </div>
        <div v-show="editNameMode" class="add-data-outer provide-link-text">
          <form class="link-form">
            <label for="project-name-edit">Project Name</label>
            <input type="text" class="project-name-edit" id="project-name-edit" :value="project.name"></input>
            <div class="provide-link-buttons">
              <a @click.stop="saveEditedName">Save</a>
              |
              <a @click.stop="cancelEditName">Cancel</a>
            </div>
          </form>
        </div>
      </div>
      <div class="add-data-outer">
        <div @dragover.prevent="onDragOver" @drop.prevent="onDrop" @dragleave.prevent="onDragLeave" @click.stop="addFileClick" class="add-data-button" v-bind:class="{dragover: processing.dataDragOver}">
          <div class="file-icons">
            <div class="file-type-icons">
              <font-awesome-icon class="file-type-icon-1" icon="file-image" size="2x"/>
              <font-awesome-icon class="file-type-icon-2" icon="file-archive" size="2x"/>
              <font-awesome-icon class="file-type-icon-3" icon="globe-americas" transform="shrink-9 down-1" mask="file" size="2x" />
            </div>
            <font-awesome-icon class="file-import-icon" icon="file-import" size="3x"/>
          </div>
          <div class="major-button-text">Drag and drop or click here</div>
          <div class="major-button-subtext">to add data to your project</div>
          <!-- <div class="major-button-detail">Data formats accepted are: GeoPackage, GeoJSON, GeoTIFF, Shapefile, MBTiles, or zip files of XYZ tiles</div> -->
          <div v-if="processing.dragging" class="major-button-text">{{processing.dragging}}</div>
        </div>
          <div v-if="!linkInputVisible" class="provide-link-text">You can also provide a <a @click.stop="provideLink">link from the web</a></div>
          <div v-show="linkInputVisible">
            <form class="link-form">
              <span class="provide-link-text">
                <label for="link-input">Link from web</label>
                <input type="url" id="link-input" class="link-input" :value="linkToValidate"></input>
                <div class="provide-link-buttons">
                  <a @click.stop="validateLink">Add URL</a>
                  |
                  <a @click.stop="cancelProvideLink">Cancel</a>
                </div>
              </span>
            </form>
          </div>
      </div>
      <div class="source-container">
        <processing-source v-for="source in processing.sources" :source="source" class="sources processing-source" @clear-processing="clearProcessing"/>
        <!-- <layer-card v-for="sourceLayer in layers" :key="sourceLayer.zIndex" class="sources" :layer="sourceLayer.layer" :source="sourceLayer.source" @zoom-to="zoomToExtent" @toggle-layer="toggleLayer" @delete-layer="deleteLayer"/> -->
        <layer-flip-card v-for="sourceLayer in project.layers" :key="sourceLayer.id" class="sources" :layer="sourceLayer" @zoom-to="zoomToExtent" @toggle-layer="toggleLayer" @delete-layer="deleteLayer"/>
      </div>
    </div>

    <div class="work-area">
      <div id="map" style="width: 100%; height: 100%;"></div>
    </div>
  </div>
</template>

<script>
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import * as Projects from '../../../lib/projects'
  // eslint-disable-next-line no-unused-vars
  import * as vendor from '../../../lib/vendor'
  import SourceFactory from '../../../lib/source/SourceFactory'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import Vue from 'vue'
  import FloatLabels from 'float-labels.js'

  import LayerFlipCard from './LayerFlipCard'
  import ProcessingSource from './ProcessingSource'

  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }

  let map
  let project

  let mapLayers = {}
  let processing = {
    dataDragOver: false,
    sources: [],
    dragging: undefined
  }
  let editNameMode = false
  let linkInputVisible = false
  let linkToValidate = ''

  function loadProject () {
    const projectId = new URL(location.href).searchParams.get('id')
    project = Projects.getProject(projectId)
    if (!project) {
      console.log('Tried to open the project ' + projectId + ' but got nothing')
      return
    }
    project.layers = project.layers || {}
    console.log({project})
  }

  loadProject()

  async function addExistingSouces () {
    console.log('adding existing sorces')
    for (let layerId in project.layers) {
      let layer = project.layers[layerId]
      await addLayer(layer)
    }
  }

  async function addLayer (layerConfig) {
    console.log('add old layer', layerConfig.shown)
    try {
      let layer = LayerFactory.constructLayer(layerConfig)
      await layer.initialize()
      for (const mapLayer of layer.mapLayer) {
        console.log('mapLayer', mapLayer)
        mapLayer.addTo(map)
        mapLayers[mapLayer.id] = mapLayer
      }
    } catch (e) {
      console.log('error was', e)
    }
  }

  async function addSource (source) {
    try {
      let createdSource = SourceFactory.constructSource(source.file.path)
      let layers = await createdSource.retrieveLayers()

      for (const layer of layers) {
        await layer.initialize()
        let config = layer.configuration
        console.log('Layer configuration', config.shown)
        Vue.set(project.layers, config.id, config)
        project.layers[config.id] = config
        for (const mapLayer of layer.mapLayer) {
          console.log('mapLayer', mapLayer)
          mapLayer.addTo(map)
          mapLayers[mapLayer.id] = mapLayer
        }
      }

      console.log({project})
      Projects.saveProject(project)
      clearProcessing(source)
    } catch (e) {
      console.log('source', source)
      console.log('setting source error to', e)
      source.error = e.toString()
      throw e
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

  function processFiles (files) {
    let file = files[0]
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
  }

  export default {
    data () {
      return {
        project,
        processing,
        editNameMode,
        linkInputVisible,
        linkToValidate
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
      LayerFlipCard,
      ProcessingSource
    },
    methods: {
      provideLink () {
        this.linkInputVisible = true
      },
      cancelProvideLink () {
        this.linkToValidate = ''
        this.linkInputVisible = false
      },
      validateLink () {
        console.log('validate the link', this.linkToValidate)
      },
      editProjectName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById('project-name-edit').focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        let projectNameEdit = event.target.closest('.project-name-container').querySelector('.project-name-edit')
        project.name = projectNameEdit.value
        Projects.saveProject(project)
      },
      cancelEditName () {
        this.editNameMode = false
      },
      zoomToExtent (extent) {
        console.log({extent})
        map.fitBounds([
          [extent[1], extent[0]],
          [extent[3], extent[2]]
        ])
      },
      toggleLayer (layer) {
        let mapLayer = mapLayers[layer.id]
        if (layer.shown) {
          mapLayer.addTo(map)
        } else {
          mapLayer.remove()
        }
      },
      deleteLayer (layer, source) {
        console.log({layer})
        let mapLayer = mapLayers[layer.id]
        console.log({mapLayer})
        if (mapLayer) {
          mapLayer.remove()
        }
        Vue.delete(this.project.layers, layer.id)
        Projects.saveProject(this.project)
      },
      addFileClick (ev) {
        remote.dialog.showOpenDialog({
          properties: ['openFile']
        }, (files) => {
          let fileInfos = []
          for (const file of files) {
            let fileInfo = jetpack.inspect(file, {
              times: true,
              absolutePath: true
            })
            fileInfo.lastModified = fileInfo.modifyTime.getTime()
            fileInfo.lastModifiedDate = fileInfo.modifyTime
            fileInfo.path = fileInfo.absolutePath
            fileInfos.push(fileInfo)
          }
          processFiles(fileInfos)
        })
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
        processFiles(ev.dataTransfer.files)
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
      const osmbasemap = vendor.L.tileLayer('https://osm-{s}.geointservices.io/tiles/default/{z}/{x}/{y}.png', {
        subdomains: ['1', '2', '3', '4']
      })
      // const basemap = vendor.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      //   attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      // })

      map.setView(defaultCenter, defaultZoom)
      osmbasemap.addTo(map)
      addExistingSouces()
      let fl = new FloatLabels('.link-form', {
        style: 1
      })
      console.log('fl', fl)
    }
  }
</script>

<style scoped>

  @import '~leaflet/dist/leaflet.css';
  @import '~float-labels.js/dist/float-labels.css';

  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  #project {
    font-family: sans-serif;
    color: rgba(255, 255, 255, .87);
  }

  .source-container {

  }

  .container {
    display:flex;
    flex-direction: row;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .link-form {
    margin-top: 1em;
  }

  .provide-link-text {
    margin-top: .6em;
    font-size: .8em;
    color: rgba(54, 62, 70, .87);
  }

  .provide-link-text a {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
  }

  .provide-link-buttons {
    margin-top: -10px;
  }

  .file-icons {
    position: relative;
  }

  .file-import-icon {
    margin-top: 1.2em;
  }

  .file-type-icons {
    position: absolute;
    margin-left: auto;
    margin-right: auto;
    left: 0;
    right: 0;
    top: 10px;
  }

  .file-type-icon-1 {
    margin-right: 5px;
    transform: rotate(-40grad);
    opacity: .6;
  }

  .file-type-icon-2 {
    margin-bottom: 13px;
    transform: rotate(13grad);
    opacity: .4;
  }

  .file-type-icon-3 {
    margin-left: 1px;
    transform: rotate(30grad);
    opacity: .7;
  }

  /* .project-name-container {
    display:flex;
    flex-direction: row;
    width: 100%;
    margin: 0;
    padding: 0;
  } */

  /* .project-name-edit {
    flex: 1;
    max-width: none;
    margin-right: 5px;
  } */

  .link-input {
    max-width: none;
  }

  .save-name-button {
    margin-right: 5px;
  }

  .work-area {
    flex: 1;
    /* background: #FAFAFA; */
  }

  .project-sidebar {
    padding: 15px;
    text-align: center;
    min-width: 380px;
    max-width: 500px;
    width: 30vw;
    height: 100vh;
    overflow-y: scroll;
  }

  .add-data-outer {
    padding: .75em;
    background-color: rgba(255, 255, 255, 1);
    border-radius: 4px;
    margin-bottom: 1em;
    margin-top: 1em;
  }

  .add-data-button {
    border-color: rgba(54, 62, 70, .87);
    border-width: 1px;
    border-style: dashed;
    border-radius: 4px;
    color: rgba(54, 62, 70, .87);
    background-color: #ECEFF1;
    padding-bottom: .2em;
  }

  .dragover {
    background-color: rgb(68, 152, 192);
    color: rgba(255, 255, 255, .95);
  }

  .project-name {
    font-size: 1.1em;
    font-weight: bold;
    cursor: pointer;
  }

  .major-button-text {
    font-size: 1.6em;
    font-weight: bold;
    margin-bottom: -10px;
  }

  .major-button-subtext {
    opacity: .65;
    font-size: 1.1em;
  }

  .major-button-detail {
    opacity: .65;
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
