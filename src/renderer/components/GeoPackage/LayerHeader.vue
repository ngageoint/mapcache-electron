<template>
  <div :style="cssProps" class="layer__face__header fill-background-color">
    <div class="layer__face__source-name contrast-text">
      {{layer.name}}
    </div>
    <div class="layer-checked contrast-svg-always" @click.stop="layerClicked()">
      <font-awesome-icon v-show="layer.included" icon="check-square" size="lg"/>
      <font-awesome-icon v-show="!layer.included" :icon="['far', 'square']" size="lg"/>
    </div>
  </div>
</template>

<script>
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
    props: ['layer', 'geopackage'],
    computed: {
      cssProps () {
        return {
          '--fill-color': this.layer.style && this.layer.style.color ? setColorAlpha(this.layer.style.color, 0.95) : 'rgba(254, 254, 254, .95)',
          '--contrast-text-color': getContrastYIQ(this.layer.style && this.layer.style.color ? this.layer.style.color : '#FEFEFE')
        }
      }
    },
    methods: {
      layerClicked () {
        this.layer.included = !this.layer.included
        this.$emit('layer-included', {
          layerId: this.layer.id,
          included: this.layer.included
        })
      }
    }
  }
</script>

<style scoped>
  .layer-checked {
    margin-right: 6px;
    padding-top: 3px;
    padding-bottom: 0px;
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
    font-size: 1.5rem;
    font-weight: bold;
    flex: 1;
  }
  .fill-color-background {
    background-color: var(--fill-color);
  }
  .contrast-text {
    color: var(--contrast-text-color);
  }
  .contrast-svg-always {
    transition: color 0.3s;
    color: var(--contrast-text-color);
  }
</style>
