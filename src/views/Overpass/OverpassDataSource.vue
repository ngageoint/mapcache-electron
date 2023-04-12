<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
        theme="dark"
        flat
        class="sticky-toolbar"
    >
      <v-icon>{{ mdiSteering }}</v-icon>
      <v-toolbar-title>Overpass feature download</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content">
      <v-stepper v-model="step" class="background" non-linear vertical
                 :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => dataSourceNameValid]" color="primary">
          Name the data source
          <small class="pt-1">{{ dataSourceName }}</small>
        </v-stepper-step>
        <v-stepper-content step="1" class="mt-0 pt-0">
          <v-card flat tile>
            <v-card-subtitle class="mt-0 pt-0">
              Specify a name for this data source.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="dataSourceNameForm" v-model="dataSourceNameValid">
                <v-text-field
                    variant="underlined"
                    autofocus
                    v-model="dataSourceName"
                    :rules="dataSourceNameRules"
                    label="Data source name"
                    required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 2" :disabled="!dataSourceNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" :rules="[() => contentSelection === 0 || overpassGeneratedQueryValid || step < 3]" color="primary">
          Specify content to download
          <small class="pt-1">{{contentSelection === 0 ? 'Category' : 'Search'}}</small>
        </v-stepper-step>
        <v-stepper-content step="2" class="mt-0 pt-0">
          <v-card-subtitle class="mt-0 pt-0">
            Select a method for specifying content.
          </v-card-subtitle>
          <v-btn-toggle borderless dense v-model="contentSelection" class="pt-2 pb-4 pl-4" mandatory>
            <v-btn width="136">
              Category
            </v-btn>
            <v-btn width="136">
              Search
            </v-btn>
          </v-btn-toggle>
          <v-card v-if="contentSelection === 0" flat tile>
            <v-card-subtitle class="mt-0 pt-0 pb-6">
              Select categories to download. Leave this field blank to retrieve all features within the
              bounding box.
            </v-card-subtitle>
            <v-card-text>
              <v-autocomplete
                  @change="searchInput = ''"
                  v-model="categorySelection"
                  :items="categories"
                  label="Categories"
                  auto-select-first
                  multiple
                  clearable
                  :search-input.sync="searchInput"
              >
                <template v-slot:selection="{ item, index }">
                  <v-chip v-if="index === 0">
                    <span>{{ item }}</span>
                  </v-chip>
                  <span
                      v-if="index === 1"
                      class="grey--text text-caption"
                  >
                    &nbsp;+{{ categorySelection.length - 1 }}&nbsp;{{ categorySelection.length - 1 === 1 ?  'other' : 'others'}}&nbsp;&nbsp;
                  </span>
                </template>
              </v-autocomplete>
            </v-card-text>
          </v-card>
          <v-card v-else flat tile>
            <v-card-subtitle class="mt-0 pt-0 pb-6">
              Specify the overpass search term. Leave this field blank to retrieve all features within the bounding box.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="urlForm" v-model="overpassGeneratedQueryValid">
                <v-row no-gutters justify="space-between">
                  <v-text-field
                      variant="underlined"
                      v-model="overpassSearchTerm"
                      :rules="overpassSearchRules"
                      label="Overpass search term"
                      required
                      :hint="hintText"
                      persistent-hint
                      clearable
                  ></v-text-field>
                </v-row>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 3" :disabled="contentSelection === 1 && !overpassGeneratedQueryValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 3" step="3" color="primary" :disabled="queryLocked" style="width: 100% !important;">
          <v-row no-gutters justify="space-between" style="width: 312px !important;">
            <v-col cols="10">
              Modify query<br>
              <small class="pt-1">For advanced users</small>
            </v-col>
            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn :disabled="step !== '3'" icon v-bind="props" :color="queryLocked ? 'red' : 'secondary'" @click="queryLocked = !queryLocked"><v-icon>{{queryLocked ? mdiLock : mdiLockOpen}}</v-icon></v-btn>
              </template>
              <span>{{queryLocked ? 'Unlock' : 'Lock'}}</span>
            </v-tooltip>
          </v-row>
        </v-stepper-step>
        <v-stepper-content step="3" :disabled="queryLocked">
          <v-card flat tile>
            <v-card-subtitle class="pb-0 mb-0 mt-0 pt-0">
              Click the lock button to make edits to the auto-generated query.
            </v-card-subtitle>
            <v-card-text class="mt-0 pt-0 pr-0">
              <v-textarea label="Overpass query" :rows="3" :disabled="queryLocked" v-model="overpassQuery"></v-textarea>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 4" step="4"
                        :rules="[() => (overpassBoundingBox || Number(step) < 5) && (!isEditingBoundingBox() || (Number(step) === 4))]"
                        color="primary">
          Specify bounding box
          <small
              class="pt-1">{{
              isEditingBoundingBox() ? 'Editing bounding box' : (overpassBoundingBox ? 'Bounding box set' : 'Bounding box not set')
            }}</small>
        </v-stepper-step>
        <v-stepper-content step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Restrict your Overpass query to a specified area on the map.
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" :project="project" :boundingBox="overpassBoundingBox"
                                 :update-bounding-box="updateOverpassBoundingBox"></bounding-box-editor>
            <v-card-subtitle v-if="isBlank(overpassSearchTerm) && exceedsBoundingBoxAreaThreshold" class="hazard--text">
              <b>Your bounding box has an area of approximately {{ boundingBoxArea }} square miles. Requests with an
                area over 10 square miles may take several minutes to process.</b>
            </v-card-subtitle>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 5" step="5" color="primary" :rules="[() => clipBufferValid]">
          Feature clipping
          <small class="pt-1">{{clipBufferValid ? (clipFeatures ? ('Enabled (' + clipBuffer + '%)') : 'Disabled') : 'Invalid buffer percentage'}}</small>
        </v-stepper-step>
        <v-stepper-content step="5">
          <v-card flat tile>
            <v-card-subtitle>
              The features returned may extend beyond the bounding box set above. If you would like to clip those features, enable clipping and specify a buffer around the bounding box.
            </v-card-subtitle>
            <v-card-text>
              <v-switch :disabled="overpassBoundingBox == null || isEditingBoundingBox()" v-model="clipFeatures" label="Clip features"/>
              <number-picker suffix="%" :disabled="overpassBoundingBox == null || isEditingBoundingBox() || !clipFeatures" :number="clipBuffer" :label="'Bounding box buffer'" :step="5" :min="0"
                             @update-valid="(v) => {this.clipBufferValid = v}"
                             @update-number="(val) => {this.clipBuffer = val}"></number-picker>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 6">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :step="6" color="primary">
          Summary
        </v-stepper-step>
        <v-stepper-content :step="6" :rules="[() => (overpassBoundingBox || !isEditingBoundingBox() || overpassGeneratedQueryValid || step < 6)]">
          <v-card flat tile>
            <v-card-text v-if="overpassGeneratedQueryValid">
              Data retrieved using the OSM Overpass API
              <b>{{ this.overpassSearchTerm !== '' ? ('for the search term ' + this.overpassSearchTerm) : '' }}</b> will
              be imported as the <b>{{ dataSourceName }}</b> data source.
            </v-card-text>
            <v-card-text v-else>
              The search term and/or query is not valid. Please adjust your search term or query before continuing.
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
    </v-sheet>
    <div class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            text
            @click.stop.prevent="close">
          Cancel
        </v-btn>
        <v-btn
            :disabled="!importReady"
            color="primary"
            text
            @click.stop.prevent="addLayer">
          Import
        </v-btn>
      </v-card-actions>
    </div>
  </v-sheet>
