<template>
  <v-layout id="project" class="project-holder ma-0 pa-0">
    <web-view-dialog :key="authKey" v-if="authUrl != null" :width="600" :url="authUrl" :cancel="cancelAuthRequest"></web-view-dialog>
    <v-dialog v-model="closingDialog" persistent width="400">
      <v-card color="primary" class="pt-2 pb-4">
        <v-card-text class="pt-2 text-theme-dark-background">
          {{ closingMessage }}
          <v-progress-linear class="mt-2 text-theme-dark-background" indeterminate>
          </v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog max-width="580" v-model="showCertificateSelectionDialog" persistent>
      <cert-auth v-if="showCertificateSelectionDialog" :certificate-request-url="certificateRequestUrl" :certificate-list="certificateList" :select-certificate="selectCertificate" :cancel-selection="cancelCertificateSelection"/>
    </v-dialog>
    <v-dialog v-if="showSignIn" v-model="showSignIn" max-width="400" persistent>
      <basic-auth v-if="showSignIn" :event-url="requestEventUrl" :auth-info="requestAuthInfo" :details="requestDetails" :cancel="cancelSignIn" :sign-in="signIn"/>
    </v-dialog>
    <v-dialog v-if="showConfirmation" v-model="showConfirmation" max-width="400" persistent>
      <confirmation-card v-if="showConfirmation" :id="confirmationId" :title="confirmationTitle" :icon="confirmationIcon" :message="confirmationMessage" :close="closeConfirmationDialog"/>
    </v-dialog>
    <v-layout class="project-container overflow-hidden ma-0 pa-0">
      <v-navigation-drawer permanent color="main" v-model="drawer" rail expand-on-hover style="z-index: 10;">
        <v-list>
          <v-list-item prepend-avatar="/images/64x64.png" title="MapCache" :subtitle="project.name" class="pl-2">
            <template v-slot:prepend>
              <v-avatar size="42">
                <v-img src="/images/64x64.png"/>
              </v-avatar>
            </template>
          </v-list-item>
        </v-list>
        <v-list density="compact" nav>
          <v-list-item v-for="(tab, i) in tabs" :key="i" :value="tab.tabId" :onclick="() => tab.onClick(i)" :title="tab.text" :active="tabId === tab.tabId">
            <template v-slot:prepend>
              <v-badge v-if="tabNotification[tab.tabId]" color="red" dot overlap>
                <v-icon :icon="tab.icon"></v-icon>
              </v-badge>
              <v-icon v-else :icon="tab.icon"></v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
      <v-row no-gutters class="ml-14">
        <v-col class="content-panel" v-show="tabId != null">
          <geo-packages v-show="tabId === 0" :back="back" :project="project" :geopackages="project.geopackages" :display-feature="displayFeature" :allow-notifications="allowNotifications" :dark="dark"/>
          <data-sources  v-show="tabId === 1" ref="dataSourceRef" :back="back" :project="project" :sources="project.sources" :display-feature="displayFeature" :allow-notifications="allowNotifications" :dark="dark"/>
          <settings v-show="tabId === 2" :back="back" :project="project" :allow-notifications="allowNotifications" :dark="dark"/>
          <nominatim-search-results v-show="tabId === 3 && nominatimSearchResults != null" :results="nominatimSearchResults" :back="back" :project="project" :dark="dark"/>
        </v-col>
        <v-col>
          <leaflet-map ref="map" visible :geopackages="project.geopackages" :sources="project.sources" :project-id="project.id" :project="project" :resizeListener="tabId" :feature-table-popped-out="featureTablePoppedOut" :dark="dark"/>
        </v-col>
      </v-row>
    </v-layout>
    <v-snackbar
        top
        style="margin-left: 56px;"
        v-model="noInternet"
        color="orange"
        timeout="-1"
    >
      No internet connectivity. Check your connection.
      <template v-slot:actions>
        <v-btn variant="text" @click="noInternet = false">Close</v-btn>
      </template>
    </v-snackbar>
    <v-snackbar
        v-if="showAlertMessage"
        v-model="showAlertMessage"
        timeout="1500"
        bottom
        style="margin-left: 56px;"
    >
      {{ alertMessage }}
      <template v-slot:actions>
        <v-btn :color="alertColor" variant="text" @click="showAlertMessage = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-layout>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { useTheme } from 'vuetify'
import isNil from 'lodash/isNil'
import EventBus from '../../lib/vue/EventBus'
import LeafletMap from '../Map/LeafletMap.vue'
import Settings from '../Settings/Settings.vue'
import GeoPackages from '../GeoPackage/GeoPackages.vue'
import DataSources from '../DataSources/DataSources.vue'
import BasicAuth from '../Network/BasicAuth.vue'
import CertAuth from '../Network/CertAuth.vue'
import { SUPPORTED_FILE_EXTENSIONS_WITH_DOT } from '../../lib/util/file/FileConstants'
import NominatimSearchResults from '../Nominatim/NominatimSearchResults.vue'
import ConfirmationCard from '../Common/ConfirmationCard.vue'
import WebViewDialog from '../Common/WebViewDialog.vue'
import { addGeoPackage } from '../../lib/vue/vuex/CommonActions'
import {
  addProjectState,
  clearNotification,
  clearNotifications,
  setActiveGeoPackage,
  setProjectName
} from '../../lib/vue/vuex/ProjectActions'

