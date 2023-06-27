<template>
  <v-container class="ma-0 pa-0 fab-position" v-click-outside="clickOutside">
    <v-slide-y-reverse-transition>
      <v-row v-if="activated" class="above-activator pl-2">
        <slot name="options">
        </slot>
      </v-row>
    </v-slide-y-reverse-transition>
    <v-row id="activator" no-gutters>
      <slot name="activator">
      </slot>
    </v-row>
  </v-container>
</template>

<script>

import { ClickOutside } from 'vuetify/directives'

export default {
  name: 'speed-dial',
  directives: {
    ClickOutside
  },
  props: {
    activated: Boolean,
  },
  emits: ['deactivated'],
  methods: {
    clickOutside () {
      this.$emit('deactivated')
    }
  }
}
</script>

<style scoped>
.above-activator {
  position: relative;
  bottom: 30px;
  left: 12px;
  transition-delay: 0.1s;
}
</style>
