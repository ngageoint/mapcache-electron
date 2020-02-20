<template>
  <expandable-card :initially-expanded="layer.expanded" :on-expand-collapse="expandCollapseProjectLayer">
    <div slot="card-header">
      <v-container fluid class="pa-0 ma-0">
        <v-row class="align-center" no-gutters>
          <v-col :cols="layer.pane === 'vector' ? 9 : 11">
            <view-edit-text :value="initialDisplayName" font-size="1.25em" font-weight="700" label="Layer Name" :on-save="saveLayerName"/>
          </v-col>
          <v-col :cols="layer.pane === 'vector' ? 3 : 1">
            <v-row class="align-center justify-end mr-1" no-gutters>
              <v-btn v-if="layer.pane === 'vector'" icon color="black" @click.stop="downloadGeoPackage">
                <v-icon>mdi-download</v-icon>
              </v-btn>
              <div class="contrast-svg-always" @click.stop="toggleProjectLayer({projectId: projectId, layerId: layer.id})">
                <font-awesome-icon v-show="layer.shown" icon="check-square" size="lg"/>
                <font-awesome-icon v-show="!layer.shown" :icon="['far', 'square']" size="lg"/>
              </div>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <div slot="card-expanded-body">
      <div class="layer-body">
        <div class="layer-file-path">
          {{layer.filePath}}
        </div>
        <div class="layer-summary">
          <div class="left-side-summary layer-thumb" :style="overviewBackgroundStyle">
            <div class="layer-type-icon fill-background-color flex-the-rest">
              <div class="contrast-svg">
                <font-awesome-icon v-if="layer.pane === 'vector' || layer.pane === 'overlayPane'" icon="vector-square" size="2x"/>
                <font-awesome-icon v-if="layer.pane === 'tile' || layer.pane === 'tilePane'" icon="atlas" size="2x"/>
              </div>
            </div>
            <div class="layer-action-buttons">
              <p class="zoom-to contrast-svg" @click.stop="zoomToExtent(layer.extent)"><font-awesome-icon class="action-svg" icon="crosshairs" title="ZoomTo" size="lg"/></p>
            </div>
          </div>
          <div class="path-container">
            <div class="layer__face__path"></div>
          </div>
          <div class="flex-the-rest flex-container-column">
            <div class="flex-container-row">
              <div class="layer__face__from-to flex-the-rest">
                <bounds-ui :bounds="bounds"/>
              </div>
            </div>
            <div class="flex-container-row lower-stats">
              <div class="layer__face__stats flex-the-rest">
                Source
                <p class="layer__face__stats__weight">
                  <span>{{layer.layerType}}</span>
                </p>
              </div>
              <div class="layer__face__stats flex-the-rest">
                <div v-if="layer.pane === 'vector'">
                  Features
                  <p>{{layer.count}}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <expandable-card>
          <div slot="card-header">
            <div class="title-card">
              Style Options
            </div>
          </div>
          <div slot="card-expanded-body">
            <geotiff-options v-if="layer.layerType === 'GeoTIFF'" :layer="layer" :projectId="projectId"></geotiff-options>
            <vector-options v-if="layer.pane === 'vector'" :layer="layer" :layer-key="layer.layerKey" :projectId="projectId"></vector-options>
          </div>
        </expandable-card>
        <div class="flex-container-row danger-div">
          <button class="danger-button" @click.stop="removeProjectLayer({projectId: projectId, layerId: layer.id})">
            <span >Remove Layer</span>
          </button>
        </div>
      </div>
    </div>
  </expandable-card>
</template>

