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
              Specify the overpass search term and generate the overpass query.
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
              Data retrieved using the OSM Overpass API for the search term <b>{{this.overpassSearchTerm}}</b> will be imported as the <b>{{dataSourceName}}</b> data source.
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
  import {getOverpassQuery} from '../../lib/util/overpass/OverpassUtilities'
  import {SERVICE_TYPE} from '../../lib/network/HttpUtilities'
  import {environment} from '../../lib/env/env'

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
        return this.step === 4 && !this.isEditingBoundingBox() && this.overpassGeneratedQueryValid
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
        overpassSearchRules: [v => !!v || 'Search term is required', v => getOverpassQuery('"' + v + '"') !== false || 'Unable to determine overpass query. Please modify your search term.'],
        valid: false,
        menuProps: {
          closeOnClick: true,
          closeOnContentClick: true
        }
      }
    },
    components: {
      BoundingBoxEditor
    },
    methods: {
      open (url) {
        window.mapcache.openExternal(url)
      },
      async addLayer() {
        const id = window.mapcache.createUniqueID()
        let query = getOverpassQuery('"' + this.overpassSearchTerm + '"')
        query = query.replace('{{bbox}}', [this.overpassBoundingBox[1], this.overpassBoundingBox[0], this.overpassBoundingBox[3], this.overpassBoundingBox[2]].join(','))
        let sourceToProcess = {
          id: id,
          directory: window.mapcache.createSourceDirectory(this.project.directory),
          url: environment.overpassUrl,
          query: query,
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
      }
    }
  }
</script>

<style scoped>
  small {
    word-break: break-all;
  }
  .ghost {
    opacity: 0.5 !important;
    background-color: var(--v-primary-lighten2) !important;
  }
  .flip-list-move {
    transition: transform 0.5s;
  }
  .no-move {
    transition: transform 0s;
  }
  .v-input--reverse .v-input__slot {
    flex-direction: row-reverse;
    justify-content: flex-end;
  .v-input--selection-controls__input {
    margin-left: 0;
    margin-right: 8px;
  }
  }
  .v-input--expand .v-input__slot {
  .v-label {
    display: block;
    flex: 1;
  }
  }
  ul {
    list-style-type: none;
  }
  .no-clamp {
    -webkit-line-clamp: unset !important;
    word-wrap: normal !important;
  }
  .list-item {
    min-height: 50px;
    cursor: move !important;
    background: var(--v-background-base);
  }
  .list-item i {
    cursor: pointer !important;
  }
  .list-item-title {
    font-size: .8125rem;
    font-weight: 500;
    line-height: 1rem;
    color: var(--v-text-base)
  }
  .list-item-subtitle {
    font-size: .8125rem;
    font-weight: 400;
    line-height: 1rem;
    color: var(--v-detail-base)
  }
</style>
