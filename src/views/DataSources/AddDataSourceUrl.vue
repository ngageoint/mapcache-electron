<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>Add Data Source from URL</v-toolbar-title>
    </v-toolbar>
    <v-dialog
      v-model="deleteUrlDialog"
      max-width="400"
      persistent
      @keydown.esc="cancelDeleteUrl">
      <v-card v-if="deleteUrlDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete URL
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete {{urlToDelete}} from your saved URLs?
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
        <v-stepper-content step="1">
          <v-card flat tile>
            <v-card-subtitle>
              Specify a name for the new data source.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="dataSourceNameForm" v-model="dataSourceNameValid">
                <v-text-field
                  autofocus
                  v-model="dataSourceName"
                  :rules="dataSourceNameRules"
                  label="Data Source Name"
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
          Specify URL
          <small class="pt-1">{{dataSourceUrl}}</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile>
            <v-card-subtitle>
              Specify the data source's URL.
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
                <h4 v-if="error && !loading" class="warning--text">{{error}}</h4>
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
              <p class="pb-0 mb-0" v-if="serviceInfo.contactName">{{'Contact Person: ' + serviceInfo.contactName}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactOrg">{{'Contact Organization:' + serviceInfo.contactOrg}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.copyright">{{'Copyright:' + serviceInfo.copyright}}</p>
            </v-card-text>
            <v-card flat tile v-if="!loading && (unsupportedServiceLayers.length + serviceLayers.length) > 0 && !error">
              <v-card-subtitle v-if="selectedServiceType === 0 && serviceInfo.format === undefined" class="warning--text pb-0 mb-4">{{'WMS server does not utilize any of the following web supported image formats: ' + supportedImageFormats.join(', ')}}</v-card-subtitle>
              <v-sheet v-else>
                <v-card-subtitle v-if="selectedServiceType === 0" class="primary--text pb-0 mb-0">{{serviceLayers.length > 0 ? 'Available EPSG:3857 supported layers from the WMS service to import.' : 'The WMS service does not have any EPSG:3857 supported layers available for import.'}}</v-card-subtitle>
                <v-card-subtitle v-if="selectedServiceType === 1" class="primary--text pb-0 mb-0">{{'Available layers from the WFS service to import.'}}</v-card-subtitle>
                <v-card-subtitle v-if="selectedServiceType === 3" class="primary--text pb-0 mb-0">{{'Available layers from the ArcGIS feature service to import.'}}</v-card-subtitle>
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
            <v-card flat tile v-if="unsupportedServiceLayers.length > 0">
              <v-card-subtitle v-if="selectedServiceType === 0" class="primary--text pb-0 mb-0">{{'Unsupported layers from the WMS service.'}}</v-card-subtitle>
              <v-card-text class="pt-0 mt-1">
                <v-list dense v-if="unsupportedServiceLayers.length > 0">
                  <v-list-item
                    v-for="(item, i) in unsupportedServiceLayers"
                    :key="`unsupported-service-layer-${i}`"
                    :value="item"
                  >
                    <v-list-item-content>
                      <div v-if="item.title"><div class="list-item-title no-clamp" v-html="item.title"></div></div>
                      <div v-if="item.subtitles.length > 0"><div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles" :key="i + '-unsupported-service-layer-title'" v-html="title"></div></div>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
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
              Drag layers in the list to specify the rendering order. Layers at the top of the list will be rendered first.
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
        <v-stepper-step editable :step="summaryStep" color="primary">
          Summary
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
              <p v-if="!loading && selectedServiceType === 2 && !error">{{'XYZ layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '}}<b>{{dataSourceName}}</b>{{' data source.'}}</p>
              <h4 v-if="error" class="warning--text">{{error}}</h4>
              <h4 v-if="!dataSourceUrlValid || (selectedDataSourceLayers.length === 0 && selectedServiceType !== 2)" class="warning--text">Nothing to import.</h4>
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
    </v-sheet>
    <div class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-switch v-model="previewing" class="pl-2" hide-details v-if="connected && dataSourceNameValid && !accessDeniedOrForbidden && !error && ((selectedServiceType === 0 && this.selectedDataSourceLayers.length > 0) || selectedServiceType === 2)" label="Preview"></v-switch>
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
  import { mapActions, mapState } from 'vuex'
  import URLUtilities from '../../lib/util/URLUtilities'
  import isNil from 'lodash/isNil'
  import difference from 'lodash/difference'
  import isEmpty from 'lodash/isEmpty'
  import UniqueIDUtilities from '../../lib/util/UniqueIDUtilities'
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import ServiceConnectionUtils from '../../lib/network/ServiceConnectionUtils'
  import XYZTileUtilities from '../../lib/util/XYZTileUtilities'
  import GeoServiceUtilities from '../../lib/util/GeoServiceUtilities'
  import ElectronUtilities from '../../lib/electron/ElectronUtilities'
  import HttpUtilities from '../../lib/network/HttpUtilities'
  import { mdiTrashCan } from '@mdi/js'
  import XYZServerLayer from '../../lib/source/layer/tile/XYZServerLayer'
  import WMSLayer from '../../lib/source/layer/tile/WMSLayer'

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
        return this.step === this.summaryStep && this.dataSourceNameValid && this.dataSourceUrlValid && this.selectedServiceType !== -1 && !this.error && (((this.selectedServiceType < 2 || this.selectedServiceType === HttpUtilities.SERVICE_TYPE.ARCGIS_FS) && this.selectedDataSourceLayers.length > 0) || this.selectedServiceType === HttpUtilities.SERVICE_TYPE.XYZ)
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
        mdiTrashCan: mdiTrashCan,
        supportedImageFormats: GeoServiceUtilities.supportedImageFormats,
        connected: false,
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
        supportedServiceTypes: [{value: HttpUtilities.SERVICE_TYPE.WMS, name: 'WMS'}, {value: HttpUtilities.SERVICE_TYPE.WFS, name: 'WFS'}, {value: HttpUtilities.SERVICE_TYPE.XYZ, name: 'XYZ'}, {value: HttpUtilities.SERVICE_TYPE.ARCGIS_FS, name: 'ArcGIS FS'}],
        selectedServiceType: HttpUtilities.SERVICE_TYPE.XYZ,
        serviceTypeAutoDetected: true,
        selectedDataSourceLayersSourceType: '',
        serviceLayers: [],
        unsupportedServiceLayers: [],
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
        subdomainsValid: true
      }
    },
    components: {
      draggable
    },
    methods: {
      ...mapActions({
        addUrl: 'URLs/addUrl',
        removeUrl: 'URLs/removeUrl'
      }),
      connect () {
        this.getServiceInfo(this.selectedServiceType)
      },
      async addLayer () {
        if (this.selectedServiceType === HttpUtilities.SERVICE_TYPE.XYZ) {
          await this.processXYZUrl(XYZTileUtilities.fixXYZTileServerUrlForLeaflet(this.dataSourceUrl))
        } else {
          await this.confirmLayerImport()
        }
      },
      close () {
        this.previewing = false
        ProjectActions.clearPreviewLayer(({projectId: this.project.id}))
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
        this.unsupportedServiceLayers = []
        this.error = null
        const options = {}
        options.timeout = HttpUtilities.DEFAULT_TIMEOUT
        if (this.requiresSubdomains && this.subdomainsValid) {
          options.subdomains = this.subdomainText.split(',')
        }
        options.allowAuth = true

        const {queryParams} = URLUtilities.getBaseUrlAndQueryParams(this.dataSourceUrl)
        if (!isNil(queryParams.version)) {
          options.version = queryParams.version
        }

        const {serviceInfo, error} = await ServiceConnectionUtils.testServiceConnection(this.dataSourceUrl, serviceType, options)

        if (!isNil(error)) {
          this.authValid = false
          if (HttpUtilities.isAuthenticationError(error)) {
            this.error = 'Access to the ' + HttpUtilities.getServiceName(serviceType) + ' service was denied. Verify your credentials and try again.'
          } else if (HttpUtilities.isServerError(error)) {
            this.error = 'Something went wrong trying to access the ' + HttpUtilities.getServiceName(serviceType) + ' service.'
          } else if (HttpUtilities.isTimeoutError(error)) {
            this.error = 'The request to the ' + HttpUtilities.getServiceName(serviceType) + ' service timed out.'
          } else {
            this.error = error
          }
        }

        if (!isNil(serviceInfo)) {
          setTimeout(() => {
            this.authValid = true
            this.accessDeniedOrForbidden = HttpUtilities.isAuthenticationError(error)
            if (!isNil(serviceInfo)) {
              if (serviceType === HttpUtilities.SERVICE_TYPE.WMS) {
                this.summaryStep = 5
              } else if (serviceType === HttpUtilities.SERVICE_TYPE.WFS || serviceType === HttpUtilities.SERVICE_TYPE.ARCGIS_FS) {
                this.summaryStep = 4
              } else {
                this.summaryStep = 3
              }
            }
            this.connected = true
            this.serviceLayers = serviceInfo.serviceLayers || []
            this.unsupportedServiceLayers = serviceInfo.unsupportedServiceLayers || []
            this.serviceInfo = serviceInfo
            this.loading = false
          }, 500)
        } else {
          this.loading = false
        }
      },
      async confirmLayerImport () {
        if (this.selectedDataSourceLayers.length > 0) {
          const id = UniqueIDUtilities.createUniqueID()
          let sourceToProcess = {
            id: id,
            directory: ElectronUtilities.createSourceDirectory(this.project.id, id),
            url: this.dataSourceUrl,
            serviceType: this.selectedServiceType,
            layers: this.selectedServiceType === HttpUtilities.SERVICE_TYPE.WFS ? this.selectedDataSourceLayers.slice() : this.sortedLayers.slice(),
            name: this.dataSourceName,
            format: this.serviceInfo.format
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
        this.dataSourceUrl = 'https://osm.gs.mil/tiles/default/{z}/{x}/{y}.png'
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
        const id = UniqueIDUtilities.createUniqueID()
        let sourceToProcess = {
          id: id,
          directory: ElectronUtilities.createSourceDirectory(this.projectId, id),
          url: url,
          serviceType: this.selectedServiceType,
          separateLayers: false,
          subdomains: this.requiresSubdomains ? this.subdomainText.split(',') : undefined,
          name: this.dataSourceName
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
          if (this.selectedServiceType === HttpUtilities.SERVICE_TYPE.WMS) {
            const layerNames = this.sortedLayers.map(layer => layer.name)
            let extent = this.sortedLayers[0].extent
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
            layer = new WMSLayer({id: UniqueIDUtilities.createUniqueID(), filePath: this.dataSourceUrl, name: 'Preview', sourceLayerName: 'Preview', layers: layerNames, extent, version: version, format: this.serviceInfo.format})
          } else if (this.selectedServiceType === HttpUtilities.SERVICE_TYPE.XYZ) {
            layer = new XYZServerLayer({id: UniqueIDUtilities.createUniqueID(), filePath: XYZTileUtilities.fixXYZTileServerUrlForLeaflet(this.dataSourceUrl), subdomains: this.subdomainText.split(','), sourceLayerName: 'Preview', visible: false})
          }
        }
        if (!isNil(layer)) {
          await layer.initialize()
          ProjectActions.setPreviewLayer({projectId: this.project.id, previewLayer: layer.configuration})
        } else {
          this.previewing = false
        }
      }
    },
    mounted () {
      this.resetURLValidation()
      this.previewing = false
      this.dataSourceUrl = 'https://osm.gs.mil/tiles/default/{z}/{x}/{y}.png'
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
          this.connected = false
          this.error = null
          this.previewing = false
          this.sortedLayers = []
          this.sortedRenderingLayers = []
          this.serviceInfo = null
          if (!isNil(newValue) && !isEmpty(newValue)) {
            let serviceTypeAutoDetected = true
            let selectedServiceType = -1
            let requiresSubdomains = false
            let valid = false
            if (URLUtilities.isXYZ(newValue)) {
              requiresSubdomains = URLUtilities.requiresSubdomains(newValue)
              selectedServiceType = 2
              valid = true
            } else if (URLUtilities.isWFS(newValue)) {
              selectedServiceType = 1
              valid = true
            } else if (URLUtilities.isWMS(newValue)) {
              selectedServiceType = 0
              valid = true
            } else if (URLUtilities.isArcGISFeatureService(newValue)) {
              selectedServiceType = 3
              valid = true
            } else {
              serviceTypeAutoDetected = false
              valid = URLUtilities.isUrlValid(newValue)
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
          } else {
            this.selectedServiceType = -1
            this.serviceTypeAutoDetected = true
            this.requiresSubdomains = false
            this.subdomainText = '1,2,3,4'
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
              ProjectActions.clearPreviewLayer(({projectId: this.project.id}))
            }
          })
        }
      },
      sortedLayers: {
        handler () {
          if (this.selectedServiceType === HttpUtilities.SERVICE_TYPE.WMS && this.connected && this.previewing) {
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
