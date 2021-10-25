<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-icon>{{ mdiSteering }}</v-icon>
      <v-toolbar-title>Overpass feature download</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content">
      <v-stepper v-model="step" class="background" non-linear vertical :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => dataSourceNameValid]" color="primary">
          Name the data source
          <small class="pt-1">{{dataSourceName}}</small>
        </v-stepper-step>
        <v-stepper-content step="1" class="mt-0 pt-0">
          <v-card flat tile>
            <v-card-subtitle class="mt-0 pt-0">
              Specify a name for this data source.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="dataSourceNameForm" v-model="dataSourceNameValid">
                <v-text-field
                  autofocus
                  v-model="dataSourceName"
                  :rules="dataSourceNameRules"
                  label="Data source name"
                  required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 2" v-if="dataSourceNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" :rules="[() => overpassGeneratedQueryValid || step < 3]" color="primary">
          Specify overpass search term
          <small v-if="!overpassGeneratedQueryValid && step > 2" class="pt-1">Search term not set</small>
        </v-stepper-step>
        <v-stepper-content step="2" class="mt-0 pt-0">
          <v-card flat tile>
            <v-card-subtitle class="mt-0 pt-0">
              Specify the overpass search term. Leave this field blank to retrieve all features that overlap with the bounding box.
            </v-card-subtitle>
            <v-card-subtitle class="pt-2 pl-4">
              Examples of valid search terms are:
              <ul style="list-style-type: circle;">
                <li>
                  Fire Hydrant
                </li>
                <li>
                  highway=* and type:way
                </li>
                <li>
                  tourism=museum in Vienna
                </li>
              </ul>
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="urlForm" v-model="overpassGeneratedQueryValid">
                <v-row no-gutters justify="space-between">
                  <v-text-field
                      autofocus
                      v-model="overpassSearchTerm"
                      :rules="overpassSearchRules"
                      label="Overpass search term"
                      required></v-text-field>
                </v-row>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 3">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 3" step="3" :rules="[() => (overpassBoundingBox || Number(step) < 4) && (!isEditingBoundingBox() || (Number(step) === 3))]" color="primary">
          Specify bounding box
          <small class="pt-1">{{isEditingBoundingBox() ? 'Editing bounding box' : (overpassBoundingBox ? 'Bounding box set' : 'Bounding box not set')}}</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Restrict your Overpass query to a specified area on the map.
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" :project="project" :boundingBox="overpassBoundingBox" :update-bounding-box="updateOverpassBoundingBox"></bounding-box-editor>
            <v-card-subtitle v-if="isBlank(overpassSearchTerm) && exceedsBoundingBoxAreaThreshold" class="hazard--text">
              <b>Your bounding box has an area of approximately {{boundingBoxArea}} square miles. Requests with an area over 10 square miles may take several minutes to process.</b>
            </v-card-subtitle>
          </v-card>
          <v-btn class="mb-2" text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :step="4" color="primary">
          Summary
        </v-stepper-step>
        <v-stepper-content :step="4">
          <v-card flat tile>
            <v-card-text>
              Data retrieved using the OSM Overpass API <b>{{this.overpassSearchTerm !== '' ? ('for the search term ' + this.overpassSearchTerm) : ''}}</b> will be imported as the <b>{{dataSourceName}}</b> data source.
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
          v-if="importReady"
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
  import {mapState} from 'vuex'
  import isNil from 'lodash/isNil'
  import {mdiTrashCan, mdiSteering} from '@mdi/js'
  import BoundingBoxEditor from '../Common/BoundingBoxEditor'
  import {
    getOverpassQuery,
    bboxOnlyQuery,
    OVERPASS_SQ_MI_LIMIT, bboxOnlyQueryCount, getOverpassCountQuery,
  } from '../../lib/util/overpass/OverpassUtilities'
  import {SERVICE_TYPE} from '../../lib/network/HttpUtilities'
  import {environment} from '../../lib/env/env'
  import bboxPolygon from '@turf/bbox-polygon'
  import area from '@turf/area'

  export default {
    props: {
      sources: Object,
      project: Object,
      back: Function,
      addSource: Function
    },
    computed: {
      ...mapState({
        urls: state => {
          return state.URLs.savedUrls || []
        }
      }),
      sortedLayers: {
        get() {
          return this.sortedRenderingLayers || this.selectedDataSourceLayers
        },
        set(val) {
          this.sortedRenderingLayers = val
        }
      },
      importReady() {
        return this.step === 4 && !this.isEditingBoundingBox() && this.overpassBoundingBox != null
      }
    },
    data() {
      return {
        overpassBoundingBox: undefined,
        overpassSearchTerm: '',
        overpassQuery: '',
        mdiTrashCan: mdiTrashCan,
        mdiSteering: mdiSteering,
        step: 1,
        dataSourceNameValid: true,
        overpassGeneratedQueryValid: true,
        dataSourceName: 'Data source',
        dataSourceNameRules: [v => !!v || 'Data source name is required'],
        overpassSearchRules: [v => (v != null && v.trim().length === 0) || getOverpassQuery(v) !== false || 'Unable to determine overpass query. Please modify your search term.'],
        valid: false,
        menuProps: {
          closeOnClick: true,
          closeOnContentClick: true
        },
        exceedsBoundingBoxAreaThreshold: false,
        boundingBoxArea: null
      }
    },
    components: {
      BoundingBoxEditor
    },
    methods: {
      isBlank (str) {
        return str == null || str.trim().length === 0
      },
      open (url) {
        window.mapcache.openExternal(url)
      },
      async addLayer() {
        const id = window.mapcache.createUniqueID()
        let query = this.overpassSearchTerm == null || this.overpassSearchTerm.trim().length === 0 ? bboxOnlyQuery : getOverpassQuery(this.overpassSearchTerm)
        let queryCount = this.overpassSearchTerm == null || this.overpassSearchTerm.trim().length === 0 ? bboxOnlyQueryCount : getOverpassCountQuery(this.overpassSearchTerm)
        let sourceToProcess = {
          id: id,
          directory: window.mapcache.createSourceDirectory(this.project.directory),
          url: environment.overpassUrl,
          query: query,
          queryCount: queryCount,
          bbox: this.overpassBoundingBox,
          serviceType: SERVICE_TYPE.OVERPASS,
          name: this.dataSourceName
        }
        this.close()
        this.$nextTick(() => {
          this.addSource(sourceToProcess)
        })
      },
      close() {
        if (this.isEditingBoundingBox()) {
          this.$refs.boundingBoxEditor.stopEditing()
        }
        this.$nextTick(() => {
          this.back()
        })
      },
      isEditingBoundingBox() {
        if (this.$refs.boundingBoxEditor) {
          return this.$refs.boundingBoxEditor.isEditing()
        }
        return false
      },
      updateOverpassBoundingBox(boundingBox) {
        this.overpassBoundingBox = boundingBox
        if (this.previewing) {
          this.sendLayerPreview()
        }
      },
    },
    mounted() {
      this.$nextTick(() => {
        if (!isNil(this.$refs.dataSourceNameForm)) {
          this.$refs.dataSourceNameForm.validate()
        }
      })
    },
    watch: {
      overpassSearchTerm: {
        handler () {
          this.overpassQuery = null
        }
      },
      overpassBoundingBox: {
        handler (value) {
          if (value != null && value.length === 4) {
            const a = area(bboxPolygon(value)) / 1000000.0 * 0.62137
            this.boundingBoxArea = a.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            this.exceedsBoundingBoxAreaThreshold = a > OVERPASS_SQ_MI_LIMIT
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
