<template>
  <section :style="cssProps"
           class="layer themed">
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
             </div>
             <div class="layer-detail">
               <div class="layer__horizontal__divider detail-divider"></div>
               <div class="flex-container-column align-center">
                 <!-- <div class="layer__stats__item layer__stats__item--req">
                   <p class="layer__stats__type">Source Location</p>
                   <span class="layer__stats__value">{{source.file.path}}</span>
                 </div> -->
                 <button type="button" class="layer__request-btn" @click.stop="removeProjectLayer({projectId: projectId, layerId: layer.id})">
                   <span class="layer__request-btn__text-1">Remove Layer</span>
                 </button>
               </div>
             </div>
           </div>
         </transition-expand>
       </div>
     </div>
    </section>
  </section>
</div>
</template>

<script>
  import fs from 'fs'
  import jetpack from 'fs-jetpack'
  import TransitionExpand from '../../TransitionExpand'
  import BoundsUi from './BoundsUi'
  import GeotiffOptions from './GeotiffOptions'
  import { mapActions, mapState } from 'vuex'

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
          '--fill-color': this.layer.style && this.layer.style.color ? setColorAlpha(this.layer.style.color, 0.95) : 'rgba(254, 254, 254, .95)',
          '--contrast-text-color': getContrastYIQ(this.layer.style && this.layer.style.color ? this.layer.style.color : '#FEFEFE')
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
          return [[this.layer.extent[0], this.layer.extent[1]], [this.layer.extent[2], this.layer.extent[3]]]
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
      // toggleLayer () {
      //   this.layer.shown = !this.layer.shown
      //   this.$emit('toggle-layer', this.layer)
      // },
      zoomToExtent (extent) {
        console.log({extent})
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
      // ,
      // removeLayer (event) {
      //   this.$emit('delete-layer', this.layer)
      // }
    }
  }
</script>

<style scoped>

@import '~verte/dist/verte.css';

.expand-enter-active,
.expand-leave-active {
  transition-property: opacity, height;
}
.expand-enter,
.expand-leave-to {
  opacity: 0;
}

.layer-summary {
  position: relative;
  display: flex;
  flex-direction: row;
}
.layer-detail {
  margin-bottom: 10px;
}
/* .layer-summary:before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
} */
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

.layer__text__heading, .layer__sender__heading {
  font-size: 10px;
  text-transform: uppercase;
  color: #B5B5B5;
}

.layer-file-path {
  color: #555A5F;
  font-size: 13px;
  margin-left: 20px;
  margin-top: 5px;
  word-wrap: break-word;
}

.layer-style-heading {
  font-size: 10px;
  text-transform: uppercase;
  color: #656565;
  text-align: center;
  padding-bottom: 6px;
}

