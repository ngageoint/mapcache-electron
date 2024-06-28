<template>
  <v-sheet v-if="styleEditorVisible" class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn variant="text" icon="mdi-chevron-left" @click="hideStyleEditor"/>
      <v-toolbar-title>
        <v-icon large color="white" class="pr-2" icon="mdi-palette"/>
        {{ baseMap.name }}
      </v-toolbar-title>

    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-card flat tile>
        <v-card-text class="pt-0">
          <m-b-tiles-options v-if="configuration.layerType === 'MBTiles' && configuration.format === 'pbf'"
                             :configuration="configuration"
                             :update-configuration="updateConfiguration"></m-b-tiles-options>
          <geotiff-options v-if="configuration.layerType === 'GeoTIFF'" :configuration="configuration"
                           :update-configuration="updateConfiguration"></geotiff-options>
          <v-divider v-if="configuration.layerType === 'MBTiles' || configuration.layerType === 'GeoTIFF'"></v-divider>
          <background-tile-color :background-value="baseMap.background"
                                 :on-background-updated="updateBackground"></background-tile-color>
          <v-divider v-if="configuration.pane === 'tile' && configuration.layerType !== 'GeoTIFF'"></v-divider>
          <transparency-options v-if="configuration.pane === 'tile' && configuration.layerType !== 'GeoTIFF'"
                                :configuration="configuration"
                                :update-configuration="updateConfiguration"></transparency-options>
        </v-card-text>
        <v-divider v-if="configuration.pane === 'vector'"></v-divider>
        <style-editor v-if="configuration.pane === 'vector'"
                      :tableName="configuration.sourceLayerName"
                      :projectId="project.id"
                      :id="baseMap.id"
                      :project="project"
                      :path="configuration.geopackageFilePath"
                      :style-key="configuration.styleKey"
                      :back="hideStyleEditor"
                      :style-assignment="configuration.styleAssignment"
                      :table-style-assignment="configuration.tableStyleAssignment"
                      :icon-assignment="configuration.iconAssignment"
                      :table-icon-assignment="configuration.tableIconAssignment"
                      :is-geo-package="false"
                      :is-base-map="true"/>
      </v-card>
    </v-sheet>
  </v-sheet>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
      <v-toolbar-title :title="baseMap.name">{{ baseMap.name }}</v-toolbar-title>
    </v-toolbar>
    <v-dialog
        v-model="renameDialog"
        max-width="400"
        persistent
        @keydown.esc="renameDialog = false">
      <v-card v-if="renameDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2" icon="mdi-pencil"/>
          Rename base map
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent="() => {}" v-model="renameValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                      variant="underlined"
                      autofocus
                      v-model="renamedBaseMap"
                      :rules="renamedBaseMapRules"
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
              variant="text"
              @click="renameDialog = false">
            Cancel
          </v-btn>
          <v-btn
              :disabled="!renameValid"
              color="primary"
              variant="text"
              @click="saveBaseMapName">
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
          <v-icon color="primary" class="pr-2" icon="mdi-cloud-braces"></v-icon>
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
              variant="text"
              @click="closeConnectionSettingsDialog">
            Cancel
          </v-btn>
          <v-btn
              :disabled="!rateLimitValid || !timeoutValid || !retryAttemptsValid"
              color="primary"
              variant="text"
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
          <v-icon color="warning" class="pr-2" icon="mdi-trash-can-outline"/>
          Remove base map
        </v-card-title>
        <v-card-text>
          Are you sure you want to remove the <b>{{ baseMap.name }}</b> base map?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="deleteBaseMap">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-sheet class="text-left mapcache-sheet-content detail-bg">
      <v-row no-gutters class="pl-3 pt-3 pr-3 background" justify="space-between">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn variant="text" icon @click="zoomTo" color="whitesmoke">
              <v-icon style="width: 20px; height: 20px;" icon="mdi-map-outline"/>
            </v-btn>
            <span>{{ configuration.pane === 'vector' ? 'Feature' : 'Tile' }} base map</span>
          </p>
        </v-col>
        <v-col cols="1" v-if="baseMap.warning">
          <data-source-warning :source="baseMap"></data-source-warning>
        </v-col>
        <v-col cols="1" v-if="baseMap.error && !baseMap.readonly">
          <base-map-troubleshooting :base-map="baseMap"></base-map-troubleshooting>
        </v-col>
        <v-col cols="1" v-if="rasterMissing">
          <geo-t-i-f-f-troubleshooting :source-or-base-map="baseMap"></geo-t-i-f-f-troubleshooting>
        </v-col>
      </v-row>
      <v-row v-if="!readonly" no-gutters class="pl-3 pb-3 pr-3 background" style="margin-left: -12px;" justify="center"
             align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="renameDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-pencil"/>
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
                  <v-icon small icon="mdi-palette"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Style
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover
            v-if="configuration.layerType === 'WMS' || configuration.layerType === 'WMTS' || configuration.layerType === 'XYZServer'">
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="showConnectingSettingsDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-cloud-braces"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Network
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-trash-can-outline"/>
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
                {{ configuration.pane === 'vector' ? configuration.sourceType : configuration.layerType }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="start"
                 v-if="(baseMap.url || configuration.filePath) && configuration.pane === 'tile' && (configuration.layerType === 'WMS' || configuration.layerType === 'WMTS' || configuration.layerType === 'XYZServer')">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                URL
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                {{ baseMap.url ? baseMap.url : configuration.filePath }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="start"
                 v-if="configuration.subdomains !== null && configuration.subdomains !== undefined && configuration.subdomains.length > 0">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Subdomains
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                {{ configuration.subdomains.join(',') }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters
                 v-if="configuration.minZoom !== undefined && configuration.maxZoom !== undefined">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Zoom levels
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ configuration.minZoom + ' - ' + configuration.maxZoom }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between" v-if="configuration.pane === 'vector'">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Features
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ configuration.count }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters
                 v-if="!baseMap.readonly && (configuration.layerType === 'WMS' || configuration.layerType === 'WMTS' || configuration.layerType === 'XYZServer')">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Network settings
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ 'Max requests per second: ' + (configuration.rateLimit || defaultRateLimit) }}
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{
                  'Request timeout (ms): ' + (configuration.timeoutMs === undefined ? defaultTimeout : configuration.timeoutMs)
                }}
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{
                  'Retry attempts: ' + (configuration.retryAttempts === undefined ? defaultRetryAttempts : configuration.retryAttempts)
                }}
              </p>
            </v-col>
          </v-row>
          <w-m-s-layer-editor v-if="configuration.layerType === 'WMS'" class="mt-4" :configuration="configuration"
                              :error="baseMap.error" :update-configuration="updateConfiguration" :project="project"
                              :set-error="setBaseMapError"></w-m-s-layer-editor>
          <w-m-t-s-layer-editor v-if="configuration.layerType === 'WMTS'" class="mt-4" :configuration="configuration"
                                :error="baseMap.error" :update-configuration="updateConfiguration" :project="project"
                                :set-error="setBaseMapError"></w-m-t-s-layer-editor>
        </v-col>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
