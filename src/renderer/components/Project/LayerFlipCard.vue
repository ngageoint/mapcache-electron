<template>
  <section :style="cssProps" class="layer themed">
    <section class="layer__part layer__front">
      <div class="layer__part__side">
       <div class="layer__part__inner layer__face">
         <div class="layer__face__colored-side"></div>
         <div class="layer__face__header fill-background-color">
           <div class="layer__face__source-name contrast-text">
             {{layer.name.length > 40 ? layer.name.substring(0, 37) + "..." : layer.name}}
           </div>
           <div class="layer-checked contrast-svg-always" @click.stop="toggleProjectLayer({projectId: projectId, layerId: layer.id})">
             <font-awesome-icon v-show="layer.shown" icon="check-square" size="lg"/>
             <font-awesome-icon v-show="!layer.shown" :icon="['far', 'square']" size="lg"/>
           </div>
         </div>
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
               <p class="zoom-to contrast-svg" @click.stop="zoomToExtent(layer.extent)"><font-awesome-icon icon="crosshairs" title="ZoomTo" size="lg"/></p>
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
         <div @click.stop="openDetail" class="advanced-options">Advanced Options</div>
         <transition-expand>
           <div v-show="expanded">
             <div class="layer-type-options">
               <hr/>
               <geotiff-options v-if="layer.layerType === 'GeoTIFF'" :layer="layer" :projectId="projectId"></geotiff-options>
               <vector-options v-if="layer.pane === 'vector'" :layer="layer" :layer-key="layer.layerKey" :projectId="projectId"></vector-options>
               <div class="flex-container-row danger-div">
                 <button class="danger-button" @click.stop="removeProjectLayer({projectId: projectId, layerId: layer.id})">
                   <span >Remove Layer</span>
                 </button>
               </div>
             </div>
           </div>
         </transition-expand>
       </div>
     </div>
    </section>
  </section>
</template>

<script>
  import fs from 'fs'
  import jetpack from 'fs-jetpack'
  import TransitionExpand from '../../TransitionExpand'
  import BoundsUi from './BoundsUi'
  import GeotiffOptions from './GeotiffOptions'
  import { mapActions, mapState } from 'vuex'
  import VectorOptions from './VectorOptions'

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
      TransitionExpand,
      BoundsUi,
      GeotiffOptions
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
        }
      }),
      cssProps () {
        return {
          '--fill-color': this.layer.style && this.layer.style.fillColor ? setColorAlpha(this.layer.style.fillColor, 0.95) : 'rgba(254, 254, 254, .95)',
          '--contrast-text-color': getContrastYIQ(this.layer.style && this.layer.style.fillColor ? this.layer.style.fillColor : '#FEFEFE')
        }
      },
      overviewBackgroundStyle () {
        console.log('overviewtile', this.layer.overviewTile)
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
    mounted: function () {
      console.log('this.layer', this.layer)
    },
    methods: {
      ...mapActions({
        removeProjectLayer: 'Projects/removeProjectLayer',
        toggleProjectLayer: 'Projects/toggleProjectLayer',
        setProjectExtents: 'UIState/setProjectExtents'
      }),
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      },
      colorChanged (colorHex, layerId) {
        console.log('source', this.source)
        console.log('color changed arguments', arguments)
      },
      openDetail () {
        this.expanded = !this.expanded
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
.layer-detail {
  margin-bottom: 10px;
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
.layer-checked {
  margin-right: 6px;
  padding-top: 3px;
  padding-bottom: 0px;
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
.layer__part {
  z-index: 1;
  /* position: absolute;
  left: 0; */
  width: 100%;
  border-radius: 4px;
}
.layer__part__side {
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: rgba(255, 255, 255, .95);
  -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
  -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
}
.layer__part__side.m--front {
  background: rgba(255, 255, 255, .95);
}
.layer__front {
  z-index: 6;
  -webkit-transition: border-radius 0.25s, -webkit-transform 0.5s ease-out;
  transition: border-radius 0.25s, -webkit-transform 0.5s ease-out;
  transition: transform 0.5s ease-out, border-radius 0.25s;
  transition: transform 0.5s ease-out, border-radius 0.25s, -webkit-transform 0.5s ease-out;
}

.layer__part__inner {
  overflow: hidden;
  /* position: relative; */
  height: 100%;
  border-radius: inherit;
}
.layer__text p {
  width: 200%;
}
.layer__face {
  /* padding: 20px 20px 15px; */
}
.layer__face__colored-side {
  z-index: 100;
  position: absolute;
  left: 0;
  top: 0;
  width: 9px;
  height: 100%;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  -webkit-transition: width 0.3s;
  transition: width 0.3s;
}
.layer__face__header {
  display: flex;
  align-items:center;
  padding-left: 10px;
  font-weight: normal;
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
  background-color: var(--fill-color);
}
.layer__face__source-name {
  padding-top: 4px;
  font-size: 15px;
  font-weight: bold;
  flex: 1;
}
.contrast-text {
  color: var(--contrast-text-color);
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
.danger-div {
  flex-direction: row-reverse;
}
.danger-button {
  width: 100%;
  min-height: 2.5rem;
  margin-bottom: 10px;
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
  margin-right: 0.25rem;
  margin-left: 0.25rem;
}
.danger-button:hover {
  background-color: #9b0000;
  letter-spacing: 5px;
}
.advanced-options {
  color: rgba(68, 152, 192, .95);
  text-transform: uppercase;
  font-size: 12px;
  margin-left: 10px;
  cursor: pointer;
  margin-bottom: 10px;
}

</style>
