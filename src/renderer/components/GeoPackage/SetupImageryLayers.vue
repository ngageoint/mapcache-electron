<template>
  <div class="instruction">
    <step-buttons
        :step="geopackage.step"
        :back="back"
        :next="next"
        :top="true"
        :disableNext="!allLayersValid"
        :steps="4">
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
            :projectId="project.id"
            :geopackageId="geopackage.id"
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
              {{imageryLayer.name}}
            </div>
            <imagery-options
                :projectId="project.id"
                :geopackageId="geopackage.id"
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
        :steps="4">
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
            console.log('imageryLayer.minZoom', imageryLayer.minZoom)
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
          geopackageId: this.geopackage.id
        })
        let nextStep = this.geopackage.step + 1
        if (!this.geopackage.featureLayers || !Object.keys(this.geopackage.featureLayers).length) {
          nextStep = this.geopackage.step + 2
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
  .layer-header {
    border: 1px solid rgba(54, 62, 70, .5);
    border-width: 1px;
    border-radius: 5px;
    height: 3em;
    margin-top: 1em;
    margin-bottom: 1em;
  }
  .layer-name {
    font-size: 1.3em;
    font-weight: bold;
  }
  .layer-coordinates {
    padding: 5px 10px;
  }
  .coordinate-container {
    padding-top: 5px;
  }
  .coordinate-divider {
    margin-left: 15px;
    margin-right: 15px;
  }
  .layer__horizontal__divider {
    height: 1px;
    background: #ECECEC;
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

  .instruction-buttons {
    width: 100%;
    display: flex;
    flex-flow: row;
    justify-content: center;
  }

  .instruction-buttons.top {
    padding-bottom: 1em;
  }

  .instruction-buttons.bottom {
    padding-top: 1em;
  }

  .step-indicators {
    font-size: .5em;
    line-height: 28px;
    flex-grow: 1;
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

  .current-step {
    color: rgba(68, 152, 192, .95);
  }

  .consolidated-config-chooser {
    padding-top: 1em;
    padding-bottom: 1em;
    text-align: center;
  }
</style>
