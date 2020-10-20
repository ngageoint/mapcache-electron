<template>
  <v-sheet class="content-panel" v-if="selectedDataSource !== null && selectedDataSource !== undefined">
    <data-source
      :key="selectedDataSource.id"
      class="sources"
      :source="selectedDataSource"
      :project="project"
      :back="deselectDataSource">
    </data-source>
  </v-sheet>
  <v-sheet v-else>
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>Data Sources</v-toolbar-title>
    </v-toolbar>
    <v-dialog v-model="layerSelectionVisible" persistent max-width="400">
      <v-card>
        <v-card-title>
          {{layerSelectionSourceType + ' Layer Selection'}}
        </v-card-title>
        <v-card-text>
          {{'Select the ' + layerSelectionSourceType + ' layers for import.'}}
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="layerSelection"
                  :items="layerChoices"
                  :label="layerSelectionSourceType + ' Layers'"
                  multiple
                  return-object
                  item-text="name"
                  item-value="name"
                  hide-details
                  chips>
                </v-select>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelLayerImport">
            Cancel
          </v-btn>
          <v-btn
            v-if="layerSelection.length > 0"
            text
            color="primary"
            @click="confirmLayerImport">
            Import
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <modal
      v-if="showErrorModal"
      header="Invalid URL"
      :ok="dismissErrorModal">
      <div slot="body">
        <p style="color: #42b983">{{error}}</p>
      </div>
    </modal>
    <v-dialog v-model="urlSourceDialog" max-width="500" persistent>
      <v-card>
        <v-card-title>
          <v-icon color="primary" class="pr-2">mdi-cloud-download-outline</v-icon>
          Import URL Source
        </v-card-title>
        <v-card-text>
          <v-form
            v-on:submit.prevent
            ref="form"
            v-model="valid"
            lazy-validation>
            <v-text-field
              label="Link from web"
              clearable
              v-model="linkToValidate"
              :rules="urlRules"
              required/>
            <v-select
              v-model="authSelection"
              label="Authorization"
              :items="authItems">
            </v-select>
            <v-text-field
              v-if="authSelection === 'basic'"
              label="Username"
              clearable
              v-model="username"
              :rules="basicAuthUsernameRules"
              required/>
            <v-text-field
              v-if="authSelection === 'basic'"
              label="Password"
              clearable
              v-model="password"
              type="password"
              :rules="basicAuthPasswordRules"
              required/>
            <v-text-field
              v-if="authSelection === 'bearer'"
              label="Token"
              clearable
              v-model="token"
              :rules="tokenAuthRules"
              required/>

          <v-card-title class="pl-0 pb-0" style="font-size: 1rem;" v-if="urls.length > 0">
            Previously used
          </v-card-title>
          <v-card-text class="mt-0 pt-0" v-if="urls.length > 0">
            <v-list style="max-height: 150px" class="overflow-y-auto" dense>
              <v-list-item
                v-for="(item, i) in urls"
                :key="`saved-url-${i}`"
                :value="item.value"
                dense
                link
              >
                <v-list-item-content @click.stop="setUrlToLink(item.url)">
                  <v-list-item-title v-text="item.url"></v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon color="warning" @click.stop="removeUrlFromHistory(item.url)">
                    <v-icon>mdi-trash-can</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
          </v-card-text>
            <v-row justify="end" align="center">
              <v-btn
                text
                class="mr-4"
                @click="cancelProvideLink">
                Cancel
              </v-btn>
              <v-btn
                text
                :disabled="!valid"
                color="primary"
                class="mr-4"
                @click.stop="validateLink">
                Add URL
              </v-btn>
            </v-row>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
    <div style="margin-bottom: 80px;">
      <data-source-list :sources="sources" :projectId="project.id" :source-selected="dataSourceSelected">
      </data-source-list>
      <processing-source
        v-for="source in processing.sources"
        :source="source"
        :key="source.file.path"
        class="sources processing-source"
        @clear-processing="clearProcessing">
      </processing-source>
    </div>
    <v-card class="card-position" v-if="Object.keys(project.sources).length === 0">
      <v-row no-gutters justify="space-between" align="end">
        <v-col>
          <v-row class="pa-0" no-gutters>
            <v-col class="pa-0 align-center">
              <h5 class="align-self-center">No data sources found</h5>
            </v-col>
          </v-row>
          <v-row class="pa-0" no-gutters>
            <v-col class="pa-0 align-center">
              <h5 class="align-self-center primary--text">Get Started</h5>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
    <v-speed-dial
      class="fab-position"
      v-model="fab"
      transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-tooltip right :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              fab
              color="primary"
              v-bind="attrs"
              v-on="on">
              <v-icon>mdi-layers-plus</v-icon>
            </v-btn>
          </template>
          <span>Add data source</span>
        </v-tooltip>
      </template>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            fab
            small
            color="accent"
            @click.stop="addFileClick"
            v-bind="attrs"
            v-on="on">
            <v-icon>mdi-file-document-outline</v-icon>
          </v-btn>
        </template>
        <span>Import from file</span>
      </v-tooltip>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            fab
            small
            color="accent"
            @click.stop="displayURLModal"
            v-bind="attrs"
            v-on="on">
            <v-icon>mdi-cloud-download-outline</v-icon>
          </v-btn>
        </template>
        <span>Download from URL</span>
      </v-tooltip>
    </v-speed-dial>
  </v-sheet>
