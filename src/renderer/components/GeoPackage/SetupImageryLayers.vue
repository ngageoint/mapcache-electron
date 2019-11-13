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
      Imagery Layers Setup
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
              :class="{selected: geopackage.imageryLayersShareBounds === true}"
              @click.stop="useSameConfigurations()">
            Use The Same Configuration For All Layers
          </a>
        </div>
        <div>
          <a class="step-button"
              :class="{selected: geopackage.imageryLayersShareBounds === false}"
              @click.stop="useDifferentConfigurations()">
            Use Different Configurations Per Layer
          </a>
        </div>
      </div>

      <div v-if="geopackage.imageryLayersShareBounds === true">
        <imagery-options
            :project="project"
            :geopackage="geopackage"
            :options="geopackage">
        </imagery-options>
      </div>

      <div v-if="geopackage.imageryLayersShareBounds === false">
        <div class="layer-group-header">
          Layers
        </div>

        <hr/>
        <div class="imagery-layers">
          <div v-for="imageryLayer in geopackage.imageryLayers" v-if="imageryLayer.included">
            <div class="layer-name">
              {{imageryLayer.displayName}}
            </div>
            <imagery-options
                :project="project"
                :geopackage="geopackage"
                :options="imageryLayer"
                :layer="project.layers[imageryLayer.id]">
              </imagery-options>
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
  import ImageryOptions from './ImageryOptions'

  export default {
    props: {
      geopackage: Object,
      project: Object
    },
    components: {
      LayerHeader,
      StepButtons,
      ImageryOptions
    },
    computed: {
      allLayersValid () {
        if (this.geopackage.imageryLayersShareBounds) {
          return !!this.geopackage.imageryAoi
        } else {
          return Object.values(this.geopackage.imageryLayers).some((imageryLayer) => {
            return imageryLayer.included && (!!imageryLayer.aoi && imageryLayer.minZoom !== undefined && !isNaN(Number(imageryLayer.minZoom)) && imageryLayer.maxZoom !== undefined && !isNaN(Number(imageryLayer.maxZoom)))
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateGeopackageLayers: 'Projects/updateGeopackageLayers',
        setGeoPackageStepNumber: 'Projects/setGeoPackageStepNumber',
        setImageryLayersShareBounds: 'Projects/setImageryLayersShareBounds',
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
        if (Object.values(this.geopackage.featureLayers).filter((layer) => {
          return layer.included
        }).length === 0) {
          if (Object.values(this.geopackage.featureToImageryLayers).filter((layer) => {
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
      },
      back () {
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: this.geopackage.step - 1
        })
      },
      useDifferentConfigurations () {
        this.setImageryLayersShareBounds({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          sharesBounds: false
        })
      },
      useSameConfigurations () {
        this.setImageryLayersShareBounds({
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
