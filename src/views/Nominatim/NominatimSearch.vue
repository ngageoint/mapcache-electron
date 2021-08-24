<template>
  <v-card-text class="ma-0 pa-0">
    <v-row no-gutters>
      <v-col>
        <v-form v-on:submit.prevent="runSearch">
          <v-text-field style="max-width: 350px;"
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
                      v-bind="attrs"
                      v-on="on"
                      class="mr-1"
                      icon
                      @click="toggleViewBoxFilter">
                    <v-icon>{{applyViewBox ? '$mapFilterOn' : '$mapFilterOff'}}</v-icon>
                  </v-btn>
                </template>
                <span>Restrict search to visible area of map</span>
              </v-tooltip>
              <v-divider inset vertical style="margin-bottom: 8px;"></v-divider>
              <v-tooltip right :disabled="!project.showToolTips">
                <template v-slot:activator="{ on, attrs }">
                  <v-btn v-bind="attrs" v-on="on" class="ml-1" style="margin-right: -8px;" color="primary" icon @click="runSearch"><v-icon>{{ mdiMagnify }}</v-icon></v-btn>
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
import keys from 'lodash/keys'
import { OpenStreetMapProvider } from 'leaflet-geosearch'
import EventBus from '../../lib/vue/EventBus'

export default {
  name: 'NominatimSearch',
  props: {
    project: Object,
    mapBounds: Array
  },
  data () {
    return {
      applyViewBox: false,
      mdiMagnify: mdiMagnify,
      query: '',
      searching: false,
      provider: null,
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
        this.searchGeoJson(this.query).then(featureCollection => {
          this.searching = false
          featureCollection.query = this.query
          EventBus.$emit(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, featureCollection)
        })
      }
    },
    async searchGeoJson (value) {
      const requestObject = {q: value, format: 'geojson', polygon_geojson: 1, addressdetails: 1, extratags: 1, namedetails: 1, limit: 10}
      if (this.applyViewBox) {
        requestObject.viewbox = this.mapBounds.join(',')
        requestObject.bounded = 1
      }
      const url = this.provider.getUrl(this.provider.searchUrl, requestObject)
      const request = await fetch(url)
      const featureCollection = await request.json()

      for (let i = 0; i < featureCollection.features.length; i++) {
        const feature = featureCollection.features[i]
        feature.properties.attribution = featureCollection.licence
        if (feature.properties && feature.properties.extratags) {
          if (feature.properties.extratags.image == null && feature.properties.extratags.wikipedia != null) {
            // try to pull wiki image
            try {
              const parts = feature.properties.extratags.wikipedia.split(':')
              const wikiReq = await fetch('https://' + parts[0] + '.wikipedia.org/w/api.php?action=query&titles=' + parts[1] +  '&prop=pageimages&format=json&pithumbsize=500')
              const wikiRes = await wikiReq.json()
              const thumbnailKeys = keys(wikiRes.query.pages).filter(key => wikiRes.query.pages[key].thumbnail != null)
              if (thumbnailKeys.length > 0) {
                feature.properties.extratags.image = wikiRes.query.pages[thumbnailKeys[0]].thumbnail.source
              }
            } catch (e) {
              console.error(e)
            }
          }
        }
        if (feature.properties.extratags) {
          keys(feature.properties.extratags).forEach(tag => {
            feature.properties[tag] = feature.properties.extratags[tag]
          })
          delete feature.properties['extratags']
        } else {
          feature.properties.image = null
          feature.properties.wikipedia = null
        }
        if (feature.properties.namedetails) {
          feature.properties.name = feature.properties.namedetails['name:en'] || feature.properties.namedetails['name'] || ''
          delete feature.properties['namedetails']
        } else {
          feature.properties.name = ''
        }
        if (feature.properties.address) {
          feature.properties.city = feature.properties.address.city || ''
          feature.properties.country = feature.properties.address.country || ''
          feature.properties.country_code = feature.properties.address.country_code || ''
          feature.properties.county = feature.properties.address.county || ''
          feature.properties.house_number = feature.properties.address.house_number || ''
          feature.properties.leisure = feature.properties.address.leisure || ''
          feature.properties.neighbourhood = feature.properties.address.neighbourhood || ''
          feature.properties.postcode = feature.properties.address.postcode || ''
          feature.properties.road = feature.properties.address.road || ''
          feature.properties.state = feature.properties.address.state || ''
          feature.properties.suburb = feature.properties.address.suburb || ''
          delete feature.properties['address']
        } else {
          feature.properties.city = ''
          feature.properties.country = ''
          feature.properties.country_code = ''
          feature.properties.county = ''
          feature.properties.house_number = ''
          feature.properties.leisure = ''
          feature.properties.neighbourhood = ''
          feature.properties.postcode = ''
          feature.properties.road = ''
          feature.properties.state = ''
          feature.properties.suburb = ''
        }
      }
      return featureCollection
    }
  },
  mounted () {
    const host = 'https://osm-nominatim.gs.mil'
    const searchUrl = `${host}/search`
    const reverseUrl = `${host}/reverse`
    this.provider = new OpenStreetMapProvider({searchUrl, reverseUrl})
    EventBus.$on(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, () => {
      this.selectedResult = null
      this.searching = false
      this.results = null
      this.requestingFeatures = false
      this.query = null
    })
    EventBus.$emit(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS)
  }
}
</script>

<style scoped>
</style>
