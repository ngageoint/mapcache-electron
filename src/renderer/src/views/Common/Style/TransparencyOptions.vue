<template>
  <v-list lines="three" subheader>
    <v-list-subheader>Transparency</v-list-subheader>
    <v-list-item class="pt-2">
      <v-slider class="mt-8 mr-8 mb-4" thumb-label="always" label="Opacity" hide-details v-model="opacity" :min="0" :max="100" :interval="1"/>
    </v-list-item>
  </v-list>
</template>

<script>
import isNil from 'lodash/isNil'
import debounce from 'lodash/debounce'

export default {
  created () {
    this.debounceOpacityUpdated = debounce((value) => {
      if (!isNil(value)) {
        let updatedConfiguration = Object.assign({}, this.configuration)
        updatedConfiguration.opacity = value / 100.0
        this.updateConfiguration(updatedConfiguration)
      }
    }, 250)
  },
  props: {
    configuration: Object,
    updateConfiguration: Function
  },
  data () {
    return {
      opacity: this.configuration.opacity === null || this.configuration.opacity === undefined ? 1.0 : this.configuration.opacity * 100.0
    }
  },
  watch: {
    opacity: {
      handler (newValue) {
        this.debounceOpacityUpdated(newValue)
      },
      deep: true
    }
  }
}
</script>

<style scoped>
</style>
