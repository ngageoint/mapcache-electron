<template>
  <v-switch :disabled="disabled || errored" v-model="model" :loading="loadingContent ? 'primary' : false" color="primary" dense hide-details @click.stop=""/>
</template>

<script>
import isNil from 'lodash/isNil'
import { setDataSourceVisible } from '../../lib/vue/vuex/CommonActions'

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
    },
    model: {
      async handler (newValue) {
        await setDataSourceVisible(this.projectId, this.source.id, newValue)

      }
    }
  }
}
</script>

<style scoped>

</style>
