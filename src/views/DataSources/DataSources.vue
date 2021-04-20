<template>
  <data-source v-if="selectedDataSource !== null && selectedDataSource !== undefined"
    :key="selectedDataSource.id"
    class="sources"
    :source="selectedDataSource"
    :project="project"
    :back="deselectDataSource">
  </data-source>
  <add-data-source-url v-else-if="urlSourceDialog" :back="() => {urlSourceDialog = false}" :sources="sources" :project="project" :add-source="addSource"></add-data-source-url>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title>Data Sources</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <data-source-list :sources="sources" :projectId="project.id" :source-selected="dataSourceSelected">
      </data-source-list>
      <template v-for="source in processingSourceList">
        <processing-source
          :source="source"
          :key="source.id"
          class="sources processing-source"
          @clear-processing="clearProcessing">
        </processing-source>
      </template>
    </v-sheet>
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
              <v-icon>{{mdiLayersPlus}}</v-icon>
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
            <v-icon>{{mdiFileDocumentOutline}}</v-icon>
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
            <v-icon>{{mdiCloudDownloadOutline}}</v-icon>
          </v-btn>
        </template>
        <span>Download from URL</span>
      </v-tooltip>
    </v-speed-dial>
  </v-sheet>
</template>

<script>
  import { ipcRenderer } from 'electron'
  import jetpack from 'fs-jetpack'
  import { mapState } from 'vuex'
  import ProcessingSource from './ProcessingSource'
  import isNil from 'lodash/isNil'
  import isEmpty from 'lodash/isEmpty'
  import cloneDeep from 'lodash/cloneDeep'
  import UniqueIDUtilities from '../../lib/util/UniqueIDUtilities'
  import DataSource from './DataSource'
  import DataSourceList from './DataSourceList'
  import AddDataSourceUrl from './AddDataSourceUrl'
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import FileUtilities from '../../lib/util/FileUtilities'
  import ElectronUtilities from '../../lib/electron/ElectronUtilities'
  import { mdiChevronLeft, mdiLayersPlus, mdiFileDocumentOutline, mdiCloudDownloadOutline } from '@mdi/js'

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
        mdiChevronLeft: mdiChevronLeft,
        mdiLayersPlus: mdiLayersPlus,
        mdiFileDocumentOutline: mdiFileDocumentOutline,
        mdiCloudDownloadOutline: mdiCloudDownloadOutline,
        selectedDataSource,
        fab,
        urlSourceDialog: false,
        processingSourceList: []
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
        ElectronUtilities.showOpenDialog({
          filters: [
            {
              name: 'All Files',
              extensions: FileUtilities.SUPPORTED_FILE_EXTENSIONS
            }
          ],
          properties: ['openFile', 'multiSelections']
        }).then((result) => {
          if (result.filePaths && !isEmpty(result.filePaths)) {
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
        this.processingSourceList.push(source)
        let self = this
        ipcRenderer.once('process_source_completed_' + source.id, (event, result) => {
          // if there is no error, go ahead and add data sources
          if (isNil(result.error)) {
            setTimeout(() => {
              ProjectActions.addDataSources({projectId: self.project.id, dataSources: result.dataSources})
              self.$nextTick(() => {
                self.clearProcessing(source)
              })
            }, 1000)
          } else {
            // iterate over list of sources and set error
            for (let i = 0; i < this.processingSourceList.length; i++) {
              let s = this.processingSourceList[i]
              if (s.id === source.id) {
                const sCopy = cloneDeep(s)
                sCopy.error = result.error
                this.processingSourceList.splice(i, 1, sCopy)
                break
              }
            }
          }
        })
        ipcRenderer.send('process_source', {project: self.project, source: source})
      },
      clearProcessing (processingSource) {
        for (let i = 0; i < this.processingSourceList.length; i++) {
          let source = this.processingSourceList[i]
          if (source.id === processingSource.id) {
            this.processingSourceList.splice(i, 1)
            ProjectActions.notifyTab({projectId: this.project.id, tabId: 1})
            break
          }
        }
      },
      processFiles (files) {
        files.forEach((file) => {
          const id = UniqueIDUtilities.createUniqueID()
          let sourceToProcess = {
            id: id,
            directory: ElectronUtilities.createSourceDirectory(this.project.directory),
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
