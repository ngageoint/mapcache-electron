<template>
  <v-switch :disabled="disabled || errored" v-model="model" :loading="loadingContent ? 'primary' : false" color="primary" density="compact" hide-details @click.stop="">
    <template v-slot:prepend v-if="label != null">
      <span class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginTop: '2px !important'}">{{ label }}</span>
    </template>
  </v-switch>
</template>

<script>
import isNil from 'lodash/isNil'
import { setDataSourceVisible } from '../../lib/vue/vuex/CommonActions'

export default {
  props: {
    projectId: String,
    source: Object,
    modelValue: Boolean,
    disabled: {
      type: Boolean,
      default: false
    },
    label: String
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
      model: !this.disabled && this.modelValue
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
