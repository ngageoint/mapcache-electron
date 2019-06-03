<template>
  <div class="instruction">
    <step-buttons
        :step="geopackage.step"
        :back="back"
        :next="next"
        :top="true"
        :disableNext="!allLayersValid"
        :steps="5">
    </step-buttons>

    <div class="instruction-title">
      Feature Layers to Imagery Layer Setup
    </div>

    <div class="instruction-detail">
      You will now specify the bounds for your imagery layer.
    </div>

    <div class="instruction-configuration">
      <feature-to-imagery-options
              :project="project"
              :geopackage="geopackage"
              :options="geopackage">
      </feature-to-imagery-options>
    </div>

    <step-buttons
        :step="geopackage.step"
        :back="back"
        :next="next"
        :bottom="true"
        :disableNext="!allLayersValid"
        :steps="5">
    </step-buttons>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import LayerHeader from './LayerHeader'
  import StepButtons from './StepButtons'
  import FeatureToImageryOptions from './FeatureToImageryOptions'

  export default {
    props: {
      geopackage: Object,
      project: Object
    },
    components: {
      LayerHeader,
      StepButtons,
      FeatureToImageryOptions
    },
    computed: {
      allLayersValid () {
        let valid = !!this.geopackage.featureImageryConversion.aoi
        if (!this.geopackage.featureImageryConversion.minZoom || !this.geopackage.featureImageryConversion.maxZoom) {
          valid = false
        }
        return valid
      }
    },
    methods: {
      ...mapActions({
        updateGeopackageLayers: 'Projects/updateGeopackageLayers',
        setGeoPackageStepNumber: 'Projects/setGeoPackageStepNumber',
        setFeatureImageryConversionAOI: 'Projects/setFeatureImageryConversionAOI'
      }),
      next () {
        this.updateGeopackageLayers({
          projectId: this.project.id,
          imageryLayers: this.geopackage.imageryLayers,
          featureLayers: this.geopackage.featureLayers,
          featureToImageryLayers: this.geopackage.featureToImageryLayers,
          geopackageId: this.geopackage.id
        })
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: this.geopackage.step + 1
        })
      },
      back () {
        let previousStep = this.geopackage.step - 1
        if (Object.values(this.geopackage.featureLayers).filter((layer) => {
          return layer.included
        }).length === 0) {
          if (Object.values(this.geopackage.imageryLayers).filter((layer) => {
            return layer.included
          }).length === 0) {
            previousStep -= 2
          } else {
            previousStep -= 1
          }
        }
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: previousStep
        })
      }
    }
  }
</script>

<style scoped>
  .instruction {
    margin-bottom: 1em;
    text-align: left;
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
