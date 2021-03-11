<template>
  <v-switch :disabled="disabled || errored" v-model="model" :loading="loadingContent ? 'primary' : false" color="primary" dense hide-details @click.stop.prevent="" @change="visibilityChanged"></v-switch>
</template>

<script>
  import _ from 'lodash'
  import EventBus from '../../EventBus'
  import ActionUtilities from '../../lib/ActionUtilities'

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
    computed: {
      errored: {
        get () {
          return !_.isNil(this.source) && !_.isNil(this.source.error)
        }
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
        let value = this.model
        ActionUtilities.setDataSourceVisible({projectId: this.projectId, sourceId: this.source.id, visible: value})
      },
      initializing () {
        this.loadingContent = true
      },
      initialized () {
        this.loadingContent = false
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
      EventBus.$on(EventBus.EventTypes.SOURCE_INITIALIZED(this.source.id), this.initialized)
      EventBus.$on(EventBus.EventTypes.SOURCE_INITIALIZING(this.source.id), this.initializing)
      EventBus.$emit(EventBus.EventTypes.REQUEST_SOURCE_INIT_STATUS, this.source.id)
    },
    beforeDestroy: function () {
      EventBus.$off(EventBus.EventTypes.SOURCE_INITIALIZED(this.source.id), this.initialized)
      EventBus.$off(EventBus.EventTypes.SOURCE_INITIALIZING(this.source.id), this.initializing)
    }
  }
</script>

<style scoped>

</style>
