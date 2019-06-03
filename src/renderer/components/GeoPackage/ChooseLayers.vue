<template>

  <div class="instruction">
    <step-buttons
        :step="geopackage.step"
        :next="next"
        :top="true"
        :disableNext="!atLeastOneLayer"
        :steps="5">
    </step-buttons>

    <div class="instruction-title">
      Choose Layers To Include
    </div>

    <div class="instruction-detail">
      Checked layers will be included in the exported GeoPackage.  You will have an opportunity to choose options for each layer later.
    </div>

    <div class="instruction-configuration">
      <div class="imagery-layers">
        <div class="layer-group-header">
          Imagery Layers
        </div>
        <div v-for="imageryLayer in imageryLayers">
          <layer-header
              class="layer-header"
              :projectId="project.id"
              group="imageryLayers"
              :layer="imageryLayer"
              :geopackage="geopackage"/>
        </div>
      </div>
      <div class="feature-layers">
        <div class="layer-group-header">
          Feature Layers
        </div>
        <div v-for="featureLayer in featureLayers">
          <layer-header
              class="layer-header"
              :projectId="project.id"
              group="featureLayers"
              :layer="featureLayer"
              :geopackage="geopackage"/>
        </div>
      </div>
      <div class="feature-layers">
        <div class="layer-group-header">
          Feature Layers for Conversion to Imagery Layer
        </div>
        <div v-for="featureToImageryLayer in featureToImageryLayers">
          <layer-header
            class="layer-header"
            :projectId="project.id"
            group="featureToImageryLayers"
            :layer="featureToImageryLayer"
            :geopackage="geopackage"/>
        </div>
      </div>
    </div>

    <step-buttons
        :step="geopackage.step"
        :next="next"
        :bottom="true"
        :disableNext="!atLeastOneLayer"
        :steps="5">
    </step-buttons>

  </div>

</template>

<script>
  import { mapActions } from 'vuex'
  import LayerHeader from './LayerHeader'
  import StepButtons from './StepButtons'

  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    components: {
      LayerHeader,
      StepButtons
    },
    computed: {
      atLeastOneLayer () {
        return Object.values(this.imageryLayers).some((imageryLayer) => {
          return imageryLayer.included
        }) || Object.values(this.featureLayers).some((featureLayer) => {
          return featureLayer.included
        }) || Object.values(this.featureToImageryLayers).some((layer) => {
          return layer.included
        })
      }
    },
    methods: {
      ...mapActions({
        updateGeopackageLayers: 'Projects/updateGeopackageLayers',
        setGeoPackageStepNumber: 'Projects/setGeoPackageStepNumber'
      }),
      next () {
        this.updateGeopackageLayers({
          projectId: this.project.id,
          imageryLayers: this.imageryLayers,
          featureLayers: this.featureLayers,
          featureToImageryLayers: this.featureToImageryLayers,
          geopackageId: this.geopackage.id
        })
        let nextStep = this.geopackage.step + 1
        if (Object.values(this.imageryLayers).filter((layer) => {
          return layer.included
        }).length === 0) {
          if (Object.values(this.featureLayers).filter((layer) => {
            return layer.included
          }).length === 0) {
            nextStep += 2
          } else {
            nextStep += 1
          }
        }
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: nextStep
        })
      }
    },
    created: function () {
      this.imageryLayers = this.geopackage.imageryLayers || {}
      this.featureLayers = this.geopackage.featureLayers || {}
      this.featureToImageryLayers = this.geopackage.featureToImageryLayers || {}
    }
  }
</script>

<style scoped>
  .layer-group-header {
    font-size: 1.2em;
    font-weight: bold;
    text-align: left;
  }
  .layer-header {
    border: 1px solid rgba(54, 62, 70, .5);
    border-radius: 5px;
    height: 3em;
    margin-top: 1em;
    margin-bottom: 1em;
  }

  .instruction {
    margin-bottom: 1em;
  }

  .instruction-title {
    font-size: 1.5em;
    font-weight: bold;
    text-align: left;
  }

  .instruction-detail {
    font-size: .9em;
    text-align: left;
  }
</style>
