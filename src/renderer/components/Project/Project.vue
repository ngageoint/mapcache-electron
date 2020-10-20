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
                <v-icon v-text="item.icon"></v-icon>
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
          <data-sources v-show="item === 1" :back="back" :project="project" :sources="project.sources"></data-sources>
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
    <v-alert class="alert-position" dismissible v-model="addGeoPackageError" type="error">
      GeoPackage already exists in project.
    </v-alert>
  </v-layout>
</template>

<script>
  import { mapGetters, mapActions, mapState } from 'vuex'
  import _ from 'lodash'
  import Vue from 'vue'

  import LeafletMap from '../Map/LeafletMap'
  import ViewEditText from '../Common/ViewEditText'
  import Settings from '../Settings/Settings'
  import GeoPackages from '../GeoPackage/GeoPackages'
  import DataSources from '../DataSources/DataSources'

  let options = {
    contentShown: -1,
    titleColor: '#ffffff',
    addGeoPackageDialog: false,
    addGeoPackageError: false,
    drawer: true,
    item: 0,
    items: [
      { text: 'GeoPackages', icon: 'mdi-package-variant' },
      { text: 'Data Sources', icon: 'mdi-layers-outline' },
      { text: 'Settings', icon: 'mdi-cog-outline' }
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
              boundingBoxFilterEditingEnabled: false,
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
      ViewEditText,
      Settings,
      GeoPackages
    },
    methods: {
      ...mapActions({
        setProjectName: 'Projects/setProjectName',
        addProjectState: 'UIState/addProjectState'
      }),
      saveProjectName (val) {
        this.setProjectName({project: this.project, name: val})
      },
      back () {
        this.item = undefined
      }
    },
    watch: {
      darkTheme: {
        handler (newValue, oldValue) {
          this.$vuetify.theme.dark = newValue
        }
      },
      showToolTips: {
        handler (newValue, oldValue) {
          Vue.prototype.$showToolTips = newValue
        }
      }
    },
    mounted: function () {
      let uistate = this.getUIStateByProjectId(this.project.id)
      if (!uistate) {
        this.addProjectState({projectId: this.project.id})
      }
    }
  }
</script>

<style scoped>
  #project {
    font-family: sans-serif;
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
  .alert-position {
    position: absolute;
    margin-left: auto;
    margin-right: auto;
    left: 15rem;
    right: 15rem;
    text-align: center;
    top: 16px;
  }
  .list-item:hover {
    background-color: var(--v-main-darken2) !important;
    color: whitesmoke
  }
  .list-item-active {
    background-color: whitesmoke;
    color: var(--v-main-base)
  }
  .list-item-active:hover {
    background-color: var(--v-main-base);
    color: whitesmoke
  }
</style>