</template>

<script>
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import { mapActions, mapState } from 'vuex'
  import ProcessingSource from './ProcessingSource'
  import xml2js from 'xml2js'
  import Modal from '../Modal'
  import request from 'request-promise-native'
  import GeoServiceUtilities from '../../../lib/GeoServiceUtilities'
  import URLUtilities from '../../../lib/URLUtilities'
  import _ from 'lodash'
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'
  import DataSource from './DataSource'
  import DataSourceList from './DataSourceList'

  let processing = {
    dataDragOver: false,
    sources: [],
    dragging: undefined,
    url: undefined
  }
  let selectedDataSource = null
  let fab = false
  let urlSourceDialog = false
  let linkInputVisible = false
  let linkToValidate = ''
  let layerSelectionSourceType = ''
  let layerSelectionVisible = false
  let layerChoices = []
  let layerSelection = []
  let error = null
  let showErrorModal = false
  let authSelection = 'none'
  let username = ''
  let password = ''
  let token = ''
  let authItems = [{text: 'No Authorization', value: 'none'}, {text: 'Basic', value: 'basic'}, {
    text: 'Bearer Token',
    value: 'bearer'
  }]
  let basicAuthUsernameRules = [
    v => !!v || 'Username is required'
  ]
  let basicAuthPasswordRules = [
    v => !!v || 'Password is required'
  ]
  let tokenAuthRules = [
    v => !!v || 'Token is required'
  ]
  let urlRules = [
    v => !!v || 'URL is required',
    url => {
      let error
      if (url !== null) {
        if (url.startsWith('http')) {
          if (!URLUtilities.isXYZ(url) && !URLUtilities.isWMS(url) && !URLUtilities.isWFS(url)) {
            error = 'URL not supported. Supported URLs include WMS, WFS and XYZ tile servers.'
          }
        } else if (url.length > 0) {
          error = 'URL not supported. Supported URLs include WMS, WFS and XYZ tile servers.'
        } else {
          error = 'URL is required'
        }
      } else {
        error = 'URL is required'
      }
      return error || true
    }
  ]
  let valid = false

  export default {
    props: {
      sources: Object,
      project: Object,
      back: Function
    },
    computed: {
      ...mapState({
        urls: state => {
          return state.URLs.savedUrls || []
        }
      })
    },
    data () {
      return {
        selectedDataSource,
        fab,
        urlSourceDialog,
        processing,
        linkInputVisible,
        linkToValidate,
        layerSelectionVisible,
        layerSelectionSourceType,
        layerChoices,
        layerSelection,
        showErrorModal,
        error,
        authSelection,
        username,
        password,
        token,
        authItems,
        urlRules,
        basicAuthUsernameRules,
        basicAuthPasswordRules,
        tokenAuthRules,
        valid
      }
    },
    components: {
      ProcessingSource,
      Modal,
      DataSource,
      DataSourceList
    },
    methods: {
      ...mapActions({
        addDataSources: 'Projects/addDataSources',
        addUrl: 'URLs/addUrl',
        removeUrl: 'URLs/removeUrl'
      }),
      cancelProvideLink () {
        this.linkToValidate = ''
        this.urlSourceDialog = false
        this.resetAuth()
        this.$refs.form.resetValidation()
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
        if (this.$refs.form.validate()) {
          if (URLUtilities.isXYZ(this.linkToValidate)) {
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
          } else if (URLUtilities.isWMS(this.linkToValidate)) {
            let layers = []
            let options = {
              method: 'GET',
              uri: GeoServiceUtilities.getGetCapabilitiesURL(this.linkToValidate),
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
              layers = GeoServiceUtilities.getWMSLayersFromGetCapabilities(json)
              this.layerChoices = layers
              this.layerSelectionSourceType = 'WMS'
              this.layerSelectionVisible = true
            } catch (error) {
              this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
              this.showErrorModal = true
            }
          } else if (URLUtilities.isWFS(this.linkToValidate)) {
            let layers = []
            let options = {
              method: 'GET',
              uri: GeoServiceUtilities.getGetCapabilitiesURL(this.linkToValidate),
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
              layers = GeoServiceUtilities.getWFSLayersFromGetCapabilities(json)
              this.layerChoices = layers
              this.layerSelectionSourceType = 'WFS'
              this.layerSelectionVisible = true
            } catch (error) {
              this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
              this.showErrorModal = true
            }
          } else {
            this.error = 'URL not supported. Supported URLs include WMS, WFS and XYZ tile servers.'
            this.urlSourceDialog = false
            this.showErrorModal = true
          }
        }
      },
      resetAuth () {
        this.authSelection = 'none'
        this.password = ''
        this.username = ''
        this.token = ''
      },
      cancelLayerImport () {
        this.resetURLValidation()
      },
      confirmLayerImport () {
        if (this.layerSelection.length > 0) {
          let sourceToProcess = {
            id: UniqueIDUtilities.createUniqueID(),
            file: {
              path: this.linkToValidate
            },
            isUrl: true,
            wms: this.layerSelection[0].wms,
            wfs: this.layerSelection[0].wfs,
            credentials: this.getCredentials(),
            layers: this.layerSelection.slice()
          }
          processing.sources.push(sourceToProcess)
          setTimeout(() => {
            this.addSource(sourceToProcess)
            this.resetURLValidation()
          }, 0)
        }
      },
      addFileClick () {
        this.fab = false
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'All Files',
              extensions: ['tif', 'tiff', 'geotiff', 'kml', 'kmz', 'geojson', 'json', 'shp', 'zip']
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
      async addSource (source) {
        let _this = this
        this.$electron.ipcRenderer.once('process_source_completed_' + source.id, (event, result) => {
          if (!result.error) {
            _this.clearProcessing(result.source)
            _this.addDataSources({dataSources: result.dataSources})
          }
        })
        this.$electron.ipcRenderer.send('process_source', {project: _this.project, source: source})
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
            id: UniqueIDUtilities.createUniqueID(),
            file: {
              lastModified: file.lastModified,
              lastModifiedDate: file.lastModifiedDate,
              name: file.name,
              size: file.size,
              type: file.type,
              path: file.path
            },
            isUrl: file.xyz,
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
      resetURLValidation () {
        this.urlSourceDialog = false
        this.layerChoices = []
        this.layerSelectionSourceType = ''
        this.layerSelectionVisible = false
        this.linkInputVisible = false
        this.linkToValidate = ''
        this.layerSelection = []
        this.urlSourceDialog = false
        this.resetAuth()
        this.$refs.form.resetValidation()
        this.valid = false
      },
      processXYZUrl (url) {
        this.processFiles([{
          path: url,
          xyz: true
        }])
        this.addUrlToHistory(url)
        this.resetURLValidation()
      },
      validateWMSVersion (version) {
        let error = null
        if (!_.isNil(version)) {
          if (version !== '1.1.1' && version !== '1.3.0') {
            error = 'WMS version ' + version + ' not supported. Supported versions are [1.1.1, 1.3.0].'
          }
        } else {
          error = 'WMS version not provided. Valid versions [1.1.1, 1.3.0] should be used.'
        }
        return error
      },
      validateWFSVersion (version) {
        let error = null
        if (!_.isNil(version)) {
          if (version !== '2.0.0' && version !== '1.1.0' && version !== '1.0.0') {
            error = 'WFS version ' + version + ' not supported. Supported versions are [2.0.0, 1.1.0, 1.0.0].'
          }
        } else {
          error = 'WFS version not provided. Valid versions [2.0.0, 1.1.0, 1.0.0] should be used.'
        }
        return error
      },
      displayURLModal () {
        this.fab = false
        this.urlSourceDialog = true
      },
      dataSourceSelected (dataSourceId) {
        this.selectedDataSource = this.project.sources[dataSourceId]
      },
      deselectDataSource () {
        this.selectedDataSource = null
      },
      removeUrlFromHistory (url) {
        // Remove a URL from the Tile URL history state
        this.removeUrl(url)
      },
      addUrlToHistory (url) {
        // Save a given URL to the Tile URL history state
        this.addUrl({url: url})
      },
      setUrlToLink (url) {
        // Sets the url text box to the clicked-on url
        this.linkToValidate = url
      }
    },
    watch: {
      sources: {
        handler (newSources, oldSources) {
          if (!_.isNil(this.selectedDataSource)) {
            this.selectedDataSource = newSources[this.selectedDataSource.id]
          }
        },
        deep: true
      }
    }
  }
</script>

<style scoped>

  .provide-link-text {
    margin-top: .6em;
    font-size: .8em;
    color: rgba(54, 62, 70, .87);
  }

  .provide-link-text a {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
  }

  .card-position {
    position: absolute;
    padding: 16px;
    height: 72px;
    width: 384px;
    left: 64px;
    bottom: 8px;
  }

  .sources {
    list-style: none;
    text-align: left;
  }

  .sources li.checked {
    list-style: url('../../assets/check.png');
  }
</style>
