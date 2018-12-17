<template>
  <div>
    <div v-for="layer of source.layers" class="sources" id="source-list">
      <layer-card class="sources" :layer="layer" :source="source" @zoom-to="zoomToExtent" @toggle-layer="toggleLayer" @delete-layer="deleteLayer"></layer-card>
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
      },
      deleteLayer (layer) {
        let layerIndex = this.source.layers.findIndex(function (sourceLayer) {
          return sourceLayer.id === layer.id
        })
        this.source.layers.splice(layerIndex, 1)
        this.$emit('delete-layer', layer)
        if (!this.source.layers.length) {
          this.$emit('delete-source', this.source)
        }
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