export default {
  setup () {
    const theme = useTheme()

    return {
      theme,
      setTheme: (isDark) => theme.global.name.value = isDark ? 'dark' : 'light'
    }
  },
  data () {
    return {
      authUrl: null,
      authKey: 0,
      closingMessage: '',
      closingDialog: false,
      loading: true,
      contentShown: -1,
      titleColor: '#ffffff',
      addGeoPackageDialog: false,
      drawer: true,
      tabId: 0,
      tabs: [
        { tabId: 0, text: 'GeoPackages', icon: 'mdi-package-variant', onClick: (i) => this.tabId = i },
        { tabId: 1, text: 'Data sources', icon: 'mdi-layers-outline', onClick: (i) => this.tabId = i } ,
        { tabId: 2, text: 'Settings', icon: 'mdi-cog-outline', onClick: (i) => this.tabId = i },
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
      displayFeature: null,
      showAlertMessage: false,
      alertMessage: '',
      alertColor: 'warning',
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
      dark (state) {
        let isDark = false
        const projectId = this.$route.params.id
        let project = state.UIState[projectId]
        if (!isNil(project)) {
          isDark = project.dark
        }
        this.setTheme(isDark)
        return isDark
      },
      allowNotifications (state) {
        const projectId = this.$route.params.id
        let project = state.UIState[projectId]
        let allowNotifications = false
        if (!isNil(project)) {
          allowNotifications = project.allowNotifications
        }
        return allowNotifications
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
          tabNotification = Object.assign({}, project.tabNotification || { 0: false, 1: false, 2: false })
        }
        if (!isNil(this.tabId) && this.tabId >= 0 && tabNotification[this.tabId]) {
          tabNotification[this.tabId] = false
          clearNotification(this.project.id, this.tabId)
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
        this.$showToolTips = show
        return show
      }
    }),
    ...mapGetters({
      getProjectById: 'Projects/getProjectById',
      getUIStateByProjectId: 'UIState/getUIStateByProjectId'
    })
  },
  components: {
    WebViewDialog,
    ConfirmationCard,
    NominatimSearchResults,
    BasicAuth,
    DataSources,
    LeafletMap,
    Settings,
    GeoPackages,
    CertAuth
  },
  methods: {
    updatedSelected(val) {
      this.tabId = val.id
    },
    cancelAuthRequest () {
      this.authUrl = null
      window.mapcache.cancelWebViewAuthRequest()
    },
    handleSearchResults (data) {
      if (this.tabs.length === 3) {
        this.tabs.splice(2, 0, { tabId: 3, text: 'Search', icon: 'mdi-magnify', onClick: (i) => this.tabId = i })
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
        // TODO: Fix
        bounds = this.$refs['map'].getMapCenterAndZoom()
        // eslint-disable-next-line no-empty
      } catch (e) {
        console.error(e);
      }
      return bounds
    },
    saveProjectName (val) {
      setProjectName(this.project.id, val)
    },
    back () {
      this.tabId = null
    },
    addGeoPackageToApp (path) {
      return new Promise(resolve => {
        const existsInApp = Object.values(this.project.geopackages).find(geopackage => geopackage.path === path)
        if (!existsInApp) {
          addGeoPackage(this.project.id, path).then(geopackageId => {
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
              // eslint-disable-next-line no-console
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
    dark: {
      handler (newValue) {
        this.setTheme(newValue)
      }
    },
    showToolTips: {
      handler (newValue) {
        this.$showToolTips = newValue
      }
    },
    item: {
      handler (newValue) {
        if (!isNil(this.tabNotification[newValue]) && this.tabNotification[newValue]) {
          clearNotification(this.project.id, newValue)
        }
      }
    }
  },
  mounted () {
    window.mapcache.registerAuthRequestListener((url) => {
      this.authUrl = url
      this.authKey = this.authKey++
    })
    window.mapcache.registerAuthResponseListener(() => {
      this.authUrl = null
    })
    let uistate = this.getUIStateByProjectId(this.project.id)
    if (!uistate) {
      addProjectState(this.project.id)
    }
    setActiveGeoPackage(this.project.id, null)
    window.mapcache.addLoadOrDisplayGeoPackageListener(async (geopackageIds = [], filePaths = []) => {
      if (filePaths != null && filePaths.length > 0) {
        let geopackageId = null
        for (let i = 0; i < filePaths.length; i++) {
          geopackageId = await this.addGeoPackageToApp(filePaths[i])
        }
        if (filePaths.length === 1) {
          await setActiveGeoPackage(this.project.id, geopackageId)
        }
      } else {
        if (geopackageIds != null && geopackageIds.length === 1) {
          await setActiveGeoPackage(this.project.id, geopackageIds[0])
        }
      }
      this.$nextTick(() => {
        this.tabId = 0
      })
    })
    clearNotifications(this.project.id)
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
    EventBus.$on(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, () => {
      this.tabId = 3
    })
    EventBus.$on(EventBus.EventTypes.ALERT_MESSAGE, (message, color = 'warning') => {
      this.alertMessage = message
      this.alertColor = color
      this.showAlertMessage = true
    })
    EventBus.$on(EventBus.EventTypes.CREATE_BASE_MAP, () => {
      this.tabId = 2
    })
  },
  beforeDestroy () {
    window.removeEventListener('online', this.onLineListener)
    window.removeEventListener('offline', this.offLineListener)
    EventBus.$off([
      EventBus.EventTypes.NETWORK_ERROR,
      EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS,
      EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS,
      EventBus.EventTypes.CONFIRMATION_MESSAGE,
      EventBus.EventTypes.SHOW_FEATURE,
      EventBus.EventTypes.ALERT_MESSAGE,
      EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT,
      EventBus.EventTypes.CREATE_BASE_MAP
    ])
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.project-container {
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 100vh;
}

.content-panel {
  background-color: whitesmoke;
  max-width: 400px;
  min-width: 400px;
  min-height: 100vh;
  max-height: 100vh;
  /*overflow-y: auto;*/
}
</style>