<script>
  import fs from 'fs'
  import jetpack from 'fs-jetpack'
  import BoundsUi from './BoundsUi'
  import GeotiffOptions from './GeotiffOptions'
  import { mapActions, mapState } from 'vuex'
  import VectorOptions from './VectorOptions'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import _ from 'lodash'

  let expanded = false

  function parseHexColor (hexcolor) {
    var r = parseInt(hexcolor.substr(1, 2), 16)
    var g = parseInt(hexcolor.substr(3, 2), 16)
    var b = parseInt(hexcolor.substr(5, 2), 16)
    return {r, g, b}
  }

  function getContrastYIQ (hexcolor) {
    let {r, g, b} = parseHexColor(hexcolor)
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return (yiq >= 128) ? '#222' : '#eee'
  }

  function setColorAlpha (hexcolor, alpha) {
    let {r, g, b} = parseHexColor(hexcolor)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  export default {
    props: {
      layer: Object,
      zIndex: Number,
      projectId: String
    },
    components: {
      VectorOptions,
      BoundsUi,
      GeotiffOptions,
      ViewEditText,
      ExpandableCard
    },
    data () {
      return {
        expanded
      }
    },
    computed: {
      ...mapState({
        uiState (state) {
          return state.UIState[this.projectId]
        },
        initialDisplayName () {
          return _.isNil(this.layer.displayName) ? this.layer.name : this.layer.displayName
        }
      }),
      cssProps () {
        return {
          '--fill-color': this.layer.style && this.layer.style.fillColor ? setColorAlpha(this.layer.style.fillColor, 0.95) : 'rgba(254, 254, 254, .95)',
          '--contrast-text-color': getContrastYIQ(this.layer.style && this.layer.style.fillColor ? this.layer.style.fillColor : '#FEFEFE')
        }
      },
      overviewBackgroundStyle () {
        if (this.layer.overviewTile && jetpack.exists(this.layer.overviewTile)) {
          let tile = fs.readFileSync(this.layer.overviewTile).toString('base64')
          return {
            'background-image': 'url(data:image/png;base64,' + tile + ')'
          }
        }
      },
      bounds () {
        if (this.layer.extent) {
          return [[this.layer.extent[1], this.layer.extent[0]], [this.layer.extent[3], this.layer.extent[2]]]
        }
      }
    },
    methods: {
      ...mapActions({
        setLayerDisplayName: 'Projects/setLayerDisplayName',
        removeProjectLayer: 'Projects/removeProjectLayer',
        toggleProjectLayer: 'Projects/toggleProjectLayer',
        expandProjectLayer: 'Projects/expandProjectLayer',
        setProjectExtents: 'UIState/setProjectExtents'
      }),
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      },
      openDetail () {
        this.expanded = !this.expanded
      },
      expandCollapseProjectLayer () {
        this.expandProjectLayer({projectId: this.projectId, layerId: this.layer.id})
      },
      saveLayerName (val) {
        this.setLayerDisplayName({projectId: this.projectId, layerId: this.layer.id, displayName: val})
      },
      downloadGeoPackage () {
        try {
          console.log('sending request to download ' + this.layer.geopackageFilePath)
          this.$electron.ipcRenderer.send('quick_download_geopackage', { url: this.layer.geopackageFilePath })
        } catch (error) {
          console.log(error)
        }
      }
    }
  }
</script>

<style scoped>
@import '~verte/dist/verte.css';
.layer-summary {
  position: relative;
  display: flex;
  flex-direction: row;
}
.left-side-summary {
  width: 80px;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}
.flex-the-rest {
  flex: 1;
}
.flex-container-row {
  display: flex;
  flex-direction: row;
}
.flex-container-column {
  display: flex;
  flex-direction: column;
}
.align-center {
  align-items: center;
}
.direction-reverse {
  flex-direction: row-reverse;
}
.path-container {
  width: 10px;
}
.lower-stats {
  padding-top: 12px;
  padding-bottom: 11px;
  padding-left: 10px;
  padding-right: 20px;
}

.layer-type-options {
  color: #656565;
  padding-left: 10px;
  padding-right: 10px;
}
.layer-file-path {
  color: #555A5F;
  font-size: 13px;
  margin-left: 20px;
  margin-top: 5px;
  word-wrap: break-word;
}

.layer-action-buttons {
  padding-bottom: 11px;
}

.layer {
  z-index: 1;
  position: relative;
  /* height: 160px; */
  margin-bottom: 15px;
}
.layer.themed .layer__face__colored-side {
  background: var(--fill-color);
}
.layer.themed .layer__face__path {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.layer.themed .layer__header {
  color: var(--contrast-text-color);
  background: var(--fill-color);
}
.layer.themed .layer__path-big {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.layer__text p {
  width: 200%;
}
.layer-type-icon {
  margin-top: 10px;
}
.contrast-svg-always {
  transition: color 0.3s;
  color: var(--contrast-text-color);
}
.contrast-svg {
  transition: color 0.3s;
  color: black;
}
.layer__face__path {
  position: absolute;
  left: 80px;
  top: 25px;
  width: 2px;
  height: 78px;
}
.layer__face__path:before, .layer__face__path:after {
  content: "";
  position: absolute;
  left: -3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  border: 2px solid;
  border-color: inherit;
}
.layer__face__path:before {
  top: -11px;
}
.layer__face__path:after {
  bottom: -9px;
}
.layer__face__from-to {
  color: #555A5F;
  font-size: 13px;
}
.layer__face__deliv-date p {
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
}
.layer__face__stats {
  color: #777;
  text-transform: uppercase;
  font-size: 12px;
  margin-right: 15px;
}
.layer__face__stats p {
  font-size: 15px;
  color: #777;
  font-weight: bold;
}
.layer-thumb {
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
}
.layer.req-active1 .layer__stats {
  opacity: 0;
}
.layer.req-active2 .layer__stats {
  display: none;
}
.danger-button {
  padding: 8px;
  min-height: 3rem;
  width: 100%;
  background-color: #d50000;
  text-transform: uppercase;
  font-size: 16px;
  color: #FFF;
  outline: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0;
  -webkit-transition: letter-spacing 0.3s;
  transition: letter-spacing 0.3s;
}
.danger-button:hover {
  background-color: #9b0000;
  letter-spacing: 5px;
}
.title-card {
  color: #000;
  font-size: 20px
}
.action-svg {
  cursor: pointer;
}
.layer-body {
  background-color: rgba(254, 254, 254, .95);
}
</style>
