<template>
  <feature-view v-if="displayFeature && !displayFeature.isGeoPackage" :name="initialDisplayName" :project="project"
                :projectId="project.id" :geopackage-path="source.geopackageFilePath" :id="source.id"
                :tableName="source.sourceLayerName" :feature-id="displayFeature.featureId" :object="source"
                :back="hideFeature"/>
  <feature-layer-field v-else-if="showFeatureLayerField"
                       :tableName="source.sourceLayerName"
                       :projectId="project.id"
                       :id="source.id"
                       :object="source"
                       :column="featureLayerField"
                       :columnNames="featureLayerColumnNames"
                       :back="hideFeatureLayerField"
                       :renamed="featureLayerFieldRenamed"/>
  <v-sheet v-else-if="styleEditorVisible" class="mapcache-sheet">
    <v-toolbar
        color="main"
        dark
        flat
        class="sticky-toolbar"
    >
      <v-btn icon @click="hideStyleEditor">
        <v-icon large>{{ mdiChevronLeft }}</v-icon>
      </v-btn>
      <v-toolbar-title>
        <v-icon large color="white" class="pr-2">{{ mdiPalette }}</v-icon>
        {{ initialDisplayName }}
      </v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-card flat tile>
        <style-editor v-if="source.pane === 'vector'"
                      :tableName="source.sourceLayerName"
                      :projectId="project.id"
                      :id="source.id"
                      :project="project"
                      :path="source.geopackageFilePath"
                      :style-key="source.styleKey"
                      :back="hideStyleEditor"
                      :style-assignment="source.styleAssignment"
                      :table-style-assignment="source.tableStyleAssignment"
                      :icon-assignment="source.iconAssignment"
                      :table-icon-assignment="source.tableIconAssignment"
                      :is-geo-package="false"/>
        <v-card-text v-else>
          <geotiff-options v-if="source.layerType === 'GeoTIFF'" :configuration="source"
                           :update-configuration="updateSource"></geotiff-options>
          <m-b-tiles-options v-if="source.format === 'pbf'" :configuration="source"
                             :update-configuration="updateSource"></m-b-tiles-options>
          <v-divider v-if="source.pane === 'tile' && source.format === 'pbf'"></v-divider>
          <transparency-options v-if="source.pane === 'tile' && source.layerType !== 'GeoTIFF'" :configuration="source"
                                :update-configuration="updateSource"></transparency-options>
        </v-card-text>
      </v-card>
    </v-sheet>
  </v-sheet>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        dark
        flat
        class="sticky-toolbar"
    >
      <v-btn icon @click="back">
        <v-icon large>{{ mdiChevronLeft }}</v-icon>
      </v-btn>
      <v-toolbar-title :title="initialDisplayName">{{ initialDisplayName }}</v-toolbar-title>
      <v-spacer></v-spacer>
    </v-toolbar>
    <v-dialog
        v-model="editZoomLevelsDialog"
        max-width="400"
        persistent
        @keydown.esc="editZoomLevelsDialog = false">
      <edit-zoom-range :close="() => {editZoomLevelsDialog = false}" :save-zoom-range="saveZoomRange"
                       :min-zoom="source.minZoom" :max-zoom="source.maxZoom"></edit-zoom-range>
    </v-dialog>
    <v-dialog
        v-model="renameDialog"
        max-width="400"
        persistent
        @keydown.esc="renameDialog = false">
      <v-card v-if="renameDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2">{{ mdiPencil }}</v-icon>
          Rename data source
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="renameValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                      autofocus
                      v-model="renamedSource"
                      :rules="renamedSourceRules"
                      label="Data source name"
                      required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              text
              @click="renameDialog = false">
            Cancel
          </v-btn>
          <v-btn
              :disabled="!renameValid"
              color="primary"
              text
              @click="saveLayerName">
            Rename
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="connectionSettingsDialog"
        max-width="400"
        persistent
        @keydown.esc="connectionSettingsDialog = false">
      <v-card v-if="connectionSettingsDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2">{{ mdiCloudBraces }}</v-icon>
          Edit network settings
        </v-card-title>
        <v-card-text>
          <v-container class="ma-0 pa-0">
            <v-row no-gutters>
              <v-col cols="12">
                <number-picker :number="rateLimit" label="Max requests per second" :step="Number(1)" :min="Number(1)"
                               :max="Number(1000)" @update-number="(val) => {this.rateLimit = val}"
                               @update-valid="(val) => {this.rateLimitValid = val}"/>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col cols="12">
                <number-picker
                    :hint="timeoutMs === 0 ? 'A timeout of zero will not set a timeout' : (timeoutMs < 2000 ? 'A timeout below 2000ms is not recommended' : undefined)"
                    :number="timeoutMs" label="Request timeout (ms)" :step="Number(500)" :min="Number(0)"
                    :max="Number(10000)" @update-number="(val) => {this.timeoutMs = val}"
                    @update-valid="(val) => {this.timeoutValid = val}"/>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col cols="12">
                <number-picker :number="retryAttempts" label="Retry attempts" :step="Number(1)" :min="Number(0)"
                               :max="Number(10)" @update-number="(val) => {this.retryAttempts = val}"
                               @update-valid="(val) => {this.retryAttemptsValid = val}"/>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              text
              @click="closeConnectionSettingsDialog">
            Cancel
          </v-btn>
          <v-btn
              :disabled="!rateLimitValid || !timeoutValid || !retryAttemptsValid"
              color="primary"
              text
              @click="saveConnectionSettings">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="deleteDialog"
        max-width="400"
        persistent
        @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{ mdiTrashCan }}</v-icon>
          Remove data source
        </v-card-title>
        <v-card-text>
          Removing the <b>{{ initialDisplayName }}</b> data source will remove it from the application but the file/url
          will not be impacted. Are you sure you want to remove the <b>{{ initialDisplayName }}</b> data source?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              text
              @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              text
              @click="removeDataSource">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="showOverwriteDialog"
        max-width="400"
        persistent
        @keydown.esc="cancelOverwrite">
      <v-card v-if="showOverwriteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{ mdiExportVariant }}</v-icon>
          Overwrite {{ overwriteFileName }}
        </v-card-title>
        <v-card-text>
          Are you sure you want to overwrite {{ overwriteFileName }}?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              text
              @click="cancelOverwrite">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              text
              @click="overwrite">
            Overwrite
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="exportingProgressDialog"
        max-width="400"
        persistent>
      <v-card>
        <v-card-title>
          <v-icon color="primary" class="pr-2">{{ mdiExportVariant }}</v-icon>
          Exporting {{ initialDisplayName }}
        </v-card-title>
        <v-card-text>
          <v-progress-linear indeterminate color="primary"></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-sheet class="text-left mapcache-sheet-content detail-bg">
      <v-row no-gutters class="pl-3 pt-3 pr-3 background" justify="space-between">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn icon @click="zoomTo" color="whitesmoke">
              <img v-if="source.pane === 'tile' && $vuetify.theme.dark" src="/images/white_layers.png" alt="Tile layer"
                   width="20px" height="20px"/>
              <img v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px"
                   height="20px"/>
              <img v-else-if="source.pane === 'tile'" src="/images/colored_layers.png" alt="Tile layer" width="20px"
                   height="20px"/>
              <img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
            <span>{{ source.pane === 'vector' ? 'Feature' : 'Tile' }} data source</span>
          </p>
        </v-col>
        <v-col cols="1" v-if="source.warning">
          <data-source-warning :source="source" :project-id="project.id"></data-source-warning>
        </v-col>
        <v-col cols="1" v-if="source.error">
          <data-source-troubleshooting :source="source" :project-id="project.id"></data-source-troubleshooting>
        </v-col>
        <v-col cols="1" v-if="missingRaster">
          <geo-t-i-f-f-troubleshooting :source-or-base-map="source"
                                       :project-id="project.id"></geo-t-i-f-f-troubleshooting>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" style="margin-left: -12px" justify="center"
             align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="renameDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{ mdiPencil }}</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Rename
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="styleEditorVisible = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{ mdiPalette }}</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Style
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover v-if="source.layerType === 'WMS' || source.layerType === 'XYZServer' || source.layerType === 'WMTS'">
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="showConnectingSettingsDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{ mdiCloudBraces }}</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Network
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-tooltip bottom :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-hover v-if="source.pane === 'vector'">
              <template v-slot="{ hover }">
                <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                        @click.stop="downloadGeoPackage" v-bind="attrs" v-on="on">
                  <v-card-text class="pa-2">
                    <v-row no-gutters align-content="center" justify="center">
                      <v-icon small>{{ mdiExportVariant }}</v-icon>
                    </v-row>
                    <v-row no-gutters align-content="center" justify="center">
                      Export
                    </v-row>
                  </v-card-text>
                </v-card>
              </template>
            </v-hover>
          </template>
          <span>Export as GeoPackage</span>
        </v-tooltip>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{ mdiTrashCan }}</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Remove
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <v-col>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Type
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ source.pane === 'vector' ? source.sourceType : source.layerType }}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Enable
                </p>
                <source-visibility-switch :disabled="missingRaster" :input-value="source.visible"
                                          :project-id="project.id" :source="source" class="ml-2"
                                          :style="{marginTop: '-4px'}"></source-visibility-switch>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="start"
                 v-if="source.pane === 'tile' && (source.layerType === 'WMS' || source.layerType === 'WMTS' || source.layerType === 'XYZServer')">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                URL
              </p>
              <p class="allowselect" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                {{ source.filePath }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="start" v-if="hasSubdomains()">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Subdomains
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                {{ source.subdomains.join(',') }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters v-if="source.minZoom !== undefined && source.maxZoom !== undefined">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Zoom levels
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                <span style="margin-top: 8px;">{{ source.minZoom + ' - ' + source.maxZoom }}</span>
                <v-btn style="margin-top: -2px;" icon small v-if="source.layerType === 'XYZServer'"
                       @click="editZoomLevels">
                  <v-icon small>{{ mdiPencil }}</v-icon>
                </v-btn>
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between" v-if="source.pane === 'vector'">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Features
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ source.count }}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <v-btn class="btn-background" @click.stop="showFeatureTable">
                  <v-icon left>
                    {{ mdiTableEye }}
                  </v-icon>
                  View features
                </v-btn>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters v-if="source.srs != null">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Spatial reference system
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ source.srs }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters
                 v-if="source.layerType === 'WMS' || source.layerType === 'WMTS' || source.layerType === 'XYZServer'">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Network settings
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ 'Max requests per second: ' + (source.rateLimit || defaultRateLimit) }}
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ 'Request timeout (ms): ' + (source.timeoutMs === undefined ? defaultTimeout : source.timeoutMs) }}
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{
                  'Retry attempts: ' + (source.retryAttempts === undefined ? defaultRetryAttempts : source.retryAttempts)
                }}
              </p>
            </v-col>
          </v-row>
          <w-m-s-layer-editor v-if="source.layerType === 'WMS'" class="mt-4" :error="source.error" :project="project"
                              :configuration="source" :update-configuration="updateSource"
                              :set-error="setSourceError"></w-m-s-layer-editor>
          <w-m-t-s-layer-editor v-if="source.layerType === 'WMTS'" class="mt-4" :error="source.error" :project="project"
                                :configuration="source" :update-configuration="updateSource"
                                :set-error="setSourceError"></w-m-t-s-layer-editor>
          <v-row class="pb-2" no-gutters v-if="source.geopackageFilePath != null">
            <feature-layer-fields :id="source.id" :project-id="project.id" :project="project" :table-name="source.sourceLayerName" :object="source" :field-clicked="showFieldManagementView"></feature-layer-fields>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import keys from 'lodash/keys'
