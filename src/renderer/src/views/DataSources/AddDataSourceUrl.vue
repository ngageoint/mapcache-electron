<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
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
          <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
          Delete url
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete {{ urlToDelete }} from your saved urls?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click.stop.prevent="cancelDeleteUrl">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="removeUrlFromHistory">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-sheet class="mapcache-sheet-content">
      <v-card flat tile>
        <v-card-subtitle class="mt-4 pt-0">
          Give your data source a name.
        </v-card-subtitle>
        <v-card-text>
          <v-form v-on:submit.prevent="() => {}" ref="dataSourceNameForm" v-model="dataSourceNameValid">
            <v-text-field
                variant="underlined"
                autofocus
                v-model="dataSourceName"
                :rules="dataSourceNameRules"
                label=" Data source name"
                hide-details-auto
                required
            ></v-text-field>
          </v-form>
        </v-card-text>
      </v-card>

      <v-card flat tile>
        <v-card-subtitle class="mt-0 pt-0">
          Specify the data source's url.
        </v-card-subtitle>
        <v-card-text>
          <v-form v-on:submit.prevent="() => {}" ref="urlForm" v-model="dataSourceUrlValid">
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
                    <v-list-item density="compact" link @click="setUrlToLink(item)">
                      <div>
                        {{ item }}
                      </div>
                      <v-list-item-action>
                        <v-btn icon color="warning" @click.stop.prevent="showDeleteUrlDialog(item)">
                          <v-icon icon="mdi-trash-can"/>
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
              <v-form v-on:submit.prevent="() => {}" ref="subdomainRef" v-model="subdomainsValid">
                <v-text-field
                    variant="underlined"
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
                      @click.stop="connect" variant="text">
                {{ loading ? 'Connecting...' : 'Test Connection' }}
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
              <v-infinite-scroll
                  class="pa-0 ma-0 detail-bg"
                  :items="serviceLayers"
                  @load="getServiceLayers"
                  :height="serviceLayers.length * getHeightFromServiceLayers(serviceLayers) > 1000 ? 300 : null"
                  :item-height="getHeightFromServiceLayers(serviceLayers)"
                  :max-height="700"
              >
                  <template v-for="(item, i) in serviceLayers" :key="`service-layer-item-${i}`" >
                    <v-list-item
                        class="detail-bg"
                        :value="item"
                        @click="() => {item.active = !item.active}"
                    >
                      <template v-slot:default="{ active }">
                        <v-list-item-title>
                          <div v-if="item.title" >
                            <div class="list-item-title" v-text="item.title" :title="item.title"></div>
                          </div>
                          <div v-if="item.subtitles && item.subtitles.length > 0">
                            <div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles"
                                  :key="i + 'service-layer-title'" v-text="title" :title="title"></div>
                          </div>
                        </v-list-item-title>
                      </template>
                      <template v-slot:append>
                        <v-switch
                            :model-value="active"
                            hide-details
                            color="primary"
                        ></v-switch>
                      </template >
                    </v-list-item>
                </template>
                <!-- stop display of scroller -->
                <template v-slot:empty>
                  <div style="padding:2px;"></div>
                </template>
              </v-infinite-scroll>
            </v-card-text>
          </v-sheet>
        </v-card>
      </v-card>

      <v-card flat tile>
        <v-card-text class="ma-4 pa-0"
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
        <v-card-text class="ma-4 pa-0" v-else>
          <p v-if="!loading && selectedServiceType === 1 && !error && selectedDataSourceLayersValid()">
            <b>{{ selectedSourceCount }}</b>
            {{
              ' WFS layer' + (selectedSourceCount > 1 ? 's' : '') + ' will be imported as the '
            }}<b>{{ dataSourceName }}</b>{{ ' data source.' }}
          </p>
          <p v-if="!loading && selectedServiceType === 3 && !error && selectedDataSourceLayersValid()">
            <b>{{ selectedSourceCount }}</b>
            {{
              ' ArcGIS Feature Service layer' + (selectedSourceCount > 1 ? 's' : '') + ' will be imported as the '
            }}<b>{{ dataSourceName }}</b>{{ ' data source.' }}
          </p>
          <p v-if="!loading && selectedServiceType === 2 && !error && connected">
            {{ 'The XYZ layer will be imported as the ' }}<b>{{ dataSourceName }}</b>{{ ' data source.' }}</p>
          <h4 v-if="error" class="warning--text">{{ error }}</h4>
          <h4 v-if="!dataSourceUrlValid || !connected || (!selectedDataSourceLayersValid() && selectedServiceType !== 2)"
              class="warning--text">Nothing to import.</h4>
        </v-card-text>
      </v-card>
    </v-sheet>
    
    <div class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            variant="text"
            @click.stop.prevent="close">
          Cancel
        </v-btn>
        <v-btn
            :disabled="!importReady"
            color="primary"
            variant="text"
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
import {
  SERVICE_TYPE,
  DEFAULT_TIMEOUT,
  getServiceName,
  isAuthenticationError,
  isServerError,
  isTimeoutError
} from '../../../../lib/network/HttpUtilities'
import { testServiceConnection } from '../../../../lib/network/ServiceConnectionUtils'
import { environment } from '../../../../lib/env/env'
import Sortable from 'sortablejs'
import {
  WEB_MERCATOR,
  WEB_MERCATOR_DISPLAY_TEXT,
  WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT
} from '../../../../lib/projection/ProjectionConstants'

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
      return this.connected && this.dataSourceNameValid && this.dataSourceUrlValid && this.selectedServiceType !== -1 && !this.error && (((this.selectedServiceType < 2 || this.selectedServiceType === SERVICE_TYPE.ARCGIS_FS) && this.selectedDataSourceLayersValid()) || this.selectedServiceType === SERVICE_TYPE.XYZ || this.selectedServiceType === SERVICE_TYPE.WMS || this.selectedServiceType === SERVICE_TYPE.WMTS)
    }
  },
  data () {
    return {
      WEB_MERCATOR,
      WEB_MERCATOR_DISPLAY_TEXT,
      WORLD_GEODETIC_SYSTEM,
      WORLD_GEODETIC_SYSTEM_DISPLAY_TEXT,
      supportedImageFormats: window.mapcache.supportedImageFormats,
      step: 1,
      summaryStep: 3,
      urlToDelete: null,
      deleteUrlDialog: false,
      accessDeniedOrForbidden: false,
      sortedRenderingLayers: undefined,
      dataSourceNameValid: true,
      dataSourceName: "My Data Source",
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
      selectedSourceCount: 0,
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
    async getServiceLayers ({ done }) {
      setTimeout(() => {
          done('empty')
        }, 300)
    },
    getSelectedSourcesCount () {
      let activeCount = 0
      if (this.serviceLayers !== undefined || this.serviceLayers.length == 0) { 
        for (let i in this.serviceLayers) {
          let source = this.serviceLayers[i]
          if (source.active){
            activeCount++
          }
        }
      }
      this.selectedSourceCount = activeCount
      return activeCount
    },
    selectedDataSourceLayersValid () {
      return this.getSelectedSourcesCount() > 0
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
              resource: layer.resource,
              style: layer.style
            }
          })
          sourceToProcess.wmtsInfo = this.serviceInfo.wmtsInfo
        } else if (this.selectedServiceType === SERVICE_TYPE.WFS || this.selectedServiceType === SERVICE_TYPE.ARCGIS_FS) {
          sourceToProcess.layers = this.serviceLayers.slice()
          // Only send selected layers to processing
          for (let i=0; i < sourceToProcess.layers.length; ++i) {
            if (!sourceToProcess.layers[i].active) {
              sourceToProcess.layers.splice(i, 1);
              --i;
            }
          }
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
      this.selectedSourceCount = 0
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
      this.addUrl(url)
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
  background: rgb(var(--v-theme-background));
}

.list-item i {
  cursor: pointer !important;
}

.list-item-title {
  font-size: .8125rem;
  font-weight: 500;
  color: rgb(var(--v-theme-text))
}

.list-item-subtitle {
  font-size: .8125rem;
  font-weight: 400;
  color: rgb(var(--v-theme-detail))
}
</style>