</template>

<script>
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import { mdiTrashCan, mdiSteering, mdiLock, mdiLockOpen } from '@mdi/js'
import BoundingBoxEditor from '../Common/BoundingBoxEditor.vue'
import {
  getOverpassQueryFilter,
  getOverpassQueryFilterFromTags,
  generateQueryFromFilter,
  defaultQuery,
  OVERPASS_SQ_MI_LIMIT,
  tagLookup
} from '../../lib/util/overpass/OverpassUtilities'
import { SERVICE_TYPE } from '../../lib/network/HttpUtilities'
import { environment } from '../../lib/env/env'
import bboxPolygon from '@turf/bbox-polygon'
import area from '@turf/area'
import NumberPicker from '../Common/NumberPicker.vue'

export default {
  props: {
    sources: Object,
    project: Object,
    back: Function,
    addSource: Function
  },
  computed: {
    ...mapState({
      overpassUrl: state => {
        return state.URLs.overpassUrl || environment.overpassUrl
      }
    }),
    importReady () {
      return this.step === 6 && !this.isEditingBoundingBox() && this.overpassBoundingBox != null
    }
  },
  data () {
    return {
      hintText: 'Examples: "Fire Hydrant", "highway=* and type:way", and "tourism=museum in Vienna"',
      searchInput: '',
      queryLocked: true,
      contentSelection: 0,
      categories: Object.keys(tagLookup),
      categorySelection: [],
      overpassBoundingBox: undefined,
      overpassSearchTerm: '',
      overpassQuery: defaultQuery,
      mdiTrashCan,
      mdiSteering,
      mdiLock,
      mdiLockOpen,
      step: 1,
      dataSourceNameValid: true,
      overpassGeneratedQueryValid: true,
      dataSourceName: 'Data source',
      dataSourceNameRules: [v => !!v || 'Data source name is required'],
      overpassSearchRules: [v => !v || v.trim().length === 0 || getOverpassQueryFilter(v) !== false || 'Unable to determine overpass query. Please modify your search term.'],
      valid: false,
      menuProps: {
        closeOnClick: true,
        closeOnContentClick: true
      },
      exceedsBoundingBoxAreaThreshold: false,
      boundingBoxArea: null,
      clipFeatures: true,
      clipBuffer: 20,
      clipBufferValid: true
    }
  },
  components: {
    NumberPicker,
    BoundingBoxEditor
  },
  methods: {
    isBlank (str) {
      return str == null || str.trim().length === 0
    },
    open (url) {
      window.mapcache.openExternal(url)
    },
    applyBufferToBoundingBox (boundingBox) {
      let boundingBoxWithBuffer = boundingBox.slice()
      if (this.clipBuffer > 0) {
        const bufferPercentage = this.clipBuffer / 100.0
        const widthOffset = (boundingBoxWithBuffer[2] - boundingBoxWithBuffer[0]) * bufferPercentage
        const heightOffset = (boundingBoxWithBuffer[3] - boundingBoxWithBuffer[1]) * bufferPercentage
        boundingBoxWithBuffer[0] = Math.max(-180, (boundingBoxWithBuffer[0] - widthOffset))
        boundingBoxWithBuffer[1] = Math.max(-90, (boundingBoxWithBuffer[1] - heightOffset))
        boundingBoxWithBuffer[2] = Math.min(180, (boundingBoxWithBuffer[2] + widthOffset))
        boundingBoxWithBuffer[3] = Math.min(90, (boundingBoxWithBuffer[3] + heightOffset))
      }
      return boundingBoxWithBuffer
    },
    async addLayer () {
      const id = window.mapcache.createUniqueID()
      let sourceToProcess = {
        id: id,
        directory: window.mapcache.createSourceDirectory(this.project.directory),
        url: this.overpassUrl,
        query: generateQueryFromFilter(this.overpassQuery, this.overpassBoundingBox),
        queryCount: generateQueryFromFilter(this.overpassQuery, this.overpassBoundingBox, true),
        bbox: this.overpassBoundingBox,
        serviceType: SERVICE_TYPE.OVERPASS,
        name: this.dataSourceName,
      }
      if (this.clipFeatures) {
        sourceToProcess.clippingBounds = this.applyBufferToBoundingBox(this.overpassBoundingBox)
      }
      this.close()
      this.$nextTick(() => {
        this.addSource(sourceToProcess)
      })
    },
    close () {
      if (this.isEditingBoundingBox()) {
        this.$refs.boundingBoxEditor.stopEditing()
      }
      this.$nextTick(() => {
        this.back()
      })
    },
    isEditingBoundingBox () {
      if (this.$refs.boundingBoxEditor) {
        return this.$refs.boundingBoxEditor.isEditing()
      }
      return false
    },
    updateOverpassBoundingBox (boundingBox) {
      this.overpassBoundingBox = boundingBox
    },
  },
  mounted () {
    this.$nextTick(() => {
      if (!isNil(this.$refs.dataSourceNameForm)) {
        this.$refs.dataSourceNameForm.validate()
      }
    })
  },
  watch: {
    step: {
      handler () {
        this.queryLocked = true
      }
    },
    contentSelection: {
      handler (newValue) {
        if (newValue === 0) {
          this.overpassQuery = this.categorySelection != null && this.categorySelection.length > 0 ? getOverpassQueryFilterFromTags(this.categorySelection) : defaultQuery
        } else {
          this.overpassQuery = getOverpassQueryFilter(this.overpassSearchTerm) || defaultQuery
        }
      }
    },
    categorySelection: {
      handler (newValue) {
        this.overpassQuery = newValue != null && newValue.length > 0 ? getOverpassQueryFilterFromTags(newValue) : defaultQuery
      }
    },
    overpassSearchTerm: {
      handler (newValue) {
        this.overpassQuery = getOverpassQueryFilter(newValue) || defaultQuery
      }
    },
    overpassBoundingBox: {
      handler (value) {
        if (value != null && value.length === 4) {
          const a = area(bboxPolygon(value)) / 1000000.0 * 0.62137
          this.boundingBoxArea = a.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          this.exceedsBoundingBoxAreaThreshold = a > OVERPASS_SQ_MI_LIMIT
        } else {
          this.boundingBoxArea = null
          this.exceedsBoundingBoxAreaThreshold = false
        }
      }
    }
  }
}
</script>

<style scoped>
small {
  word-break: break-all;
}

.hazard--text {
  color: darkorange !important;
}
</style>
