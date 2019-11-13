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
      Feature Layers Setup
    </div>

    <div class="instruction-detail">
      You will now specify the bounds for your imagery layers.  You can either set one bounds and set of zoom levels for all layers, or specify bounds and zoom levels per layer.
    </div>

    <div class="instruction-configuration">
      <div class="consolidated-config-chooser">
        <div class="layer-group-header">
          Please Choose One
        </div>

        <div>
          <a class="step-button"
              :class="{selected: geopackage.featureLayersShareBounds === true}"
              @click.stop="useSameConfigurations()">
            Use The Same Configuration For All Layers
          </a>
        </div>
        <div>
          <a class="step-button"
              :class="{selected: geopackage.featureLayersShareBounds === false}"
              @click.stop="useDifferentConfigurations()">
            Use Different Configurations Per Layer
          </a>
        </div>
      </div>

      <div v-if="geopackage.featureLayersShareBounds === true">
        <feature-options
            :project="project"
            :geopackage="geopackage"
            :options="geopackage">
        </feature-options>
      </div>

      <div v-if="geopackage.featureLayersShareBounds === false">
        <div class="layer-group-header">
          Layers
        </div>
        <hr/>

        <div class="feature-layers">
          <div v-for="featureLayer in geopackage.featureLayers" v-if="featureLayer.included">
            <div class="layer-name">
              {{featureLayer.displayName}}
            </div>
            <feature-options
                :project="project"
                :geopackage="geopackage"
                :options="featureLayer"
                :layer="project.layers[featureLayer.id]">
            </feature-options>
          </div>
        </div>
      </div>
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
  import FeatureOptions from './FeatureOptions'

  export default {
    props: {
      geopackage: Object,
      project: Object
    },
    components: {
      LayerHeader,
      StepButtons,
      FeatureOptions
    },
    computed: {
      allLayersValid () {
        if (this.geopackage.featureLayersShareBounds) {
          return !!this.geopackage.featureAoi
        } else {
          if (!this.geopackage.featureLayers || !Object.values(this.geopackage.featureLayers).length) {
            return false
          }
          return Object.values(this.geopackage.featureLayers).filter((featureLayer) => {
            return featureLayer.included
          }).every((featureLayer) => {
            return !!featureLayer.aoi
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateGeopackageLayers: 'Projects/updateGeopackageLayers',
        setGeoPackageStepNumber: 'Projects/setGeoPackageStepNumber',
        setFeatureLayersShareBounds: 'Projects/setFeatureLayersShareBounds',
        setGeoPackageAOI: 'Projects/setGeoPackageAOI'
      }),
      next () {
        this.updateGeopackageLayers({
          projectId: this.project.id,
          imageryLayers: this.geopackage.imageryLayers,
          featureLayers: this.geopackage.featureLayers,
          featureToImageryLayers: this.geopackage.featureToImageryLayers,
          geopackageId: this.geopackage.id
        })
        let nextStep = this.geopackage.step + 1
        if (Object.values(this.geopackage.featureToImageryLayers).filter((layer) => {
          return layer.included
        }).length === 0) {
          nextStep += 1
        }
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: nextStep
        })
      },
      back () {
        let previousStep = this.geopackage.step - 1
        if (Object.values(this.geopackage.imageryLayers).filter((layer) => {
          return layer.included
        }).length === 0) {
          previousStep -= 1
        }
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: previousStep
        })
      },
      useDifferentConfigurations () {
        this.setFeatureLayersShareBounds({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          sharesBounds: false
        })
      },
      useSameConfigurations () {
        this.setFeatureLayersShareBounds({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          sharesBounds: true
        })
      }
    }
  }
</script>

<style scoped>
  .layer-group-header {
    font-size: 1.2em;
    font-weight: bold;
    text-align: left;
  }

  .layer-name {
    font-size: 1.3em;
    font-weight: bold;
  }

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

  .step-button {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
    font-size: 1.2em;
    font-weight: bold;
    padding: 5px;
    border-radius: 3px;
  }

  .step-button.selected {
    background-color: rgba(68, 152, 192, .95);
    color: rgba(255, 255, 255, .95);
    cursor: pointer;
    font-size: 1.2em;
    font-weight: bold;
  }

  .step-button.back {
    text-align: left;
  }

  .step-button.next {
    text-align: right;
  }

  .consolidated-config-chooser {
    padding-top: 1em;
    padding-bottom: 1em;
    text-align: center;
  }
</style>
