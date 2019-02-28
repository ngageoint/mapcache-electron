<template>
<div class="coordinate-container">
  <div class="layer-coordinates">Lower Left: {{lowerLeft[0] | latitude}}, {{lowerLeft[1] | longitude}}</div>
  <div class="layer__horizontal__divider coordinate-divider"></div>
  <div class="layer-coordinates">Upper Right: {{upperRight[0] | latitude}}, {{upperRight[1] | longitude}}</div>
</div>
</template>

<script>
  export default {
    props: ['bounds'],
    filters: {
      latitude: function (value) {
        return value.toFixed(4) + '°' + (value < 0 ? ' W' : ' E')
      },
      longitude: function (value) {
        return value.toFixed(4) + '°' + (value < 0 ? ' S' : ' N')
      }
    },
    computed: {
      lowerLeft () {
        return this.bounds[0]
      },
      upperRight () {
        return this.bounds[1]
      }
    }
  }
</script>

<style>
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
</style>
