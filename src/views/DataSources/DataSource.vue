<template>
  <v-sheet v-if="styleEditorVisible" class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="hideStyleEditor"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title><b class="ml-2">{{initialDisplayName}}</b> Style Editor</v-toolbar-title>
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
          <geotiff-options v-if="source.layerType === 'GeoTIFF'" :configuration="source" :update-configuration="updateSource"></geotiff-options>
          <m-b-tiles-options v-if="source.format === 'pbf'" :configuration="source" :update-configuration="updateSource"></m-b-tiles-options>
          <v-divider v-if="source.pane === 'tile' && source.format === 'pbf'"></v-divider>
          <transparency-options v-if="source.pane === 'tile' && source.layerType !== 'GeoTIFF'" :configuration="source" :update-configuration="updateSource"></transparency-options>
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
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title :title="initialDisplayName">{{initialDisplayName}}</v-toolbar-title>
      <v-spacer></v-spacer>
    </v-toolbar>
    <v-dialog
      v-model="renameDialog"
      max-width="400"
      persistent
      @keydown.esc="renameDialog = false">
      <v-card v-if="renameDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2">{{mdiPencil}}</v-icon>
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
            v-if="renameValid"
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
          <v-icon color="primary" class="pr-2">{{mdiCloudBraces}}</v-icon>
          Edit network settings
        </v-card-title>
        <v-card-text>
          <v-container class="ma-0 pa-0">
            <v-row no-gutters>
              <v-col cols="12">
                <number-picker :number="rateLimit" label="Max requests per second" :step="Number(1)" :min="Number(1)" :max="Number(1000)" @update-number="(val) => {this.rateLimit = val}" @update-valid="(val) => {this.rateLimitValid = val}"/>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col cols="12">
                <number-picker :hint="timeoutMs === 0 ? 'A timeout of zero will not set a timeout' : (timeoutMs < 2000 ? 'A timeout below 2000ms is not recommended' : undefined)" :number="timeoutMs" label="Request timeout (ms)" :step="Number(500)" :min="Number(0)" :max="Number(10000)" @update-number="(val) => {this.timeoutMs = val}" @update-valid="(val) => {this.timeoutValid = val}"/>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col cols="12">
                <number-picker :number="retryAttempts" label="Retry attempts" :step="Number(1)" :min="Number(0)" :max="Number(10)" @update-number="(val) => {this.retryAttempts = val}" @update-valid="(val) => {this.retryAttemptsValid = val}"/>
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
            v-if="rateLimitValid && timeoutValid && retryAttemptsValid"
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
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Remove data source
        </v-card-title>
        <v-card-text>
          Removing the <b>{{initialDisplayName}}</b> data source will remove it from the application but the file/url will not be impacted. Are you sure you want to remove the <b>{{initialDisplayName}}</b> data source?
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
          <v-icon color="warning" class="pr-2">{{mdiExportVariant}}</v-icon>
          Overwrite {{overwriteFileName}}
        </v-card-title>
        <v-card-text>
          Are you sure you want to overwrite {{overwriteFileName}}?
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
          <v-icon color="primary" class="pr-2">{{mdiExportVariant}}</v-icon>
          Exporting {{initialDisplayName}}
        </v-card-title>
        <v-card-text>
          <v-progress-linear indeterminate color="primary"></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-sheet class="text-left mapcache-sheet-content detail-bg">
      <v-alert
        class="alert-position"
        v-model="showExportAlert"
        dismissible
        type="success"
      >Successfully exported.</v-alert>
      <v-row no-gutters class="pl-3 pt-3 pr-3 background" justify="space-between">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn icon @click="zoomToSource" color="whitesmoke">
              <img v-if="source.pane === 'tile' && $vuetify.theme.dark" src="/images/white_layers.png" alt="Tile Layer" width="20px" height="20px"/>
              <img v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
              <img v-else-if="source.pane === 'tile'" src="/images/colored_layers.png" alt="Tile Layer" width="20px" height="20px"/>
              <img v-else src="/images/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
            </v-btn>
            <span>{{source.pane === 'vector' ? 'Feature' : 'Tile'}} Data Source</span>
          </p>
        </v-col>
        <v-col cols="1" v-if="source.error">
          <data-source-troubleshooting :source="source" :project-id="project.id"></data-source-troubleshooting>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" style="margin-left: -12px" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="renameDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiPencil}}</v-icon>
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="styleEditorVisible = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiPalette}}</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Style
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover v-if="source.layerType === 'WMS' || source.layerType === 'XYZServer'">
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showConnectingSettingsDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiCloudBraces}}</v-icon>
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
                <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="downloadGeoPackage" v-bind="attrs" v-on="on">
                  <v-card-text class="pa-2">
                    <v-row no-gutters align-content="center" justify="center">
                      <v-icon small>{{mdiExportVariant}}</v-icon>
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
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiTrashCan}}</v-icon>
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
                {{source.pane === 'vector' ? source.sourceType : source.layerType}}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Enable
                </p>
                <source-visibility-switch :input-value="source.visible" :project-id="project.id" :source="source" class="ml-2" :style="{marginTop: '-4px'}"></source-visibility-switch>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="start" v-if="source.pane === 'tile' && (source.layerType === 'WMS' || source.layerType === 'XYZServer')">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                URL
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                {{source.filePath}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="start" v-if="hasSubdomains()">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Subdomains
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                {{source.subdomains.join(',')}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters v-if="source.minZoom !== undefined && source.maxZoom !== undefined">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Zoom Levels
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{source.minZoom + ' - ' + source.maxZoom}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between" v-if="source.pane === 'vector'">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Features
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{source.count}}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <v-btn class="btn-background" @click.stop="showFeatureTable">
                  <v-icon left>
                    {{mdiTableEye}}
                  </v-icon>View features
                </v-btn>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters v-if="source.layerType === 'WMS' || source.layerType === 'XYZServer'">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Network settings
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{'Max requests per second: ' + (source.rateLimit || defaultRateLimit)}}
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{'Request timeout (ms): ' + (source.timeoutMs === undefined ? defaultTimeout : source.timeoutMs)}}
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{'Retry attempts: ' + (source.retryAttempts === undefined ? defaultRetryAttempts : source.retryAttempts)}}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import {mapState} from 'vuex'
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
import NumberPicker from '../Common/NumberPicker'
import {
  mdiChevronLeft,
  mdiCloudBraces,
  mdiExportVariant,
  mdiPalette,
  mdiPencil,
  mdiTableEye,
  mdiTrashCan
} from '@mdi/js'
import {DEFAULT_RETRY_ATTEMPTS, DEFAULT_RATE_LIMIT, DEFAULT_TIMEOUT} from '../../lib/network/HttpUtilities'

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
      back: Function
    },
    components: {
      NumberPicker,
      DataSourceTroubleshooting,
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
      })
    },
    data () {
      return {
        mdiChevronLeft: mdiChevronLeft,
        mdiPencil: mdiPencil,
        mdiCloudBraces: mdiCloudBraces,
        mdiTrashCan: mdiTrashCan,
        mdiExportVariant: mdiExportVariant,
        mdiPalette: mdiPalette,
        mdiTableEye: mdiTableEye,
        defaultTimeout: DEFAULT_TIMEOUT,
        defaultRateLimit: DEFAULT_RATE_LIMIT,
        defaultRetryAttempts: DEFAULT_RETRY_ATTEMPTS,
        exportingProgressDialog: false,
        styleEditorVisible: false,
        showExportAlert: false,
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
        retryAttemptsValid: true
      }
    },
    methods: {
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
      saveLayerName () {
        this.renameDialog = false
        window.mapcache.setDataSourceDisplayName({projectId: this.project.id, sourceId: this.source.id, displayName: this.renamedSource})
      },
      copyAndAddGeoPackage (filePath) {
        this.exportingProgressDialog = true
        window.mapcache.copyFile(this.source.geopackageFilePath, filePath).then(() => {
          const geopackageKey = keys(this.project.geopackages).find(key => this.project.geopackages[key].path === filePath)
          if (isNil(geopackageKey)) {
            window.mapcache.addGeoPackage({projectId: this.project.id, filePath: filePath})
          } else {
            window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: geopackageKey})
          }
          this.overwriteFile = ''
          setTimeout(() => {
            this.exportingProgressDialog = false
            this.exportSnackBarText = 'Export successful.'
            this.showExportAlert = true
          }, 1000)
        })
      },
      downloadGeoPackage () {
        try {
          window.mapcache.showSaveDialog({
            title: 'Export GeoPackage',
            defaultPath: this.initialDisplayName.replace(' ', '_')
          }).then(({canceled, filePath}) => {
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
      zoomToSource () {
        window.mapcache.zoomToExtent({projectId: this.project.id, extent: this.source.extent})
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
        window.mapcache.removeDataSource({projectId: this.project.id, sourceId: this.source.id})
      },
      updateSource (updatedSource) {
        window.mapcache.setDataSource({
          projectId: this.project.id,
          source: updatedSource
        })
      }
    }
  }
</script>

<style scoped>
</style>
