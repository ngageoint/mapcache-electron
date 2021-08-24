<template>
  <nominatim-result-details v-if="selectedResult" :project="project" :result="selectedResult" :back="() => selectedResult = null"></nominatim-result-details>
  <v-sheet v-else class="mapcache-sheet">
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
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <v-list v-if="results != null && results.features != null && results.features.length > 0">
        <template v-for="(item, i) in results.features">
          <v-list-item
              three-line
              :key="i"
              @click="(e) => selectResult(e, item)"
          >
            <v-list-item-content>
              <v-list-item-title class="mb-2">{{ item.properties.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ prettyifyWords(item.properties.type, true) + ' • ' + prettyifyWords(item.properties.category, true) }}</v-list-item-subtitle>
              <v-list-item-subtitle>{{ prettifyAddress(item.properties) }}</v-list-item-subtitle>
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
        </template>
      </v-list>
      <v-list no-gutters v-else>
        <v-list-item three-line>
          <v-list-item-content>
            <v-list-item-title>
              <b>No results matching "<i>{{ this.results.query }}</i>".</b>
            </v-list-item-title>
            <v-list-item-subtitle class="pt-2">
              <p>Make sure your search is spelled correctly. Try removing or expanding the map filter.</p>
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-sheet>
  </v-sheet>
</template>

<script>
import {mdiChevronLeft, mdiContentSave, mdiClose} from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'
// import GeometryStyleSvg from '../Common/GeometryStyleSvg'
import NominatimResultDetails from '../Nominatim/NominatimResultDetails'

export default {
  components: {NominatimResultDetails},
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
        selection: 0
      }
    },
    watch: {
      results: {
        handler () {
          this.selectedResult = null
        }
      }
    },
    methods: {
      clearResults () {
        EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
      },
      prettyifyWords (words, uppercase = false) {
        let pretty = words.toLowerCase().replaceAll('_', ' ')
        if (uppercase) {
          pretty = pretty.replace(words.charAt(0), words.charAt(0).toUpperCase())
        }
        return pretty
      },
      prettifyAddress (properties) {
        let prettyAddress = ''

        if (properties.house_number != null) {
          prettyAddress += properties.house_number + ' '
        }
        if (properties.road != null) {
          prettyAddress += properties.road + ', '
        }
        if (properties.city != null) {
          prettyAddress += properties.city + ', '
        }
        if (properties.state != null) {
          prettyAddress += properties.state + ', '
        }
        if (properties.country != null) {
          prettyAddress += properties.country
        }
        return prettyAddress
      },
      selectResult (e, item) {
        this.selectedResult = item
        this.zoomTo(e, item)
      },
      getIcon (item) {
        let icon = null
        if (item.properties && item.properties.icon) {
          icon = item.properties.icon
        }
        return icon
      },
      getGeometryTypeForItem (item) {
        let type = 1
        switch (item.geometry.type.toLowerCase()) {
          case 'point':
            type = 1
            break;
          case 'linestring':
            type = 2
            break;
          case 'polygon':
            type = 3
            break;
          case 'multipoint':
            type = 4
            break;
          case 'multilinestring':
            type = 5
            break;
          case 'multipolygon':
            type = 6
            break;
          case 'geometrycollection':
            type = 7
            break;
        }
        return type
      },
      getImage (item) {
        let image = null
        if (item.properties && item.properties.image != null) {
          image = item.properties.image
        }
        return image
      },
      saveFeature (e, item) {
        EventBus.$emit(EventBus.EventTypes.SAVE_NOMINATIM_SEARCH_RESULT, item)
        e.stopPropagation()
      },
      zoomTo (e, item) {
        EventBus.$emit(EventBus.EventTypes.ZOOM_TO, item.bbox, 0, 18)
        e.stopPropagation()
      }
    }
  }
</script>

<style scoped>
</style>
