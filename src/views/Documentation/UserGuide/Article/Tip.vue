
<template>
  <v-row no-gutters class="tip" align="center" style="width: 560px;">
    <v-col cols="1"><v-icon class="pa-4">{{mdiLightbulbOnOutline}}</v-icon></v-col>
    <v-col cols="10"><p class="pa-2 ma-0" v-html="tip"></p></v-col>
  </v-row>
</template>

<script>
import {mdiLightbulbOnOutline} from '@mdi/js'

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
