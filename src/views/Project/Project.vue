<template>
  <v-layout id="project" class="project-holder ma-0 pa-0">
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
          <settings v-if="item === 2" :back="back" :project="project" :dark="darkTheme"></settings>
        </v-col>
        <v-col>
          <leaflet-map
            style="width: 100%; height: 100%;"
            :geopackages="project.geopackages"
            :sources="project.sources"
            :project-id="project.id"
            :project="project"
            :resizeListener="item">
          </leaflet-map>
        </v-col>
      </v-row>
    </v-layout>
  </v-layout>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'
  import _ from 'lodash'
  import Vue from 'vue'
  import path from 'path'
  import jetpack from 'fs-jetpack'

  import LeafletMap from '../Map/LeafletMap'
  import Settings from '../Settings/Settings'
  import GeoPackages from '../GeoPackage/GeoPackages'
  import DataSources from '../DataSources/DataSources'
  import ActionUtilities from '../../lib/ActionUtilities'

  let options = {
    contentShown: -1,
    titleColor: '#ffffff',
    addGeoPackageDialog: false,
    drawer: true,
    item: 0,
    items: [
      { id: 0, text: 'GeoPackages', icon: 'mdi-package-variant', notify: false },
      { id: 1, text: 'Data Sources', icon: 'mdi-layers-outline', notify: false },
      { id: 2, text: 'Settings', icon: 'mdi-cog-outline', notify: false }
    ]
  }

  export default {
    data () {
      return options
    },
    computed: {
      ...mapState({
        project (state) {
          const projectId = new URL(location.href).searchParams.get('id')
          let project = state.Projects[projectId]
          if (_.isNil(project)) {
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
        darkTheme (state) {
          let isDark = false
          const projectId = new URL(location.href).searchParams.get('id')
          let project = state.UIState[projectId]
          if (!_.isNil(project)) {
            isDark = project.dark
          }
          this.$vuetify.theme.dark = isDark
          return isDark
        },
        tabNotification (state) {
          let tabNotification = {}
          const projectId = new URL(location.href).searchParams.get('id')
          let project = state.UIState[projectId]
          if (!_.isNil(project)) {
            tabNotification = Object.assign({}, project.tabNotification || {0: false, 1: false, 2: false})
          }
          if (!_.isNil(this.item) && this.item >= 0 && tabNotification[this.item]) {
            tabNotification[this.item] = false
            ActionUtilities.clearNotification({projectId: this.project.id, tabId: this.item})
          }
          return tabNotification
        },
        showToolTips (state) {
          let show = true
          const projectId = new URL(location.href).searchParams.get('id')
          let project = state.UIState[projectId]
          if (!_.isNil(project)) {
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
      DataSources,
      LeafletMap,
      Settings,
      GeoPackages
    },
    methods: {
      saveProjectName (val) {
        ActionUtilities.setProjectName({project: this.project, name: val})
      },
      back () {
        this.item = undefined
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
          ActionUtilities.clearNotification({projectId: this.project.id, tabId: newValue})
        }
      }
    },
    mounted: function () {
      let uistate = this.getUIStateByProjectId(this.project.id)
      if (!uistate) {
        ActionUtilities.addProjectState({projectId: this.project.id})
      }
      ActionUtilities.setActiveGeoPackage({projectId: this.project.id, geopackageId: null})
      ActionUtilities.clearNotifications({projectId: this.project.id})
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
        const supportedExtensions = ['.tif', '.tiff', '.geotiff', '.kml', '.kmz', '.geojson', '.json', '.shp', '.zip']
        for (let f of e.dataTransfer.files) {
          const extension = path.extname(f.path)
          // try to add a geopackage to the project
          if (extension === '.gpkg') {
            geopackagesToAdd.push(f.path)
          } else if (supportedExtensions.findIndex(e => e === extension) !== -1) {
            dataSourcesToAdd.push(f.path)
          }
        }

        let geopackageNotify = false
        for (let i = 0; i < geopackagesToAdd.length; i++) {
          const path = geopackagesToAdd[i]
          const existsInApp = Object.values(this.project.geopackages).findIndex(geopackage => geopackage.path === path) !== -1
          if (!existsInApp) {
            ActionUtilities.addGeoPackage({projectId: this.project.id, filePath: path})
            geopackageNotify = true
          }
        }
        if (geopackageNotify) {
          ActionUtilities.notifyTab({projectId: this.project.id, tabId: 0})
        }

        let fileInfos = []
        for (let i = 0; i < dataSourcesToAdd.length; i++) {
          const file = dataSourcesToAdd[i]
          let fileInfo = jetpack.inspect(file, {
            times: true,
            absolutePath: true
          })
          fileInfo.lastModified = fileInfo.modifyTime.getTime()
          fileInfo.lastModifiedDate = fileInfo.modifyTime
          fileInfo.path = fileInfo.absolutePath
          fileInfos.push(fileInfo)
        }
        this.$refs.dataSourceRef.processFiles(fileInfos)
        return false
      }
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
