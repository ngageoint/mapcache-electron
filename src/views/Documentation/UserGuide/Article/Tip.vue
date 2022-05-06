<template>
  <v-row no-gutters class="tip" align="center" style="width: 616px;">
    <v-col cols="1">
      <v-icon class="pa-4">{{ mdiLightbulbOnOutline }}</v-icon>
    </v-col>
    <v-col cols="11"><p class="ma-0 pl-2 pt-2 pb-2 pr-4" v-html="tip"></p></v-col>
  </v-row>
</template>

<script>
import { mdiLightbulbOnOutline } from '@mdi/js'

export default {
  props: {
    tip: String
  },
  data () {
    return {
      mdiLightbulbOnOutline,
    }
  },
}
</script>

<style scoped>
.tip {
  border: #4e9cca solid 1px !important;
  border-radius: 4px !important;
  background: #00eeff22 !important;
}
</style>
