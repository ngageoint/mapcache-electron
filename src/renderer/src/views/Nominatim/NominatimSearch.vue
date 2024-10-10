<template>
  <v-form v-on:submit.prevent="runSearch">
    <v-text-field :disabled="disableSearch"
                  style="max-width: 350px;"
                  variant="solo"
                  density="compact"
                  hide-details
                  hint="Address"
                  class="mr-0"
                  v-model="query"
                  :loading="searching"
                  clearable
                  persistent-clear
                  clear-icon="mdi-close"
                  @click:clear="clearResults">
      <template v-slot:append-inner>
        <v-tooltip location="end" :disabled="!project.showToolTips" text="Restrict search to visible area of map">
          <template v-slot:activator="{ props }">
            <v-btn style="margin-top: -2px !important;" variant="text" density="compact" :disabled="disableSearch" v-bind="props" class="mr-2 ml-2" :icon="applyViewBox ? '$mapFilterOn' : '$mapFilterOff'" :color="applyViewBox ? 'primary' : 'detail'" @click="toggleViewBoxFilter"/>
          </template>
        </v-tooltip>
        <v-divider inset vertical style="max-height: calc(100% - 8px) !important;" class="mb-0 mt-0"></v-divider>
        <v-tooltip location="end" :disabled="!project.showToolTips" text="Search">
          <template v-slot:activator="{ props }">
            <v-btn style="margin-top: -2px !important;" variant="text" density="compact" :disabled="disableSearch" v-bind="props" class="ml-2" color="primary" @click="runSearch" icon="mdi-magnify"/>
          </template>
        </v-tooltip>
      </template>
    </v-text-field>
  </v-form>
</template>

<script>
import EventBus from '../../../../lib/vue/EventBus'
import { queryNominatim } from '../../../../lib/util/nominatim/NominatimUtilities'
import { mapState } from 'vuex'
import { environment } from '../../../../lib/env/env'

export default {
  name: 'NominatimSearch',
  props: {
    project: Object,
    disableSearch: Boolean,
    mapBounds: Array
  },
  computed: {
    ...mapState({
      nominatimUrl: state => {
        return state.URLs.nominatimUrl || environment.nominatimUrl
      }
    })
  },
  data () {
    return {
      applyViewBox: false,
      query: '',
      searching: false
    }
  },
  methods: {
    toggleViewBoxFilter () {
      this.applyViewBox = !this.applyViewBox
    },
    clearResults () {
      EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
    },
    runSearch () {
      if(this.$matomo){
        this.$matomo.trackEvent("Data Source", "Nominatum query");
      }
      if (this.query == null || this.query.trim().length === 0) {
        this.searching = false
        EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
      } else {
        this.searching = true
        this.searchGeoJson(this.query).then(result => {
          if (result.error) {
            EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, result.error)
          } else {
            EventBus.$emit(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, result)
          }
          this.searching = false
        })
      }
    },
    async searchGeoJson (value) {
      let bbox = null
      if (this.applyViewBox) {
        bbox = this.mapBounds
      }
      return queryNominatim(this.nominatimUrl, value, bbox, [])
    }
  },
  mounted () {
    EventBus.$on(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, () => {
      this.selectedResult = null
      this.searching = false
      this.results = null
      this.requestingFeatures = false
      this.query = null
    })
    EventBus.$on(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, (data) => {
      if (data.reverse && data.featureCollection.features.length > 0) {
        this.query = data.featureCollection.features[0].properties.name
      }
    })
    EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
  },
  beforeDestroy () {
    EventBus.$off([EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS])
  }
}
</script>

<style scoped>
</style>
