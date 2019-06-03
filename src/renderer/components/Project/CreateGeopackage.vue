<template>
  <div>
    <edit-geo-package-name
        :geopackage="geopackageConfiguration"
        :project="project"/>
    <choose-layers
        v-if="geopackageConfiguration.step === 1"
        :project="project"
        :geopackage="geopackageConfiguration"/>
    <setup-imagery-layers
        v-if="geopackageConfiguration.step === 2"
        :project="project"
        :geopackage="geopackageConfiguration"/>
    <setup-feature-layers
        v-if="geopackageConfiguration.step === 3"
        :project="project"
        :geopackage="geopackageConfiguration"/>
    <setup-features-to-imagery-layer
        v-if="geopackageConfiguration.step === 4"
        :project="project"
        :geopackage="geopackageConfiguration"/>
    <creation-summary
        v-if="geopackageConfiguration.step === 5"
        :project="project"
        :geopackage="geopackageConfiguration"/>

    <div class="gp-button" @click.stop="cancelOrFinish">
      <span>{{cancelOrFinishText}}</span>
    </div>
  </div>
</template>

<script>
  import { mapState, mapActions } from 'vuex'
  import ChooseLayers from '../GeoPackage/ChooseLayers'
  import SetupImageryLayers from '../GeoPackage/SetupImageryLayers'
  import SetupFeatureLayers from '../GeoPackage/SetupFeatureLayers'
  import SetupFeaturesToImageryLayer from '../GeoPackage/SetupFeaturesToImageryLayer'
  import CreationSummary from '../GeoPackage/CreationSummary'
  import EditGeoPackageName from '../GeoPackage/EditGeoPackageName'

  export default {
    props: {
      project: Object
    },
    components: {
      ChooseLayers,
      SetupImageryLayers,
      SetupFeatureLayers,
      SetupFeaturesToImageryLayer,
      CreationSummary,
      EditGeoPackageName
    },
    computed: {
      ...mapState({
        geopackageConfiguration (state) {
          return state.Projects[this.project.id].geopackages[this.project.currentGeoPackage]
        }
      }),
      cancelOrFinishText () {
        let text = 'Cancel'
        let geopackage = this.project.geopackages[this.project.currentGeoPackage]
        if (geopackage && geopackage.status && geopackage.status.creation === 'Completed') {
          text = 'Finish'
        }
        return text
      }
    },
    methods: {
      ...mapActions({
        setCurrentGeoPackage: 'Projects/setCurrentGeoPackage'
      }),
      cancelOrFinish () {
        this.setCurrentGeoPackage({
          projectId: this.project.id,
          geopackageId: undefined
        })
      }
    }
  }
</script>

<style scoped>

@import '~float-labels.js/dist/float-labels.css';

.instruction {
  padding: .75em;
  color: rgba(54, 62, 70, .87);
  background-color: rgba(255, 255, 255, 1);
  border-radius: 4px;
  margin-bottom: 1em;
  margin-top: 1em;
}

.geopackage-sidebar {
  padding: 15px;
  text-align: center;
  min-width: 380px;
  max-width: 500px;
  width: 30vw;
  height: 100vh;
  overflow-y: scroll;
  z-index: 100000;
}

.instruction-title {
  font-size: 1em;
  font-weight: bold;
  text-align: left;
}

.instruction-detail {
  font-size: .8em;
  text-align: left;
}

.gp-button {
  border-color: rgba(54, 62, 70, .87);
  border-width: 1px;
  border-radius: 4px;
  padding: .2em;
  color: rgba(255, 255, 255, .95);
  background-color: rgba(68, 152, 192, .95);
  cursor: pointer;
  margin-top: 1em;
}

</style>
