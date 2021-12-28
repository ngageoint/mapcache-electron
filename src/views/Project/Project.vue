<template>
  <v-layout id="project" class="project-holder ma-0 pa-0">
    <v-dialog
      v-model="closingDialog"
      persistent
      width="400">
      <v-card
        color="#426e91" dark class="pt-2">
        <v-card-text
          class="padding-top">
          {{closingMessage}}
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0">
          </v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog max-width="580" v-model="showCertificateSelectionDialog" persistent>
      <cert-auth v-if="showCertificateSelectionDialog" :certificate-request-url="certificateRequestUrl" :certificate-list="certificateList" :select-certificate="selectCertificate" :cancel-selection="cancelCertificateSelection"></cert-auth>
    </v-dialog>
    <v-dialog v-if="showSignIn" v-model="showSignIn" max-width="400" persistent>
      <basic-auth v-if="showSignIn" :event-url="requestEventUrl" :auth-info="requestAuthInfo" :details="requestDetails" :cancel="cancelSignIn" :sign-in="signIn"></basic-auth>
    </v-dialog>
    <v-dialog v-if="showConfirmation" v-model="showConfirmation" max-width="400" persistent>
      <confirmation-card v-if="showConfirmation" :id="confirmationId" :title="confirmationTitle" :icon="confirmationIcon" :message="confirmationMessage" :close="closeConfirmationDialog"></confirmation-card>
    </v-dialog>
    <v-layout class="project-container overflow-hidden ma-0 pa-0">
      <v-navigation-drawer
        color="main"
        v-model="drawer"
        expand-on-hover
        mini-variant
        permanent
        absolute
        dark
        style="z-index: 10;"
      >
        <v-list dense flat class="py-0">
          <v-list-item one-line class="px-0 pt-1 pb-1">
            <v-list-item-avatar class="ml-2">
              <img alt="MapCache icon" src="/images/64x64.png"/>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>MapCache</v-list-item-title>
              <v-list-item-subtitle>{{project.name}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item-group v-model="tabId" activeClass="list-item-active">
            <v-list-item
              class="list-item"
              v-for="(tab, i) in tabs"
              :key="i"
              :value="tab.tabId"
              :onclick="tab.onclick"
              v-ripple="{ class: `main--text` }"
            >
              <v-list-item-icon>
                <v-badge
                  v-if="tabNotification[tab.tabId]"
                  color="red"
                  dot
                  overlap
                >
                  <v-icon v-text="tab.icon"></v-icon>
                </v-badge>
                <v-icon v-else v-text="tab.icon"></v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="tab.text"></v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-navigation-drawer>
      <v-row no-gutters class="ml-14">
        <v-col class="content-panel" v-show="tabId >= 0">
          <geo-packages v-show="tabId === 0" :back="back" :project="project" :geopackages="project.geopackages" :display-feature="displayFeature"></geo-packages>
          <data-sources ref="dataSourceRef" v-show="tabId === 1" :back="back" :project="project" :sources="project.sources" :display-feature="displayFeature"></data-sources>
          <settings v-show="tabId === 2" :back="back" :project="project" :dark="darkTheme"></settings>
          <nominatim-search-results v-show="tabId === 3 && nominatimSearchResults != null" :results="nominatimSearchResults" :back="back" :project="project"></nominatim-search-results>
        </v-col>
        <v-col>
          <preview-map
            :visible="previewLayer !== null && previewLayer !== undefined && tabId === 1"
            :project="project"
            :preview-layer="previewLayer"
            :resizeListener="tabId"
            :get-map-center-and-zoom="getMapCenterAndZoom">
          </preview-map>
          <leaflet-map
            ref="map"
            :visible="previewLayer === null || previewLayer === undefined || tabId !== 1"
            :geopackages="project.geopackages"
            :sources="project.sources"
            :project-id="project.id"
            :project="project"
            :resizeListener="tabId"
            :feature-table-popped-out="featureTablePoppedOut">
          </leaflet-map>
        </v-col>
      </v-row>
    </v-layout>
    <v-snackbar
      top
      v-model="noInternet"
      color="orange"
      timeout="-1"
    >
      No internet connectivity. Check your connection.
      <template v-slot:action="{ attrs }">
        <v-btn
          text
          v-bind="attrs"
          @click="noInternet = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-layout>
</template>

<script>
import {mapGetters, mapState} from 'vuex'
import isNil from 'lodash/isNil'
import Vue from 'vue'
import EventBus from '../../lib/vue/EventBus'
import LeafletMap from '../Map/LeafletMap'
import PreviewMap from '../Map/PreviewMap'
import Settings from '../Settings/Settings'
import GeoPackages from '../GeoPackage/GeoPackages'
import DataSources from '../DataSources/DataSources'
import BasicAuth from '../Network/BasicAuth'
import CertAuth from '../Network/CertAuth'
import {mdiCogOutline, mdiLayersOutline, mdiPackageVariant, mdiMagnify} from '@mdi/js'
import {SUPPORTED_FILE_EXTENSIONS_WITH_DOT} from '../../lib/util/file/FileConstants'
import NominatimSearchResults from '../Nominatim/NominatimSearchResults'
import ConfirmationCard from '../Common/ConfirmationCard'

export default {
    data () {
      return {
        mdiPackageVariant: mdiPackageVariant,
        mdiLayersOutline: mdiLayersOutline,
        mdiCogOutline: mdiCogOutline,
        mdiMagnify: mdiMagnify,
        closingMessage: '',
        closingDialog: false,
        loading: true,
        contentShown: -1,
        titleColor: '#ffffff',
        addGeoPackageDialog: false,
        drawer: true,
        tabId: 0,
        tabs: [
          { tabId: 0, text: 'GeoPackages', icon: mdiPackageVariant },
          { tabId: 1, text: 'Data sources', icon: mdiLayersOutline },
          { tabId: 2, text: 'Settings', icon: mdiCogOutline },
        ],
        showCertificateSelectionDialog: false,
        certificateList: [],
        certificateRequestUrl: '',
        noInternet: !navigator.onLine,
        showSignIn: false,
        requestEventUrl: '',
        requestAuthInfo: {},
        requestDetails: {},
        nominatimSearchResults: null,
        showConfirmation: false,
        confirmationTitle: null,
        confirmationMessage: null,
        confirmationIcon: null,
        confirmationId: null,
        displayFeature: null
      }
    },
    computed: {
      ...mapState({
        project (state) {
          const projectId = this.$route.params.id
          let project = state.Projects[projectId]
          if (isNil(project)) {
            project = {
              id: '-1',
              name: '',
              sources: {},
              geopackages: {},
              zoomControlEnabled: true,
              displayZoomEnabled: true,
              displayAddressSearchBar: true,
              maxFeatures: 1000,
              boundingBoxFilterEditing: undefined,
              boundingBoxFilter: undefined
            }
          }
          return project
        },
        previewLayer (state) {
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          let previewLayer
          if (!isNil(project)) {
            previewLayer = project.previewLayer
          }
          return previewLayer
        },
        darkTheme (state) {
          let isDark = false
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          if (!isNil(project)) {
            isDark = project.dark
          }
          this.$vuetify.theme.dark = isDark
          return isDark
        },
        featureTablePoppedOut (state) {
          let popOut = false
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          if (!isNil(project)) {
            popOut = project.featureTablePoppedOut
          }
          return popOut
        },
        tabNotification (state) {
          let tabNotification = {}
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          if (!isNil(project)) {
            tabNotification = Object.assign({}, project.tabNotification || {0: false, 1: false, 2: false})
          }
          if (!isNil(this.tabId) && this.tabId >= 0 && tabNotification[this.tabId]) {
            tabNotification[this.tabId] = false
            window.mapcache.clearNotification({projectId: this.project.id, tabId: this.tabId})
          }
          return tabNotification
        },
        showToolTips (state) {
          let show = true
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          if (!isNil(project)) {
            show = project.showToolTips
          }
          Vue.prototype.$showToolTips = show
          return show
        }
      }),
      ...mapGetters({
        getProjectById: 'Projects/getProjectById',
        getUIStateByProjectId: 'UIState/getUIStateByProjectId'
      })
    },
    components: {
      ConfirmationCard,
      NominatimSearchResults,
      BasicAuth,
      DataSources,
      LeafletMap,
      Settings,
      GeoPackages,
      PreviewMap,
      CertAuth
    },
    methods: {
      handleSearchResults (data) {
        if (this.tabs.length === 3) {
          this.tabs.splice( 2, 0, { tabId: 3, text: 'Search', icon: mdiMagnify })
        }
        this.nominatimSearchResults = data
        this.tabId = 3
      },
      clearSearchResults () {
        if (this.tabId === 3) {
          this.tabId = 0
        }
        if (this.tabs.length === 4) {
          this.tabs.splice(2, 1)
        }
        this.nominatimSearchResults = null
      },
      getMapCenterAndZoom () {
        let bounds
        try {
          bounds = this.$refs['map'].getMapCenterAndZoom()
          // eslint-disable-next-line no-empty
        } catch (e) {}
        return bounds
      },
      saveProjectName (val) {
        window.mapcache.setProjectName({project: this.project, name: val})
      },
      back () {
        this.tabId = undefined
      },
      addGeoPackageToApp (path) {
        return new Promise(resolve => {
          const existsInApp = Object.values(this.project.geopackages).find(geopackage => geopackage.path === path)
          if (!existsInApp) {
            window.mapcache.addGeoPackage({projectId: this.project.id, filePath: path}).then(geopackageId => {
              resolve(geopackageId)
            })
          } else {
            resolve(existsInApp.id)
          }
        })
      },
      setupDragAndDrop () {
        const project = document.getElementById('project')
        project.ondragover = () => {
          return false
        }
        project.ondragleave = () => {
          return false
        }

        project.ondragend = () => {
          return false
        }
        project.ondrop = (e) => {
          e.preventDefault()
          let geopackagesToAdd = []
          let dataSourcesToAdd = []
          for (let f of e.dataTransfer.files) {
            const extension = window.mapcache.getExtensionName(f.path)
            // try to add a geopackage to the project
            if (extension === '.gpkg') {
              geopackagesToAdd.push(f.path)
            } else if (SUPPORTED_FILE_EXTENSIONS_WITH_DOT.findIndex(e => e === extension) !== -1) {
              dataSourcesToAdd.push(f.path)
            }
          }

          for (let i = 0; i < geopackagesToAdd.length; i++) {
            const path = geopackagesToAdd[i]
            this.addGeoPackageToApp(path).then(geopackageId => {
              if (geopackageId == null) {
                console.error('Failed to import GeoPackage')
                EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Failed to import GeoPackage')
              }
            })
          }
          let fileInfos = []
          for (let i = 0; i < dataSourcesToAdd.length; i++) {
            const file = dataSourcesToAdd[i]
            let fileInfo = window.mapcache.getFileInfo(file)
            fileInfo.lastModified = fileInfo.modifyTime.getTime()
            fileInfo.lastModifiedDate = fileInfo.modifyTime
            fileInfo.path = fileInfo.absolutePath
            fileInfos.push(fileInfo)
          }
          this.$refs.dataSourceRef.processFiles(fileInfos)
          return false
        }
      },
      cancelSignIn (eventUrl) {
        window.mapcache.sendClientCredentials(eventUrl, undefined)
        this.showCertificateSelectionDialog = false
        this.showSignIn = false
      },
      signIn (eventUrl, credentials) {
        window.mapcache.sendClientCredentials(eventUrl, credentials)
        this.showCertificateSelectionDialog = false
        this.showSignIn = false
      },
      cancelCertificateSelection (url) {
        window.mapcache.sendCertificateSelection(url, null)
        this.showCertificateSelectionDialog = false
      },
      selectCertificate (url, certificate) {
        window.mapcache.sendCertificateSelection(url, certificate)
        this.showCertificateSelectionDialog = false
      },
      showConfirmationDialog (id, title, message, icon) {
        this.confirmationTitle = title
        this.confirmationMessage = message
        this.confirmationIcon = icon
        this.confirmationId = id
        this.showConfirmation = true
      },
      closeConfirmationDialog () {
        this.showConfirmation = false
        this.confirmationTitle = null
        this.confirmationMessage = null
        this.confirmationIcon = null
        this.confirmationId = null
      }
    },
    watch: {
      darkTheme: {
        handler (newValue) {
          this.$vuetify.theme.dark = newValue
        }
      },
      showToolTips: {
        handler (newValue) {
          Vue.prototype.$showToolTips = newValue
        }
      },
      item: {
        handler (newValue) {
          if (!isNil(this.tabNotification[newValue]) && this.tabNotification[newValue]) {
            window.mapcache.clearNotification({projectId: this.project.id, tabId: newValue})
          }
        }
      }
    },
    mounted: function () {
      let uistate = this.getUIStateByProjectId(this.project.id)
      if (!uistate) {
        window.mapcache.addProjectState({projectId: this.project.id})
      }
      window.mapcache.setActiveGeoPackage({projectId: this.project.id, geopackageId: null})
      window.mapcache.addLoadOrDisplayGeoPackageListener(async (geopackageIds = [], filePaths = []) => {
        if (filePaths != null && filePaths.length > 0) {
          let geopackageId = null
          for (let i = 0; i < filePaths.length; i++) {
            geopackageId = await this.addGeoPackageToApp(filePaths[i])
          }
          if (filePaths.length === 1) {
            window.mapcache.setActiveGeoPackage({projectId: this.project.id, geopackageId: geopackageId})
          }
        } else {
          if (geopackageIds != null && geopackageIds.length === 1) {
            window.mapcache.setActiveGeoPackage({projectId: this.project.id, geopackageId: geopackageIds[0]})
          }
        }
        this.$nextTick(() => {
          this.tabId = 0
        })
      })
      window.mapcache.clearNotifications({projectId: this.project.id})
      window.mapcache.clearPreviewLayer({projectId: this.project.id})
      this.setupDragAndDrop()
      window.mapcache.removeClosingProjectWindowListener()
      window.mapcache.removeSelectClientCertificateListener()
      window.mapcache.removeRequestClientCredentialsListener()
      window.mapcache.addClosingProjectWindowListener((args) => {
        if (args.isDeleting) {
          this.closingMessage = 'Deleting project...'
        } else {
          this.closingMessage = 'Closing ' + this.project.name + '...'
        }
        this.closingDialog = true
      })
      window.mapcache.addSelectClientCertificateListener((args) => {
        this.certificateList = args.certificates.map((certificate, i) => {
          return {
            id: i,
            subjectName: certificate.subjectName,
            issuerName: certificate.issuerName,
            serialNumber: certificate.serialNumber,
            isSelectable: true,
            certificate: certificate
          }
        })
        this.certificateRequestUrl = args.url
        this.showCertificateSelectionDialog = true
      })
      window.mapcache.addRequestClientCredentialsListener((args) => {
        this.requestEventUrl = args.eventUrl
        this.requestAuthInfo = args.authInfo
        this.requestDetails = args.details
        this.showSignIn = true
      })
      this.onLineListener = () => this.noInternet = false
      this.offLineListener = () => this.noInternet = true
      window.addEventListener('online', this.onLineListener)
      window.addEventListener('offline', this.offLineListener)
      EventBus.$on(EventBus.EventTypes.NETWORK_ERROR, this.offLineListener)
      EventBus.$on(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, this.handleSearchResults)
      EventBus.$on(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, this.clearSearchResults)
      EventBus.$on(EventBus.EventTypes.CONFIRMATION_MESSAGE, this.showConfirmationDialog)
      EventBus.$on(EventBus.EventTypes.SHOW_FEATURE, (id, isGeoPackage, tableName, featureId) => {
        if (featureId == null) {
          this.displayFeature = null
        } else {
          this.displayFeature = {
            id, isGeoPackage, tableName, featureId
          }
          if (isGeoPackage) {
            this.tabId = 0
          } else {
            this.tabId = 1
          }
        }
      })
    },
    beforeDestroy() {
      window.removeEventListener('online', this.onLineListener)
      window.removeEventListener('offline', this.offLineListener)
      EventBus.$off([EventBus.EventTypes.NETWORK_ERROR, EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, EventBus.EventTypes.CONFIRMATION_MESSAGE, EventBus.EventTypes.SHOW_FEATURE])
      window.mapcache.removeClosingProjectWindowListener()
      window.mapcache.removeSelectClientCertificateListener()
      window.mapcache.removeRequestClientCredentialsListener()
      window.mapcache.removeLoadOrDisplayGeoPackageListener()
    }
  }
</script>

<style scoped>
  #project {
    font-family: Roboto, sans-serif;
    color: rgba(255, 255, 255, .87);
  }
  .project-holder {
    display:flex;
    flex-direction: column;
    overflow: hidden;
  }
  .project-container {
    display:flex;
    flex-direction: row;
    overflow: hidden;
    min-height: 100vh;
  }
  .content-panel {
    background-color: whitesmoke;
    max-width: 400px;
    min-height: 100vh;
    max-height: 100vh;
    /*overflow-y: auto;*/
  }
  .list-item:hover {
    background-color: var(--v-main-darken2) !important;
    color: whitesmoke;
  }
  .list-item-active {
    background-color: var(--v-main_active_background-base);
    color: var(--v-main_active_text-base) !important;
  }
  .list-item-active:hover {
    background-color: var(--v-main-base);
    color: whitesmoke !important;
  }
</style>
