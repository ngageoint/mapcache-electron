<template>
  <v-list lines="two" subheader>
    <v-list-subheader>Transparency</v-list-subheader>
    <v-list-item class="pt-2">
      <div style="max-width: 100px; padding-right: 0px; padding-top: 0; padding-bottom: 0;">
        Opacity
      </div>
      <v-slider class="mx-auto" thumb-label="always" hide-details dense v-model="opacity" :min="0" :max="100"
                :interval="1">
        <template v-slot:thumb-label="{ value }">
          {{ value / 100.0 }}
        </template>
      </v-slider>
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
        updatedConfiguration.opacity = value
        this.updateConfiguration(updatedConfiguration)
      }
    }, 250)
  },
  props: {
    configuration: Object,
    updateConfiguration: Function
  },
  computed: {
    opacity: {
      get () {
        return (this.configuration.opacity === null || this.configuration.opacity === undefined ? 1.0 : this.configuration.opacity) * 100.0
      },
      set (value) {
        this.debounceOpacityUpdated(Number(value) / 100.0)
      }
    }
  }
}
</script>

<style scoped>
</style>
