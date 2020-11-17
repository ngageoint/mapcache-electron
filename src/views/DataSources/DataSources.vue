<template>
  <v-sheet class="content-panel" v-if="selectedDataSource !== null && selectedDataSource !== undefined">
    <data-source
      :key="selectedDataSource.id"
      class="sources"
      :source="selectedDataSource"
      :project="project"
      :back="deselectDataSource">
    </data-source>
  </v-sheet>
  <v-sheet class="content-panel" v-else-if="urlSourceDialog">
    <add-data-source-url :back="() => {urlSourceDialog = false}" :sources="sources" :project="project" :add-source="addSource"></add-data-source-url>
  </v-sheet>
  <v-sheet v-else>
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>Data Sources</v-toolbar-title>
    </v-toolbar>
    <div style="margin-bottom: 80px;">
      <data-source-list :sources="sources" :projectId="project.id" :source-selected="dataSourceSelected">
      </data-source-list>
      <processing-source
        v-for="source in processing.sources"
        :source="source"
        :key="source.id"
        class="sources processing-source"
        @clear-processing="clearProcessing">
      </processing-source>
    </div>
    <v-card class="card-position" v-if="Object.keys(project.sources).length === 0">
      <v-row no-gutters justify="space-between" align="end">
        <v-col>
          <v-row class="pa-0" no-gutters>
            <v-col class="pa-0 align-center">
              <h5 class="align-self-center">No data sources found</h5>
            </v-col>
          </v-row>
          <v-row class="pa-0" no-gutters>
            <v-col class="pa-0 align-center">
              <h5 class="align-self-center primary--text">Get Started</h5>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
    <v-speed-dial
      class="fab-position"
      v-model="fab"
      transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-tooltip right :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              fab
              color="primary"
              v-bind="attrs"
              v-on="on">
              <v-icon>mdi-layers-plus</v-icon>
            </v-btn>
          </template>
          <span>Add data source</span>
        </v-tooltip>
      </template>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            fab
            small
            color="accent"
            @click.stop="addFileClick"
            v-bind="attrs"
            v-on="on">
            <v-icon>mdi-file-document-outline</v-icon>
          </v-btn>
        </template>
        <span>Import from file</span>
      </v-tooltip>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            fab
            small
            color="accent"
            @click.stop.prevent="showUrlDialog"
            v-bind="attrs"
            v-on="on">
            <v-icon>mdi-cloud-download-outline</v-icon>
          </v-btn>
        </template>
        <span>Download from URL</span>
      </v-tooltip>
    </v-speed-dial>
  </v-sheet>
</template>

<script>
  import { remote, ipcRenderer } from 'electron'
  import jetpack from 'fs-jetpack'
  import { mapState } from 'vuex'
  import ProcessingSource from './ProcessingSource'
  import _ from 'lodash'
  import UniqueIDUtilities from '../../lib/UniqueIDUtilities'
  import DataSource from './DataSource'
  import DataSourceList from './DataSourceList'
  import AddDataSourceUrl from './AddDataSourceUrl'
  import ActionUtilities from '../../lib/ActionUtilities'

  let processing = {
    dataDragOver: false,
    sources: [],
    dragging: undefined,
    url: undefined
  }
  let selectedDataSource = null
  let fab = false

  export default {
    props: {
      sources: Object,
      project: Object,
      back: Function
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
        processing
      }
    },
    components: {
      AddDataSourceUrl,
      ProcessingSource,
      DataSource,
      DataSourceList
    },
    methods: {
      addFileClick () {
        this.fab = false
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'All Files',
              extensions: ['tif', 'tiff', 'geotiff', 'kml', 'kmz', 'geojson', 'json', 'shp', 'zip']
            }
          ],
          properties: ['openFile', 'multiSelections']
        }).then((result) => {
          if (result.filePaths && !_.isEmpty(result.filePaths)) {
            let fileInfos = []
            for (const file of result.filePaths) {
              let fileInfo = jetpack.inspect(file, {
                times: true,
                absolutePath: true
              })
              fileInfo.lastModified = fileInfo.modifyTime.getTime()
              fileInfo.lastModifiedDate = fileInfo.modifyTime
              fileInfo.path = fileInfo.absolutePath
              fileInfos.push(fileInfo)
            }
            this.processFiles(fileInfos)
          }
        })
      },
      async addSource (source) {
        processing.sources.push(source)
        let _this = this
        ipcRenderer.once('process_source_completed_' + source.id, (event, result) => {
          if (!result.error) {
            setTimeout(() => {
              _this.clearProcessing(result.source)
              ActionUtilities.addDataSources({dataSources: result.dataSources})
            }, 1000)
          }
        })
        ipcRenderer.send('process_source', {project: _this.project, source: source})
      },
      clearProcessing (processingSource) {
        for (let i = 0; i < processing.sources.length; i++) {
          let source = processing.sources[i]
          if (source.url && source.url === processingSource.url) {
            processing.sources.splice(i, 1)
            break
          } else if (source.file && source.file.path === processingSource.file.path) {
            processing.sources.splice(i, 1)
            break
          }
        }
      },
      processFiles (files) {
        files.forEach((file) => {
          let sourceToProcess = {
            id: UniqueIDUtilities.createUniqueID(),
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
          setTimeout(() => {
            this.addSource(sourceToProcess)
          }, 100)
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
      }
    },
    watch: {
      sources: {
        handler (newSources) {
          if (!_.isNil(this.selectedDataSource)) {
            this.selectedDataSource = newSources[this.selectedDataSource.id]
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

  .sources li.checked {
    list-style: url('../../assets/check.png');
  }
</style>
