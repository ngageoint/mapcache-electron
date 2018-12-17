<template>
  <section :style="cssProps"
           class="layer themed"
           @click="openlayer">
    <section class="layer__part layer__back">
      <div class="layer__part__inner">
        <header class="layer__header contrast-text">
          <div class="layer__header__close-btn" @click="closelayer"></div>
          <span class="layer__header__id">{{layer.name}}</span>
        </header>
        <div class="layer__stats" :style="overviewBackgroundStyle">
          <div class="layer__stats__item layer__stats__item--req">
            <p class="layer__stats__type">Source Location</p>
            <span class="layer__stats__value">{{source.file.path}}</span>
          </div>
          <div class="layer__stats__item layer__stats__item--pledge">
            <p class="layer__stats__type">Pledge</p>
            <span class="layer__stats__value">${{layer.pledge}}</span>
          </div>
          <div class="layer__stats__item layer__stats__item--weight">
            <p class="layer__stats__type">Weight</p>
            <span class="layer__stats__value">{{layer.weight}} oz</span>
          </div>
        </div>
      </div>
    </section>
    <section class="layer__part layer__front">
      <div class="layer__part__side m--back">
        <div class="layer__part__inner layer__face">
          <div class="layer__face__colored-side"></div>
          <h3 class="layer__face__header fill-background-color">
            <div class="layer__face__source-name contrast-text">
              {{layer.name}}
            </div>
            <div class="layer-checked contrast-svg" @click.stop="toggleLayer()">
              <font-awesome-icon v-if="!layer.hidden" icon="check-square" size="sm"/>
              <font-awesome-icon v-if="layer.hidden" icon="square" size="sm"/>
            </div>
          </h3>
          <div class="layer-type-icon fill-background-color">
            <div class="contrast-svg">
              <font-awesome-icon v-if="layer.type === 'feature'" icon="vector-square" size="2x"/>
              <font-awesome-icon v-if="layer.type === 'tile'" icon="atlas" size="2x"/>
            </div>
          </div>
          <div class="layer__face__divider"></div>
          <div class="layer__face__path"></div>
          <div class="layer__face__from-to">
            <p>Lower Left: {{layer.extent[0] | latitude}}, {{layer.extent[1] | longitude}}</p>
            <p>Upper Right: {{layer.extent[2] | latitude}}, {{layer.extent[3] | longitude}}</p>
          </div>
          <div class="layer__face__deliv-date">
            &nbsp;
            <p class="layer__face__stats__weight zoom-to contrast-svg" @click.stop="zoomToExtent(layer.extent)"><font-awesome-icon icon="crosshairs" title="ZoomTo" size="lg"/></p>
          </div>
          <div class="layer__face__stats layer__face__stats--req">
            <div v-if="layer.type === 'feature'">
              Features
              <p>{{layer.count}}</p>
            </div>
          </div>
          <div class="layer__face__stats layer__face__stats--weight">
            Source
            <p class="layer__face__stats__weight">
              <span>{{source.originalType}}</span>
            </p>
          </div>
        </div>
      </div>
      <div class="layer__part__side m--front">
        <div class="layer__sender">
          <h4 class="layer__sender__heading">Sender</h4>
          <div class="layer__sender__img-cont">
            <div class="layer__sender__img-cont__inner">
              <img :src="layer.senderImg" class="layer__sender__img" />
            </div>
          </div>
          <div class="layer__sender__name-and-rating">
            <p class="layer__sender__name">{{layer.sender}}</p>
            <p :class="'layer__sender__rating layer__sender__rating-'+layer.rating">
              <span class="layer__sender__rating__star">&#9733;</span>
              <span class="layer__sender__rating__star">&#9733;</span>
              <span class="layer__sender__rating__star">&#9733;</span>
              <span class="layer__sender__rating__star">&#9733;</span>
              <span class="layer__sender__rating__star">&#9733;</span>
              <span class="layer__sender__rating__count">({{layer.ratingCount}})</span>
            </p>
            <p class="layer__sender__address">
              {{layer.fromStreet}}, {{layer.fromCity}}
            </p>
          </div>
          <div class="layer__receiver">
            <div class="layer__receiver__inner">
              <div class="layer__sender__img-cont">
                <div class="layer__sender__img-cont__inner">
                  <img :src="layer.senderImg" class="layer__sender__img" />
                </div>
              </div>
              <div class="layer__sender__name-and-rating">
                <p class="layer__sender__name">{{layer.sender}}</p>
                <p class="layer__sender__address">
                  {{layer.toStreet}}, {{layer.toCity}}
                </p>
              </div>
            </div>
          </div>
          <div class="layer__path-big"></div>
        </div>
        <div class="layer__from-to">
          <div class="layer__from-to__inner">
            <div class="layer__text layer__text--left">
              <p class="layer__text__heading">From</p>
              <p class="layer__text__middle">{{layer.fromStreet}}</p>
              <p class="layer__text__bottom">{{layer.fromCity}}</p>
            </div>
            <div class="layer__text layer__text--right">
              <p class="layer__text__heading">To</p>
              <p class="layer__text__middle">{{layer.toStreet}}</p>
              <p class="layer__text__bottom">{{layer.toCity}}</p>
            </div>
          </div>
        </div>
        <section class="layer__part layer__part-3">
          <div class="layer__part__side m--back"></div>
          <div class="layer__part__side m--front">
            <div class="layer__timings">
              <div class="layer__timings__inner">
                <div class="layer__text layer__text--left">
                  <p class="layer__text__heading">Delivery Date</p>
                  <p class="layer__text__middle">{{layer.delivTime}}</p>
                  <p class="layer__text__bottom">{{layer.delivTime}}</p>
                </div>
                <div class="layer__text layer__text--right">
                  <p class="layer__text__heading">Request Deadline</p>
                  <p class="layer__text__middle">{{layer.reqDl}}</p>
                </div>
              </div>
            </div>
            <div class="layer__timer">60 min 00 sec</div>
            <section class="layer__part layer__part-4">
              <div class="layer__part__side m--back"></div>
              <div class="layer__part__side m--front">
                <button type="button" class="layer__request-btn" @click.stop="removeLayer()">
                  <span class="layer__request-btn__text-1">Remove Layer</span>
                  <span class="layer__request-btn__text-2">Start</span>
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>
  </section>
