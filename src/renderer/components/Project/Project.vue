<template>
<div id="project-holder" class="project-holder">
  <div id="project-name">
    <v-card class="project-name-card">
      <view-edit-text :value="project.name" :fontColor="titleColor" font-size="1.5em" font-weight="bold" label="Project Name" :on-save="saveProjectName" justify="center"/>
    </v-card>
  </div>
  <div id="project" class="project-container">
    <div class="admin-actions">
      <div class="admin-actions-content">
        <div
            class="admin-action"
            :class="{'admin-action-selected': !geopackagesShowing}"
            @click.stop="showLayers()">
          <div class="admin-badge">
            <font-awesome-icon icon="layer-group" size="2x"/>
          </div>
          <div>Layers</div>
        </div>

        <div
            class="admin-action"
            :class="{'admin-action-selected': geopackagesShowing}"
            @click.stop="showGeoPackages()">
          <div class="admin-badge">
            <font-awesome-icon icon="archive" size="2x"/>
          </div>
          <div>GeoPackages</div>
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
    <div class="sidebar-fab-wrapper"
         v-if="geopackagesShowing">
      <div
        class="project-sidebar">
        <geo-package-card
          v-for="geopackage in project.geopackages"
          :key="geopackage.id"
          :geopackage="geopackage"
          :project="project"/>
      </div>
      <v-btn
        class="bottom-right"
        dark
        fab
        color="blue"
        @click.stop="addGeoPackage({project})">
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

  import LayerFlipCard from './LayerFlipCard'
  import LeafletMap from '../Map/LeafletMap'
  import AddSource from './AddSource'
  import ViewEditText from '../Common/ViewEditText'
  import GeoPackageCard from './GeoPackageCard'

  let options = {
    geopackagesShowing: false,
    titleColor: '#ffffff'
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
      GeoPackageCard
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
  .project-name-card {
    background: transparent 100%;
    padding: 16px;
  }
  .project-container {
    display:flex;
    flex-direction: row;
    overflow: hidden;
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
    height: 100vh;
    overflow: hidden;
  }
  .project-sidebar {
    padding: 15px;
    padding-left: 10px;
    text-align: center;
    min-width: 380px;
    max-width: 500px;
    width: 30vw;
    height: 100vh;
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
  .bottom-right {
    position: absolute;
    right: 32px;
    bottom: 32px;
  }

</style>
