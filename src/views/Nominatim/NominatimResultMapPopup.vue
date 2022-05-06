<template>
  <v-card flat class="pa-0 ma-0 rounded-lg" v-if="result != null" @click="showFeatureDetails" @mouseover="mouseover"
          @mouseleave="mouseleave">
    <v-img
        v-if="getImage() != null"
        height="104"
        :src="getImage()"
    ></v-img>
    <v-row no-gutters>
      <v-col cols="9">
        <v-card-title style="font-size: 16px;"
                      :class="getImage() != null ? ' mt-0 pt-2 pb-0 mb-0' : 'pt-2 mt-0 pb-0 mb-0'">
          {{ result.properties.name }}
        </v-card-title>
        <v-card-subtitle style="font-size: 11px; line-height: 12px;" class="pt-0 mt-0 pb-0 mb-0">
          {{ prettyifyWords(result.properties.type, true) + ' • ' + prettyifyWords(result.properties.category, true) }}
        </v-card-subtitle>
        <v-card-subtitle style="font-size: 11px; line-height: 12px;" class="pt-0 mt-0">
          {{ prettyifyAddress(result.properties) }}
        </v-card-subtitle>
      </v-col>
      <v-col class="mt-2" style="margin-left: -8px;">
        <v-btn color="primary" icon @click="zoomTo">
          <v-icon>{{ mdiMagnify }}</v-icon>
        </v-btn>
        <v-btn color="primary" icon @click="saveFeature">
          <v-icon>{{ mdiContentSaveOutline }}</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script>
import { mdiContentSaveOutline, mdiMagnify } from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'
import { prettyifyAddress, prettyifyWords } from '../../lib/util/nominatim/NominatimUtilities'

export default {
  props: {
    result: Object,
    mouseover: Function,
    mouseleave: Function
  },
  data () {
    return {
      mdiContentSaveOutline: mdiContentSaveOutline,
      mdiMagnify: mdiMagnify
    }
  },
  methods: {
    prettyifyWords: prettyifyWords,
    prettyifyAddress: prettyifyAddress,
    getImage () {
      let image = null
      if (this.result.properties && this.result.properties.image != null) {
        image = this.result.properties.image
      }
      return image
    },
    showFeatureDetails (e) {
      EventBus.$emit(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, this.result.properties.osm_id)
      e.preventDefault()
      e.stopPropagation()
    },
    saveFeature (e) {
      EventBus.$emit(EventBus.EventTypes.SAVE_NOMINATIM_SEARCH_RESULT, this.result, this.result.properties.image)
      e.stopPropagation()
    },
    zoomTo (e) {
      EventBus.$emit(EventBus.EventTypes.ZOOM_TO, this.result.bbox, 0, 18)
      e.stopPropagation()
    }
  }
}
</script>

<style scoped>
.v-card__text, .v-card__title {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  word-break: break-all !important;
  flex-wrap: nowrap;
  display: block;
}
</style>
