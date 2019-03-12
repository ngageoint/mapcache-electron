<template>
  <div id="project" class="container">
    <div class="admin-actions">
      <div class="admin-actions-content">
        <div class="admin-action" :class="{'admin-action-selected': !geopackagesShowing}" @click.stop="showLayers()">
          <!-- <div :class="{'admin-action-arrow-left': !geopackagesShowing}"></div> -->
          <div class="admin-badge">
            <font-awesome-icon icon="layer-group" size="2x"/>
          </div>
          <div>Layers</div>
        </div>
        <div class="admin-action" :class="{'admin-action-selected': geopackagesShowing}" @click.stop="showGeoPackages()">
          <!-- <div :class="{'admin-action-arrow-left': geopackagesShowing}"></div> -->
          <div class="admin-badge">
            <font-awesome-icon icon="archive" size="2x"/>
          </div>
          <div>GeoPackages</div>
        </div>
      </div>
    </div>
    <!-- <div class="tab-bar">
      <div class="tab-name vertical-text">Layers</div>
      <div class="tab-name vertical-text">GeoPackages</div>
    </div> -->
    <div id="source-drop-zone" class="project-sidebar" v-if="!project.currentGeoPackage">
      <edit-project-name :project="project"/>
      <add-source v-if="!geopackagesShowing" :project="project"/>
      <div class="source-container">
        <div v-if="!geopackagesShowing">
          <layer-flip-card v-for="sourceLayer in project.layers" :key="sourceLayer.id" class="sources" :layer="sourceLayer" :projectId="project.id"/>
        </div>
        <div v-if="geopackagesShowing">
          <a class="pull-right create-gp-button" @click.stop="addGeoPackage({project})">Create GeoPackage</a>
          <div v-for="geopackage in project.geopackages" :key="geopackage.id" class="geopackage-item">
            {{geopackage.id}}
          </div>
        </div>
      </div>
    </div>
    <create-geopackage v-if="project.currentGeoPackage" :project="project"/>

    <div class="work-area">
      <leaflet-map style="width: 100%; height: 100%;" :active-geopackage="project.geopackages[project.currentGeoPackage]" :layer-configs="project.layers" :project-id="project.id"></leaflet-map>
    </div>
  </div>
</template>

<script>
  import { mapGetters, mapActions, mapState } from 'vuex'

  import LayerFlipCard from './LayerFlipCard'
  import CreateGeopackage from './CreateGeopackage'
  import LeafletMap from '../Map/LeafletMap'
  import AddSource from './AddSource'
  import EditProjectName from './EditProjectName'

  let options = {
    geopackagesShowing: false
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
      CreateGeopackage,
      LeafletMap,
      AddSource,
      EditProjectName
    },
    methods: {
      ...mapActions({
        addProjectLayer: 'Projects/addProjectLayer',
        addGeoPackage: 'Projects/addGeoPackage',
        addProjectState: 'UIState/addProjectState'
      }),
      showLayers () {
        console.log('show Layers')
        options.geopackagesShowing = false
      },
      showGeoPackages () {
        console.log('show geopackages')
        options.geopackagesShowing = true
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

  @import '~float-labels.js/dist/float-labels.css';

  #project {
    font-family: sans-serif;
    color: rgba(255, 255, 255, .87);
  }

  .container {
    display:flex;
    flex-direction: row;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
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
    padding: 25px;
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

  .project-sidebar {
    padding: 15px;
    text-align: center;
    min-width: 380px;
    max-width: 500px;
    width: 30vw;
    height: 100vh;
    overflow-y: scroll;
  }

  .section-name {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 10px;
    text-align: left;
  }

  .create-gp-button {
    border-color: rgba(54, 62, 70, .87);
    border-width: 1px;
    border-radius: 4px;
    padding: .2em;
    color: rgba(255, 255, 255, .95);
    background-color: rgba(68, 152, 192, .95);
    cursor: pointer;
  }

  .sources {
    list-style: none;
    text-align: left;
  }

  .sources li.checked {
    list-style: url('../../assets/check.png');
  }

</style>