.layer-checked {
  margin-right: 6px;
  padding-top: 3px;
  padding-bottom: 0px;
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
.detail-divider {
  margin-top: 5px;
  margin-left: 20px;
  margin-right: 15px;
  margin-bottom: 10px;
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
.layer__part-4 {
  height: 70px;
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
  /* -webkit-transform-origin: 50% 0;
          transform-origin: 50% 0;
  -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d; */
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
/* .layer__part__side.m--back {
  -webkit-transform: rotateX(180deg);
          transform: rotateX(180deg);
} */
.layer__part__side.m--front {
  background: rgba(255, 255, 255, .95);
}
.layer__back {
  top: 0;
  height: 100%;
  -webkit-transition: all 0.25s;
  transition: all 0.25s;
  -webkit-transform: translateZ(-3px);
          transform: translateZ(-3px);
}

.layer__front {
  z-index: 6;
  /* top: 100%;
  height: 100%; */
  /* -webkit-transform: rotateX(179deg) translateZ(3px);
          transform: rotateX(179deg) translateZ(3px); */
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
.layer__text {
  overflow: hidden;
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
}
.layer__text:after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  width: 20px;
  height: 100%;
  background: -webkit-linear-gradient(left, rgba(255, 255, 255, 0), #fff);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), #fff);
}
.layer__text p {
  width: 200%;
}
.layer__text--left {
  left: 0;
}
.layer__text--right {
  left: 50%;
}
.layer__text__heading {
  line-height: 1;
  margin-bottom: 3px;
}
.layer__text__middle {
  font-size: 18px;
  line-height: 1;
  font-weight: bold;
  color: #4B4D52;
}
.layer__text__bottom {
  font-size: 14px;
  color: #555A5F;
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
/* .layer__face:hover .layer__face__colored-side {
  width: 80px;
} */
.layer__face__header {
  display: flex;
  align-items:center;
  padding-left: 10px;
  font-weight: normal;
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
  background-color: var(--fill-color);
}
/* .layer__face:hover .layer__face__header {
  color: #fff;
} */
.layer__face__source-name {
  padding-top: 4px;
  font-size: 15px;
  font-weight: bold;
  flex: 1;
}
.fill-color-background {
  background-color: var(--fill-color);
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
/* .layer__face:hover .contrast-svg {
  color: var(--contrast-text-color);
} */
.layer__face__divider {
  width: 1px;
  background: #ECECEC;
}
.layer__horizontal__divider {
  height: 1px;
  background: #ECECEC;
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

.layer__face__deliv-date {
  position: absolute;
  left: 20px;
  top: 105px;
  text-transform: uppercase;
  font-size: 12px;
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
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
.layer__face__stats--req {
  left: 100px;
}
.layer__face__stats--pledge {
  left: 190px;
}
.layer__face__stats--weight {
  left: 220px;
}
.layer__face__stats--weight p {
  text-transform: lowercase;
}
.layer__header {
  position: relative;
  height: 40px;
  color: rgba(255, 255, 255, 0.8);
}
.layer__header__close-btn {
  z-index: 2;
  position: absolute;
  left: 12px;
  top: 12px;
  width: 16px;
  height: 16px;
  -webkit-transition: -webkit-transform 0.3s;
  transition: -webkit-transform 0.3s;
  transition: transform 0.3s;
  transition: transform 0.3s, -webkit-transform 0.3s;
  cursor: pointer;
}
.layer__header__close-btn:hover {
  -webkit-transform: rotate(90deg);
          transform: rotate(90deg);
}
.layer__header__close-btn:before, .layer__header__close-btn:after {
  content: "";
  position: absolute;
  left: -4px;
  top: 7px;
  width: 23px;
  height: 2px;
  background: var(--contrast-text-color);
}
.layer__header__close-btn:before {
  -webkit-transform: rotate(45deg);
          transform: rotate(45deg);
}
.layer__header__close-btn:after {
  -webkit-transform: rotate(-45deg);
          transform: rotate(-45deg);
}
.layer__header__id {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  line-height: 40px;
  font-weight: bold;
  text-align: center;
}
.layer__header__price {
  position: absolute;
  right: 10px;
  top: 0;
  line-height: 40px;
}
.layer-thumb {
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
}
/* .layer__stats:before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
} */
.layer.req-active1 .layer__stats {
  opacity: 0;
}
.layer.req-active2 .layer__stats {
  display: none;
}
.layer__stats__item {
  position: absolute;
  bottom: 10px;
}
.layer__stats__item--req {
  z-index: 2;
  top: 0px;
  left: 20px;
}
.layer__stats__item--pledge {
  z-index: 1;
  left: 0;
  width: 100%;
  text-align: center;
}
.layer__stats__item--weight {
  z-index: 2;
  right: 20px;
  text-align: right;
}
.layer__stats__type {
  font-size: 12px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.layer__stats__value {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}

.layer__request-btn {
  position: relative;
  width: 80%;
  height: 40px;
  background-color: #C00;
  text-transform: uppercase;
  font-size: 18px;
  color: #FFF;
  outline: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0;
  -webkit-transition: letter-spacing 0.3s;
  transition: letter-spacing 0.3s;
}
.layer__request-btn__text-1 {
  -webkit-transition: opacity 0.48s;
  transition: opacity 0.48s;
}
.layer.req-active1 .layer__request-btn__text-1 {
  opacity: 0;
}
.layer.req-active2 .layer__request-btn__text-1 {
  display: none;
}
.layer__request-btn:hover {
  letter-spacing: 5px;
}
.layer-style-container {
  display: flex;
  flex-direction: row;
}
.layer-style-type {
  flex: 1;
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
