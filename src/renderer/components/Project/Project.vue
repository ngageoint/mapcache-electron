<template>
  <v-layout id="project" class="project-holder ma-0 pa-0">
    <v-layout row justify-center>
      <v-dialog v-model="addGeoPackageDialog" max-width="300">
        <v-card class="text-center">
          <v-card-title class="headline">
            <v-container class="pa-0 ma-0">
              <v-row no-gutters>
                <v-col class="align-center">
                  New GeoPackage
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-divider class="mt-2 mb-2"/>
              </v-row>
            </v-container>
          </v-card-title>
          <v-card-text>
            <v-hover>
              <template v-slot="{ hover }">
                <v-card class="text-left mb-4 clickable" :elevation="hover ? 4 : 1" @click.stop="createNewGeoPackage">
                  <v-card-text>
                    <v-container style="padding: 4px">
                      <v-row>
                        <v-col cols="2">
                          <v-icon color="black">mdi-plus-box-outline</v-icon>
                        </v-col>
                        <v-col cols="8">
                          Create New
                        </v-col>
                      </v-row>
                    </v-container>
                  </v-card-text>
                </v-card>
              </template>
            </v-hover>
            <v-hover>
              <template v-slot="{ hover }">
                <v-card class="text-left mt-4 mb-4 clickable" :elevation="hover ? 4 : 1" @click.stop="displayURLModal">
                  <v-card-text>
                    <v-container style="padding: 4px">
                      <v-row>
                        <v-col cols="2">
                          <v-icon color="black">mdi-cloud-download-outline</v-icon>
                        </v-col>
                        <v-col cols="8">
                          Download from URL
                        </v-col>
                      </v-row>
                    </v-container>
                  </v-card-text>
                </v-card>
              </template>
            </v-hover>
            <v-hover>
              <template v-slot="{ hover }">
                <v-card class="text-left mt-4 clickable" :elevation="hover ? 4 : 1" @click.stop="importGeoPackage">
                  <v-card-text>
                    <v-container style="padding: 4px">
                      <v-row>
                        <v-col cols="2">
                          <v-icon color="black">mdi-file-document-outline</v-icon>
                        </v-col>
                        <v-col cols="8">
                          Import from File
                        </v-col>
                      </v-row>
                    </v-container>
                  </v-card-text>
                </v-card>
              </template>
            </v-hover>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-layout>
    <v-layout class="project-container overflow-hidden ma-0 pa-0">
      <v-navigation-drawer
        v-model="drawer"
        color="#3b779a"
        expand-on-hover
        mini-variant
        permanent
        absolute
        dark
      >
        <v-list dense flat class="py-0">
          <v-list-item two-line class="px-0">
            <v-list-item-avatar class="ml-2">
              <img src="../../assets/64x64.png">
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>MapCache</v-list-item-title>
              <v-list-item-subtitle>{{project.name}}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item-group v-model="item" activeClass="list-item-active">
            <v-list-item
              class="list-item-hover"
              v-for="(item, i) in items"
              :key="i"
              :onclick="item.onclick"
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
        <v-col class="content-panel" v-if="item >= 0">
          <v-col v-if="item === 0" style="min-height: 100vh;">
            <v-row no-gutters v-if="Object.keys(geopackages).length > 0">
              <v-col cols="12">
                <geo-package-card
                  v-for="geopackage in geopackages"
                  :key="geopackage.id"
                  :geopackage="geopackage"
                  :projectId="project.id"/>
              </v-col>
            </v-row>
          </v-col>
          <v-container v-if="item === 1">
            Layers TODO
            <div
              id="source-drop-zone">
              <add-source :project="project"/>
              <layer-flip-card
                v-for="sourceLayer in project.layers"
                :key="sourceLayer.id"
                class="sources"
                :layer="sourceLayer"
                :projectId="project.id"/>
            </div>
          </v-container>
          <v-container v-if="item === 2">
            <settings></settings>
          </v-container>
          <v-card class="card-position" v-if="Object.keys(geopackages).length === 0">
            <v-row no-gutters justify="space-between" align="end">
              <v-col>
                <v-row class="pa-0" no-gutters>
                  <v-col class="pa-0 align-center">
                    <h5 class="align-self-center"style="color: #9A9E9E">No GeoPackage files found</h5>
                  </v-col>
                </v-row>
                <v-row class="pa-0" no-gutters>
                  <v-col class="pa-0 align-center">
                    <h5 class="align-self-center" style="color: #3b779a">Get Started</h5>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card>
          <v-btn
            class="fab-position"
            v-if="item === 0"
            dark
            fab
            color="#3b779a"
            @click.stop="addGeoPackageDialog = true">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-col>
        <v-col>
          <leaflet-map
            style="width: 100%; height: 100%;"
            :geopackages="geopackages"
            :layer-configs="project.layers"
            :project-id="project.id"
            :project="project">
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
  import jetpack from 'fs-jetpack'
  import { remote } from 'electron'

  import LayerFlipCard from './LayerFlipCard'
  import LeafletMap from '../Map/LeafletMap'
  import AddSource from './AddSource'
  import ViewEditText from '../Common/ViewEditText'
  import GeoPackageCard from '../GeoPackage/GeoPackageCard'
  import Modal from '../Modal'
  import Card from '../Card/Card'
  import Settings from './Settings'

  let options = {
    contentShown: -1,
    titleColor: '#ffffff',
    addGeoPackageDialog: false,
    addGeoPackageError: false,
    drawer: true,
    item: 0,
    items: [
      { text: 'GeoPackages', icon: 'mdi-package-variant' },
      { text: 'Layers', icon: 'mdi-layers-outline' },
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
          return state.Projects[projectId]
        },
        geopackages (state) {
          const projectId = new URL(location.href).searchParams.get('id')
          return state.Projects[projectId].geopackages
        }
      }),
      ...mapGetters({
        getProjectById: 'Projects/getProjectById',
        getUIStateByProjectId: 'UIState/getUIStateByProjectId'
      })
    },
    components: {
      LayerFlipCard,
      LeafletMap,
      AddSource,
      ViewEditText,
      GeoPackageCard,
      Modal,
      Card,
      Settings
    },
    methods: {
      ...mapActions({
        setProjectName: 'Projects/setProjectName',
        addProjectLayer: 'Projects/addProjectLayer',
        addGeoPackage: 'Projects/addGeoPackage',
        addProjectState: 'UIState/addProjectState'
      }),
      showLayers () {
        options.geopackagesShowing = false
      },
      showGeoPackages () {
        options.geopackagesShowing = true
      },
      saveProjectName (val) {
        this.setProjectName({project: this.project, name: val})
      },
      createNewGeoPackage () {
        this.addGeoPackageDialog = false
        const geopackages = this.project.geopackages
        remote.dialog.showSaveDialog((filePath) => {
          if (!filePath.endsWith('.gpkg')) {
            filePath = filePath + '.gpkg'
          }
          const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === filePath) !== -1
          if (!exists) {
            this.addGeoPackage({projectId: this.project.id, filePath: filePath})
          } else {
            this.addGeoPackageError = true
          }
        })
      },
      importGeoPackage () {
        const geopackages = this.project.geopackages
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'GeoPackage Extensions',
              extensions: ['gpkg', 'geopackage']
            }
          ],
          properties: ['openFile']
        }, (files) => {
          if (files) {
            let fileInfo = jetpack.inspect(files[0], {
              times: true,
              absolutePath: true
            })
            const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === fileInfo.absolutePath) !== -1
            if (!exists) {
              this.addGeoPackage({projectId: this.project.id, filePath: fileInfo.absolutePath})
            } else {
              this.addGeoPackageError = true
            }
          }
        })
        this.addGeoPackageDialog = false
      },
      displayURLModal () {
        // TODO:
        console.log('url geopackage')
        this.addGeoPackageDialog = false
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
  .sources {
    list-style: none;
    text-align: left;
  }
  .sources li.checked {
    list-style: url('../../assets/check.png');
  }
  .content-panel {
    max-width: 400px;
    min-height: 100vh;
    max-height: 100vh;
    overflow-y: auto;
  }
  .card-position {
    position: absolute;
    background-color: white;
    padding: 16px;
    height: 72px;
    width: 384px;
    left: 64px;
    bottom: 8px;
  }
  .fab-position {
    position: absolute;
    left: 384px;
    bottom: 16px;
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
  .list-item-hover:hover {
    background-color: #4c99c7;
  }
  .list-item-active {
    background-color: #5fc2fc;
  }
</style>
