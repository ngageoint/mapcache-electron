<template>
  <v-switch :disabled="disabled" v-model="model" :loading="loadingContent ? 'primary' : false" color="primary" dense hide-details @click.stop.prevent="" @change="visibilityChanged"></v-switch>
</template>

<script>
  import EventBus from '../../EventBus'
  import ActionUtilities from '../../lib/ActionUtilities'
  import ServiceConnectionUtils from '../../lib/ServiceConnectionUtils'

  export default {
    props: {
      projectId: String,
      source: Object,
      inputValue: Boolean,
      disabled: {
        type: Boolean,
        default: false
      }
    },
    data () {
      return {
        loadingContent: false,
        model: !this.disabled && this.inputValue
      }
    },
    methods: {
      async visibilityChanged () {
        let success = true
        let value = this.model
        // making visible - ensure that a url data source is 'healthy'
        if (value && ServiceConnectionUtils.isRemoteSource(this.source)) {
          this.loadingContent = true
          success = await ServiceConnectionUtils.connectToSource(this.projectId, this.source, ActionUtilities.setDataSource)
          this.loadingContent = false
        }
        if (success) {
          ActionUtilities.setDataSourceVisible({projectId: this.projectId, sourceId: this.source.id, visible: value})
        } else {
          this.$nextTick(() => {
            this.model = false
          })
        }
      }
    },
    watch: {
      inputValue: {
        handler (newValue) {
          this.model = newValue
        }
      }
    },
    mounted () {
      EventBus.$on(EventBus.EventTypes.SOURCE_INITIALIZED(this.source.id), () => {
        this.loadingContent = false
      })
      EventBus.$on(EventBus.EventTypes.SOURCE_INITIALIZING(this.source.id), () => {
        this.loadingContent = true
      })
      if (this.inputValue) {
        EventBus.$emit(EventBus.EventTypes.REQUEST_SOURCE_INIT_STATUS, this.source.id)
      }
    },
    beforeDestroy: function () {
      EventBus.$off([EventBus.EventTypes.REQUEST_SOURCE_INIT_STATUS, EventBus.EventTypes.SOURCE_INITIALIZED(this.source.id), EventBus.EventTypes.SOURCE_INITIALIZING(this.source.id)])
    }
  }
</script>

<style scoped>

</style>
