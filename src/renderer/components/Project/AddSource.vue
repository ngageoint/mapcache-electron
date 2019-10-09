<template>
  <div>
    <modal
        v-if="layerSelectionVisible"
        header="Select Layers"
        footer="Confirm Selection"
        :ok="confirmLayerImport"
        :cancel="cancelLayerImport">
      <div slot="body">
        <multiselect v-model="layerSelection" :options="layerChoices" :multiple="true" :close-on-select="false" :clear-on-select="false" placeholder="Select Layers" label="name" track-by="name" :preselect-first="false">
          <template slot="selection" slot-scope="{ layerChoices, isOpen }"><span class="multiselect__single" v-if="!isOpen">{{ layerSelection.length }} layers selected</span></template>
        </multiselect>
      </div>
    </modal>
    <modal
        v-if="showErrorModal"
        header="Invalid URL"
        :ok="dismissErrorModal">
      <div slot="body">
        <p style="color: #42b983">{{error}}</p>
      </div>
    </modal>
    <div class="add-data-outer">
      <div
          @dragover.prevent="onDragOver"
          @drop.prevent="onDrop"
          @dragleave.prevent="onDragLeave"
          @click.stop="addFileClick"
          class="add-data-button"
          :class="{dragover: processing.dataDragOver}">
        <div class="file-icons">
          <div class="file-type-icons">
            <font-awesome-icon
                class="file-type-icon-1"
                icon="file-image"
                size="2x"/>
            <font-awesome-icon
                class="file-type-icon-2"
                icon="file-archive"
                size="2x"/>
            <font-awesome-icon
                class="file-type-icon-3"
                icon="globe-americas"
                transform="shrink-9 down-1"
                mask="file"
                size="2x" />
          </div>
          <font-awesome-icon
              class="file-import-icon"
              icon="file-import"
              size="3x"/>
        </div>

        <div class="major-button-text">Drag and drop or click here</div>
        <div class="major-button-subtext">to add data to your project</div>

        <div v-if="processing.dragging" class="major-button-text">{{processing.dragging}}</div>
      </div>

      <div v-if="!linkInputVisible"
        class="provide-link-text">You can also provide a <a @click.stop="provideLink">link from the web</a>
      </div>


      <div v-show="linkInputVisible">
        <form class="link-form" v-on:submit.prevent="validateLink">
          <span class="provide-link-text">
            <label for="link-input">Link from web</label>
            <input
                type="url"
                id="link-input"
                class="text-input"
                v-model="linkToValidate">
            </input>
            <label for="auth-select">Authorization</label>
            <select id="auth-select" name="authSelect" v-model="authSelection">
              <option disabled>Authorization</option>
              <option value="none">No Authorization</option>
              <option value="basic">Basic</option>
              <option value="bearer">Bearer Token</option>
            </select>
            <div id="basic-auth-div" class="provide-auth" v-if="authSelection === 'basic'">
              <label id="username-input-label" for="username-input">Username</label>
              <input
                type="text"
                id="username-input"
                class="text-input"
                v-model="username">
              <label id="password-input-label" for="password-input">Password</label>
              <input
                type="password"
                id="password-input"
                class="text-input"
                v-model="password">
            </div>
            <div id="bearer-auth-div" class="provide-auth" v-if="authSelection === 'bearer'">
              <label id="token-input-label" for="token-input">Token</label>
              <input
                type="text"
                id="token-input"
                class="text-input"
                v-model="token">
            </div>
            <div class="provide-link-buttons">
              <a @click.stop="validateLink">Add URL</a>
              |
              <a @click.stop="cancelProvideLink">Cancel</a>
            </div>
          </span>
        </form>
      </div>

    </div>
    <processing-source
        v-for="source in processing.sources"
        :source="source"
        :key="source.file.path"
        class="sources processing-source"
        @clear-processing="clearProcessing">
    </processing-source>
  </div>
</template>