</template>

<script>
  import fs from 'fs'
  import jetpack from 'fs-jetpack'

  let step1 = 500
  let step2 = 500
  let step3 = 500
  // let reqStep1 = 600;
  // let reqStep2 = 800;
  let reqClosingStep1 = 500
  let reqClosingStep2 = 500

  function getContrastYIQ (hexcolor) {
    var r = parseInt(hexcolor.substr(1, 2), 16)
    var g = parseInt(hexcolor.substr(3, 2), 16)
    var b = parseInt(hexcolor.substr(5, 2), 16)
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return (yiq >= 128) ? '#222' : '#eee'
  }

  export default {
    props: ['layer', 'source'],
    computed: {
      cssProps () {
        return {
          '--fill-color': this.layer.style && this.layer.style.color ? this.layer.style.color : '#FEFEFE',
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
      }
    },
    filters: {
      latitude: function (value) {
        return value.toFixed(4) + '°' + (value < 0 ? ' W' : ' E')
      },
      longitude: function (value) {
        return value.toFixed(4) + '°' + (value < 0 ? ' S' : ' N')
      }
    },
    mounted: function () {
      console.log('this.layer', this.source)
    },
    methods: {
      toggleLayer () {
        this.layer.hidden = !this.layer.hidden
        this.$emit('toggle-layer', this.layer)
      },
      zoomToExtent (extent) {
        console.log({extent})
        this.$emit('zoom-to', extent)
      },
      colorChanged (colorHex, layerId) {
        console.log('source', this.source)
        console.log('color changed arguments', arguments)
      },
      openlayer (event) {
        if (!this.active && !this.animating) {
          this.animating = true
          var $layer = event.currentTarget
          console.log($layer)
          var layerTop = $layer.clientTop
          var scrollTopVal = layerTop - 30
          $layer.classList.add('flip-step1', 'active')

          var $scrollCont = $layer.closest('.project-sidebar')

          $scrollCont.animate({scrollTop: scrollTopVal}, step1)

          setTimeout(function () {
            $scrollCont.animate({scrollTop: scrollTopVal}, step2)
            $layer.classList.add('flip-step2')

            setTimeout(function () {
              $scrollCont.animate({scrollTop: scrollTopVal}, step3)
              $layer.classList.add('flip-step3')

              setTimeout(function () {
                this.animating = false
              }.bind(this), step3)
            }.bind(this), step2 * 0.5)
          }.bind(this), step1 * 0.65)
        }
      },
      closelayer (event) {
        if (this.animating) return
        this.animating = true
        let closeButton = event.currentTarget
        var $layer = closeButton.closest('.layer')

        $layer.classList.add('req-closing1')

        setTimeout(function () {
          $layer.classList.add('req-closing2')

          setTimeout(function () {
            $layer.classList.add('no-transition', 'hidden-hack')
            // $layer.css("top");
            $layer.classList.remove('req-closing2', 'req-closing1', 'req-active2', 'req-active1', 'map-active', 'flip-step3', 'flip-step2', 'flip-step1', 'active')
            // $layer.css("top");
            $layer.classList.remove('no-transition', 'hidden-hack')
            this.animating = false
          }.bind(this), reqClosingStep2)
        }.bind(this), reqClosingStep1)
      },
      removeLayer (event) {
        this.$emit('delete-layer', this.layer, this.source)
      }
    }
  }
</script>

<style scoped>

*, *:before, *:after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #222;
  font-family: "Open Sans", Helvetica, Arial, sans-serif;
}