import GeotiffOptions from '../Common/Style/GeotiffOptions'
import TransparencyOptions from '../Common/Style/TransparencyOptions'
import StyleEditor from '../StyleEditor/StyleEditor'
import EventBus from '../../lib/vue/EventBus'
import SourceVisibilitySwitch from './SourceVisibilitySwitch'
import MBTilesOptions from '../Common/Style/MBTilesOptions'
import DataSourceTroubleshooting from './DataSourceTroubleshooting'
import DataSourceWarning from './DataSourceWarning.vue'
import NumberPicker from '../Common/NumberPicker'
import {
  mdiChevronLeft,
  mdiCloudBraces,
  mdiExportVariant,
  mdiPalette,
  mdiPencil,
  mdiTableEye,
  mdiTrashCan,
} from '@mdi/js'
import {
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RATE_LIMIT,
  DEFAULT_TIMEOUT,
} from '../../lib/network/HttpUtilities'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import EditZoomRange from '../../views/Common/EditZoomRange'
import { zoomToSource } from '../../lib/leaflet/map/ZoomUtilities'
import FeatureView from '../Common/FeatureView'
import WMSLayerEditor from '../Common/WMSLayerEditor'
import WMTSLayerEditor from '../Common/WMTSLayerEditor'
import FeatureLayerFields from '../Common/GeoPackageFeatureLayer/FeatureLayerFields'
import FeatureLayerField from '../Common/GeoPackageFeatureLayer/FeatureLayerField'

