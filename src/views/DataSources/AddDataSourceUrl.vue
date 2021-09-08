<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>Add data source from url</v-toolbar-title>
    </v-toolbar>
    <v-dialog
      v-model="deleteUrlDialog"
      max-width="400"
      persistent
      @keydown.esc="cancelDeleteUrl">
      <v-card v-if="deleteUrlDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete url
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete {{urlToDelete}} from your saved urls?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click.stop.prevent="cancelDeleteUrl">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="removeUrlFromHistory">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-sheet class="mapcache-sheet-content">
      <v-stepper v-model="step" class="background" non-linear vertical :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => dataSourceNameValid]" color="primary">
          Name the data source
          <small class="pt-1">{{dataSourceName}}</small>
        </v-stepper-step>
        <v-stepper-content step="1" class="mt-0 pt-0">
          <v-card flat tile>
            <v-card-subtitle class="mt-0 pt-0">
              Specify a name for the new data source.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="dataSourceNameForm" v-model="dataSourceNameValid">
                <v-text-field
                  autofocus
                  v-model="dataSourceName"
                  :rules="dataSourceNameRules"
                  label="Data source name"
                  required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 2" v-if="dataSourceNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" :rules="[() => dataSourceUrlValid]" color="primary">
          Specify url
          <small v-if="dataSourceUrlValid && connected" class="pt-1">{{dataSourceUrl + ' (' + getServiceTypeName(selectedServiceType) + ')'}}</small>
        </v-stepper-step>
        <v-stepper-content step="2" class="mt-0 pt-0">
          <v-card flat tile>
            <v-card-subtitle class="mt-0 pt-0">
              Specify the data source's url.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="urlForm" v-model="dataSourceUrlValid">
                <v-row no-gutters justify="space-between">
                  <v-col>
                    <v-combobox
                      v-model="dataSourceUrl"
                      :search-input.sync="dataSourceUrl"
                      :menu-props="menuProps"
                      :rules="dataSourceUrlRules"
                      clearable
                      :items="urls.map(url => url.url)"
                      label="URL"
                    >
                      <template v-slot:no-data>
                        <v-list-item>
                          <span class="subheading">No matching urls</span>
                        </v-list-item>
                      </template>
                      <template v-slot:item="{ item }">
                        <v-list-item dense link @click="setUrlToLink(item)">
                          <v-list-item-content>
                            {{item}}
                          </v-list-item-content>
                          <v-list-item-action>
                            <v-btn icon color="warning" @click.stop.prevent="showDeleteUrlDialog(item)">
                              <v-icon>{{mdiTrashCan}}</v-icon>
                            </v-btn>
                          </v-list-item-action>
                        </v-list-item>
                      </template>
                    </v-combobox>
                  </v-col>
                </v-row>
                <div v-if="!serviceTypeAutoDetected">
                  <v-card-subtitle>
                    The service type could not be determined, please select from the available options.
                  </v-card-subtitle>
                  <v-radio-group row v-model="selectedServiceType">
                    <v-radio
                      v-for="serviceType in supportedServiceTypes"
                      :key="'service-type-' + serviceType.value"
                      :label="`${serviceType.name}`"
                      :value="serviceType.value"
                    ></v-radio>
                  </v-radio-group>
                </div>
                <div v-if="requiresSubdomains">
                  <v-card-subtitle class="pl-0">
                    This XYZ url requires subdomains.
                  </v-card-subtitle>
                  <v-form v-on:submit.prevent ref="subdomainRef" v-model="subdomainsValid">
                    <v-text-field
                      autofocus
                      v-model="subdomainText"
                      :rules="subdomainRules"
                      label="Subdomains"
                      hint="e.g. 1,2,3,4"
                      required
                    ></v-text-field>
                  </v-form>
                </div>
                <v-row no-gutters>
                  <v-spacer/>
                  <v-btn v-if="!connected" color="primary" :disabled="!dataSourceUrlValid || !urlIsValid || loading || (!subdomainsValid && selectedServiceType === 2)" @click.stop="connect" text>
                    {{loading ? 'Connecting...' : 'Connect'}}
                  </v-btn>
                  <span v-else style="color: #00C851;">
                    Connected
                  </span>
                </v-row>
                <h4 v-if="error && !loading" class="warning--text">{{error.statusText ? error.statusText : error}}</h4>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 3" v-if="dataSourceUrlValid && ((serviceInfo !== null && serviceInfo !== undefined) || accessDeniedOrForbidden)">
            Continue
          </v-btn>
          <v-progress-circular
            class="mb-2"
            v-else-if="dataSourceUrlValid && loading"
            indeterminate
            color="primary"
          ></v-progress-circular>
        </v-stepper-content>
        <v-stepper-step v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && selectedServiceType === 2" editable :complete="step > 3" step="3" color="primary">
          {{'Specify zoom levels'}}
        </v-stepper-step>
        <v-stepper-content v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && selectedServiceType === 2" step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Specify the xyz tile service's minimum and maximum zoom levels.
            </v-card-subtitle>
            <v-card-text>
              <v-container>
                <v-row no-gutters>
                  <number-picker ref="minZoom" :number="Number(minZoom)" @update-number="updateMinZoom" label="Minimum zoom" :min="Number(0)" :max="Number(20)" :step="Number(1)"/>
                </v-row>
                <v-row no-gutters>
                  <number-picker ref="maxZoom" :number="Number(maxZoom)" @update-number="updateMaxZoom" label="Maximum zoom" :min="Number(0)" :max="Number(20)" :step="Number(1)"/>
                </v-row>
              </v-container>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && selectedServiceType === 2" editable :complete="step > 4" :rules="[() => !isEditingBoundingBox() || (Number(step) === 4)]" step="4" color="primary" >
          Specify bounding box (optional)
          <small class="pt-1">{{isEditingBoundingBox() ? 'Editing bounding box' : (xyzBoundingBox ? 'Bounding box applied' : 'No bounding box')}}</small>
        </v-stepper-step>
        <v-stepper-content v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && selectedServiceType === 2" step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Restrict your xyz tile requests to a specified area of the map.
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" :project="project" :boundingBox="xyzBoundingBox" :update-bounding-box="updateXYZBoundingBox"></bounding-box-editor>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && (selectedServiceType === 0 || selectedServiceType === 1 || selectedServiceType === 3)" editable :complete="step > 3" step="3" color="primary" :rules="[() => (selectedServiceType !== 0 || (selectedServiceType === 0 && serviceInfo.format !== undefined)) && serviceLayers.length > 0]">
          {{'Select ' + supportedServiceTypes[selectedServiceType].name + ' layers'}}
          <small v-if="selectedServiceType === 0 && serviceInfo.format === undefined" class="pt-1">No supported image formats</small>
          <small v-else-if="serviceLayers.length === 0" class="pt-1">No supported layers available</small>
          <small v-else class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && (selectedServiceType === 0 || selectedServiceType === 1 || selectedServiceType === 3)" step="3">
          <v-card flat tile>
            <v-card-text v-if="serviceInfo">
              <h4 class="primary--text">{{serviceInfo.title}}</h4>
              <p class="pb-0 mb-0" v-if="serviceInfo.abstract">{{serviceInfo.abstract}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.version">{{supportedServiceTypes[selectedServiceType].name + ' Version: ' + serviceInfo.version}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactName">{{'Contact person: ' + serviceInfo.contactName}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactOrg">{{'Contact organization:' + serviceInfo.contactOrg}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.copyright">{{'Copyright:' + serviceInfo.copyright}}</p>
            </v-card-text>
            <v-card flat tile v-if="!loading && serviceLayers.length > 0 && !error">
              <v-card-subtitle v-if="selectedServiceType === 0 && serviceInfo.format === undefined" class="warning--text pb-0 mb-4">{{'WMS server does not utilize any of the following web supported image formats: ' + supportedImageFormats.join(', ')}}</v-card-subtitle>
              <v-sheet v-else>
                <v-card-subtitle v-if="selectedServiceType === 0" class="primary--text pb-0 mb-0">{{serviceLayers.length > 0 ? 'Layers from the WMS service to import.' : 'The WMS service does not have any layers.'}}</v-card-subtitle>
                <v-card-subtitle v-if="selectedServiceType === 1" class="primary--text pb-0 mb-0">{{'Layers from the WFS service to import.'}}</v-card-subtitle>
                <v-card-subtitle v-if="selectedServiceType === 3" class="primary--text pb-0 mb-0">{{'Layers from the ArcGIS feature service to import.'}}</v-card-subtitle>
                <v-card-text v-if="serviceLayers.length > 0" class="pt-0 mt-1">
                  <v-list dense>
                    <v-list-item-group
                      v-model="selectedDataSourceLayers"
                      multiple
                      color="primary"
                    >
                      <v-list-item
                        v-for="(item, i) in serviceLayers"
                        :key="`service-layer-${i}`"
                        :value="item"
                        link
                      >
                        <template v-slot:default="{ active }">
                          <v-list-item-content>
                            <div v-if="item.title"><div class="list-item-title no-clamp" v-html="item.title"></div></div>
                            <div v-if="item.subtitles.length > 0"><div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles" :key="i + 'service-layer-title'" v-html="title"></div></div>
                          </v-list-item-content>
                          <v-list-item-action>
                            <v-switch
                              :input-value="active"
                              color="primary"
                            ></v-switch>
                          </v-list-item-action>
                        </template>
                      </v-list-item>
                    </v-list-item-group>
                  </v-list>
                </v-card-text>
              </v-sheet>
            </v-card>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && selectedServiceType === 0" editable :complete="step > 4" step="4" color="primary">
          Layer rendering order
          <small class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'No layers selected' : ''}}</small>
        </v-stepper-step>
        <v-stepper-content  v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && (selectedServiceType === 0)" step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Drag layers in the list to specify the rendering order. Layers at the top of the list will be rendered on top.
            </v-card-subtitle>
            <v-card-text>
              <draggable
                v-model="sortedLayers"
                class="list-group pl-0"
                ghost-class="ghost"
                tag="ul"
                v-bind="dragOptions"
                @start="drag = true"
                @end="drag = false">
                <transition-group type="transition" :name="!drag ? 'flip-list' : null" :class="`v-list v-sheet ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'} v-list--dense`">
                  <li v-for="(item) in sortedLayers" :key="item.name + '-sorted-layer'" :class="`list-item v-list-item ${drag ? '' : 'v-item--active v-list-item--link'} ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'}`">
                    <v-list-item-content>
                      <div v-if="item.title"><div class="list-item-title no-clamp" v-html="item.title"></div></div>
                      <div v-if="item.subtitles.length > 0"><div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles" :key="i + '-sorted-layer-title'" v-html="title"></div></div>
                    </v-list-item-content>
                  </li>
                </transition-group>
              </draggable>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :step="summaryStep" color="primary" :rules="[() => connected || step !== summaryStep]">
          Summary
          <small v-if="!connected && step === summaryStep" class="pt-1">Connection not verified.</small>
        </v-stepper-step>
        <v-stepper-content :step="summaryStep">
          <v-card flat tile>
            <v-card-text>
              <p v-if="!loading && selectedServiceType === 0 && !error && selectedDataSourceLayers.length > 0">
                <b>{{selectedDataSourceLayers.length}}</b> {{' WMS layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '}}<b>{{dataSourceName}}</b>{{' data source.'}}
              </p>
              <p v-if="!loading && selectedServiceType === 1 && !error && selectedDataSourceLayers.length > 0">
                <b>{{selectedDataSourceLayers.length}}</b> {{' WFS layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '}}<b>{{dataSourceName}}</b>{{' data source.'}}
              </p>
              <p v-if="!loading && selectedServiceType === 3 && !error && selectedDataSourceLayers.length > 0">
                <b>{{selectedDataSourceLayers.length}}</b> {{' ArcGIS Feature Service layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '}}<b>{{dataSourceName}}</b>{{' data source.'}}
              </p>
              <p v-if="!loading && selectedServiceType === 2 && !error && connected">{{'XYZ layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '}}<b>{{dataSourceName}}</b>{{' data source.'}}</p>
              <h4 v-if="error" class="warning--text">{{error}}</h4>
              <h4 v-if="!dataSourceUrlValid || !connected || (selectedDataSourceLayers.length === 0 && selectedServiceType !== 2)" class="warning--text">Nothing to import.</h4>
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
    </v-sheet>
    <div class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-switch v-model="previewing" class="pl-2 mt-0" hide-details v-if="connected && dataSourceNameValid && !accessDeniedOrForbidden && !error && ((selectedServiceType === 0 && this.selectedDataSourceLayers.length > 0) || selectedServiceType === 2)" label="Preview"></v-switch>
        <v-spacer></v-spacer>
        <v-btn
          text
          @click.stop.prevent="close">
          Cancel
        </v-btn>
        <v-btn
          v-if="importReady"
          color="primary"
          text
          @click.stop.prevent="addLayer">
          Import
        </v-btn>
      </v-card-actions>
    </div>
  </v-sheet>