.layer__text__heading, .layer__sender__heading {
  font-size: 10px;
  text-transform: uppercase;
  color: #B5B5B5;
}

.layer-checked {
  margin-right: 10px;
  padding-top: 3px;
  margin-bottom: -3px;
  padding-bottom: 0px;
}

.layer {
  z-index: 1;
  position: relative;
  height: 160px;
  margin-bottom: 15px;
  -webkit-perspective: 2000px;
          perspective: 2000px;
  -webkit-transition: margin 0.4s 0.1s;
  transition: margin 0.4s 0.1s;
}
.layer.active {
  -webkit-transition: margin 0.4s;
  transition: margin 0.4s;
}
.layer.flip-step1 {
  margin-bottom: 175px;
}
.layer.flip-step2 {
  margin-bottom: 245px;
}
.layer.flip-step3 {
  margin-bottom: 330px;
}
.layer.req-active1 {
  -webkit-transition: margin 0.6s cubic-bezier(0.77, 0.03, 0.83, 0.67);
  transition: margin 0.6s cubic-bezier(0.77, 0.03, 0.83, 0.67);
  margin-bottom: 55px;
}
.layer.req-active2 {
  -webkit-transition: margin 0.6s cubic-bezier(0.31, 0.14, 0.48, 1.52);
  transition: margin 0.6s cubic-bezier(0.31, 0.14, 0.48, 1.52);
  margin-bottom: 477px;
}
.layer.req-closing1 {
  -webkit-transition: margin 0.5s;
  transition: margin 0.5s;
  margin-bottom: 175px;
}
.layer.req-closing2 {
  -webkit-transition: margin 0.5s;
  transition: margin 0.5s;
  margin-bottom: 15px;
}
.layer.hidden-hack .layer__front > .m--front {
  display: none;
}
.layer.no-transition {
  -webkit-transition: all 0s 0s !important;
  transition: all 0s 0s !important;
}
.layer.no-transition * {
  -webkit-transition: all 0s 0s !important;
  transition: all 0s 0s !important;
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
.layer.themed .layer__sender__rating__star {
  color: var(--fill-color);
}
.layer.themed .layer__path-big {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.layer__part {
  z-index: 1;
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: 11px;
  -webkit-transform-origin: 50% 0;
          transform-origin: 50% 0;
  -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
}
.layer__part__side {
  z-index: 1;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
  -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
}
.layer__part__side.m--back {
  -webkit-transform: rotateX(180deg);
          transform: rotateX(180deg);
}
.layer__part__side.m--front {
  background: #fff;
}
.layer__back {
  top: 0;
  height: 100%;
  -webkit-transition: all 0.25s;
  transition: all 0.25s;
  -webkit-transform: translateZ(-3px);
          transform: translateZ(-3px);
}
.layer.flip-step1 .layer__back {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  -webkit-transform: translateZ(0);
          transform: translateZ(0);
}
.layer.req-closing2 .layer__back {
  border-radius: 11px;
}
.layer__front {
  z-index: 6;
  top: 100%;
  height: 100%;
  -webkit-transform: rotateX(179deg) translateZ(3px);
          transform: rotateX(179deg) translateZ(3px);
  -webkit-transition: border-radius 0.25s, -webkit-transform 0.5s ease-out;
  transition: border-radius 0.25s, -webkit-transform 0.5s ease-out;
  transition: transform 0.5s ease-out, border-radius 0.25s;
  transition: transform 0.5s ease-out, border-radius 0.25s, -webkit-transform 0.5s ease-out;
}
.layer__front > .m--back {
  overflow: hidden;
  cursor: pointer;
}
.layer.flip-step1 .layer__front {
  -webkit-transform: translateZ(0);
          transform: translateZ(0);
  border-radius: 0;
}
.layer.req-active1 .layer__front {
  -webkit-transition: -webkit-transform 0.6s;
  transition: -webkit-transform 0.6s;
  transition: transform 0.6s;
  transition: transform 0.6s, -webkit-transform 0.6s;
  -webkit-transform: translate3d(0, -120px, 0);
          transform: translate3d(0, -120px, 0);
}
.layer.req-active2 .layer__front {
  -webkit-transition: -webkit-transform 0.6s cubic-bezier(0.61, 0.14, 0.18, 1.52);
  transition: -webkit-transform 0.6s cubic-bezier(0.61, 0.14, 0.18, 1.52);
  transition: transform 0.6s cubic-bezier(0.61, 0.14, 0.18, 1.52);
  transition: transform 0.6s cubic-bezier(0.61, 0.14, 0.18, 1.52), -webkit-transform 0.6s cubic-bezier(0.61, 0.14, 0.18, 1.52);
  -webkit-transform: translate3d(0, 140px, 0);
          transform: translate3d(0, 140px, 0);
}
.layer.req-closing1 .layer__front {
  -webkit-transition: -webkit-transform 0.5s;
  transition: -webkit-transform 0.5s;
  transition: transform 0.5s;
  transition: transform 0.5s, -webkit-transform 0.5s;
  -webkit-transform: translate3d(0, 0, 0);
          transform: translate3d(0, 0, 0);
}
.layer.req-closing2 .layer__front {
  -webkit-transition: border-radius, -webkit-transform;
  transition: border-radius, -webkit-transform;
  transition: transform, border-radius;
  transition: transform, border-radius, -webkit-transform;
  -webkit-transition-duration: 0.5s;
          transition-duration: 0.5s;
  -webkit-transform: rotateX(179deg) translateZ(3px);
          transform: rotateX(179deg) translateZ(3px);
  border-radius: 11px;
}
.layer__part-3 {
  top: 100%;
  height: 70px;
  -webkit-transform: rotateX(179deg) translateZ(-3px);
          transform: rotateX(179deg) translateZ(-3px);
  -webkit-transition: border-radius 0s 0.5s, -webkit-transform 0.5s;
  transition: border-radius 0s 0.5s, -webkit-transform 0.5s;
  transition: transform 0.5s, border-radius 0s 0.5s;
  transition: transform 0.5s, border-radius 0s 0.5s, -webkit-transform 0.5s;
}
.layer__part-3 > .m--back {
  background: #CCC;
}
.layer.flip-step2 .layer__part-3 {
  -webkit-transition: border-radius 0s 0s, -webkit-transform 0.5s;
  transition: border-radius 0s 0s, -webkit-transform 0.5s;
  transition: transform 0.5s, border-radius 0s 0s;
  transition: transform 0.5s, border-radius 0s 0s, -webkit-transform 0.5s;
  border-radius: 0;
  -webkit-transform: translateZ(0);
          transform: translateZ(0);
}
.layer.req-active1 .layer__part-3 {
  -webkit-transition: height, -webkit-transform;
  transition: height, -webkit-transform;
  transition: transform, height;
  transition: transform, height, -webkit-transform;
  -webkit-transition-duration: 0.6s;
          transition-duration: 0.6s;
  -webkit-transform: translate3d(0, -70px, 0);
          transform: translate3d(0, -70px, 0);
  height: 0;
}
.layer.req-active2 .layer__part-3 {
  -webkit-transition: height, -webkit-transform;
  transition: height, -webkit-transform;
  transition: transform, height;
  transition: transform, height, -webkit-transform;
  -webkit-transition-duration: 0.6s;
          transition-duration: 0.6s;
  -webkit-transform: translate3d(0, 0, 0);
          transform: translate3d(0, 0, 0);
  height: 75px;
}
.layer.req-closing1 .layer__part-3 {
  -webkit-transition: -webkit-transform 0.5s;
  transition: -webkit-transform 0.5s;
  transition: transform 0.5s;
  transition: transform 0.5s, -webkit-transform 0.5s;
  -webkit-transform: rotateX(179deg) translateZ(-3px);
          transform: rotateX(179deg) translateZ(-3px);
}
.layer.req-closing2 .layer__part-3 {
  -webkit-transition: border-radius 0.5s;
  transition: border-radius 0.5s;
  border-radius: 11px;
}
.layer__part-4 {
  top: 100%;
  height: 70px;
  -webkit-transform: rotateX(179deg) translateZ(0);
          transform: rotateX(179deg) translateZ(0);
  -webkit-transition: border-radius 0s 0s, height 0.5s, -webkit-transform 0.5s;
  transition: border-radius 0s 0s, height 0.5s, -webkit-transform 0.5s;
  transition: transform 0.5s, border-radius 0s 0s, height 0.5s;
  transition: transform 0.5s, border-radius 0s 0s, height 0.5s, -webkit-transform 0.5s;
}
.layer__part-4 > .m--back {
  background: #CCC;
}
.layer__part-4 > .m--front {
  padding: 10px 20px;
  opacity: 0;
  -webkit-transition: opacity 0s 0.5s;
  transition: opacity 0s 0.5s;
}
.layer.flip-step2 .layer__part-4 {
  -webkit-transition: border-radius 0s 0s, height 0.33s 0.165s, -webkit-transform 0.5s;
  transition: border-radius 0s 0s, height 0.33s 0.165s, -webkit-transform 0.5s;
  transition: transform 0.5s, border-radius 0s 0s, height 0.33s 0.165s;
  transition: transform 0.5s, border-radius 0s 0s, height 0.33s 0.165s, -webkit-transform 0.5s;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.layer.flip-step3 .layer__part-4 {
  -webkit-transition: border-radius 0s 0s, height 0.33s, -webkit-transform 0.5s;
  transition: border-radius 0s 0s, height 0.33s, -webkit-transform 0.5s;
  transition: transform 0.5s, border-radius 0s 0s, height 0.33s;
  transition: transform 0.5s, border-radius 0s 0s, height 0.33s, -webkit-transform 0.5s;
  height: 85px;
  -webkit-transform: translateZ(0);
          transform: translateZ(0);
}
.layer.flip-step3 .layer__part-4 > .m--front {
  opacity: 1;
  -webkit-transition: opacity 0s 0s;
  transition: opacity 0s 0s;
}
.layer.req-closing1 .layer__part-4 {
  -webkit-transition: border-radius 0.5s;
  transition: border-radius 0.5s;
  border-radius: 0;
}
.layer.req-closing2 .layer__part-4 {
  -webkit-transition: border-radius 0.5s;
  transition: border-radius 0.5s;
  border-radius: 11px;
}
.layer__part__inner {
  overflow: hidden;
  position: relative;
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
  padding: 20px 20px 15px;
}
.layer__face:after {
  content: "";
  z-index: 5;
  position: absolute;
  right: 0;
  top: 31px;
  width: 20px;
  height: 100%;
  background: -webkit-linear-gradient(left, rgba(255, 255, 255, 0), white 60%, white 100%);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), white 60%, white 100%);
}
.layer__face__colored-side {
  z-index: -1;
  position: fixed;
  left: 0;
  top: 0;
  width: 7px;
  height: 100%;
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  -webkit-transition: width 0.3s;
  transition: width 0.3s;
}
.layer__face:hover .layer__face__colored-side {
  width: 80px;
}
.layer__face__header {
  display: flex;
  align-items:center;
  margin-top: -20px;
  margin-left: -13px;
  margin-right: -20px;
  padding-left: 10px;
  padding-bottom: 4px;
  font-weight: normal;
  font-size: 22px;
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
  background-color: var(--fill-color);
}
.layer__face:hover .layer__face__header {
  color: #fff;
}
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
.contrast-svg {
  transition: color 0.3s;
  color: black;
}
.layer__face:hover .contrast-svg {
  color: var(--contrast-text-color);
}
.layer__face__divider {
  position: absolute;
  left: 80px;
  top: 36px;
  width: 1px;
  height: calc(100% - 20px);
  background: #ECECEC;
}
.layer__face__path {
  position: absolute;
  left: 105px;
  top: 54px;
  width: 2px;
  height: 23px;
}
.layer__face__path:before, .layer__face__path:after {
  content: "";
  position: absolute;
  left: -3px;
  width: 8px;
  height: 8px;
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
  position: absolute;
  left: 120px;
  top: 37px;
  width: 300px;
  color: #555A5F;
  font-size: 13px;
}
.layer__face__from-to:before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #ECECEC;
}
.layer__face__from-to p:first-child {
  margin-bottom: 15px;
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
  position: absolute;
  top: 105px;
  color: #777;
  text-transform: uppercase;
  font-size: 12px;
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
.layer__stats {
  position: relative;
  height: 120px;
  background-size: cover;
  background-position: center center;
  -webkit-transition: opacity 0.6s;
  transition: opacity 0.6s;
}
.layer__stats:before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
}
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
.layer__map {
  display: none;
  overflow: hidden;
  z-index: -1;
  position: absolute;
  left: 0;
  top: 40px;
  width: 100%;
  height: 110px;
  opacity: 0;
}
.layer.map-active .layer__map {
  display: block;
}
.layer.req-active2 .layer__map {
  -webkit-transition: height 0.48s;
  transition: height 0.48s;
  height: 310px;
  z-index: 5;
  opacity: 1;
}
.layer.req-closing1 .layer__map {
  -webkit-transition: height 0.5s;
  transition: height 0.5s;
  height: 120px;
}
.layer.req-closing2 .layer__map {
  -webkit-transition: opacity 0.5s;
  transition: opacity 0.5s;
  opacity: 0;
}
.layer__map__inner {
  position: absolute;
  left: -5%;
  top: -5%;
  width: 110%;
  height: 341px;
  -webkit-transform: scale(1);
          transform: scale(1);
  -webkit-transition: -webkit-transform 0.6s cubic-bezier(0.8, -1.4, 0.8, 1.4);
  transition: -webkit-transform 0.6s cubic-bezier(0.8, -1.4, 0.8, 1.4);
  transition: transform 0.6s cubic-bezier(0.8, -1.4, 0.8, 1.4);
  transition: transform 0.6s cubic-bezier(0.8, -1.4, 0.8, 1.4), -webkit-transform 0.6s cubic-bezier(0.8, -1.4, 0.8, 1.4);
}
.layer.req-active2 .layer__map__inner {
  -webkit-transform: scale(1.1) !important;
          transform: scale(1.1) !important;
}
.layer__sender {
  position: relative;
  height: 90px;
  padding: 10px 20px 0;
}
.layer.req-active2 .layer__sender {
  height: 160px;
}
.layer__sender:after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #ECECEC;
  -webkit-transition: opacity 0.3s;
  transition: opacity 0.3s;
  opacity: 0;
}
.layer.req-active2 .layer__sender:after {
  opacity: 1;
}
.layer__sender__heading {
  margin-bottom: 5px;
}
.layer.req-active1 .layer__sender__heading {
  -webkit-transition: opacity, margin;
  transition: opacity, margin;
  -webkit-transition-duration: 0.48s;
          transition-duration: 0.48s;
  opacity: 0;
  margin-top: -9px;
}
.layer.req-active2 .layer__sender__heading {
  pointer-events: none;
}
.layer__sender__img-cont {
  overflow: hidden;
  display: inline-block;
  vertical-align: top;
  width: 50px;
  height: 50px;
  margin-right: 5px;
  border-radius: 8px;
}
.layer__sender__img-cont__inner {
  height: 100%;
  -webkit-filter: grayscale(100%);
          filter: grayscale(100%);
}
.layer__sender__img {
  width: 100%;
  min-height: 100%;
}
.layer__sender__name-and-rating {
  overflow: hidden;
  display: inline-block;
  vertical-align: top;
  max-width: 180px;
  height: 55px;
  margin-top: -5px;
  margin-bottom: 20px;
}
.layer__sender__name {
  font-size: 18px;
  color: #3B424A;
}
.layer__sender__rating {
  font-size: 14px;
}
.layer.req-active1 .layer__sender__rating {
  -webkit-transition: opacity 0.48s;
  transition: opacity 0.48s;
  opacity: 0;
}
.layer.req-active2 .layer__sender__rating {
  display: none;
}
.layer__sender__rating__star {
  opacity: 0.3;
}
.layer__sender__rating-1 .layer__sender__rating__star:nth-child(1) {
  opacity: 1;
}
.layer__sender__rating-2 .layer__sender__rating__star:nth-child(1) {
  opacity: 1;
}
.layer__sender__rating-2 .layer__sender__rating__star:nth-child(2) {
  opacity: 1;
}
.layer__sender__rating-3 .layer__sender__rating__star:nth-child(1) {
  opacity: 1;
}
.layer__sender__rating-3 .layer__sender__rating__star:nth-child(2) {
  opacity: 1;
}
.layer__sender__rating-3 .layer__sender__rating__star:nth-child(3) {
  opacity: 1;
}
.layer__sender__rating-4 .layer__sender__rating__star:nth-child(1) {
  opacity: 1;
}
.layer__sender__rating-4 .layer__sender__rating__star:nth-child(2) {
  opacity: 1;
}
.layer__sender__rating-4 .layer__sender__rating__star:nth-child(3) {
  opacity: 1;
}
.layer__sender__rating-4 .layer__sender__rating__star:nth-child(4) {
  opacity: 1;
}
.layer__sender__rating-5 .layer__sender__rating__star:nth-child(1) {
  opacity: 1;
}
.layer__sender__rating-5 .layer__sender__rating__star:nth-child(2) {
  opacity: 1;
}
.layer__sender__rating-5 .layer__sender__rating__star:nth-child(3) {
  opacity: 1;
}
.layer__sender__rating-5 .layer__sender__rating__star:nth-child(4) {
  opacity: 1;
}
.layer__sender__rating-5 .layer__sender__rating__star:nth-child(5) {
  opacity: 1;
}
.layer__sender__rating__count {
  font-size: 12px;
  color: #8C9093;
}
.layer__sender__address {
  font-size: 12px;
  color: #8C9093;
  opacity: 0;
  pointer-events: none;
}
.layer.req-active2 .layer__sender__address {
  -webkit-transition: opacity 0.6s;
  transition: opacity 0.6s;
  opacity: 1;
  pointer-events: auto;
}
.layer__receiver {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 0;
}
.layer.req-active2 .layer__receiver {
  -webkit-transition: height 0.6s;
  transition: height 0.6s;
  height: 65px;
}
.layer__receiver__inner {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 65px;
}
.layer__path-big {
  position: absolute;
  right: 26px;
  top: 55px;
  width: 2px;
  height: 57px;
  opacity: 0;
}
.layer.req-active2 .layer__path-big {
  -webkit-transition: opacity 0.3s;
  transition: opacity 0.3s;
  opacity: 1;
}
.layer__path-big:before, .layer__path-big:after {
  content: "";
  position: absolute;
  left: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  border-color: inherit;
}
.layer__path-big:before {
  top: -13px;
}
.layer__path-big:after {
  bottom: -11px;
}
.layer__from-to {
  position: relative;
  height: 70px;
  padding: 10px 20px 0;
}
.layer.req-active1 .layer__from-to {
  -webkit-transition: opacity 0.48s;
  transition: opacity 0.48s;
  opacity: 0;
}
.layer.req-active2 .layer__from-to {
  display: none;
}
.layer__from-to__inner {
  position: relative;
  height: 100%;
}
.layer__from-to__inner:before {
  content: "";
  position: absolute;
  left: 0;
  top: -10px;
  width: 100%;
  height: 1px;
  background: #ECECEC;
}
.layer__timings {
  position: relative;
  height: 100%;
  padding: 10px 20px 0;
}
.layer.req-active1 .layer__timings {
  -webkit-transition: opacity 0.48s;
  transition: opacity 0.48s;
  opacity: 0;
}
.layer.req-active2 .layer__timings {
  display: none;
}
.layer__timings__inner {
  position: relative;
  height: 100%;
}
.layer__timer {
  display: none;
  margin-top: 22px;
  font-size: 30px;
  color: #A4ADAD;
  text-align: center;
}
.layer.req-active2 .layer__timer {
  display: block;
}
.layer__request-btn {
  position: relative;
  width: 100%;
  height: 40px;
  background-color: #C00;
  text-transform: uppercase;
  font-size: 18px;
  color: #FFF;
  outline: none;
  border: none;
  border-radius: 8px;
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
.layer__request-btn__text-2 {
  z-index: -5;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 40px;
  line-height: 40px;
  text-align: center;
  opacity: 0;
  -webkit-transition: opacity 0.6s;
  transition: opacity 0.6s;
}
.layer.req-active2 .layer__request-btn__text-2 {
  z-index: 1;
  opacity: 1;
}
.layer__request-btn:hover {
  letter-spacing: 5px;
}
.layer__counter {
  position: absolute;
  left: 0;
  top: 57px;
  width: 100%;
  font-size: 14px;
  color: #A2A2A5;
  text-align: center;
  -webkit-transition: opacity 0.48s;
  transition: opacity 0.48s;
}
.layer.req-active1 .layer__counter {
  opacity: 0;
}
.layer.req-active2 .layer__counter {
  display: none;
}


</style>
