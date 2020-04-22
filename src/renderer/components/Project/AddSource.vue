<template>
  <card class="mb-2">
    <div slot="card">
     <modal
       v-if="layerSelectionVisible"
       :header="layerSelectionSourceType + ' Layer Selection'"
       :card-text="'Select the ' + layerSelectionSourceType + ' layers for import.'"
       :ok="confirmLayerImport"
       :cancel="cancelLayerImport">
       <div slot="body">
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
       <v-container v-show="linkInputVisible">
         <v-form
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
           <v-row justify="end" align="center">
             <v-btn
                     color="light"
                     class="mr-4"
                     @click="cancelProvideLink">
               Cancel
             </v-btn>
             <v-btn
                     :disabled="!valid"
                     color="primary"
                     class="mr-4"
                     @click.stop="validateLink">
               Add URL
             </v-btn>
           </v-row>
         </v-form>
       </v-container>
     </div>
     <processing-source
             v-for="source in processing.sources"
             :source="source"
             :key="source.file.path"
             class="sources processing-source"
             @clear-processing="clearProcessing">
     </processing-source>
    </div>
  </card>
</template>

<script>
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import { mapActions } from 'vuex'
  import ProcessingSource from './ProcessingSource'
  import AddUrlDialog from './AddUrlDialog'
  import xml2js from 'xml2js'
  import Modal from '../Modal'
  import request from 'request-promise-native'
  import Card from '../Card/Card'
  import GeoServiceUtilities from '../../../lib/GeoServiceUtilities'
  import URLUtilities from '../../../lib/URLUtilities'
  import _ from 'lodash'
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'

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
  let authItems = [{text: 'No Authorization', value: 'none'}, {text: 'Basic', value: 'basic'}, {text: 'Bearer Token', value: 'bearer'}]
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
      project: Object
    },
    data () {
      return {
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
      AddUrlDialog,
      ProcessingSource,
      Modal,
      Card
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
        this.layerChoices = []
        this.layerSelectionSourceType = ''
        this.layerSelectionVisible = false
        this.linkToValidate = ''
        this.resetAuth()
      },
      confirmLayerImport () {
        if (this.layerSelection.length > 0) {
          let sourceToProcess = {
            id: UniqueIDUtilities.createUniqueID(),
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
            this.layerSelectionSourceType = ''
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
        let _this = this
        this.$electron.ipcRenderer.once('process_source_completed_' + source.id, (event, result) => {
          if (!result.error) {
            _this.clearProcessing(result.source)
            _this.addProjectLayers({projectLayers: result.projectLayers})
          }
        })
        this.$electron.ipcRenderer.send('process_source', { project: _this.project, source: source })
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

  .add-data-outer {
    background-color: rgba(255, 255, 255, 1);
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
  .major-button-subtext {
    opacity: .65;
    font-size: 1.1em;
  }

</style>
