<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      dark
      color="main"
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title>{{ result.properties.name }}</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <v-row no-gutters class="background">
        <v-img
            v-if="getImage() != null"
            alt="Image"
            :src="getImage()"
            max-height="200px"
        ></v-img>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <v-col>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="allowselect" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{result.properties.display_name}}
              </p>
            </v-col>
            <v-col cols="1">
              <v-btn color="primary" icon @click="zoomTo"><v-icon>{{mdiMagnify}}</v-icon></v-btn>
            </v-col>
          </v-row>
          <v-row v-if="result.properties.country_name != null" class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Regional name
              </p>
              <p class="allowselect" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{result.properties.country_name}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Category
              </p>
              <p class="allowselect" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ prettyifyWords(result.properties.type, true) + ' • ' + prettyifyWords(result.properties.category, true) }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Address
              </p>
              <p class="allowselect" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ prettyifyAddress(result.properties) }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between" v-if="result.properties.website != null">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Website
              </p>
              <p class="fake-link allowselect" :style="{color: 'blue',fontSize: '14px', fontWeight: '500', marginBottom: '0px'}" @click="() => open(result.properties.website)">
                {{result.properties.website}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between" v-if="result.properties.wikipedia != null">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Wikipedia
              </p>
              <p class="fake-link allowselect" :style="{color: 'blue', fontSize: '14px', fontWeight: '500', marginBottom: '0px'}" @click="() => open(getWikiUrl(result.properties.wikipedia))">
                {{result.properties.wikipedia}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between" v-if="result.properties.attribution != null">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Attribution
              </p>
              <p class="allowselect" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{result.properties.attribution}}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
    <v-tooltip right :disabled="!project.showToolTips">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
            class="fab-position"
            fab
            color="primary"
            v-bind="attrs"
            v-on="on"
            @click="saveFeature">
          <v-icon>{{mdiContentSave}}</v-icon>
        </v-btn>
      </template>
      <span>Save</span>
    </v-tooltip>
  </v-sheet>
</template>

<script>
import {mdiChevronLeft, mdiContentSave, mdiMagnify} from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'
import {prettyifyWords, prettyifyAddress} from '../../lib/util/nominatim/NominatimUtilities'

export default {
  props: {
      project: Object,
      result: Object,
      back: Function
    },
    data () {
      return {
        mdiChevronLeft: mdiChevronLeft,
        mdiContentSave: mdiContentSave,
        mdiMagnify: mdiMagnify,
        fab: false,
      }
    },
    methods: {
      prettyifyWords: prettyifyWords,
      prettyifyAddress: prettyifyAddress,
      open (link) {
        window.mapcache.openExternal(link)
      },
      getWikiUrl (wiki) {
        const parts = wiki.split(':')
        return 'https://' + parts[0] + '.wikipedia.com/wiki/' + parts[1]
      },
      getIcon () {
        let icon = null
        if (this.result.properties && this.result.properties.icon) {
          icon = this.result.properties.icon
        }
        return icon
      },
      getImage () {
        let image = null
        if (this.result.properties && this.result.properties.image != null) {
          image = this.result.properties.image
        }
        return image
      },
      saveFeature () {
        EventBus.$emit(EventBus.EventTypes.SAVE_NOMINATIM_SEARCH_RESULT, this.result, this.result.properties.image)
      },
      zoomTo () {
        EventBus.$emit(EventBus.EventTypes.ZOOM_TO, this.result.bbox, 0, 18)
      }
    }
  }
</script>

<style scoped>
</style>
