<template>
  <v-sheet>
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>Add Data Source from URL</v-toolbar-title>
    </v-toolbar>
    <v-sheet>
      <v-stepper v-model="step" non-linear vertical>
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
                        <v-btn icon color="warning" @click.stop.prevent="removeUrlFromHistory(item)">
                          <v-icon>mdi-trash-can</v-icon>
                        </v-btn>
                      </v-list-item-action>
                    </v-list-item>
                  </template>
                </v-combobox>
                <h4 v-if="error && !loading" class="warning--text">{{error}}</h4>
                <div v-if="dataSourceUrlValid && !serviceTypeAutoDetected">
                  <v-card-subtitle>
                    The service type could not be determined, please select from the available options.
                  </v-card-subtitle>
                  <v-radio-group row v-model="selectedServiceType">
                    <v-radio
                      v-for="serviceType in supportedServiceTypes"
                      :key="serviceType.value"
                      :label="`${serviceType.name}`"
                      :value="serviceType.value"
                    ></v-radio>
                  </v-radio-group>
                </div>
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
        <v-stepper-step editable :complete="step > 3" step="3" :rules="[() => authValid && !accessDeniedOrForbidden]" color="primary">
          Credentials
          <small v-if="dataSourceUrlValid && accessDeniedOrForbidden" class="pt-1 warning--text">access denied or forbidden</small>
          <small v-else-if="dataSourceUrlValid && !loading && (serviceInfo !== null && serviceInfo !== undefined)" class="pt-1 success--text">access granted</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Provide credentials if your data source requires user authentication.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="authForm" v-model="authValid">
                <v-select
                  v-model="authSelection"
                  label="Authentication Type"
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
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 4" v-if="authValid && (serviceInfo !== null && serviceInfo !== undefined)">
            Continue
          </v-btn>
          <v-progress-circular
            class="mb-2"
            v-else-if="authValid && loading"
            indeterminate
            color="primary"
          ></v-progress-circular>
        </v-stepper-content>
        <v-stepper-step v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && (selectedServiceType === 0 || selectedServiceType === 1)" editable :complete="step > 4" step="4" color="primary">
          {{'Select ' + (selectedServiceType === 0 ? 'WMS' : 'WFS') + ' layers'}}
          <small class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && (selectedServiceType === 0 || selectedServiceType === 1)" step="4">
          <v-card flat tile v-if="selectedServiceType <= 1">
            <v-card-text v-if="serviceInfo">
              <h4 class="primary--text">{{serviceInfo.title}}</h4>
              <p class="pb-0 mb-0" v-if="serviceInfo.abstract">{{serviceInfo.abstract}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.version">{{supportedServiceTypes[selectedServiceType].name + ' Version: ' + serviceInfo.version}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactName">{{'Contact Person: ' + serviceInfo.contactName}}</p>
              <p class="pb-0 mb-0" v-if="serviceInfo.contactOrg">{{'Contact Organization:' + serviceInfo.contactOrg}}</p>
            </v-card-text>
            <v-card flat tile v-if="!loading && serviceLayers.length > 0 && !error">
              <v-card-subtitle v-if="selectedServiceType === 0" class="primary--text pb-0 mb-0">{{serviceLayers.length > 0 ? 'Available EPSG:3857 layers from the WMS service to import.' : 'The WMS service does not have any EPSG:3857 layers available for import.'}}</v-card-subtitle>
              <v-card-subtitle v-if="selectedServiceType === 1" class="primary--text pb-0 mb-0">{{'Available layers from the WFS service to import.'}}</v-card-subtitle>
              <v-card-text v-if="serviceLayers.length > 0" class="pt-0 mt-1">
                <v-list dense>
                  <v-list-item-group
                    v-model="selectedDataSourceLayers"
                    multiple
                    color="primary"
                  >
                    <v-list-item
                      v-for="(item, i) in serviceLayers"
                      :key="`item-${i}`"
                      :value="item"
                      link
                    >
                      <template v-slot:default="{ active }">
                        <v-list-item-content>
                          <div v-if="item.title"><div class="list-item-title no-clamp" v-html="item.title"></div></div>
                          <div v-if="item.subtitles.length > 0"><div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles" :key="i + '_title'" v-html="title"></div></div>
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
            </v-card>
            <v-card flat tile v-if="unsupportedServiceLayers.length > 0">
              <v-card-subtitle v-if="selectedServiceType === 0" class="primary--text pb-0 mb-0">{{'Unsupported layers from the WMS service.'}}</v-card-subtitle>
              <v-card-text class="pt-0 mt-1">
                <v-list dense v-if="unsupportedServiceLayers.length > 0">
                  <v-list-item
                    v-for="(item, i) in unsupportedServiceLayers"
                    :key="`item-${i}`"
                    :value="item"
                  >
                    <v-list-item-content>
                      <div v-if="item.title"><div class="list-item-title no-clamp" v-html="item.title"></div></div>
                      <div v-if="item.subtitles.length > 0"><div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles" :key="i + '_title'" v-html="title"></div></div>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && selectedServiceType === 0" editable :complete="step > 5" step="5" color="primary">
          Layer rendering order
          <small class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'No layers selected' : ''}}</small>
        </v-stepper-step>
        <v-stepper-content  v-if="!loading && (serviceInfo !== null && serviceInfo !== undefined) && (selectedServiceType === 0)" step="5">
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
                  <li v-for="(item) in sortedLayers" :key="item.name" :class="`list-item v-list-item ${drag ? '' : 'v-item--active v-list-item--link'} ${$vuetify.theme.dark ? 'theme--dark' : 'theme--light'}`">
                    <v-list-item-content>
                      <div v-if="item.title"><div class="list-item-title no-clamp" v-html="item.title"></div></div>
                      <div v-if="item.subtitles.length > 0"><div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles" :key="i + '_title'" v-html="title"></div></div>
                    </v-list-item-content>
                  </li>
                </transition-group>
              </draggable>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 6">
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
        <v-spacer></v-spacer>
        <v-btn
          text
          @click.stop.prevent="back">
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
  import Vue from 'vue'
  import draggable from 'vuedraggable'
  import axios from 'axios'
  import { mapActions, mapState } from 'vuex'
  import GeoServiceUtilities from '../../lib/GeoServiceUtilities'
  import URLUtilities from '../../lib/URLUtilities'
  import _ from 'lodash'
  import UniqueIDUtilities from '../../lib/UniqueIDUtilities'

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
        return this.step === this.summaryStep && this.dataSourceNameValid && this.dataSourceUrlValid && this.selectedServiceType !== -1 && !this.error && ((this.selectedServiceType < 2 && this.selectedDataSourceLayers.length > 0) || this.selectedServiceType === 2)
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
        step: 1,
        drag: false,
        summaryStep: 4,
        accessDeniedOrForbidden: false,
        sortedRenderingLayers: undefined,
        dataSourceNameValid: true,
        dataSourceName: 'Data source',
        dataSourceNameRules: [v => !!v || 'Data source name is required'],
        dataSourceUrl: 'https://osm.gs.mil/tiles/default/{z}/{x}/{y}.png',
        dataSourceUrlValid: true,
        dataSourceUrlRules: [v => !!v || 'URL is required'],
        supportedServiceTypes: [{value: 0, name: 'WMS'}, {value: 1, name: 'WFS'}, {value: 2, name: 'XYZ'}],
        selectedServiceType: 2,
        serviceTypeAutoDetected: true,
        selectedDataSourceLayersSourceType: '',
        serviceLayers: [],
        unsupportedServiceLayers: [],
        selectedDataSourceLayers: [],
        error: null,
        authValid: true,
        authSelection: 'none',
        username: '',
        password: '',
        token: '',
        authItems: [{text: 'None', value: 'none'}, {text: 'Basic', value: 'basic'}, {
          text: 'Bearer Token',
          value: 'bearer'
        }],
        basicAuthUsernameRules: [v => !!v || 'Username is required'],
        basicAuthPasswordRules: [v => !!v || 'Password is required'],
        tokenAuthRules: [v => !!v || 'Token is required'],
        valid: false,
        loading: false,
        serviceInfo: null,
        debounceGetServiceInfo: _.debounce(this.getServiceInfo, 500),
        menuProps: {
          closeOnClick: true,
          closeOnContentClick: true
        }
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
      addLayer () {
        if (this.selectedServiceType === 2) {
          this.processXYZUrl(this.dataSourceUrl)
        } else {
          this.confirmLayerImport()
        }
      },
      async getServiceInfo (serviceType) {
        this.loading = true
        this.serviceInfo = null
        this.serviceLayers = []
        this.sortedLayers = []
        this.sortedRenderingLayers = []
        this.unsupportedServiceLayers = []
        this.error = null
        let accessDeniedOrForbidden = false
        let serviceInfo = null
        try {
          let headers = {}
          let credentials = this.getCredentials()
          if (credentials && (credentials.type === 'basic' || credentials.type === 'bearer')) {
            headers['Authorization'] = credentials.authorization
          }
          if (!_.isNil(this.dataSourceUrl) && !_.isEmpty(this.dataSourceUrl) && !_.isNil(serviceType) && serviceType !== -1) {
            if (serviceType === 2) {
              try {
                await axios({
                  method: 'get',
                  url: this.dataSourceUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'),
                  headers: headers
                })
                serviceInfo = {}
              } catch (e) {
                if (e.response.status === 401 || e.response.status === 403) {
                  accessDeniedOrForbidden = true
                  this.error = 'Access to XYZ service is denied. Check your credentials'
                } else {
                  this.error = 'XYZ service not found.'
                }
              }
            } else if (serviceType === 0) {
              const supportedWMSVersions = ['1.3.0', '1.1.1']
              let result = null
              let errStatusCodes = []
              let version
              for (let i = 0; i < supportedWMSVersions.length; i++) {
                version = supportedWMSVersions[i]
                try {
                  const response = await axios({
                    method: 'get',
                    url: GeoServiceUtilities.getGetCapabilitiesURL(this.dataSourceUrl, version, 'WMS'),
                    headers: headers
                  })
                  result = await URLUtilities.parseXMLString(response.data)
                  break
                } catch (e) {
                  if (e.response) {
                    errStatusCodes.push(e.response.status)
                  }
                }
              }
              if (!_.isNil(result)) {
                try {
                  let wmsInfo = GeoServiceUtilities.getWMSInfo(result)
                  serviceInfo = {
                    title: wmsInfo.title || 'WMS Service',
                    abstract: wmsInfo.abstract,
                    version: version,
                    contactName: wmsInfo.contactName,
                    contactOrg: wmsInfo.contactOrg
                  }
                  this.serviceLayers = wmsInfo.layers
                  this.unsupportedServiceLayers = wmsInfo.unsupportedLayers
                } catch (error) {
                  this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
                }
              } else {
                // they all failed due to an access restriction
                if (errStatusCodes.length > 0 && errStatusCodes.findIndex(code => code !== 403 && code !== 401) === -1) {
                  accessDeniedOrForbidden = true
                  this.error = 'Access to WMS denied. Check your credentials.'
                } else {
                  this.error = 'WMS service not found.'
                }
              }
            } else if (serviceType === 1) {
              const supportedWFSVersions = ['2.0.0', '1.1.0', '1.0.0']
              let version
              let result = null
              let errStatusCodes = []
              for (let i = 0; i < supportedWFSVersions.length; i++) {
                version = supportedWFSVersions[i]
                try {
                  const response = await axios({
                    method: 'get',
                    url: GeoServiceUtilities.getGetCapabilitiesURL(this.dataSourceUrl, version, 'WFS'),
                    headers: headers
                  })
                  result = await URLUtilities.parseXMLString(response.data)
                  break
                } catch (e) {
                  if (e.response) {
                    errStatusCodes.push(e.response.status)
                  }
                }
              }
              if (!_.isNil(result)) {
                try {
                  let wfsInfo = GeoServiceUtilities.getWFSInfo(result)
                  serviceInfo = {
                    title: wfsInfo.title || 'WFS Service',
                    abstract: wfsInfo.abstract,
                    version: version,
                    contactName: wfsInfo.contactName,
                    contactOrg: wfsInfo.contactOrg
                  }
                  this.serviceLayers = wfsInfo.layers
                } catch (error) {
                  this.error = 'Something went wrong. Please verify the URL and credentials are correct.'
                }
              } else {
                // they all failed due to an access restriction
                if (errStatusCodes.length > 0 && errStatusCodes.findIndex(code => code !== 403 && code !== 401) === -1) {
                  accessDeniedOrForbidden = true
                  this.error = 'Access to WFS denied. Check your credentials.'
                } else {
                  this.error = 'WFS service not found.'
                }
              }
            } else {
              this.error = 'URL not supported. Supported URLs include WMS, WFS and XYZ tile servers.'
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e)
        }
        setTimeout(() => {
          this.accessDeniedOrForbidden = accessDeniedOrForbidden
          if (!_.isNil(serviceInfo)) {
            if (serviceType === 0) {
              this.summaryStep = 6
            } else if (serviceType === 1) {
              this.summaryStep = 5
            } else {
              this.summaryStep = 4
            }
          }
          this.serviceInfo = serviceInfo
          this.loading = false
        }, 500)
      },
      resetAuth () {
        this.authSelection = 'none'
        this.password = ''
        this.username = ''
        this.token = ''
      },
      confirmLayerImport () {
        if (this.selectedDataSourceLayers.length > 0) {
          let sourceToProcess = {
            id: UniqueIDUtilities.createUniqueID(),
            url: this.dataSourceUrl,
            serviceType: this.selectedServiceType,
            credentials: this.getCredentials(),
            layers: this.selectedServiceType === 1 ? this.selectedDataSourceLayers.slice() : this.sortedLayers.slice(),
            name: this.dataSourceName
          }
          setTimeout(() => {
            this.addUrlToHistory(this.dataSourceUrl)
            this.resetURLValidation()
            this.back()
            setTimeout(() => {
              this.addSource(sourceToProcess)
            }, 100)
          }, 0)
        }
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
        this.serviceLayers = []
        this.dataSourceUrl = 'https://osm.gs.mil/tiles/default/{z}/{x}/{y}.png'
        this.selectedServiceType = 2
        this.selectedDataSourceLayers = []
        this.sortedLayers = []
        this.resetAuth()
        if (!_.isNil(this.$refs.dataSourceNameForm)) {
          this.$refs.dataSourceNameForm.validate()
        }
        if (!_.isNil(this.$refs.urlForm)) {
          this.$refs.urlForm.validate()
        }
        if (!_.isNil(this.$refs.authForm)) {
          this.$refs.authForm.validate()
        }
      },
      processXYZUrl (url) {
        let sourceToProcess = {
          id: UniqueIDUtilities.createUniqueID(),
          url: url,
          serviceType: this.selectedServiceType,
          separateLayers: false,
          credentials: this.getCredentials(),
          name: this.dataSourceName
        }
        setTimeout(() => {
          this.addUrlToHistory(url)
          this.resetURLValidation()
          this.back()
          setTimeout(() => {
            this.addSource(sourceToProcess)
          }, 100)
        }, 100)
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
        this.selectedDataSourceLayers = []
        this.resetAuth()
        this.dataSourceUrl = url
      }
    },
    mounted () {
      this.resetURLValidation()
      Vue.nextTick(() => {
        if (!_.isNil(this.$refs.dataSourceNameForm)) {
          this.$refs.dataSourceNameForm.validate()
        }
        if (!_.isNil(this.$refs.urlForm)) {
          this.$refs.urlForm.validate()
        }
        if (!_.isNil(this.$refs.authForm)) {
          this.$refs.authForm.validate()
        }
      })
    },
    watch: {
      dataSourceUrl: {
        handler (newValue) {
          if (!_.isNil(newValue) && !_.isEmpty(newValue)) {
            let serviceTypeAutoDetected = true
            let selectedServiceType = -1
            if (URLUtilities.isXYZ(newValue)) {
              selectedServiceType = 2
            } else if (URLUtilities.isWFS(newValue)) {
              selectedServiceType = 1
            } else if (URLUtilities.isWMS(newValue)) {
              selectedServiceType = 0
            } else {
              serviceTypeAutoDetected = false
            }
            this.loading = true
            if (this.selectedServiceType !== selectedServiceType) {
              this.selectedServiceType = selectedServiceType
              this.serviceTypeAutoDetected = serviceTypeAutoDetected
            } else {
              this.debounceGetServiceInfo(this.selectedServiceType)
            }
          } else {
            this.resetAuth()
            this.sortedLayers = []
            this.sortedRenderingLayers = []
            this.selectedServiceType = -1
            this.serviceTypeAutoDetected = true
          }
        }
      },
      selectedServiceType: {
        handler (newValue) {
          this.loading = true
          this.summaryStep = 4
          Vue.nextTick(() => {
            this.debounceGetServiceInfo(newValue)
          })
        }
      },
      username: {
        handler (newValue) {
          if (this.authSelection === 'basic' && !_.isNil(newValue) && !_.isNil(this.password) && this.password.length > 0) {
            this.debounceGetServiceInfo(this.selectedServiceType)
          }
        }
      },
      password: {
        handler (newValue) {
          if (this.authSelection === 'basic' && !_.isNil(newValue) && !_.isNil(this.username) && this.username.length > 0) {
            this.debounceGetServiceInfo(this.selectedServiceType)
          }
        }
      },
      token: {
        handler (newValue) {
          if (this.authSelection === 'bearer' && !_.isNil(newValue) && newValue.length > 0) {
            this.debounceGetServiceInfo(this.selectedServiceType)
          }
        }
      },
      authSelection: {
        handler (newValue) {
          if (newValue === 'none') {
            this.resetAuth()
          }
        }
      },
      selectedDataSourceLayers: {
        handler (newValue) {
          if (!_.isNil(this.sortedRenderingLayers)) {
            const sortedRenderingLayersCopy = this.sortedRenderingLayers.slice()
            const newRenderingLayers = newValue.slice()
            const namesRemoved = _.difference(sortedRenderingLayersCopy.map(item => item.name), newRenderingLayers.map(item => item.name))
            const namesAdded = _.difference(newRenderingLayers.map(item => item.name), sortedRenderingLayersCopy.map(item => item.name))
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
      }
    }
  }
</script>

<style scoped>
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
  }
  .list-item-subtitle {
    font-size: .8125rem;
    font-weight: 500;
    line-height: 1rem;
    color: rgba(0,0,0,.6);
  }
</style>
