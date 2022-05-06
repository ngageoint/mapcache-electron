<template>
  <v-card-text class="ma-0 pa-0">
    <v-row no-gutters>
      <v-col>
        <v-form v-on:submit.prevent="runSearch">
          <v-text-field :disabled="disableSearch"
                        style="max-width: 350px;"
                        solo
                        dense
                        hide-details
                        hint="Address"
                        class="mr-0"
                        v-model="query"
                        :loading="searching"
                        clearable
                        @click:clear="clearResults">
            <template slot="append">
              <v-tooltip right :disabled="!project.showToolTips">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                      :disabled="disableSearch"
                      v-bind="attrs"
                      v-on="on"
                      class="mr-1"
                      icon
                      :color="applyViewBox ? 'primary' : ''"
                      @click="toggleViewBoxFilter">
                    <v-icon>{{ applyViewBox ? '$mapFilterOn' : '$mapFilterOff' }}</v-icon>
                  </v-btn>
                </template>
                <span>Restrict search to visible area of map</span>
              </v-tooltip>
              <v-divider inset vertical style="margin-bottom: 8px;"></v-divider>
              <v-tooltip right :disabled="!project.showToolTips">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn :disabled="disableSearch" v-bind="attrs" v-on="on" class="ml-1" style="margin-right: -8px;"
                         color="primary" icon @click="runSearch">
                    <v-icon>{{ mdiMagnify }}</v-icon>
                  </v-btn>
                </template>
                <span>Search</span>
              </v-tooltip>
            </template>
          </v-text-field>
        </v-form>
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script>
import { mdiMagnify } from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'
import { queryNominatim } from '../../lib/util/nominatim/NominatimUtilities'
import { mapState } from 'vuex'
import { environment } from '../../lib/env/env'

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
      mdiMagnify: mdiMagnify,
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