import { DEFAULT_TIMEOUT, DEFAULT_RATE_LIMIT, DEFAULT_RETRY_ATTEMPTS } from '../../../../lib/network/HttpUtilities'
import { zoomToBaseMap } from '../../../../lib/leaflet/map/ZoomUtilities'
import TransparencyOptions from '../Common/Style/TransparencyOptions.vue'
import GeotiffOptions from '../Common/Style/GeotiffOptions.vue'
import BackgroundTileColor from '../Common/Style/BackgroundTileColor.vue'
import MBTilesOptions from '../Common/Style/MBTilesOptions.vue'
import StyleEditor from '../StyleEditor/StyleEditor.vue'
import BaseMapTroubleshooting from './BaseMapTroubleshooting.vue'
import DataSourceWarning from '../DataSources/DataSourceWarning.vue'
import NumberPicker from '../Common/NumberPicker.vue'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting.vue'
import WMSLayerEditor from '../Common/WMSLayerEditor.vue'
import WMTSLayerEditor from '../Common/WMTSLayerEditor.vue'
import {
  setBaseMap,
  removeBaseMap,
  saveBaseMapConnectionSettings,
  setSourceError
} from '../../../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    baseMap: {
      type: Object,
      default: () => {
        return {
          name: ''
        }
      }
    },
    baseMaps: Array,
    project: Object,
    back: Function
  },
  components: {
    WMTSLayerEditor,
    WMSLayerEditor,
    GeoTIFFTroubleshooting,
    NumberPicker,
    BaseMapTroubleshooting,
    DataSourceWarning,
    StyleEditor,
    MBTilesOptions,
    BackgroundTileColor,
    TransparencyOptions,
    GeotiffOptions
  },
  computed: {
    configuration () {
      return this.baseMap.layerConfiguration || {}
    },
    readonly () {
      return this.baseMap.readonly
    },
    rasterMissing () {
      return this.baseMap.layerConfiguration ? window.mapcache.isRasterMissing(this.baseMap.layerConfiguration.layerType, this.baseMap.layerConfiguration.rasterFile) : false
    },
    url () {
      return this.project.mapProjection === 3857 ? this.baseMap.url : this.baseMap.pcUrl
    }
  },
  data () {
    return {
      defaultTimeout: DEFAULT_TIMEOUT,
      defaultRateLimit: DEFAULT_RATE_LIMIT,
      defaultRetryAttempts: DEFAULT_RETRY_ATTEMPTS,
      styleEditorVisible: false,
      renameDialog: false,
      renameValid: false,
      deleteDialog: false,
      renamedBaseMap: this.baseMap.name,
      renamedBaseMapRules: [
        v => !!v || 'Base map name is required',
        v => this.baseMaps.map(baseMap => baseMap.name).indexOf(v) === -1 || 'Base map name must be unique'
      ],
      connectionSettingsDialog: false,
      timeoutMs: DEFAULT_TIMEOUT,
      rateLimit: DEFAULT_RATE_LIMIT,
      retryAttempts: DEFAULT_RETRY_ATTEMPTS,
      rateLimitValid: true,
      timeoutValid: true,
      retryAttemptsValid: true
    }
  },
  methods: {
    closeConnectionSettingsDialog () {
      this.connectionSettingsDialog = false
    },
    saveConnectionSettings () {
      saveBaseMapConnectionSettings(this.baseMap.id, this.timeoutMs, this.rateLimit, this.retryAttempts)
      this.closeConnectionSettingsDialog()
    },
    showConnectingSettingsDialog () {
      this.timeoutMs = !isNil(this.configuration.timeoutMs) ? this.configuration.timeoutMs : DEFAULT_TIMEOUT
      this.rateLimit = this.configuration.rateLimit || DEFAULT_RATE_LIMIT
      this.retryAttempts = !isNil(this.configuration.retryAttempts) ? this.configuration.retryAttempts : DEFAULT_RETRY_ATTEMPTS
      this.$nextTick(() => {
        this.connectionSettingsDialog = true
      })
    },
    deleteBaseMap () {
      removeBaseMap(this.baseMap).then(() => {
        this.deleteDialog = false
        this.back()
      })
    },
    zoomTo () {
      zoomToBaseMap(this.baseMap)
    },
    hideStyleEditor () {
      this.styleEditorVisible = false
    },
    saveBaseMapName () {
      const baseMap = cloneDeep(this.baseMap)
      baseMap.name = this.renamedBaseMap
      setBaseMap(baseMap)
      this.renameDialog = false
    },
    updateBackground (value) {
      const baseMap = cloneDeep(this.baseMap)
      baseMap.background = value
      setBaseMap(baseMap)
    },
    updateConfiguration (newConfiguration) {
      const baseMap = cloneDeep(this.baseMap)
      baseMap.layerConfiguration = newConfiguration
      setBaseMap(baseMap)
    },
    setBaseMapError (error) {
      setSourceError(this.baseMap.id, error)
    }
  }
}
</script>

<style scoped>
</style>
