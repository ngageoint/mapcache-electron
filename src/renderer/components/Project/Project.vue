<template>
<div id="project-holder" class="project-holder">
  <v-layout row justify-center>
    <v-dialog v-model="showDialog" max-width="300">
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
  <div id="project-name">
    <v-container>
      <v-row>
        <v-col>
          <view-edit-text compact :value="project.name" :fontColor="titleColor" :darkMode="true" font-size="1.5em" font-weight="bold" label="Project Name" :on-save="saveProjectName" justify="center"/>
        </v-col>
      </v-row>
    </v-container>
  </div>
  <div id="project" class="project-container">
    <div class="admin-actions">
      <div class="admin-actions-content">
        <div
          class="admin-action"
          :class="{'admin-action-selected': geopackagesShowing}"
          @click.stop="showGeoPackages()">
          <div class="admin-badge">
            <font-awesome-icon icon="archive" size="2x"/>
          </div>
          <div>GeoPackages</div>
        </div>
        <div
          class="admin-action"
          :class="{'admin-action-selected': !geopackagesShowing}"
          @click.stop="showLayers()">
          <div class="admin-badge">
            <font-awesome-icon icon="layer-group" size="2x"/>
          </div>
          <div>Layers</div>
        </div>
      </div>
    </div>
    <div
        id="source-drop-zone"
        class="project-sidebar"
        v-if="!geopackagesShowing">

      <add-source :project="project"/>

      <layer-flip-card
              v-for="sourceLayer in project.layers"
              :key="sourceLayer.id"
              class="sources"
              :layer="sourceLayer"
              :projectId="project.id"/>
    </div>
    <div class="sidebar-fab-wrapper" v-if="geopackagesShowing">
      <v-container class="project-sidebar" v-if="Object.keys(project.geopackages).length > 0">
        <geo-package-card
          v-for="geopackage in project.geopackages"
          :key="geopackage.id"
          :geopackage="geopackage"
          :projectId="project.id"/>
      </v-container>
      <v-container class="project-sidebar" v-if="Object.keys(project.geopackages).length === 0">
        <v-row class="align-bottom" no-gutters>
          <v-col>
            <card>
              <div slot="card">
                <v-container class="ma-2 align-end">
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
                </v-container>
              </div>
            </card>
          </v-col>
        </v-row>
      </v-container>
      <v-btn
        class="sidebar-fab"
        dark
        fab
        color="#3b779a"
        @click.stop="showDialog = true">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </div>
    <div class="work-area">
      <leaflet-map
          style="width: 100%; height: 100%;"
          :geopackages="project.geopackages"
          :layer-configs="project.layers"
          :project-id="project.id"
          :project="project">
      </leaflet-map>
    </div>
  </div>
</div>
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
  import FileUtilities from '../../../lib/FileUtilities'

  let options = {
    geopackagesShowing: true,
    titleColor: '#ffffff',
    showDialog: false
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
      Card
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
        this.showDialog = false
        remote.dialog.showSaveDialog((filePath) => {
          if (!filePath.endsWith('.gpkg')) {
            filePath = filePath + '.gpkg'
          }
          this.addGeoPackage({projectId: this.project.id, filePath})
        })
      },
      importGeoPackage () {
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
            this.addGeoPackage({projectId: this.project.id, filePath: fileInfo.absolutePath, fileSize: FileUtilities.toHumanReadable(fileInfo.size)})
          }
        })
        this.showDialog = false
      },
      displayURLModal () {
        // TODO:
        console.log('url geopackage')
        this.showDialog = false
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
  #project-name {
    min-height: 10vh;
    display: flex;
    align-items: center;
  }
  .project-name-card {
    background: transparent 100%;
    padding: 16px;
  }
  .project-container {
    display:flex;
    flex-direction: row;
    overflow: hidden;
    min-height: 90vh;
  }
  .pull-right {
    text-align: center;
    width: 49%;
    display: inline-block;
  }
  .pull-left {
    text-align: left;
    width: 50%;
    display: inline-block;
  }
  .work-area {
    flex: 1;
    /* background: #FAFAFA; */
  }
  .tab-bar {
    width: 30px;
    display: flex;
    flex-direction: column;
  }
  .vertical-text {
    transform: rotate(270deg);
  }
  .admin-actions {
    background: linear-gradient(to right, rgba(80, 80, 80, 0.3) 93%, transparent 40%) no-repeat;
    display: flex;
    flex-direction: column;
  }
  .admin-actions-content {
    overflow: auto;
  }
  .admin-badge {
    position: relative;
  }
  .admin-content {
    flex: 1;
    overflow: auto;
  }
  .admin-action {
    position: relative;
    padding: 25px 35px 25px 25px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
  }
  .admin-action-arrow-left {
    position: absolute;
    right: 0;
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right:10px solid white;
  }
  .admin-action .fa {
    font-size: 30px;
    margin-bottom: 8px;
  }
  .admin-action .fa-mobile-phone {
    font-size: 46px;
    margin-bottom: 0;
   }
  .admin-action-selected {
    color: rgba(255, 255, 255, .96);
    background-color: #444;
    -webkit-clip-path: polygon(100% 50%, 93% 40%, 93% 0%, 0% 0%, 0% 100%, 93% 100%, 93% 60%);
    clip-path: polygon(100% 50%, 93% 40%, 93% 0%, 0% 0%, 0% 100%, 93% 100%, 93% 60%);
  }
  .sidebar-fab-wrapper {
    position: relative;
    min-width: 380px;
    max-width: 500px;
    width: 30vw;
    max-height: 90vh;
    overflow: hidden;
  }
  .project-sidebar {
    padding: 0 15px 10px 10px;
    text-align: center;
    min-width: 380px;
    max-width: 500px;
    width: 30vw;
    max-height: 90vh;
    min-height: 90vh;
    overflow-y: auto;
  }
  .section-name {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 10px;
    text-align: left;
  }
  .sources {
    list-style: none;
    text-align: left;
  }
  .sources li.checked {
    list-style: url('../../assets/check.png');
  }
  .sidebar-fab {
    position: absolute;
    right: 24px;
    bottom: 30px;
  }
  .align-bottom {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 15px;
    padding-left: 10px;
    padding-bottom: 20px;
    width: 100%;
  }

</style>
