<template>
  <v-container>
    <modal
        v-if="showDeleteModal"
        header="Delete Configuration"
        :card-text="'Are you sure you want to delete ' + geopackage.name + '?'"
        ok-text="Delete"
        ok-color="red darken-1"
        :ok="confirm"
        :cancel="cancel">
    </modal>
    <geo-package-file-configuration-card
      :project-id="project.id"
      :geopackage="geopackage"/>
    <expandable-card>
      <div slot="card-header">
        <v-row class="justify-space-between" no-gutters>
          <v-col cols="10" class="title-card">
            <v-row no-gutters class="justify-start">
              {{'Tile Configurations (' + Object.keys(geopackage.tileConfigurations).length + ')'}}
            </v-row>
          </v-col>
          <v-col cols="2">
            <v-row no-gutters class="justify-end">
              <font-awesome-icon icon="plus-circle" size="2x" class="add-button" @click.stop="addTileConfiguration()"/>
            </v-row>
          </v-col>
        </v-row>
      </div>
      <div slot="card-expanded-body">
        <geo-package-tile-configuration-card
          v-for="tileConfig in geopackage.tileConfigurations"
          :key="'tile-config-' + tileConfig.id"
          :project="project"
          :geopackage="geopackage"
          :tile-configuration="tileConfig"/>
      </div>
    </expandable-card>
    <expandable-card>
      <div slot="card-header">
        <v-row class="justify-space-between" no-gutters>
          <v-col cols="10" class="title-card">
            <v-row no-gutters class="justify-start">
              {{'Vector Configurations (' + Object.keys(geopackage.vectorConfigurations).length + ')'}}
            </v-row>
          </v-col>
          <v-col cols="2">
            <v-row no-gutters class="justify-end">
              <font-awesome-icon icon="plus-circle" size="2x" class="add-button" @click.stop="addVectorConfiguration()"/>
            </v-row>
          </v-col>
        </v-row>
      </div>
      <div slot="card-expanded-body">
        <geo-package-vector-configuration-card
          v-for="vectorConfig in geopackage.vectorConfigurations"
          :key="'vector-config-' + vectorConfig.id"
          :project="project"
          :geopackage="geopackage"
          :vector-configuration="vectorConfig"/>
      </div>
    </expandable-card>
    <geo-package-builder-card
      :project="project"
      :geopackage="geopackage"/>
    <v-row>
      <v-col cols="12">
        <button class="danger-button" @click.stop="showDeleteGeoPackageConfirm()">
          <span>Delete Configuration</span>
        </button>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import { mapActions } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import GeoPackageFileConfigurationCard from './GeoPackageFileConfigurationCard'
  import GeoPackageTileConfigurationCard from './GeoPackageTileConfigurationCard'
  import GeoPackageVectorConfigurationCard from './GeoPackageVectorConfigurationCard'
  import GeoPackageBuilderCard from './GeoPackageBuilderCard'
  import Modal from '../Modal'

  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    components: {
      ExpandableCard,
      ViewEditText,
      GeoPackageFileConfigurationCard,
      GeoPackageTileConfigurationCard,
      GeoPackageVectorConfigurationCard,
      GeoPackageBuilderCard,
      Modal
    },
    data () {
      return {
        showDeleteModal: false
      }
    },
    computed: {
    },
    methods: {
      ...mapActions({
        addGeoPackageTileConfiguration: 'Projects/addGeoPackageTileConfiguration',
        addGeoPackageVectorConfiguration: 'Projects/addGeoPackageVectorConfiguration',
        setGeoPackageName: 'Projects/setGeoPackageName',
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        setGeoPackageBuildMode: 'Projects/setGeoPackageBuildMode',
        setGeoPackageStatusReset: 'Projects/setGeoPackageStatusReset'
      }),
      showDeleteGeoPackageConfirm () {
        this.showDeleteModal = true
      },
      cancel () {
        this.showDeleteModal = false
      },
      confirm () {
        this.showDeleteModal = false
        this.deleteGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id
        })
      },
      addTileConfiguration () {
        this.addGeoPackageTileConfiguration({
          projectId: this.project.id,
          geopackageId: this.geopackage.id
        })
      },
      addVectorConfiguration () {
        this.addGeoPackageVectorConfiguration({
          projectId: this.project.id,
          geopackageId: this.geopackage.id
        })
      },
      exit () {
        this.setGeoPackageStatusReset({
          projectId: this.project.id,
          geopackageId: this.geopackage.id
        })
      }
    }
  }
</script>

<style scoped>
.title-card {
  color: #000;
  font-size: 1.25em;
}
.subtitle-card {
  display: inline-block;
  vertical-align: middle;
  line-height: normal;
  color: #000;
  font-size: 16px;
  font-weight: normal;
}
.danger-button {
  padding: 8px;
  min-height: 3rem;
  width: 100%;
  background-color: #d50000;
  text-transform: uppercase;
  font-size: 16px;
  color: #FFF;
  outline: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0;
  -webkit-transition: letter-spacing 0.3s;
  transition: letter-spacing 0.3s;
}
.danger-button:hover {
  background-color: #9b0000;
  letter-spacing: 5px;
}
.add-button {
  color: #2962ff;
  margin-right: 0.25rem;
}
.add-button:hover {
  color: #0039cb;
  cursor: pointer;
}
</style>
