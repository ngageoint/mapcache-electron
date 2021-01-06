<template>
  <v-sheet>
    <v-sheet v-if="styleEditorVisible">
      <v-sheet v-if="source.pane === 'vector'">
        <style-editor
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
      </v-sheet>
      <div v-else-if="source.layerType === 'GeoTIFF'">
        <geotiff-options :source="source" :projectId="project.id" :back="hideStyleEditor"></geotiff-options>
      </div>
      <div v-else>
        <transparency-options :source="source" :projectId="project.id" :back="hideStyleEditor"></transparency-options>
      </div>
    </v-sheet>
    <v-sheet v-else>
      <v-toolbar
        color="main"
        dark
        flat
        class="sticky-toolbar"
      >
        <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
        <v-toolbar-title :title="initialDisplayName">{{initialDisplayName}}</v-toolbar-title>
      </v-toolbar>
      <v-dialog
        v-model="renameDialog"
        max-width="400"
        persistent>
        <v-card>
          <v-card-title>
            <v-icon color="primary" class="pr-2">mdi-pencil</v-icon>
            Rename data source
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
        v-model="deleteDialog"
        max-width="400"
        persistent>
        <v-card>
          <v-card-title>
            <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
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
        persistent>
        <v-card>
          <v-card-title>
            <v-icon color="warning" class="pr-2">mdi-export-variant</v-icon>
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
            <v-icon color="primary" class="pr-2">mdi-export-variant</v-icon>
            Exporting {{initialDisplayName}}
          </v-card-title>
          <v-card-text>
            <v-progress-linear indeterminate color="primary"></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-container fluid class="text-left">
        <v-alert
          class="alert-position"
          v-model="showExportAlert"
          dismissible
          type="success"
        >Successfully exported.</v-alert>
        <v-row no-gutters>
          <v-col>
            <p class="text-subtitle-1">
              <v-btn icon @click="zoomToSource" color="whitesmoke">
                <img v-if="source.pane === 'tile' && $vuetify.theme.dark" src="../../assets/white_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                <img v-else-if="$vuetify.theme.dark" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                <img v-else-if="source.pane === 'tile'" src="../../assets/colored_layers.png" alt="Tile Layer" width="20px" height="20px"/>
                <img v-else src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
              </v-btn>
              <span>{{source.pane === 'vector' ? 'Feature' : 'Tile'}} Data Source</span>
            </p>
          </v-col>
        </v-row>
        <v-row no-gutters class="pb-2" style="margin-left: -12px" justify="center" align-content="center">
          <v-hover>
            <template v-slot="{ hover }">
              <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="renameDialog = true">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small>mdi-pencil</v-icon>
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
                    <v-icon small>mdi-palette</v-icon>
                  </v-row>
                  <v-row no-gutters align-content="center" justify="center">
                    Style
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
                        <v-icon small>mdi-export-variant</v-icon>
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
                    <v-icon small>mdi-trash-can</v-icon>
                  </v-row>
                  <v-row no-gutters align-content="center" justify="center">
                    Remove
                  </v-row>
                </v-card-text>
              </v-card>
            </template>
          </v-hover>
        </v-row>
        <v-row no-gutters class="detail-bg detail-section-margins-and-padding">
          <v-col>
            <v-row no-gutters justify="space-between">
              <v-col>
                <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Data Source Type
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
                  <v-switch color="primary" class="ml-2" :style="{marginTop: '-4px'}" dense v-model="visible" hide-details></v-switch>
                </v-row>
              </v-col>
            </v-row>
            <v-row no-gutters justify="start" v-if="source.pane === 'tile' && (source.layerType === 'WMS' || source.layerType === 'XYZServer')">
              <v-col>
                <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Data Source URL
                </p>
                <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
                  {{source.filePath}}
                </p>
              </v-col>
            </v-row>
            <v-row no-gutters justify="space-between" v-if="source.pane === 'vector'">
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
                      mdi-table-eye
                    </v-icon>View features
                  </v-btn>
                </v-row>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>
  </v-sheet>
</template>

<script>
  import { mapState } from 'vuex'
  import { remote, ipcRenderer } from 'electron'
  import fs from 'fs'
  import path from 'path'
  import _ from 'lodash'
  import GeotiffOptions from './GeotiffOptions'
  import TransparencyOptions from './TransparencyOptions'
  import StyleEditor from '../StyleEditor/StyleEditor'
  import ActionUtilities from '../../lib/ActionUtilities'

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
      TransparencyOptions,
      GeotiffOptions,
      StyleEditor
    },
    computed: {
      ...mapState({
        initialDisplayName () {
          return _.isNil(this.source.displayName) ? this.source.name : this.source.displayName
        }
      }),
      visible: {
        get () {
          return this.source ? this.source.visible : false
        },
        set () {
          ActionUtilities.setDataSourceVisible({projectId: this.project.id, sourceId: this.source.id, visible: !this.source.visible})
        }
      }
    },
    data () {
      return {
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
        renamedSource: _.isNil(this.source.displayName) ? this.source.name : this.source.displayName,
        renamedSourceRules: [
          v => !!v || 'Name is required'
        ]
      }
    },
    methods: {
      saveLayerName () {
        this.renameDialog = false
        ActionUtilities.setDataSourceDisplayName({projectId: this.project.id, sourceId: this.source.id, displayName: this.renamedSource})
      },
      copyAndAddGeoPackage (filePath) {
        this.exportingProgressDialog = true
        fs.copyFile(this.source.geopackageFilePath, filePath, () => {
          const geopackageKey = _.keys(this.project.geopackages).find(key => this.project.geopackages[key].path === filePath)
          if (_.isNil(geopackageKey)) {
            ActionUtilities.addGeoPackage({projectId: this.project.id, filePath: filePath})
          } else {
            ActionUtilities.synchronizeGeoPackage({projectId: this.project.id, geopackageId: geopackageKey})
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
          remote.dialog.showSaveDialog().then(({canceled, filePath}) => {
            if (!canceled) {
              if (!_.isNil(filePath)) {
                if (!filePath.endsWith('.gpkg')) {
                  filePath = filePath + '.gpkg'
                }
                if (!fs.existsSync(filePath)) {
                  this.copyAndAddGeoPackage(filePath)
                } else {
                  this.overwriteFile = filePath
                  this.overwriteFileName = path.basename(filePath)
                  this.showOverwriteDialog = true
                }
              }
            }
          })
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error)
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
        ActionUtilities.zoomToExtent({projectId: this.project.id, extent: this.source.extent})
      },
      showFeatureTable () {
        ipcRenderer.send('show_feature_table', this.source.id, this.source.sourceLayerName, false)
      },
      removeDataSource () {
        ActionUtilities.removeDataSource({projectId: this.project.id, sourceId: this.source.id})
      }
    }
  }
</script>

<style scoped>
</style>
