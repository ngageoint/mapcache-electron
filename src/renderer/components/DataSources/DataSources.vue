<template>
  <div>
    <add-source :project="project"></add-source>
    <layer-flip-card
      v-for="source in project.sources"
      :key="source.id"
      class="sources"
      :layer="source"
      :projectId="project.id">
    </layer-flip-card>
  </div>
</template>

<script>
  import LayerFlipCard from './LayerFlipCard'
  import AddSource from './AddSource'

  export default {
    props: {
      project: Object
    },
    components: {
      LayerFlipCard,
      AddSource
    }
  }
</script>

<style scoped>
</style>
