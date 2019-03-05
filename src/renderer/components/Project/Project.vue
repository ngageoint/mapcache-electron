<template>
  <div id="project" class="container">
    <div id="source-drop-zone" class="project-sidebar">
      <edit-project-name :project="project"/>
      <add-source :project="project"/>
      <div class="source-container">
        <div class="section-name"><span class="pull-left">Layers</span><a class="pull-right create-gp-button" @click.stop="addGeoPackage({project})">Create GeoPackage</a></div>
        <layer-flip-card v-for="sourceLayer in project.layers" :key="sourceLayer.id" class="sources" :layer="sourceLayer" :projectId="project.id"/>
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

  let creatingGeoPackage = false

  export default {
    data () {
      return {
        creatingGeoPackage
      }
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
      createGeoPackage () {
        this.creatingGeoPackage = true
      }
    },
    mounted: function () {
      let uistate = this.getUIStateByProjectId(this.project.id)
      console.log('state.UIState[projectId]', uistate)
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
