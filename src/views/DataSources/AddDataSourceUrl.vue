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
          <v-icon color="warning" class="pr-2">{{ mdiTrashCan }}</v-icon>
          Delete url
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete {{ urlToDelete }} from your saved urls?
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
      <v-stepper v-model="step" class="background" non-linear vertical
                 :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => dataSourceNameValid]" color="primary">
          Name the data source
          <small class="pt-1">{{ dataSourceName }}</small>
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
          <v-btn class="mb-2" text color="primary" @click="step = 2" :disabled="!dataSourceNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" :rules="[() => dataSourceUrlValid]" color="primary">
          Specify url
          <small v-if="dataSourceUrlValid && connected"
                 class="pt-1">{{ dataSourceUrl + ' (' + getServiceTypeName(selectedServiceType) + ')' }}</small>
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
                            {{ item }}
                          </v-list-item-content>
                          <v-list-item-action>
                            <v-btn icon color="warning" @click.stop.prevent="showDeleteUrlDialog(item)">
                              <v-icon>{{ mdiTrashCan }}</v-icon>
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
                  <v-btn :loading="dataSourceUrlValid && loading" v-if="!connected" color="primary"
                         :disabled="!dataSourceUrlValid || !urlIsValid || loading || (!subdomainsValid && selectedServiceType === 2)"
                         @click.stop="connect" text>
                    {{ loading ? 'Connecting...' : 'Connect' }}
                  </v-btn>
                  <span v-else style="color: #00C851;">
                    Connected
                  </span>
                </v-row>
                <h4 v-if="error && !loading" class="warning--text">
                  {{ error.statusText ? error.statusText : error }}</h4>
                <div v-if="selectedServiceType === 2 && connected">
                  <v-card-subtitle class="pl-0">
                    Specify the XYZ tile service's projection. <br><small>Note: {{ WEB_MERCATOR_DISPLAY_TEXT }} is more commonly used.</small>
                  </v-card-subtitle>
                  <v-radio-group
                      v-model="xyzProjection"
                      mandatory
                  >
                    <v-radio
                        :label=WEB_MERCATOR_DISPLAY_TEXT
                        :value=WEB_MERCATOR
                    ></v-radio>
                    <v-radio
                        :label=WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT
                        :value=WORLD_GEODETIC_SYSTEM
                    ></v-radio>
                  </v-radio-group>
                </div>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 3" :disabled="!connected">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step
            v-if="!loading && serviceInfo != null && (selectedServiceType === 1 || selectedServiceType === 3)" editable
            :complete="step > 3" step="3" color="primary" :rules="[() => serviceLayers.length > 0]">
          {{ 'Select ' + supportedServiceTypes[selectedServiceType].name + ' layers' }}
          <small v-if="selectedServiceType === 0 && serviceInfo.format === undefined" class="pt-1">No supported image
            formats</small>
          <small v-else-if="serviceLayers.length === 0" class="pt-1">No supported layers available</small>
          <small v-else class="pt-1">{{ !selectedDataSourceLayersValid() ? 'None' : selectedDataSourceLayers.length }}
            selected</small>
        </v-stepper-step>
        <v-stepper-content
            v-if="!loading && serviceInfo != null && (selectedServiceType === 1 || selectedServiceType === 3)" step="3">
          <v-card flat tile>
            <v-card-text v-if="serviceInfo">
              <h4 class="primary--text">{{ serviceInfo.title }}</h4>
              <p class="pb-0 mb-0" v-if="serviceInfo.abstract">{{ serviceInfo.abstract }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.version">
                {{ supportedServiceTypes[selectedServiceType].name + ' Version: ' + serviceInfo.version }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactName">{{ 'Contact person: ' + serviceInfo.contactName }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactOrg">
                {{ 'Contact organization:' + serviceInfo.contactOrg }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.copyright">{{ 'Copyright:' + serviceInfo.copyright }}</p>
            </v-card-text>
            <v-card flat tile v-if="!loading && serviceLayers.length > 0 && !error">
              <v-sheet>
                <v-card-subtitle v-if="selectedServiceType === 1" class="primary--text pb-0 mb-0">
                  {{ 'Layers from the WFS service to import.' }}
                </v-card-subtitle>
                <v-card-subtitle v-if="selectedServiceType === 3" class="primary--text pb-0 mb-0">
                  {{ 'Layers from the ArcGIS feature service to import.' }}
                </v-card-subtitle>
                <v-card-text v-if="serviceLayers.length > 0" class="pt-0 mt-4">
                  <v-virtual-scroll
                      class="pa-0 ma-0 detail-bg"
                      :items="serviceLayers"
                      :height="serviceLayers.length * getHeightFromServiceLayers(serviceLayers) > 1000 ? 300 : null"
                      :item-height="getHeightFromServiceLayers(serviceLayers)"
                  >
                    <template v-slot:default="{ item, i }">
                      <v-list-item-group
                          v-model="selectedDataSourceLayers"
                          multiple
                          color="primary"
                      >
                        <v-list-item
                            class="detail-bg"
                            :key="`service-layer-${i}`"
                            :value="item"
                            @click="() => {item.active = !item.active}"
                        >
                          <template v-slot:default="{ active }">
                            <v-list-item-content>
                              <div v-if="item.title">
                                <div class="list-item-title" v-html="item.title" :title="item.title"></div>
                              </div>
                              <div v-if="item.subtitles && item.subtitles.length > 0">
                                <div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles"
                                     :key="i + 'service-layer-title'" v-html="title" :title="title"></div>
                              </div>
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
                    </template>
                  </v-virtual-scroll>
                </v-card-text>
              </v-sheet>
            </v-card>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step :editable="connected" :step="summaryStep" color="primary"
                        :rules="[() => connected || step !== summaryStep]">
          Summary
          <small v-if="!connected && step === summaryStep" class="pt-1">Connection not verified.</small>
        </v-stepper-step>
        <v-stepper-content :step="summaryStep">
          <v-card flat tile>
            <v-card-text class="ma-0 pa-0"
                         v-if="!loading && (selectedServiceType === 0|| selectedServiceType === 5 ) && !error && serviceInfo">
              <h4 class="primary--text pb-0 mb-0">{{ serviceInfo.title }}</h4>
              <p class="pb-0 mb-0" v-if="serviceInfo.abstract">{{ serviceInfo.abstract }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.version">
                {{ supportedServiceTypes[selectedServiceType].name + ' Version: ' + serviceInfo.version }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactName">{{ 'Contact person: ' + serviceInfo.contactName }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactOrg">
                {{ 'Contact organization:' + serviceInfo.contactOrg }}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.copyright">{{ 'Copyright:' + serviceInfo.copyright }}</p>
              <p class="pb-0 mb-0 mt-4" v-if="selectedServiceType === 0">
                <b>{{ serviceLayers.length }}</b>{{
                  ' layer' + (serviceLayers.length > 1 ? 's' : '') + ' from the '
                }}<b>{{ serviceInfo.title }}</b>{{ ' will be imported as the ' }}<b>{{
                  dataSourceName
                }}</b>{{ ' data source.' }}
              </p>
              <p class="pb-0 mb-0 mt-4" v-if="selectedServiceType === 5">
                <b>{{ serviceLayers.length }}</b>{{
                  ' layer' + (serviceLayers.length > 1 ? 's' : '') + ' from the '
                }}<b>{{ serviceInfo.title }}</b>{{ ' will be imported as the ' }}<b>{{
                  dataSourceName
                }}</b>{{ ' data source.' }}
              </p>
            </v-card-text>
            <v-card-text class="ma-0 pa-0" v-else>
              <p v-if="!loading && selectedServiceType === 1 && !error && selectedDataSourceLayersValid()">
                <b>{{ selectedDataSourceLayers.length }}</b>
                {{
                  ' WFS layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '
                }}<b>{{ dataSourceName }}</b>{{ ' data source.' }}
              </p>
              <p v-if="!loading && selectedServiceType === 3 && !error && selectedDataSourceLayersValid()">
                <b>{{ selectedDataSourceLayers.length }}</b>
                {{
                  ' ArcGIS Feature Service layer' + (selectedDataSourceLayers.length > 1 ? 's' : '') + ' will be imported as the '
                }}<b>{{ dataSourceName }}</b>{{ ' data source.' }}
              </p>
              <p v-if="!loading && selectedServiceType === 2 && !error && connected">
                {{ 'The XYZ layer will be imported as the ' }}<b>{{ dataSourceName }}</b>{{ ' data source.' }}</p>
              <h4 v-if="error" class="warning--text">{{ error }}</h4>
              <h4 v-if="!dataSourceUrlValid || !connected || (!selectedDataSourceLayersValid() && selectedServiceType !== 2)"
                  class="warning--text">Nothing to import.</h4>
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
    </v-sheet>
    <div class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            text
            @click.stop.prevent="close">
          Cancel
        </v-btn>
        <v-btn
            :disabled="!importReady"
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
import { mapActions, mapState } from 'vuex'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import { mdiTrashCan, mdiDragHorizontalVariant } from '@mdi/js'
import {
  SERVICE_TYPE,
  DEFAULT_TIMEOUT,
  getServiceName,
  isAuthenticationError,
  isServerError,
  isTimeoutError
} from '../../lib/network/HttpUtilities'
import { testServiceConnection } from '../../lib/network/ServiceConnectionUtils'
import { environment } from '../../lib/env/env'
import Sortable from 'sortablejs'
import {
  WEB_MERCATOR,
  WEB_MERCATOR_DISPLAY_TEXT,
  WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT
} from '../../lib/projection/ProjectionConstants'

const whiteSpaceRegex = /\s/
const endsInComma = /,$/

export default {
  props: {
    sources: Object,
    project: Object,
    back: Function,
    addSource: Function
  },
  directives: {
    'sortable-list': {
      inserted: (el, binding) => {
        Sortable.create(el, binding.value ? {
          ...binding.value,
          dragClass: 'detail-bg',
          handle: '.sortHandle',
          ghostClass: 'ghost',
          forceFallback: true,
          onChoose: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onStart: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onUnchoose: function () {
            document.body.style.cursor = 'default'
          }, // Dragging started
        } : {})
      },
    },
  },
  computed: {
    ...mapState({
      urls: state => {
        return state.URLs.savedUrls || []
      }
    }),
    importReady () {
      return this.step === this.summaryStep && this.connected && this.dataSourceNameValid && this.dataSourceUrlValid && this.selectedServiceType !== -1 && !this.error && (((this.selectedServiceType < 2 || this.selectedServiceType === SERVICE_TYPE.ARCGIS_FS) && this.selectedDataSourceLayersValid()) || this.selectedServiceType === SERVICE_TYPE.XYZ || this.selectedServiceType === SERVICE_TYPE.WMS || this.selectedServiceType === SERVICE_TYPE.WMTS)
    }
  },
  data () {
    return {
      WEB_MERCATOR,
      WEB_MERCATOR_DISPLAY_TEXT,
      WORLD_GEODETIC_SYSTEM,
      WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT,
      mdiTrashCan,
      mdiDragHorizontalVariant,
      supportedImageFormats: window.mapcache.supportedImageFormats,
      step: 1,
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
      supportedServiceTypes: [{ value: SERVICE_TYPE.WMS, name: 'WMS' }, {
        value: SERVICE_TYPE.WFS,
        name: 'WFS'
      }, { value: SERVICE_TYPE.XYZ, name: 'XYZ' }, {
        value: SERVICE_TYPE.ARCGIS_FS,
        name: 'ArcGIS FS'
      }, { value: SERVICE_TYPE.OVERPASS, name: 'OVERPASS' }, { value: SERVICE_TYPE.WMTS, name: 'WMTS' }],
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
      xyzProjection: WEB_MERCATOR
    }
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
    getHeightFromServiceLayers (serviceLayers) {
      let height = 48
      let maxSubs = 0
      serviceLayers.forEach(layer => {
        height = Math.max(height, 38 + Math.ceil(layer.title.length / 3))
        if (layer.subtitles) {
          maxSubs = Math.max(maxSubs, layer.subtitles.length)
        }
      })
      return height + maxSubs * 10
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
          if (serviceType === SERVICE_TYPE.WFS || serviceType === SERVICE_TYPE.ARCGIS_FS) {
            this.summaryStep = 4
          } else {
            this.summaryStep = 3
          }
        } else {
          this.summaryStep = 3
        }
        this.connected = true
        this.serviceLayers = serviceInfo.serviceLayers || []
        this.serviceInfo = serviceInfo
        this.xyzProjection = WEB_MERCATOR
        this.withCredentials = withCredentials
      }
    },
    async addLayer () {
      if (this.selectedServiceType === SERVICE_TYPE.XYZ) {
        await this.processXYZUrl(window.mapcache.fixXYZTileServerUrlForLeaflet(this.dataSourceUrl), this.xyzProjection)
      } else {
        await this.confirmLayerImport()
      }
    },
    close () {
      this.$nextTick(() => {
        this.back()
      })
    },
    async getServiceInfo (serviceType) {
      this.connected = false
      this.loading = true
      this.serviceInfo = null
      this.serviceLayers = []
      this.sortedRenderingLayers = []
      this.error = null
      const urlToTest = this.dataSourceUrl
      const options = {}
      options.timeout = DEFAULT_TIMEOUT
      if (this.requiresSubdomains && this.subdomainsValid) {
        options.subdomains = this.subdomainText.split(',')
      }
      const { queryParams } = window.mapcache.getBaseUrlAndQueryParams(urlToTest)
      if (!isNil(queryParams.version)) {
        options.version = queryParams.version
      }

      return testServiceConnection(urlToTest, serviceType, options)
    },
    selectedDataSourceLayersValid () {
      return !isEmpty(this.selectedDataSourceLayers)
    },
    async confirmLayerImport () {
      if (this.selectedDataSourceLayersValid() || this.selectedServiceType === SERVICE_TYPE.WMS || this.selectedServiceType === SERVICE_TYPE.WMTS) {
        const id = window.mapcache.createUniqueID()
        let sourceToProcess = {
          id: id,
          directory: window.mapcache.createSourceDirectory(this.project.directory),
          url: this.dataSourceUrl,
          serviceType: this.selectedServiceType,
          name: this.dataSourceName,
          withCredentials: this.withCredentials || false
        }
        if (this.selectedServiceType === SERVICE_TYPE.WMS) {
          sourceToProcess.layers = this.serviceLayers.map(layer => {
            return {
              name: layer.name,
              extent: layer.extent,
              enabled: false,
              version: layer.version,
              srs: layer.srs,
              supportedProjections: layer.supportedProjections
            }
          })
          sourceToProcess.format = this.serviceInfo.format
        } else if (this.selectedServiceType === SERVICE_TYPE.WMTS) {
          sourceToProcess.layers = this.serviceLayers.map(layer => {
            return {
              name: layer.title,
              extent: layer.extent,
              tileMatrixSets: layer.tileMatrixSets,
              enabled: false,
              version: this.serviceInfo.wmtsInfo.serviceIdentification.version,
              resource: layer.resource
            }
          })
          sourceToProcess.wmtsInfo = this.serviceInfo.wmtsInfo
        } else if (this.selectedServiceType === SERVICE_TYPE.WFS || this.selectedServiceType === SERVICE_TYPE.ARCGIS_FS) {
          sourceToProcess.layers = this.selectedDataSourceLayers.slice()
          sourceToProcess.format = this.serviceInfo.format
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
      if (!isNil(this.$refs.dataSourceNameForm)) {
        this.$refs.dataSourceNameForm.validate()
      }
      if (!isNil(this.$refs.urlForm)) {
        this.$refs.urlForm.validate()
      }
    },
    async processXYZUrl (url, srs) {
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
        srs: srs
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
      this.addUrl({ url: url })
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
  },
  mounted () {
    this.resetURLValidation()
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
            selectedServiceType = SERVICE_TYPE.XYZ
            valid = true
          } else if (window.mapcache.isWFS(newValue)) {
            selectedServiceType = SERVICE_TYPE.WFS
            valid = true
          } else if (window.mapcache.isWMS(newValue)) {
            selectedServiceType = SERVICE_TYPE.WMS
            valid = true
          } else if (window.mapcache.isArcGISFeatureService(newValue)) {
            selectedServiceType = SERVICE_TYPE.ARCGIS_FS
            valid = true
          } else if (window.mapcache.isWMTS(newValue)) {
            selectedServiceType = SERVICE_TYPE.WMTS
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
    subdomainText: {
      handler () {
        this.connected = false
      }
    },
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
  margin-bottom: 0 !important;
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
  color: var(--v-text-base)
}

.list-item-subtitle {
  font-size: .8125rem;
  font-weight: 400;
  color: var(--v-detail-base)
}
</style>
