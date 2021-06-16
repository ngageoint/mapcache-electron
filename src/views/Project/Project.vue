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
      <v-card>
        <v-card-title>
          Select a certificate
        </v-card-title>
        <v-card-subtitle>
          Select a certificate to authenticate yourself to {{certificateRequestUrl}}
        </v-card-subtitle>
        <v-card-text>
          <v-data-table
            v-model="certificateSelection"
            single-select
            height="150px"
            dense
            disable-filtering
            disable-pagination
            disable-sort
            :headers="headers"
            :hide-default-footer="true"
            :items="certificateList"
            class="elevation-1"
          >
            <template v-slot:item="{ item }">
              <tr :class="certificateSelection[0] === item.id ? 'grey lighten-1' : ''" @click.stop.prevent="selectCertificateRow(item)">
                <td class="text-truncate" style="max-width: 200px;">{{item.subjectName}}</td>
                <td class="text-truncate" style="max-width: 150px;">{{item.issuerName}}</td>
                <td class="text-truncate" style="max-width: 150px;">{{item.serialNumber}}</td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelCertificateSelection">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            text
            @click="selectCertificate">
            Select
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-if="showSignIn" v-model="showSignIn" max-width="400" persistent>
      <basic-auth v-if="showSignIn" :auth-info="requestAuthInfo" :details="requestDetails" :cancel="cancelSignIn" :sign-in="signIn"></basic-auth>
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
              <img src="../../assets/64x64.png">
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>MapCache</v-list-item-title>
              <v-list-item-subtitle>{{project.name}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item-group v-model="item" activeClass="list-item-active">
            <v-list-item
              class="list-item"
              v-for="(item, i) in items"
              :key="i"
              :onclick="item.onclick"
              v-ripple="{ class: `main--text` }"
            >
              <v-list-item-icon>
                <v-badge
                  v-if="tabNotification[item.id]"
                  color="red"
                  dot
                  overlap
                >
                  <v-icon v-text="item.icon"></v-icon>
                </v-badge>
                <v-icon v-else v-text="item.icon"></v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="item.text"></v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-navigation-drawer>
      <v-row no-gutters class="ml-14">
        <v-col class="content-panel" v-show="item >= 0">
          <geo-packages v-show="item === 0" :back="back" :project="project" :geopackages="project.geopackages"></geo-packages>
          <data-sources ref="dataSourceRef" v-show="item === 1" :back="back" :project="project" :sources="project.sources"></data-sources>
          <settings v-show="item === 2" :back="back" :project="project" :dark="darkTheme"></settings>
        </v-col>
        <v-col>
          <preview-map
            :visible="previewLayer !== null && previewLayer !== undefined && item === 1"
            :project="project"
            :preview-layer="previewLayer"
            :resizeListener="item"
            :get-map-center-and-zoom="getMapCenterAndZoom">
          </preview-map>
          <leaflet-map
            ref="map"
            :visible="previewLayer === null || previewLayer === undefined || item !== 1"
            :geopackages="project.geopackages"
            :sources="project.sources"
            :project-id="project.id"
            :project="project"
            :resizeListener="item">
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
import BasicAuth from '../Common/BasicAuth'
import {mdiCogOutline, mdiLayersOutline, mdiPackageVariant} from '@mdi/js'
import {SUPPORTED_FILE_EXTENSIONS_WITH_DOT} from '../../lib/util/FileConstants'

export default {
    data () {
      return {
        mdiPackageVariant: mdiPackageVariant,
        mdiLayersOutline: mdiLayersOutline,
        mdiCogOutline: mdiCogOutline,
        closingMessage: '',
        closingDialog: false,
        loading: true,
        contentShown: -1,
        titleColor: '#ffffff',
        addGeoPackageDialog: false,
        drawer: true,
        item: 0,
        items: [
          { id: 0, text: 'GeoPackages', icon: mdiPackageVariant, notify: false },
          { id: 1, text: 'Data Sources', icon: mdiLayersOutline, notify: false },
          { id: 2, text: 'Settings', icon: mdiCogOutline, notify: false }
        ],
        showCertificateSelectionDialog: false,
        certificateList: [],
        certificateSelection: [0],
        certificateRequestUrl: '',
        headers: [
          { text: 'Subject ', value: 'subjectName', width: 200 },
          { text: 'Issuer', value: 'issuerName', width: 150 },
          { text: 'Serial', value: 'serialNumber', width: 150 }
        ],
        noInternet: !navigator.onLine,
        showSignIn: false,
        requestAuthInfo: {},
        requestDetails: {}
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
        tabNotification (state) {
          let tabNotification = {}
          const projectId = this.$route.params.id
          let project = state.UIState[projectId]
          if (!isNil(project)) {
            tabNotification = Object.assign({}, project.tabNotification || {0: false, 1: false, 2: false})
          }
          if (!isNil(this.item) && this.item >= 0 && tabNotification[this.item]) {
            tabNotification[this.item] = false
            window.mapcache.clearNotification({projectId: this.project.id, tabId: this.item})
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
      BasicAuth,
      DataSources,
      LeafletMap,
      Settings,
      GeoPackages,
      PreviewMap
    },
    methods: {
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
        this.item = undefined
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
          const supportedExtensions = SUPPORTED_FILE_EXTENSIONS_WITH_DOT
          for (let f of e.dataTransfer.files) {
            const extension = window.mapcache.getExtensionName(f.path)
            // try to add a geopackage to the project
            if (extension === '.gpkg') {
              geopackagesToAdd.push(f.path)
            } else if (supportedExtensions.findIndex(e => e === extension) !== -1) {
              dataSourcesToAdd.push(f.path)
            }
          }

          for (let i = 0; i < geopackagesToAdd.length; i++) {
            const path = geopackagesToAdd[i]
            const existsInApp = Object.values(this.project.geopackages).findIndex(geopackage => geopackage.path === path) !== -1
            if (!existsInApp) {
              window.mapcache.addGeoPackage({projectId: this.project.id, filePath: path})
            }
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
      cancelSignIn () {
        window.mapcache.sendClientCredentials()
        this.showCertificateSelectionDialog = false
        this.showSignIn = false
      },
      signIn (credentials) {
        window.mapcache.sendClientCredentials(credentials)
        this.showCertificateSelectionDialog = false
        this.showSignIn = false
      },
      cancelCertificateSelection () {
        window.mapcache.sendCertificateSelection(null)
        this.showCertificateSelectionDialog = false
      },
      selectCertificate () {
        window.mapcache.sendCertificateSelection(this.certificateList[this.certificateSelection].certificate)
        this.showCertificateSelectionDialog = false
      },
      selectCertificateRow (row) {
        this.certificateSelection = [row.id]
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
        this.requestAuthInfo = args.authInfo
        this.requestDetails = args.details
        this.showSignIn = true
      })
      this.onLineListener = () => this.noInternet = false
      this.offLineListener = () => this.noInternet = true
      window.addEventListener('online', this.onLineListener)
      window.addEventListener('offline', this.offLineListener)
      EventBus.$on(EventBus.EventTypes.NETWORK_ERROR, this.offLineListener)
    },
    beforeDestroy() {
      window.removeEventListener('online', this.onLineListener)
      window.removeEventListener('offline', this.offLineListener)
      EventBus.$off([EventBus.EventTypes.NETWORK_ERROR])
      window.mapcache.removeClosingProjectWindowListener()
      window.mapcache.removeSelectClientCertificateListener()
      window.mapcache.removeRequestClientCredentialsListener()
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