export default {
  props: {
    source: {
      type: Object,
      default: () => {
        return {
          name: ''
        }
      }
    },
    project: Object,
    allowNotifications: Boolean,
    back: Function,
    displayFeature: Object,
  },
  components: {
    FeatureLayerField,
    FeatureLayerFields,
    WMSLayerEditor,
    WMTSLayerEditor,
    FeatureView,
    EditZoomRange,
    GeoTIFFTroubleshooting,
    NumberPicker,
    DataSourceTroubleshooting,
    DataSourceWarning,
    MBTilesOptions,
    SourceVisibilitySwitch,
    TransparencyOptions,
    GeotiffOptions,
    StyleEditor
  },
  computed: {
    ...mapState({
      initialDisplayName () {
        return isNil(this.source.displayName) ? this.source.name : this.source.displayName
      }
    }),
    missingRaster () {
      return window.mapcache.isRasterMissing(this.source)
    }
  },
  data () {
    return {
      mdiChevronLeft,
      mdiPencil,
      mdiCloudBraces,
      mdiTrashCan,
      mdiExportVariant,
      mdiPalette,
      mdiTableEye,
      defaultTimeout: DEFAULT_TIMEOUT,
      defaultRateLimit: DEFAULT_RATE_LIMIT,
      defaultRetryAttempts: DEFAULT_RETRY_ATTEMPTS,
      exportingProgressDialog: false,
      styleEditorVisible: false,
      showOverwriteDialog: false,
      overwriteFile: '',
      overwriteFileName: '',
      exportSnackBarText: '',
      renameDialog: false,
      renameValid: false,
      deleteDialog: false,
      renamedSource: isNil(this.source.displayName) ? this.source.name : this.source.displayName,
      renamedSourceRules: [
        v => !!v || 'Name is required'
      ],
      connectionSettingsDialog: false,
      timeoutMs: DEFAULT_TIMEOUT,
      rateLimit: DEFAULT_RATE_LIMIT,
      retryAttempts: DEFAULT_RETRY_ATTEMPTS,
      rateLimitValid: true,
      timeoutValid: true,
      retryAttemptsValid: true,
      editZoomLevelsDialog: false,
      showFeatureLayerField: false,
      featureLayerField: null,
      featureLayerColumnNames: []
    }
  },
  methods: {
    showFieldManagementView (field, columnNames) {
      this.featureLayerField = field
      this.showFeatureLayerField = true
      this.featureLayerColumnNames = columnNames
    },
    hideFeatureLayerField () {
      this.showFeatureLayerField = false
      this.featureLayerField = null
    },
    featureLayerFieldRenamed (name) {
      const index = this.featureLayerColumnNames.indexOf(this.featureLayerField.name)
      this.featureLayerColumnNames.splice(index, 1, name)
      this.featureLayerField.name = name
    },
    hideFeature () {
      EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE)
    },
    hasSubdomains () {
      return !isEmpty(this.source.subdomains) && window.mapcache.requiresSubdomains(this.source.filePath)
    },
    closeConnectionSettingsDialog () {
      this.connectionSettingsDialog = false
    },
    saveConnectionSettings () {
      window.mapcache.saveConnectionSettings(this.project.id, this.source.id, this.timeoutMs, this.rateLimit, this.retryAttempts)
      this.closeConnectionSettingsDialog()
    },
    showConnectingSettingsDialog () {
      this.timeoutMs = !isNil(this.source.timeoutMs) ? this.source.timeoutMs : DEFAULT_TIMEOUT
      this.rateLimit = this.source.rateLimit || DEFAULT_RATE_LIMIT
      this.retryAttempts = !isNil(this.source.retryAttempts) ? this.source.retryAttempts : DEFAULT_RETRY_ATTEMPTS
      this.$nextTick(() => {
        this.connectionSettingsDialog = true
      })
    },
    editZoomLevels () {
      this.editZoomLevelsDialog = true
    },
    saveZoomRange (minZoom, maxZoom) {
      let updatedConfiguration = Object.assign({}, this.source)
      updatedConfiguration.minZoom = minZoom
      updatedConfiguration.maxZoom = maxZoom
      this.updateSource(updatedConfiguration)
      this.editZoomLevelsDialog = false
    },
    saveLayerName () {
      this.renameDialog = false
      window.mapcache.setDataSourceDisplayName({
        projectId: this.project.id,
        sourceId: this.source.id,
        displayName: this.renamedSource
      })
    },
    copyAndAddGeoPackage (filePath) {
      this.exportingProgressDialog = true
      window.mapcache.copyFile(this.source.geopackageFilePath, filePath).then(() => {
        const geopackageKey = keys(this.project.geopackages).find(key => this.project.geopackages[key].path === filePath)
        if (isNil(geopackageKey)) {
          window.mapcache.addGeoPackage({ projectId: this.project.id, filePath: filePath })
        } else {
          window.mapcache.synchronizeGeoPackage({ projectId: this.project.id, geopackageId: geopackageKey })
        }
        this.overwriteFile = ''
        setTimeout(() => {
          this.exportingProgressDialog = false
          if (this.allowNotifications) {
            new Notification('Data source exported', {
              body: 'Exported GeoPackage file location: ' + filePath,
            }).onclick = () => {
              window.mapcache.sendWindowToFront()
            }
          }
          EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage exported.', 'primary')
        }, 1000)
      })
    },
    downloadGeoPackage () {
      try {
        window.mapcache.showSaveDialog({
          title: 'Export GeoPackage',
          defaultPath: this.initialDisplayName.replace(' ', '_')
        }).then(({ canceled, filePath }) => {
          if (!canceled) {
            if (!isNil(filePath)) {
              if (!filePath.endsWith('.gpkg')) {
                filePath = filePath + '.gpkg'
              }
              if (!window.mapcache.fileExists(filePath)) {
                this.copyAndAddGeoPackage(filePath)
              } else {
                this.overwriteFile = filePath
                this.overwriteFileName = window.mapcache.getBaseName(filePath)
                this.showOverwriteDialog = true
              }
            }
          }
        })
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to export GeoPackage file.')
      }
    },
    overwrite () {
      this.showOverwriteDialog = false
      this.copyAndAddGeoPackage(this.overwriteFile)
    },
    cancelOverwrite () {
      this.showOverwriteDialog = false
      this.overwriteFile = ''
    },
    hideStyleEditor () {
      this.styleEditorVisible = false
    },
    zoomTo () {
      zoomToSource(this.source)
    },
    showFeatureTable () {
      const payload = {
        id: this.source.id,
        tableName: this.source.sourceLayerName,
        isGeoPackage: false
      }
      EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE_TABLE, payload)
    },
    removeDataSource () {
      window.mapcache.removeDataSource({ projectId: this.project.id, sourceId: this.source.id })
    },
    updateSource (updatedSource) {
      window.mapcache.setDataSource({
        projectId: this.project.id,
        source: updatedSource
      })
    },
    setSourceError (error) {
      window.mapcache.setSourceError({
        id: this.source.id,
        error: error
      })
    }
  }
}
</script>

<style scoped>
.btn-background {
  background-color: var(--v-main_active_background-base) !important;
}
</style>