</template>

<script>
  import draggable from 'vuedraggable'
  import {mapActions, mapState} from 'vuex'
  import isNil from 'lodash/isNil'
  import difference from 'lodash/difference'
  import isEmpty from 'lodash/isEmpty'
  import {mdiTrashCan} from '@mdi/js'
  import WMSLayer from '../../lib/layer/tile/WMSLayer'
  import XYZServerLayer from '../../lib/layer/tile/XYZServerLayer'
  import {SERVICE_TYPE, DEFAULT_TIMEOUT, getServiceName, isAuthenticationError, isServerError, isTimeoutError} from '../../lib/network/HttpUtilities'
  import { testServiceConnection } from '../../lib/network/ServiceConnectionUtils'
  import reverse from 'lodash/reverse'
  import NumberPicker from '../Common/NumberPicker'
  import BoundingBoxEditor from '../Common/BoundingBoxEditor'
  import {environment} from '../../lib/env/env'

  const whiteSpaceRegex = /\s/
  const endsInComma = /,$/

  export default {
    props: {
      sources: Object,
      project: Object,
      back: Function,
      addSource: Function
    },
    computed: {
      ...mapState({
        urls: state => {
          return state.URLs.savedUrls || []
        }
      }),
      sortedLayers: {
        get () {
          return this.sortedRenderingLayers || this.selectedDataSourceLayers
        },
        set (val) {
          this.sortedRenderingLayers = val
        }
      },
      importReady () {
        return this.step === this.summaryStep && this.connected && this.dataSourceNameValid && !this.isEditingBoundingBox() && this.dataSourceUrlValid && this.selectedServiceType !== -1 && !this.error && (((this.selectedServiceType < 2 || this.selectedServiceType === SERVICE_TYPE.ARCGIS_FS) && this.selectedDataSourceLayers.length > 0) || this.selectedServiceType === SERVICE_TYPE.XYZ)
      },
      dragOptions () {
        return {
          animation: 200,
          group: 'layers'
        }
      }
    },
    data () {
      return {
        xyzBoundingBox: undefined,
        mdiTrashCan: mdiTrashCan,
        supportedImageFormats: window.mapcache.supportedImageFormats,
        step: 1,
        drag: false,
        summaryStep: 3,
        urlToDelete: null,
        deleteUrlDialog: false,
        accessDeniedOrForbidden: false,
        sortedRenderingLayers: undefined,
        dataSourceNameValid: true,
        dataSourceName: 'Data source',
        dataSourceNameRules: [v => !!v || 'Data source name is required'],
        dataSourceUrl: null,
        dataSourceUrlValid: true,
        dataSourceUrlRules: [v => !!v || 'URL is required'],
        supportedServiceTypes: [{value: SERVICE_TYPE.WMS, name: 'WMS'}, {value: SERVICE_TYPE.WFS, name: 'WFS'}, {value: SERVICE_TYPE.XYZ, name: 'XYZ'}, {value: SERVICE_TYPE.ARCGIS_FS, name: 'ArcGIS FS'}],
        selectedServiceType: SERVICE_TYPE.XYZ,
        serviceTypeAutoDetected: true,
        selectedDataSourceLayersSourceType: '',
        serviceLayers: [],
        selectedDataSourceLayers: [],
        error: null,
        authValid: true,
        valid: false,
        loading: false,
        serviceInfo: null,
        menuProps: {
          closeOnClick: true,
          closeOnContentClick: true
        },
        urlIsValid: false,
        previewing: false,
        subdomainText: '1,2,3,4',
        subdomainRules: [
          v => !!v || 'Subdomains are required. (valid format: 1,2,3,4)',
          v => !whiteSpaceRegex.test(v) || 'Subdomain list may not contain spaces. (valid format: 1,2,3,4)',
          v => !endsInComma.test(v) || 'Subdomain list may not end in a comma. (valid format: 1,2,3,4)'
        ],
        requiresSubdomains: false,
        subdomainsValid: true,
        withCredentials: false,
        connected: false,
        connectionId: null,
        minZoom: 0,
        maxZoom: 20
      }
    },
    components: {
      BoundingBoxEditor,
      NumberPicker,
      draggable
    },
    methods: {
      ...mapActions({
        addUrl: 'URLs/addUrl',
        removeUrl: 'URLs/removeUrl'
      }),
      cancelConnect () {
        this.connectionId = null
        this.connected = false
        this.loading = false
      },
      connect () {
        const id = window.mapcache.createUniqueID()
        this.connectionId = id
        const serviceType = this.selectedServiceType
        this.getServiceInfo(serviceType).then((result) => {
          this.$nextTick(() => {
            if (id === this.connectionId) {
              this.loading = false
              this.processServiceInfo(result.serviceInfo, result.error, result.withCredentials, serviceType)
            }
          })
        })
      },
      updateMinZoom (val) {
        if (val > this.maxZoom) {
          this.maxZoom = val
        }
        this.minZoom = val
        if (this.previewing) {
          this.sendLayerPreview()
        }
      },
      updateMaxZoom (val) {
        if (val < this.minZoom) {
          this.minZoom = val
        }
        this.maxZoom = val
        if (this.previewing) {
          this.sendLayerPreview()
        }
      },
      getServiceTypeName (serviceType) {
        return getServiceName(serviceType)
      },
      processServiceInfo (serviceInfo, error, withCredentials, serviceType) {
        if (!isNil(error)) {
          this.authValid = false
          if (isAuthenticationError(error)) {
            this.error = 'Access to the ' + getServiceName(serviceType) + ' service was denied. Verify your credentials and try again.'
          } else if (isServerError(error)) {
            this.error = 'Something went wrong trying to access the ' + getServiceName(serviceType) + ' service.'
          } else if (isTimeoutError(error)) {
            this.error = 'The request to the ' + getServiceName(serviceType) + ' service timed out.'
          } else {
            this.error = error
          }
        }

        if (!isNil(serviceInfo)) {
          this.authValid = true
          this.accessDeniedOrForbidden = isAuthenticationError(error)
          if (!isNil(serviceInfo)) {
            if (serviceType === SERVICE_TYPE.WMS || serviceType === SERVICE_TYPE.XYZ) {
              this.summaryStep = 5
            } else if (serviceType === SERVICE_TYPE.WFS || serviceType === SERVICE_TYPE.ARCGIS_FS) {
              this.summaryStep = 4
            }
          } else {
            this.summaryStep = 3
          }
          this.connected = true
          this.serviceLayers = serviceInfo.serviceLayers || []
          this.serviceInfo = serviceInfo
          this.withCredentials = withCredentials
        }
      },
      async addLayer () {
        if (this.selectedServiceType === SERVICE_TYPE.XYZ) {
          await this.processXYZUrl(window.mapcache.fixXYZTileServerUrlForLeaflet(this.dataSourceUrl))
        } else {
          await this.confirmLayerImport()
        }
      },
      close () {
        this.previewing = false
        window.mapcache.clearPreviewLayer(({projectId: this.project.id}))
        if (this.isEditingBoundingBox()) {
          this.$refs.boundingBoxEditor.stopEditing()
        }
        this.$nextTick(() => {
          this.back()
        })
      },
      async getServiceInfo (serviceType) {
        this.connected = false
        this.loading = true
        this.serviceInfo = null
        this.serviceLayers = []
        this.sortedLayers = []
        this.sortedRenderingLayers = []
        this.error = null
        const urlToTest = this.dataSourceUrl
        const options = {}
        options.timeout = DEFAULT_TIMEOUT
        if (this.requiresSubdomains && this.subdomainsValid) {
          options.subdomains = this.subdomainText.split(',')
        }
        const {queryParams} = window.mapcache.getBaseUrlAndQueryParams(urlToTest)
        if (!isNil(queryParams.version)) {
          options.version = queryParams.version
        }

        return testServiceConnection(urlToTest, serviceType, options)
      },
      async confirmLayerImport () {
        if (this.selectedDataSourceLayers.length > 0) {
          const id = window.mapcache.createUniqueID()
          let sourceToProcess = {
            id: id,
            directory: window.mapcache.createSourceDirectory(this.project.directory),
            url: this.dataSourceUrl,
            serviceType: this.selectedServiceType,
            layers: this.selectedServiceType === SERVICE_TYPE.WFS ? this.selectedDataSourceLayers.slice() : reverse(this.sortedLayers.slice()),
            name: this.dataSourceName,
            format: this.serviceInfo.format,
            withCredentials: this.withCredentials || false
          }
          this.addUrlToHistory(this.dataSourceUrl)
          this.resetURLValidation()
          this.close()
          this.$nextTick(() => {
            this.addSource(sourceToProcess)
          })
        }
      },
      resetURLValidation () {
        this.serviceLayers = []
        this.dataSourceUrl = environment.defaultBaseMaps[0].url
        this.subdomains = environment.defaultBaseMaps[0].subdomains
        this.selectedServiceType = 2
        this.selectedDataSourceLayers = []
        this.sortedLayers = []
        if (!isNil(this.$refs.dataSourceNameForm)) {
          this.$refs.dataSourceNameForm.validate()
        }
        if (!isNil(this.$refs.urlForm)) {
          this.$refs.urlForm.validate()
        }
      },
      async processXYZUrl (url) {
        const id = window.mapcache.createUniqueID()
        let sourceToProcess = {
          id: id,
          directory: window.mapcache.createSourceDirectory(this.project.directory),
          url: url,
          serviceType: this.selectedServiceType,
          separateLayers: false,
          subdomains: this.requiresSubdomains ? this.subdomainText.split(',') : undefined,
          name: this.dataSourceName,
          withCredentials: this.withCredentials,
          minZoom: this.minZoom,
          maxZoom: this.maxZoom,
          extent: this.xyzBoundingBox
        }
        this.resetURLValidation()
        this.close()
        this.$nextTick(() => {
          this.addSource(sourceToProcess)
          this.addUrlToHistory(url)
        })
      },
      removeUrlFromHistory () {
        // Remove a URL from the Tile URL history state
        this.removeUrl(this.urlToDelete)
        this.deleteUrlDialog = false
        this.$nextTick(() => {
          this.urlToDelete = null
        })
      },
      addUrlToHistory (url) {
        // Save a given URL to the Tile URL history state
        this.addUrl({url: url})
      },
      setUrlToLink (url) {
        // Sets the url text box to the clicked-on url
        this.selectedDataSourceLayers = []
        this.dataSourceUrl = url
      },
      cancelDeleteUrl () {
        this.deleteUrlDialog = false
        this.urlToDelete = null
      },
      showDeleteUrlDialog (url) {
        this.urlToDelete = url
        this.deleteUrlDialog = true
      },
      async sendLayerPreview () {
        let layer
        if (this.dataSourceNameValid && !this.accessDeniedOrForbidden && !this.error) {
          if (this.selectedServiceType === SERVICE_TYPE.WMS && this.sortedLayers.length > 0) {
            const layerNames = reverse(this.sortedLayers.map(layer => layer.name))
            let extent = this.sortedLayers[0].extent
            let srs = this.sortedLayers[0].srs
            this.sortedLayers.forEach(layer => {
              if (layer.extent[0] < extent[0]) {
                extent[0] = layer.extent[0]
              }
              if (layer.extent[1] < extent[1]) {
                extent[1] = layer.extent[1]
              }
              if (layer.extent[2] > extent[2]) {
                extent[2] = layer.extent[2]
              }
              if (layer.extent[3] > extent[3]) {
                extent[3] = layer.extent[3]
              }
            })
            const version = this.sortedLayers[0].version
            layer = new WMSLayer({id: window.mapcache.createUniqueID(), filePath: this.dataSourceUrl, name: 'Preview', sourceLayerName: 'Preview', layers: layerNames, extent, version: version, format: this.serviceInfo.format, withCredentials: this.withCredentials, srs})
          } else if (this.selectedServiceType === SERVICE_TYPE.XYZ) {
            layer = new XYZServerLayer({id: window.mapcache.createUniqueID(), filePath: window.mapcache.fixXYZTileServerUrlForLeaflet(this.dataSourceUrl), subdomains: this.subdomainText.split(','), sourceLayerName: 'Preview', visible: false, withCredentials: this.withCredentials, minZoom: this.minZoom, maxZoom: this.maxZoom, extent: this.xyzBoundingBox})
          }
        }
        if (!isNil(layer)) {
          window.mapcache.setPreviewLayer({projectId: this.project.id, previewLayer: layer.configuration})
        } else {
          this.previewing = false
        }
      },
      isEditingBoundingBox () {
        if (this.$refs.boundingBoxEditor) {
          return this.$refs.boundingBoxEditor.isEditing()
        }
        return false
      },
      updateXYZBoundingBox (boundingBox) {
        this.xyzBoundingBox = boundingBox
        if (this.previewing) {
          this.sendLayerPreview()
        }
      },
    },
    mounted () {
      this.resetURLValidation()
      this.previewing = false
      this.dataSourceUrl = environment.defaultBaseMaps[0].url
      this.urlIsValid = true
      this.$nextTick(() => {
        if (!isNil(this.$refs.dataSourceNameForm)) {
          this.$refs.dataSourceNameForm.validate()
        }
        if (!isNil(this.$refs.urlForm)) {
          this.$refs.urlForm.validate()
        }
        if (!isNil(this.$refs.authForm)) {
          this.$refs.authForm.validate()
        }
      })
    },
    watch: {
      dataSourceUrl: {
        handler (newValue) {
          this.cancelConnect()
          this.connected = false
          this.loading = false
          this.error = null
          this.previewing = false
          this.xyzBoundingBox = undefined
          this.sortedLayers = []
          this.sortedRenderingLayers = []
          this.serviceInfo = null
          this.withCredentials = false
          this.selectedServiceType = -1
          this.serviceTypeAutoDetected = true
          this.requiresSubdomains = false
          this.subdomainText = '1,2,3,4'
          this.summaryStep = 3
          if (!isNil(newValue) && !isEmpty(newValue)) {
            let serviceTypeAutoDetected = true
            let selectedServiceType = -1
            let requiresSubdomains = false
            let valid = false
            if (window.mapcache.isXYZ(newValue)) {
              requiresSubdomains = window.mapcache.requiresSubdomains(newValue)
              selectedServiceType = 2
              valid = true
            } else if (window.mapcache.isWFS(newValue)) {
              selectedServiceType = 1
              valid = true
            } else if (window.mapcache.isWMS(newValue)) {
              selectedServiceType = 0
              valid = true
            } else if (window.mapcache.isArcGISFeatureService(newValue)) {
              selectedServiceType = 3
              valid = true
            } else {
              serviceTypeAutoDetected = false
              valid = window.mapcache.isUrlValid(newValue)
            }
            this.urlIsValid = valid
            if (valid) {
              if (this.selectedServiceType !== selectedServiceType) {
                this.selectedServiceType = selectedServiceType
                this.serviceTypeAutoDetected = serviceTypeAutoDetected
                this.requiresSubdomains = requiresSubdomains
              } else {
                this.serviceTypeAutoDetected = serviceTypeAutoDetected
                this.requiresSubdomains = requiresSubdomains
              }
            }
          }
        }
      },
      subdomains: {
        handler () {
          this.connected = false
        }
      },
      selectedServiceType: {
        handler () {
          this.connected = false
          this.error = null
          this.summaryStep = 3
        }
      },
      selectedDataSourceLayers: {
        handler (newValue) {
          if (!isNil(this.sortedRenderingLayers)) {
            const sortedRenderingLayersCopy = this.sortedRenderingLayers.slice()
            const newRenderingLayers = newValue.slice()
            const namesRemoved = difference(sortedRenderingLayersCopy.map(item => item.name), newRenderingLayers.map(item => item.name))
            const namesAdded = difference(newRenderingLayers.map(item => item.name), sortedRenderingLayersCopy.map(item => item.name))
            namesRemoved.forEach(name => {
              const index = sortedRenderingLayersCopy.findIndex(item => item.name === name)
              if (index !== -1) {
                sortedRenderingLayersCopy.splice(index, 1)
              }
            })
            namesAdded.forEach(name => {
              const index = newRenderingLayers.findIndex(item => item.name === name)
              if (index !== -1) {
                sortedRenderingLayersCopy.push(newRenderingLayers[index])
              }
            })
            this.sortedLayers = sortedRenderingLayersCopy
          }
        }
      },
      subdomainText: {
        handler () {
          this.connected = false
        }
      },
      previewing: {
        handler (previewing) {
          this.$nextTick(() => {
            if (previewing) {
              this.sendLayerPreview()
            } else {
              window.mapcache.clearPreviewLayer(({projectId: this.project.id}))
            }
          })
        }
      },
      sortedLayers: {
        handler () {
          if (this.selectedServiceType === SERVICE_TYPE.WMS && this.connected && this.previewing) {
            this.sendLayerPreview()
          }
        }
      }
    }
  }
</script>

<style scoped>
  small {
    word-break: break-all;
  }
  .ghost {
    opacity: 0.5 !important;
    background-color: var(--v-primary-lighten2) !important;
  }
  .flip-list-move {
    transition: transform 0.5s;
  }
  .no-move {
    transition: transform 0s;
  }
  .v-input--reverse .v-input__slot {
    flex-direction: row-reverse;
    justify-content: flex-end;
  .v-input--selection-controls__input {
    margin-left: 0;
    margin-right: 8px;
  }
  }
  .v-input--expand .v-input__slot {
  .v-label {
    display: block;
    flex: 1;
  }
  }
  ul {
    list-style-type: none;
  }
  .no-clamp {
    -webkit-line-clamp: unset !important;
    word-wrap: normal !important;
  }
  .list-item {
    min-height: 50px;
    cursor: move !important;
    background: var(--v-background-base);
  }
  .list-item i {
    cursor: pointer !important;
  }
  .list-item-title {
    font-size: .8125rem;
    font-weight: 500;
    line-height: 1rem;
    color: var(--v-text-base)
  }
  .list-item-subtitle {
    font-size: .8125rem;
    font-weight: 400;
    line-height: 1rem;
    color: var(--v-detail-base)
  }
</style>
