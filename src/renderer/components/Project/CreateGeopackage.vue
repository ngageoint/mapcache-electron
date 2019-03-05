<template>
  <div class="geopackage-sidebar">
    <choose-layers v-if="geopackageConfiguration.step === 1" :project="project" :geopackage="geopackageConfiguration"/>
    <setup-imagery-layers v-if="geopackageConfiguration.step === 2" :project="project" :geopackage="geopackageConfiguration"/>
    {{geopackageConfiguration}}
    <!-- <div class="project-name">
      Create GeoPackage
    </div>
    <div class="instruction" :class="{incomplete : !geopackageConfiguration.aoi, complete : geopackageConfiguration.aoi}">
      <div class="instruction-title">
        1) Specify the AOI
      </div>
      <div class="instruction-detail">
        Draw an AOI on the map to specify what will be included in the GeoPackage.  This AOI will be used for all layers that are selected.
      </div>
      <bounds-ui v-if="geopackageConfiguration.aoi" :bounds="geopackageConfiguration.aoi"/>
    </div>
    <div class="instruction" :class="{incomplete : (!geopackageConfiguration.minZoom || !geopackageConfiguration.maxZoom), complete : (geopackageConfiguration.minZoom && geopackageConfiguration.maxZoom)}">
      <div class="instruction-title">
        2) Specify zoom levels
      </div>
      <div class="instruction-detail">
        Specify zoom levels to create in the GeoPackage
      </div>
      <form class="zoom-form">
        <div :class="{'invalid-label': !minZoomValid, 'valid-label': minZoomValid}">
          <label for="minzoom">Min Zoom</label>
          <input
            id="minzoom"
            v-model="minZoom"
            type="number"
            name="minzoom"
            min="0"
            max="18">
        </div>
        <div :class="{'invalid-label': !maxZoomValid, 'valid-label': maxZoomValid}">
          <label for="maxzoom">Max Zoom</label>
          <input
            id="maxzoom"
            v-model="maxZoom"
            type="number"
            name="maxzoom"
            min="0"
            max="18">
        </div>
      </form>
    </div>
    <div class="instruction">
      <div class="instruction-title">
        3) Verify Selected Layer Options
      </div>
      <div class="instruction-detail">
        Layers that will be included in the GeoPackage
      </div>
      <div class="instruction-content">
        <div v-for="layer in project.layers" :key="layer.id">
          Layer:
          {{layer.name}}
        </div>
      </div>
    </div>
    <div class="instruction" :class="{complete: geopackageConfiguration.fileName}">
      <div class="instruction-title">
        4) Choose where to save the GeoPackage
      </div>
      <div class="instruction-detail">
        {{geopackageConfiguration.fileName}}
      </div>
      <a class="choose-gp-button" @click.stop="chooseSaveLocation()">Choose File Location</a>
    </div>
    <a class="choose-gp-button" @click.stop="createGeoPackage()">GO!</a>
    <div>
      {{project}}
    </div> -->
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import { remote } from 'electron'
  import GeoPackageBuilder from '../../../lib/source/GeoPackageBuilder'
  import FloatLabels from 'float-labels.js'
  import BoundsUi from './BoundsUi'
  import ChooseLayers from '../GeoPackage/ChooseLayers'
  import SetupImageryLayers from '../GeoPackage/SetupImageryLayers'

  export default {
    props: ['project'],
    components: {
      BoundsUi,
      ChooseLayers,
      SetupImageryLayers
    },
    computed: {
      geopackageConfiguration () {
        return this.project.geopackages[this.project.currentGeoPackage]
      },
      minZoomValid () {
        return this.minZoom >= 0 && this.minZoom <= 18 && this.minZoom <= this.maxZoom
      },
      maxZoomValid () {
        return this.maxZoom <= 18 && this.maxZoom >= 0 && this.maxZoom >= this.minZoom
      },
      minZoom: {
        get () {
          return this.geopackageConfiguration.minZoom
        },
        set (value) {
          this.persistMinZoom({projectId: this.project.id, geopackageId: this.geopackageConfiguration.id, minZoom: value})
        }
      },
      maxZoom: {
        get () {
          return this.geopackageConfiguration.maxZoom
        },
        set (value) {
          this.persistMaxZoom({projectId: this.project.id, geopackageId: this.geopackageConfiguration.id, maxZoom: value})
        }
      },
      cssProps () {
        let fillColor = '#83BFC3'
        let textColor = '#111'
        if (this.source.error) {
          fillColor = '#C00'
          textColor = '#EEE'
        }
        return {
          '--fill-color': fillColor,
          '--contrast-text-color': textColor
        }
      },
      visibleLayers: function () {
        let layers = []
        for (const layerId in this.project.layers) {
          const layer = this.project.layers[layerId]
          if (layer.shown) {
            layers.push(layer)
          }
        }
        return layers
      }
    },
    methods: {
      ...mapActions({
        'persistMinZoom': 'Projects/setMinZoom',
        'persistMaxZoom': 'Projects/setMaxZoom',
        'setGeoPackageLocation': 'Projects/setGeoPackageLocation'
      }),
      chooseSaveLocation () {
        remote.dialog.showSaveDialog((fileName) => {
          if (!fileName.endsWith('.gpkg')) {
            fileName = fileName + '.gpkg'
          }
          this.setGeoPackageLocation({projectId: this.project.id, geopackageId: this.geopackageConfiguration.id, fileName})
        })
      },
      createGeoPackage () {
        console.log('Create the GeoPackage')
        let gp = new GeoPackageBuilder(this.geopackageConfiguration, this.project)
        gp.go()
      }
    },
    mounted: function () {
      let fl = new FloatLabels('.zoom-form', {
        style: 1
      })
      console.log('fl', fl)
    }
  }
</script>

<style scoped>

@import '~float-labels.js/dist/float-labels.css';

.zoom-form {
  padding-top: .75em;
  padding-left: .75em;
  padding-right: .75em;
}

.invalid-label .fl-label {
  color: red !important;
}

.valid-label .fl-label {
  color: green !important;
}

.choose-gp-button {
  border-color: rgba(54, 62, 70, .87);
  border-width: 1px;
  border-radius: 4px;
  padding: .2em;
  color: rgba(255, 255, 255, .95);
  background-color: rgba(68, 152, 192, .95);
  cursor: pointer;
}

.instruction {
  padding: .75em;
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

.project-name {
  font-size: 1.4em;
  font-weight: bold;
}

.instruction {
  color: rgba(54, 62, 70, .87);
}

.instruction.incomplete {
  color: red;
}

.instruction.complete {
  color: green;
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

</style>
