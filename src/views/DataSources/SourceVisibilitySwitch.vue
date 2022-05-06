<template>
  <v-switch :disabled="disabled || errored" v-model="model" :loading="loadingContent ? 'primary' : false"
            color="primary" dense hide-details @click.stop.prevent="" @change="visibilityChanged"></v-switch>
</template>

<script>
import isNil from 'lodash/isNil'

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
        return !isNil(this.source) && !isNil(this.source.error)
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
      window.mapcache.setDataSourceVisible({ projectId: this.projectId, sourceId: this.source.id, visible: value })
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
  }
}
</script>

<style scoped>

</style>
