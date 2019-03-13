<template>

  <div class="instruction">
    <div>
      {{includedImageryLayers.length}} Imagery Layers, and {{includedFeatureLayers.length}} Feature Layers will be added to the GeoPackage
    </div>

    <div v-if="geopackage.imageryLayersShareBounds">
      All imagery layers will share the same bounds and will be created for zoom level {{geopackage.minZoom}} to {{geopackage.maxZoom}}
    </div>

    <div v-if="!geopackage.imageryLayersShareBounds">
      Each imagery layer has specific bounds and zoom levels.
      <div v-for="imageryLayer in includedImageryLayers" class="imagery-layer-summary">
        <span class="layer-name">{{imageryLayer.name}}</span>
        <span class="layer-info">{{imageryLayer.minZoom}} - {{imageryLayer.maxZoom}}</span>
      </div>
    </div>

    <div v-if="geopackage.featureLayersShareBounds">
      All feature layers will share the same bounds
    </div>

    <div v-if="!geopackage.featureLayersShareBounds">
      Each feature layer has specific bounds.
      <div v-for="featureLayer in includedFeatureLayers" class="feature-layer-summary">
        <span class="layer-name">{{featureLayer.name}}</span>
        <span class="layer-info">
          <bounds-ui :mini="true" :bounds="featureLayer.aoi"/>
        </span>
      </div>
    </div>

    <div class="gp-save-location-button" @click.stop="chooseSaveLocation()">
      <span v-if="!geopackage.fileName">Choose GeoPackage Save Location</span>
      <span v-if="geopackage.fileName">Save To: {{geopackage.fileName}}</span>
    </div>

    <step-buttons
        :step="geopackage.step"
        :back="back"
        :bottom="true"
        :steps="geopackage.step">
    </step-buttons>

    <div
        v-if="geopackage.fileName"
        class="gp-save-location-button"
        @click.stop="createGeoPackage()">
      <span>Create The GeoPackage</span>
    </div>
  </div>

</template>

<script>
  import { mapActions } from 'vuex'
  import { remote } from 'electron'
  import StepButtons from './StepButtons'
  import BoundsUi from '../Project/BoundsUi'
  import GeoPackageBuilder from '../../../lib/source/GeoPackageBuilder'

  export default {
    props: {
      geopackage: Object,
      project: Object
    },
    components: {
      StepButtons,
      BoundsUi
    },
    computed: {
      includedFeatureLayers () {
        let featureLayers = []
        for (const featureId in this.geopackage.featureLayers) {
          let featureLayer = this.geopackage.featureLayers[featureId]
          if (featureLayer.included) {
            featureLayers.push(featureLayer)
          }
        }
        return featureLayers
      },
      includedImageryLayers () {
        let imageryLayers = []
        for (const imageryId in this.geopackage.imageryLayers) {
          let imageryLayer = this.geopackage.imageryLayers[imageryId]
          if (imageryLayer.included) {
            imageryLayers.push(imageryLayer)
          }
        }
        return imageryLayers
      }
    },
    methods: {
      ...mapActions({
        setGeoPackageStepNumber: 'Projects/setGeoPackageStepNumber',
        setGeoPackageLocation: 'Projects/setGeoPackageLocation'
      }),
      chooseSaveLocation () {
        remote.dialog.showSaveDialog((fileName) => {
          if (!fileName.endsWith('.gpkg')) {
            fileName = fileName + '.gpkg'
          }
          this.setGeoPackageLocation({projectId: this.project.id, geopackageId: this.geopackage.id, fileName})
        })
      },
      createGeoPackage () {
        console.log('Create the GeoPackage')
        let gp = new GeoPackageBuilder(this.geopackage, this.project)
        gp.go()
      },
      next () {
        // this.updateGeopackageLayers({
        //   projectId: this.project.id,
        //   imageryLayers: this.imageryLayers,
        //   featureLayers: this.featureLayers,
        //   geopackageId: this.geopackage.id
        // })
        // this.setGeoPackageStepNumber({
        //   projectId: this.project.id,
        //   geopackageId: this.geopackage.id,
        //   step: 3
        // })
      },
      back () {
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: this.geopackage.step - 1
        })
      }
    }
  }
</script>

<style scoped>

.layer-name {
  font-weight: bold;
  margin-right: 5px;
}
.layer-info {
  font-size: .9em;
}

.gp-save-location-button {
  border-color: rgba(54, 62, 70, .87);
  border-width: 1px;
  border-radius: 4px;
  padding: .2em;
  color: rgba(255, 255, 255, .95);
  background-color: rgba(68, 152, 192, .95);
  cursor: pointer;
  margin-top: 1em;
}

/* .feature-layer-summary {
  display: inline-block;
} */
</style>
