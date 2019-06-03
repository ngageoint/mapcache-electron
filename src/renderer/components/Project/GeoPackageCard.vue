<template>
  <div class="button-container">
    <modal
        v-if="showDeleteModal"
        header="Delete the GeoPackage?"
        footer="Delete it"
        :ok="confirm"
        :cancel="cancel">
    </modal>
    <div
        class="create-gp-button"
        @click.stop="setCurrentGeoPackage({projectId: project.id, geopackageId: geopackage.id})">
      <div class="geopackage-name">
        <div v-if="geopackage.name">{{geopackage.name}}</div>
        <div v-if="!geopackage.name">Unnamed</div>
      </div>
      <div class="layers">
        {{geopackage.layers.length}} Layers
      </div>
    </div>
    <div
        class="delete-gp-button"
        @click.stop="showDeleteGeoPackageConfirm()">
      <font-awesome-icon icon="trash"/>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import Modal from '../Modal'

  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    data () {
      return {
        showDeleteModal: false
      }
    },
    components: {
      Modal
    },
    methods: {
      ...mapActions({
        setCurrentGeoPackage: 'Projects/setCurrentGeoPackage',
        deleteGeoPackage: 'Projects/deleteGeoPackage'
      }),
      showDeleteGeoPackageConfirm () {
        this.showDeleteModal = true
      },
      cancelOrFinish () {
        this.showDeleteModal = false
      },
      confirm () {
        this.showDeleteModal = false
        this.deleteGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id
        })
      }
    }
  }
</script>

<style scoped>

  .button-container {
    margin-top: 1em;
    width: 100%;
    display:flex;
    flex-direction: row;
  }

  .create-gp-button {
    flex-grow: 1;
    margin-right: 1em;
    border-color: rgba(54, 62, 70, .87);
    border-width: 1px;
    border-radius: 4px;
    padding: .2em;
    color: rgba(255, 255, 255, .95);
    background-color: rgba(68, 152, 192, .95);
    cursor: pointer;
  }

  .geopackage-name {
    display: inline-block;
    font-weight: bold;
    font-size: 1.1em;
  }

  .delete-gp-button {
    margin: auto;
    cursor: pointer;
  }

  .layers {
    display: inline;
  }
</style>
