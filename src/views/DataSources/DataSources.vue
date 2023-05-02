<template>
  <div class="ma-0 pa-0 mapcache-sheet">
    <data-source v-if="selectedDataSource != null"
                 :key="selectedDataSource.id"
                 class="sources"
                 :source="selectedDataSource"
                 :project="project"
                 :display-feature="displayFeature"
                 :allow-notifications="allowNotifications"
                 :back="deselectDataSource">
    </data-source>
    <add-data-source-url v-else-if="urlSourceDialog" :back="() => {urlSourceDialog = false}" :sources="sources"
                         :project="project" :add-source="addSource"></add-data-source-url>
    <overpass-data-source v-else-if="overpassDialog" :back="() => {overpassDialog = false}" :sources="sources"
                          :project="project" :add-source="addSource"></overpass-data-source>
    <v-sheet v-else class="mapcache-sheet">
      <v-toolbar
          color="main"
          flat
          class="sticky-toolbar"
      >
        <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
        <v-toolbar-title>Data sources</v-toolbar-title>
      </v-toolbar>
      <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
        <data-source-list :sources="sources" :project="project" :source-selected="dataSourceSelected"/>
        <template v-for="source in processingSourceList" :key="source.id">
          <processing-source
              :source="source"
              :project="project"
              class="sources processing-source"
              :on-cancel="() => cancelProcessing(source)"
              :on-complete="() => clearProcessing(source)"
              :on-close="() => clearProcessing(source)"
              :allow-notifications="allowNotifications">
          </processing-source>
        </template>
      </v-sheet>
      <v-card class="card-position" v-if="Object.keys(project.sources).length === 0">
        <v-row no-gutters justify="space-between" align="end">
          <v-col>
            <v-row class="pa-0" no-gutters>
              <v-col class="pa-0 align-center">
                <h5 class="no-selection align-self-center">No data sources found</h5>
              </v-col>
            </v-row>
            <v-row class="pa-0" no-gutters>
              <h5 class="no-selection align-self-center primary--text fake-link" @click="showFab">Get started</h5>
            </v-row>
          </v-col>
        </v-row>
      </v-card>
      <speed-dial
          v-on:deactivated="fab = false"
          class="fab-position"
          :activated="fab"
          transition="slide-y-reverse-transition"
      >

        <template v-slot:activator>
          <v-tooltip location="end" :disabled="!project.showToolTips">
            <template v-slot:activator="{ props }">
              <v-btn
                  size="56px"
                  color="primary"
                  v-bind="props"
                  :active="fab"
                  @click="fab = !fab"
                  icon="mdi-layers-plus">
              </v-btn>
            </template>
            <span>Add data source</span>
          </v-tooltip>
        </template>
        <template v-slot:options>
          <v-col class="ma-0 pa-0" cols="12">
            <v-tooltip location="end" :disabled="!project.showToolTips" text="Download OpenStreetMap features with Overpass">
              <template v-slot:activator="{ props }">
                <v-btn
                    color="accent"
                    @click.stop.prevent="showOverpassDialog"
                    v-bind="props"
                    size="40px"
                    style="margin-top: 6px; margin-bottom: 6px;"
                    elevation="4"
                    icon="mdi-steering">
                </v-btn>
              </template>
            </v-tooltip>
          </v-col>
          <v-col class="ma-0 pa-0" cols="12">
            <v-tooltip location="end" :disabled="!project.showToolTips" text="Download from url">
              <template v-slot:activator="{ props }">
                <v-btn
                    size="40px"
                    style="margin-top: 6px; margin-bottom: 6px;"
                    elevation="4"
                    color="accent"
                    @click.stop.prevent="showUrlDialog"
                    v-bind="props"
                    icon="mdi-cloud-download-outline">
                </v-btn>
              </template>
            </v-tooltip>
          </v-col>
          <v-col class="ma-0 pa-0" cols="12">
            <v-tooltip location="end" :disabled="!project.showToolTips" text="Import from file">
              <template v-slot:activator="{ props }">
                <v-btn
                    size="40px"
                    style="margin-top: 6px; margin-bottom: 6px;"
                    elevation="4"
                    color="accent"
                    @click.stop="addFileClick"
                    v-bind="props"
                    icon="mdi-file-document-outline">
                </v-btn>
              </template>
            </v-tooltip>
          </v-col>
        </template>
      </speed-dial>
    </v-sheet>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import ProcessingSource from './ProcessingSource.vue'
