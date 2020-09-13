<template>
  <div :class="{'coordinate-container': !mini, 'mini': mini}">

    <div v-if="mini" class="mini">
      LL: {{lowerLeft[0] | latitude}}, {{lowerLeft[1] | longitude}} UR: {{upperRight[0] | latitude}}, {{upperRight[1] | longitude}}
    </div>

    <div v-if="!mini">
      <div class="layer-coordinates" v-if="lowerLeft">
        Lower Left: {{lowerLeft[0] | latitude}}, {{lowerLeft[1] | longitude}}
      </div>
      <div class="layer__horizontal__divider coordinate-divider"></div>
      <div class="layer-coordinates" v-if="upperRight">
        Upper Right: {{upperRight[0] | latitude}}, {{upperRight[1] | longitude}}
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      bounds: Array,
      mini: Boolean
    },
    filters: {
      longitude: function (value) {
        return value.toFixed(3) + '°' + (value < 0 ? ' W' : ' E')
      },
      latitude: function (value) {
        return value.toFixed(3) + '°' + (value < 0 ? ' S' : ' N')
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
  .mini {
    display: inline;
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
</style>