<script>
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import { mapActions } from 'vuex'
  import SourceFactory from '../../../lib/source/SourceFactory'
  import FloatLabels from 'float-labels.js'
  import ProcessingSource from './ProcessingSource'
  import AddUrlDialog from './AddUrlDialog'
  import xml2js from 'xml2js'
  import Modal from '../Modal'
  import request from 'request-promise-native'
  import Multiselect from 'vue-multiselect'

  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }

  let processing = {
    dataDragOver: false,
    sources: [],
    dragging: undefined,
    url: undefined
  }
  let linkInputVisible = false
  let linkToValidate = ''
  let layerSelectionVisible = false
  let layerChoices = []
  let layerSelection = []
  let error = null
  let showErrorModal = false
  let authSelection = ''
  let username = ''
  let password = ''
  let token = ''

  export default {
    props: {
      project: Object
    },
    data () {
      return {
        processing,
        linkInputVisible,
        linkToValidate,
        layerSelectionVisible,
        layerChoices,
        layerSelection,
        showErrorModal,
        error,
        authSelection,
        username,
        password,
        token
      }
    },
    components: {
      AddUrlDialog,
      ProcessingSource,
      Modal,
      Multiselect
    },
    methods: {
      ...mapActions({
        addProjectLayer: 'Projects/addProjectLayer',
        addProjectLayers: 'Projects/addProjectLayers'
      }),
      provideLink () {
        this.linkInputVisible = true
      },
      cancelProvideLink () {
        this.linkToValidate = ''
        this.linkInputVisible = false
      },
      dismissErrorModal () {
        this.showErrorModal = false
        this.error = null
      },
      async xml2json (xml) {
        return new Promise((resolve, reject) => {
          new xml2js.Parser().parseString(xml, function (err, json) {
            if (err) {
              reject(err)
            } else {
              resolve(json)
            }
          })
        })
      },
      async validateLink () {
        const { type, error } = this.validateUrlSource(this.linkToValidate)
        if (error === null) {
          if (type === 'XYZ') {
            try {
              let options = {
                method: 'HEAD',
                uri: this.linkToValidate.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'),
                headers: {
                  'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
                }
              }
              let credentials = this.getCredentials()
              if (credentials) {
                if (credentials.type === 'basic' || credentials.type === 'bearer') {
                  if (!options.headers) {
                    options.headers = {}
                  }
                  options.headers['Authorization'] = credentials.authorization
                }
              }
              await request(options)
              this.processXYZUrl(this.linkToValidate)
            } catch (error) {
              this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
              this.showErrorModal = true
            }
          } else if (type === 'WMS') {
            let layers = []
            let options = {
              method: 'GET',
              uri: this.linkToValidate + '&request=GetCapabilities',
              headers: {
                'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
              }
            }
            let credentials = this.getCredentials()
            if (credentials) {
              if (credentials.type === 'basic' || credentials.type === 'bearer') {
                if (!options.headers) {
                  options.headers = {}
                }
                options.headers['Authorization'] = credentials.authorization
              }
            }
            try {
              let xml = await request(options)
              let json = await this.xml2json(xml)
              if (this.linkToValidate.indexOf('1.1.1') > 0) {
                for (const layer of json['WMT_MS_Capabilities']['Capability'][0]['Layer'][0]['Layer']) {
                  const bbox = layer['LatLonBoundingBox'][0]['$']
                  const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
                  layers.push({name: layer['Name'][0], extent: extent, wms: true})
                }
              } else if (this.linkToValidate.indexOf('1.3.0') > 0) {
                for (const layer of json['WMS_Capabilities']['Capability'][0]['Layer'][0]['Layer']) {
                  const bbox = layer['EX_GeographicBoundingBox'][0]
                  const extent = [Number(bbox['westBoundLongitude']), Number(bbox['southBoundLatitude']), Number(bbox['eastBoundLongitude']), Number(bbox['northBoundLatitude'])]
                  layers.push({name: layer['Name'][0], extent: extent, wms: true})
                }
              }
              this.layerChoices = layers
              this.layerSelectionVisible = true
            } catch (error) {
              this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
              this.showErrorModal = true
            }
          } else if (type === 'WFS') {
            let layers = []
            let options = {
              method: 'GET',
              uri: this.linkToValidate + '&request=GetCapabilities',
              headers: {
                'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
              }
            }
            let credentials = this.getCredentials()
            if (credentials) {
              if (credentials.type === 'basic' || credentials.type === 'bearer') {
                if (!options.headers) {
                  options.headers = {}
                }
                options.headers['Authorization'] = credentials.authorization
              }
            }
            try {
              let xml = await request(options)
              let json = await this.xml2json(xml)
              if (this.linkToValidate.indexOf('1.0.0') > 0) {
                for (const layer of json['WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
                  const bbox = layer['LatLongBoundingBox'][0]['$']
                  const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
                  layers.push({name: layer['Name'][0], extent: extent, wfs: true})
                }
              } else if (this.linkToValidate.indexOf('1.1.0') > 0) {
                for (const layer of json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
                  const bbox = layer['ows:WGS84BoundingBox'][0]
                  const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
                  const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
                  const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
                  layers.push({name: layer['Name'][0], extent: extent, wfs: true})
                }
              } else if (this.linkToValidate.indexOf('2.0.0') > 0) {
                for (const layer of json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
                  const bbox = layer['ows:WGS84BoundingBox'][0]
                  const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
                  const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
                  const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
                  layers.push({name: layer['Name'][0], extent: extent, wfs: true})
                }
              }
              this.layerChoices = layers
              this.layerSelectionVisible = true
            } catch (error) {
              this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
              this.showErrorModal = true
            }
          } else {
            this.error = 'Unsupported URL: ' + type
            this.showErrorModal = true
          }
        } else {
          this.error = error
          this.showErrorModal = true
        }
      },
      resetAuth () {
        this.authSelection = 'none'
        this.password = ''
        this.username = ''
        this.token = ''
      },
      cancelLayerImport () {
        this.layerChoices = []
        this.layerSelectionVisible = false
        this.linkToValidate = ''
        this.resetAuth()
      },
      confirmLayerImport () {
        if (this.layerSelection.length > 0) {
          let sourceToProcess = {
            file: {
              path: this.linkToValidate
            },
            wms: this.layerSelection[0].wms,
            wfs: this.layerSelection[0].wfs,
            credentials: this.getCredentials(),
            layers: this.layerSelection.slice()
          }
          processing.sources.push(sourceToProcess)
          setTimeout(() => {
            this.addSource(sourceToProcess)
            this.layerChoices = []
            this.layerSelectionVisible = false
            this.linkInputVisible = false
            this.linkToValidate = ''
            this.layerSelection = []
            this.resetAuth()
          }, 0)
        }
      },
      addFileClick (ev) {
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'All Files',
              extensions: ['tif', 'tiff', 'geotiff', 'gpkg', 'geopackage', 'kml', 'kmz', 'geojson', 'json']
            }
          ],
          properties: ['openFile', 'multiSelections']
        }, (files) => {
          if (files) {
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
            this.processFiles(fileInfos)
          }
        })
      },
      onDragOver (ev) {
        let items = Object.values(ev.dataTransfer.items)
        let draggingText = items.length + ' Files:'
        items.forEach((item) => {
          let kind = item.kind
          let type = item.type
          draggingText += '\n\t' + type + ' ' + kind
        })
        if (!processing.dataDragOver) {
          processing.dragging = draggingText
          processing.dataDragOver = true
        }
      },
      onDrop (ev) {
        processing.dragging = undefined
        processing.dataDragOver = false
        this.processFiles(Object.values(ev.dataTransfer.files))
      },
      onDragLeave (ev) {
        processing.dataDragOver = false
        processing.dragging = undefined
      },
      async addSource (source) {
        try {
          let createdSource = null
          if (source.wms) {
            createdSource = await SourceFactory.constructWMSSource(source.file.path, source.layers, source.credentials)
          } else if (source.wfs) {
            createdSource = await SourceFactory.constructWFSSource(source.file.path, source.layers, source.credentials)
          } else if (source.xyz) {
            createdSource = await SourceFactory.constructXYZSource(source.file.path, source.credentials)
          } else {
            createdSource = await SourceFactory.constructSource(source.file.path)
          }
          let _this = this
          createdSource.retrieveLayers().then(function (layers) {
            let promises = []
            for (const layer of layers) {
              promises.push(layer.initialize())
            }
            Promise.all(promises.map(p => p.catch((e) => console.error(e)))).then(function (initializedLayers) {
              let projectLayers = []
              initializedLayers.forEach(function (initializedLayer) {
                if (initializedLayer !== undefined && initializedLayer !== null) {
                  projectLayers.push({project: _this.project, layerId: initializedLayer.id, config: initializedLayer.configuration})
                }
              })
              _this.clearProcessing(source)
              _this.addProjectLayers({projectLayers})
            })
          })
        } catch (e) {
          source.error = e.toString()
          throw e
        }
      },
      clearProcessing (processingSource) {
        for (let i = 0; i < processing.sources.length; i++) {
          let source = processing.sources[i]
          if (source.file.path === processingSource.file.path) {
            processing.sources.splice(i, 1)
            break
          }
        }
      },
      processFiles (files) {
        files.forEach((file) => {
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
            error: undefined,
            wms: false,
            wfs: false,
            xyz: file.xyz,
            credentials: this.getCredentials()
          }
          processing.sources.push(sourceToProcess)
          setTimeout(() => {
            this.addSource(sourceToProcess)
          }, 100)
        })
      },
      getCredentials () {
        if (this.authSelection === 'basic') {
          return {
            type: 'basic',
            authorization: 'Basic ' + btoa(this.username + ':' + this.password)
          }
        } else if (this.authSelection === 'bearer') {
          return {
            type: 'bearer',
            authorization: 'Bearer ' + this.token
          }
        } else {
          return undefined
        }
      },
      processXYZUrl (url) {
        this.processFiles([{
          path: url,
          xyz: true
        }])
      },
      validateUrlSource (url) {
        let error = null
        let type = 'UNKNOWN'
        if (url.startsWith('http')) {
          if (url.toLowerCase().indexOf('{x}') > 0 && url.toLowerCase().indexOf('{y}') > 0 && url.toLowerCase().indexOf('{z}') > 0) {
            type = 'XYZ'
          } else if (url.toLowerCase().indexOf('wms') > 0) {
            const versionIdx = url.toLowerCase().indexOf('version=')
            if (versionIdx > 0) {
              let version = url.toLowerCase().substring(versionIdx + 8)
              if (version.indexOf('&') > 0) {
                version = version.substring(0, version.indexOf('&'))
              }
              if (version !== '1.1.1' && version !== '1.3.0') {
                error = 'WMS version ' + version + ' not supported. Supported versions are [1.1.1, 1.3.0].'
              }
            } else {
              error = 'WMS version not provided. Valid versions [1.1.1, 1.3.0] should be used.'
            }
            // if they provided the service, ensure it is upper case
            const serviceIdx = url.toLowerCase().indexOf('service=')
            if (serviceIdx > 0) {
              let service = url.toLowerCase().substring(serviceIdx + 8)
              if (service.indexOf('&') > 0) {
                service = service.substring(0, service.indexOf('&'))
              }
              if (service === 'wms') {
                this.linkToValidate = url.replace('service=wms', 'service=WMS')
              }
            }
            type = 'WMS'
          } else if (url.toLowerCase().indexOf('wfs') > 0) {
            const versionIdx = url.toLowerCase().indexOf('version=')
            if (versionIdx > 0) {
              let version = url.toLowerCase().substring(versionIdx + 8)
              if (version.indexOf('&') > 0) {
                version = version.substring(0, version.indexOf('&'))
              }
              if (version !== '2.0.0' && version !== '1.1.0' && version !== '1.0.0') {
                error = 'WFS version ' + version + ' not supported. Supported versions are [2.0.0, 1.1.0, 1.0.0].'
              }
            } else {
              error = 'WFS version not provided. Valid versions [2.0.0, 1.1.0, 1.0.0] should be used.'
            }
            // if they provided the service, ensure it is upper case
            const serviceIdx = url.toLowerCase().indexOf('service=')
            if (serviceIdx > 0) {
              let service = url.toLowerCase().substring(serviceIdx + 8)
              if (service.indexOf('&') > 0) {
                service = service.substring(0, service.indexOf('&'))
              }
              if (service === 'wfs') {
                this.linkToValidate = url.replace('service=wfs', 'service=WFS')
              }
            }
            type = 'WFS'
          } else {
            error = 'URL not supported. Supported URLs include WMS, WFS and XYZ tile servers.'
          }
        } else {
          error = 'URL not supported.'
        }
        return { type, error }
      }
    },
    mounted: function () {
      let fl = new FloatLabels('.link-form', {
        style: 1
      })
      console.log('fl', fl)
    },
    updated: function () {
      this.fl = new FloatLabels('.link-form', {
        style: 1
      })
    }
  }
</script>

<style scoped>

  @import '~float-labels.js/dist/float-labels.css';
  @import '~vue-multiselect/dist/vue-multiselect.min.css';

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

  .provide-auth {
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

  .text-input {
    max-width: none;
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
    cursor: pointer;
  }

  .dragover {
    background-color: rgb(68, 152, 192);
    color: rgba(255, 255, 255, .95);
  }

  .project-name {
    font-size: 1.4em;
    font-weight: bold;
    cursor: pointer;
  }

  .major-button-text {
    font-size: 1.6em;
    font-weight: bold;
  }

  .major-button-subtext {
    opacity: .65;
    font-size: 1.1em;
  }

  .major-button-detail {
    opacity: .65;
    font-size: .7em;
  }

</style>