import DataSource from './DataSource.vue'
import DataSourceList from './DataSourceList.vue'
import AddDataSourceUrl from './AddDataSourceUrl.vue'
import { SUPPORTED_FILE_EXTENSIONS } from '../../lib/util/file/FileConstants'
import OverpassDataSource from '../Overpass/OverpassDataSource.vue'
import { notifyTab } from '../../lib/vue/vuex/ProjectActions'
import SpeedDial from '../Common/SpeedDial.vue'

let selectedDataSource = null
let fab = false

export default {
  props: {
    sources: Object,
    project: Object,
    allowNotifications: Boolean,
    back: Function,
    displayFeature: Object
  },
  computed: {
    ...mapState({
      urls: state => {
        return state.URLs.savedUrls || []
      }
    })
  },
  data () {
    return {
      selectedDataSource,
      fab,
      urlSourceDialog: false,
      overpassDialog: false,
      processingSourceList: []
    }
  },
  components: {
    OverpassDataSource,
    AddDataSourceUrl,
    ProcessingSource,
    DataSource,
    DataSourceList,
    SpeedDial,
  },
  methods: {
    showFab (e) {
      e.preventDefault()
      e.stopPropagation()
      if (!this.fab) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.fab = true
          }, 100)
        })
      }
    },
    addFileClick () {
      this.fab = false
      window.mapcache.showOpenDialog({
        filters: [
          {
            name: 'All files',
            extensions: SUPPORTED_FILE_EXTENSIONS
          }
        ],
        properties: ['openFile', 'multiSelections']
      }).then((result) => {
        if (result.filePaths && !isEmpty(result.filePaths)) {
          this.processFiles(window.mapcache.getFileListInfo(result.filePaths))
        }
      })
    },
    async addSource (source) {
      this.processingSourceList.push(source)
    },
    async cancelProcessing (source) {
      return window.mapcache.cancelProcessingSource(source)
    },
    clearProcessing (source) {
      for (let i = 0; i < this.processingSourceList.length; i++) {
        let s = this.processingSourceList[i]
        if (s.id === source.id) {
          this.processingSourceList.splice(i, 1)
          notifyTab(this.project.id, 1)
          break
        }
      }
    },
    processFiles (files) {
      files.forEach((file) => {
        const id = window.mapcache.createUniqueID()
        let sourceToProcess = {
          id: id,
          directory: window.mapcache.createSourceDirectory(this.project.directory),
          file: {
            lastModified: file.lastModified,
            lastModifiedDate: file.lastModifiedDate,
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.path
          },
          status: undefined,
          error: undefined
        }
        this.$nextTick(() => {
          this.addSource(sourceToProcess)
        })
      })
    },
    dataSourceSelected (dataSourceId) {
      this.selectedDataSource = this.project.sources[dataSourceId]
    },
    deselectDataSource () {
      this.selectedDataSource = null
    },
    showUrlDialog () {
      this.fab = false
      this.urlSourceDialog = true
    },
    showOverpassDialog () {
      this.fab = false
      this.overpassDialog = true
    }
  },
  watch: {
    sources: {
      handler (newSources) {
        if (!isNil(this.selectedDataSource)) {
          this.selectedDataSource = newSources[this.selectedDataSource.id]
        }
      },
      deep: true
    },
    displayFeature: {
      handler (newDisplayFeature) {
        if (newDisplayFeature != null && !newDisplayFeature.isGeoPackage) {
          if (this.selectedDataSource == null || newDisplayFeature.id !== this.selectedDataSource.id) {
            this.selectedDataSource = this.project.sources[newDisplayFeature.id]
          }
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.card-position {
  position: absolute;
  padding: 16px;
  height: 72px;
  width: 384px;
  left: 64px;
  bottom: 8px;
}

.sources {
  list-style: none;
  text-align: left;
}
</style>
