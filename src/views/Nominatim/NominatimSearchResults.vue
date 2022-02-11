<template>
  <nominatim-result-details v-if="selectedResult" :project="project" :result="selectedResult" :back="deselectResult"></nominatim-result-details>
  <v-sheet v-else class="mapcache-sheet background">
    <v-toolbar
        dark
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title>Search results</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="clearResults"><v-icon>{{mdiClose}}</v-icon></v-btn>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-virtual-scroll
          v-if="results != null && results.featureCollection != null && results.featureCollection.features.length > 0"
          :items="results.featureCollection.features.concat({type: 'END'})"
          :bench="10"
          item-height="105"
      >
        <template v-slot:default="{ item }">
          <v-list-item
              class="background"
              style="height: 104px;"
              v-if="item.type !== 'END'"
              three-line
              @click="(e) => selectResult(e, item)"
              v-on:mouseover="() => highlightFeatureOnMap(item, true)"
              v-on:mouseout="() => highlightFeatureOnMap(item, false)"
              v-on:blur="() => highlightFeatureOnMap(item, false)"
          >
            <v-list-item-content>
              <v-list-item-title class="mb-2">{{ item.properties.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ prettyifyWords(item.properties.type, true) + ' • ' + prettyifyWords(item.properties.category, true) }}</v-list-item-subtitle>
              <v-list-item-subtitle>{{ prettyifyAddress(item.properties) }}</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-avatar
                right
                rounded
                v-if="getImage(item) != null"
                size="72"
            >
              <v-img
                  :alt="item.properties.name"
                  :src="getImage(item)"
              ></v-img>
            </v-list-item-avatar>
          </v-list-item>
          <v-divider  v-if="item.type !== 'END'"></v-divider>
          <div v-if="item.type === 'END'">
            <div v-if="!noMoreResults && results.featureCollection.features.length % 10 === 0">
              <search-result-skelton :key="'top_search_skeleton'" v-observe-visibility="visibilityChanged"></search-result-skelton>
              <search-result-skelton v-for="i in 9" :key="i + '_search_skeleton'"></search-result-skelton>
            </div>
            <v-list-item three-line v-else>
              <v-list-item-content>
                <v-row class="detail--text" no-gutters justify="center">{{'No more results...' }}</v-row>
              </v-list-item-content>
            </v-list-item>
          </div>
        </template>
      </v-virtual-scroll>
      <v-list no-gutters class="pb-0" v-else-if="this.results != null">
        <v-list-item three-line>
          <v-list-item-content>
            <v-list-item-title>
              <b>No results matching "<i>{{ this.results.requestObject.q }}</i>".</b>
            </v-list-item-title>
            <v-list-item-subtitle class="pt-2">
              <p>Make sure your search is spelled correctly. Try removing or expanding the map filter.</p>
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
      </v-list>
    </v-sheet>
  </v-sheet>
</template>

<script>
import EventBus from '../../lib/vue/EventBus'
import NominatimResultDetails from '../Nominatim/NominatimResultDetails'
import {prettyifyAddress, prettyifyWords, queryWithRequestObject} from '../../lib/util/nominatim/NominatimUtilities'
import {mdiChevronLeft, mdiContentSave, mdiClose} from '@mdi/js'
import SearchResultSkelton from './SearchResultSkelton'
import isEqual from 'lodash/isEqual'

export default {
  components: {SearchResultSkelton, NominatimResultDetails},
  props: {
    project: Object,
    results: Object,
    back: Function
  },
  data () {
    return {
      selectedResult: null,
      mdiChevronLeft: mdiChevronLeft,
      mdiContentSave: mdiContentSave,
      mdiClose: mdiClose,
      fab: false,
      selection: 0,
      noMoreResults: false,
    }
  },
  mounted () {
    EventBus.$on(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, (osm_id) => {
      this.selectResult(null, this.results.featureCollection.features.find(feature => feature.properties.osm_id === osm_id))
    })
    EventBus.$on(EventBus.EventTypes.DESELECT_NOMINATIM_SEARCH_RESULT, () => {
      this.deselectResult()
    })
  },
  beforeDestroy() {
    EventBus.$off([EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, EventBus.EventTypes.DESELECT_NOMINATIM_SEARCH_RESULT])
  },
  watch: {
    results: {
      handler () {
        // check if selected result is in the list
        if (this.selectedResult != null) {
          if (this.results == null || this.results.featureCollection == null || this.results.featureCollection.features.findIndex(feature => isEqual(this.selectedResult, feature)) === -1) {
            this.selectedResult = null
          }
        }
        this.noMoreResults = false
      }
    }
  },
  methods: {
    visibilityChanged (isVisible) {
      if (isVisible && !this.noMoreResults && !this.fetching) {
        this.fetching = true
        this.fetchMore().then(() => {
          this.fetching = false
        })
      }
    },
    prettyifyWords,
    prettyifyAddress,
    highlightFeatureOnMap (item, highlight = true) {
      EventBus.$emit(EventBus.EventTypes.HIGHLIGHT_NOMINATIM_SEARCH_RESULT_ON_MAP, item.properties.osm_id, highlight)
    },
    async fetchMore () {
      // search for more by taking the current search ids out of the request
      const osmIdsToIgnore = this.results.featureCollection.features.map(feature => feature.properties.place_id)
      const queryObject = Object.assign({}, this.results.requestObject)
      queryObject.exclude_place_ids = osmIdsToIgnore.join(',')
      const result = await queryWithRequestObject(queryObject)
      if (result.error) {
        EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, result.error)
      } else if (result.featureCollection.features.length > 0) {
        result.featureCollection.features = this.results.featureCollection.features.concat(result.featureCollection.features)
        EventBus.$emit(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, result)
      } else {
        this.noMoreResults = true
      }
    },
    deselectResult () {
      if (this.selectedResult != null) {
        this.highlightFeatureOnMap(this.selectedResult, false)
      }
      this.selectedResult = null
    },
    clearResults () {
      EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
      this.noMoreResults = false
    },
    selectResult (e, item) {
      this.selectedResult = item
      this.highlightFeatureOnMap(item)
    },
    getIcon (item) {
      let icon = null
      if (item.properties && item.properties.icon) {
        icon = item.properties.icon
      }
      return icon
    },
    getImage (item) {
      let image = null
      if (item.properties && item.properties.image != null) {
        image = item.properties.image
      }
      if (image != null && image.toLowerCase().startsWith('file')) {
        image = null
      }
      return image
    }
  }
}
</script>

<style scoped>
</style>
