<template>
  <v-switch :input-value="inputValue" :loading="loadingContent ? 'primary' : false" color="primary" dense hide-details @click.stop.prevent="changeVisibility"></v-switch>
</template>

<script>
  import EventBus from '../../EventBus'
  import ActionUtilities from '../../lib/ActionUtilities'

  export default {
    props: {
      projectId: String,
      sourceId: String,
      inputValue: Boolean
    },
    data () {
      return {
        loadingContent: false
      }
    },
    methods: {
      changeVisibility () {
        ActionUtilities.setDataSourceVisible({projectId: this.projectId, sourceId: this.sourceId, visible: !this.inputValue})
      }
    },
    mounted () {
      EventBus.$on('source-initialized-' + this.sourceId, () => {
        this.loadingContent = false
      })
      EventBus.$on('source-initializing-' + this.sourceId, () => {
        this.loadingContent = true
      })
      if (this.inputValue) {
        EventBus.$emit('request-source-initialization-status', this.sourceId)
      }
    }
  }
</script>

<style scoped>

</style>
