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

    <div class="status" v-if="geopackage.status">
      <div class="layer-status" v-for="(layerStatus, layerId) in geopackage.status.layerStatus" v-if="geopackage.featureLayers[layerId]">
        <span class="layer-name">Layer: {{geopackage.featureLayers[layerId].name}}</span>
        <div>
          <span class="layer-name">Features Added:</span>
          <span class="layer-info">{{layerStatus.featuresAdded}}</span>
        </div>
        <hr/>
      </div>

      <div class="layer-status" v-for="(layerStatus, layerId) in geopackage.status.layerStatus" v-if="geopackage.imageryLayers[layerId]">
        <span class="layer-name">Layer: {{geopackage.imageryLayers[layerId].name}}</span>
        <div>
          <span class="layer-name">Total Tiles:</span>
          <span class="layer-info">{{layerStatus.totalTileCount}}</span>
        </div>
        <div>
          <span class="layer-name">Estimated Size:</span>
          <span class="layer-info">{{(layerStatus.totalTileCount * (layerStatus.totalSize / layerStatus.tilesComplete)) | fileSize}}</span>
        </div>
        <div>
          <span class="layer-name">Total Size So Far:</span>
          <span class="layer-info">{{layerStatus.totalSize | fileSize}}</span>
        </div>
        <div>
          <span class="layer-name">Average Size Per Tile:</span>
          <span class="layer-info">{{(layerStatus.totalSize / layerStatus.tilesComplete) | fileSize}}</span>
        </div>
        <div>
          <span class="layer-name">Tiles Complete:</span>
          <span class="layer-info">{{layerStatus.tilesComplete}}</span>
        </div>
        <div>
          <span class="layer-name">Tiles Remaining:</span>
          <span class="layer-info">{{layerStatus.totalTileCount - layerStatus.tilesComplete}}</span>
        </div>
        <div>
          <span class="layer-name">Percent Complete:</span>
          <span class="layer-info">{{(100 * (layerStatus.tilesComplete / layerStatus.totalTileCount)).toFixed(2)}}%</span>
        </div>
        <div class="meter">
          <span :style="{width: 100 * (layerStatus.tilesComplete / layerStatus.totalTileCount) + '%'}"></span>
        </div>
        <div>
          <span class="layer-name">Estimated Time Remaining:</span>
          <span class="layer-info">{{layerStatus.remainingTime | time}}</span>
        </div>
        <div v-if="layerStatus.currentTile">
          <span class="layer-name">Current Zoom:</span>
          <span class="layer-info">{{layerStatus.currentTile.z}}</span>
        </div>
        <div v-if="layerStatus.currentTile">
          <span class="layer-name">Current X/Y:</span>
          <span class="layer-info">X: {{layerStatus.currentTile.x}} Y: {{layerStatus.currentTile.y}}</span>
        </div>
        <hr/>
      </div>

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
    filters: {
      fileSize: function (size) {
        let i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024))
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
      },
      time: function (seconds) {
        let hours = (seconds / 3600000)
        if (hours > 1) {
          let hourMinutes = (hours % 1) * 60
          return hours.toFixed(0) + (hours >= 2 ? ' hours ' : ' hour ') + hourMinutes.toFixed(0) + (hourMinutes >= 2 ? ' minutes' : ' minute')
        }
        let minutes = (seconds / 60000)
        if (minutes > 1) {
          return minutes.toFixed(0) + (minutes < 2 ? ' minute' : ' minutes')
        }
        return (seconds / 1000).toFixed(0) + 's'
      }
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

.meter {
	height: 20px;  /* Can be anything */
	position: relative;
	background: #555;
	-moz-border-radius: 25px;
	-webkit-border-radius: 25px;
	border-radius: 25px;
	padding: 4px;
	box-shadow: inset 0 -1px 1px rgba(255,255,255,0.3);
  box-sizing: unset;
}

.meter > span {
  display: block;
  height: 100%;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  background-color: rgba(68, 152, 192, .95);
  background-image: linear-gradient(
    center bottom,
    rgb(68, 152, 192) 37%,
    rgb(68, 152, 192) 69%
  );
  box-shadow:
    inset 0 2px 9px  rgba(255,255,255,0.3),
    inset 0 -2px 6px rgba(0,0,0,0.4);
  position: relative;
  overflow: hidden;
}

/* .feature-layer-summary {
  display: inline-block;
} */
</style>
