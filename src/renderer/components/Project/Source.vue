<template>
  <div>
    <div v-for="layer of source.layers" class="sources" id="source-list">
      <layer-card class="sources" :card="layer" :source="source" @zoom-to="zoomToExtent" @toggle-layer="toggleLayer"></layer-card>
    </div>
  </div>
</template>

<script>
  import Verte from 'verte'
  import LayerCard from './LayerCard'

  export default {
    props: ['source'],
    components: {
      LayerCard,
      Verte
    },
    methods: {
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      toggleLayer (layer) {
        this.$emit('toggle-layer', layer)
      },
      colorChanged (colorHex, layerId) {
        console.log('source', this.source)
        console.log('color changed arguments', arguments)
      }
    }
  }
</script>

<style scoped>

  @import '~verte/dist/verte.css';

  .source-name {
    font-weight: 600;
  }

  .source {
    display: flex;
    flex-direction: row;
  }

  .sources {
    list-style: none;
    text-align: left;
  }

  .sources li.checked {
    list-style: url('../../assets/check.png');
  }

</style>
