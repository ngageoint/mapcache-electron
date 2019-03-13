<template>
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
</template>

<script>
  import { mapActions } from 'vuex'

  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    methods: {
      ...mapActions({
        setCurrentGeoPackage: 'Projects/setCurrentGeoPackage'
      })
    }
  }
</script>

<style scoped>
  .create-gp-button {
    margin: 1em;
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

  .layers {
    display: inline;
  }
</style>
