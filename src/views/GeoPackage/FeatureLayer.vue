<template>
  <v-sheet v-if="styleEditorVisible" class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="hideStyleEditor"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title><b class="ml-2">{{tableName}}</b> Style Editor</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-card flat tile>
        <style-editor v-if="styleEditorVisible"
          :tableName="tableName"
          :projectId="projectId"
          :project="project"
          :id="geopackage.id"
          :path="geopackage.path"
          :style-key="styleKey"
          :back="hideStyleEditor"
          :style-assignment="geopackage.styleAssignment"
          :table-style-assignment="geopackage.tableStyleAssignment"
          :icon-assignment="geopackage.iconAssignment"
          :table-icon-assignment="geopackage.tableIconAssignment"/>
      </v-card>
    </v-sheet>
  </v-sheet>
  <feature-layer-field v-else-if="showFeatureLayerField"
    :tableName="tableName"
    :projectId="projectId"
    :geopackage="geopackage"
    :column="featureLayerField"
    :columnNames="featureColumnNames"
    :back="hideFeatureLayerField"
    :renamed="featureLayerFieldRenamed"/>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title :title="tableName">{{tableName}}</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-alert
        class="alert-position"
        v-model="showCopiedAlert"
        dismissible
        type="success"
      >Layer copied.</v-alert>
      <v-dialog
        v-model="indexDialog"
        max-width="400"
        persistent>
        <v-card>
          <v-card-title>
            <v-icon color="primary" class="pr-2">mdi-speedometer</v-icon>
            Indexing feature table
          </v-card-title>
          <v-card-text>
            <v-row
              no-gutters
              class="pt-2 pb-2"
            >
              {{indexMessage}}
            </v-row>
            <v-row no-gutters class="pb-4" v-if="!indexingDone">
              <v-progress-linear
                color="primary"
                indeterminate
                rounded
                height="6"
              ></v-progress-linear>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              v-if="indexingDone"
              text
              @click="indexDialog = false">
              Close
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="renameDialog"
        max-width="400"
        persistent
        @keydown.esc="renameDialog = false">
        <v-card v-if="renameDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2">mdi-pencil</v-icon>
            Rename feature layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                      autofocus
                      v-model="renamedTable"
                      :rules="renamedTableRules"
                      label="Name"
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
              @click="rename">
              Rename
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="copyDialog"
        max-width="400"
        persistent
        @keydown.esc="copyDialog = false">
        <v-card v-if="copyDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2">mdi-content-copy</v-icon>
            Copy feature layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="copyForm" v-model="copyValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                      autofocus
                      v-model="copiedTable"
                      :rules="copiedTableRules"
                      label="Name"
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
              @click="copyDialog = false">
              Cancel
            </v-btn>
            <v-btn
              v-if="copyValid"
              color="primary"
              text
              @click="copy">
              Copy
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="addFieldDialog"
        max-width="575"
        persistent
        @keydown.esc="cancelAddField">
        <v-card v-if="addFieldDialog">
          <v-card-title>
            <v-row no-gutters justify="start" align="center">
              New Field
            </v-row>
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="copyForm" v-model="addFieldValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                      autofocus
                      v-model="addFieldValue"
                      :rules="addFieldRules"
                      label="Name"
                      required
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row no-gutters class="mt-4">
                  <v-col cols="12">
                    <p class="pb-0 mb-0">Type</p>
                    <v-btn-toggle
                      v-model="addFieldType"
                      color="primary"
                      mandatory
                      style="width: 100%"
                    >
                      <v-btn :value="TEXT">
                        <v-icon left :color="addFieldType === TEXT ? 'primary' : ''">
                          mdi-format-text
                        </v-icon>
                        <span class="hidden-sm-and-down">Text</span>
                      </v-btn>
                      <v-btn :value="FLOAT">
                        <v-icon left :color="addFieldType === FLOAT ? 'primary' : ''">
                          mdi-pound
                        </v-icon>
                        <span class="hidden-sm-and-down">Number</span>
                      </v-btn>
                      <v-btn :value="BOOLEAN">
                        <v-icon left :color="addFieldType === BOOLEAN ? 'primary' : ''">
                          mdi-toggle-switch
                        </v-icon>
                        <span class="hidden-sm-and-down">Checkbox</span>
                      </v-btn>
                      <v-btn :value="DATE">
                        <v-icon left :color="addFieldType === DATE ? 'primary' : ''">
                          mdi-calendar
                        </v-icon>
                        <span class="hidden-sm-and-down">Date</span>
                      </v-btn>
                      <v-btn :value="DATETIME">
                        <v-icon left :color="addFieldType === DATETIME ? 'primary' : ''">
                          mdi-calendar-clock
                        </v-icon>
                        <span class="hidden-sm-and-down">Date & Time</span>
                      </v-btn>
                    </v-btn-toggle>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="cancelAddField">
              Cancel
            </v-btn>
            <v-btn
              v-if="addFieldValid"
              color="primary"
              text
              @click="addField">
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
            <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
            Delete feature layer
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete the <b>{{tableName}}</b> feature layer from the <b>{{geopackage.name}}</b> GeoPackage? This action can't be undone.
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
              @click="deleteTable">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters class="pl-3 pt-3 pr-3 background" justify="center">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn icon @click="zoomToLayer" color="whitesmoke">
              <img v-if="$vuetify.theme.dark" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
              <img v-else src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
            </v-btn>
            <span style="vertical-align: middle;">Feature Layer</span>
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showRenameDialog">
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showCopyDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-content-copy</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Copy
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
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-trash-can</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Delete
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover v-if="!indexed">
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="indexTable">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-speedometer</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Index
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <v-col>
          <v-row no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                GeoPackage
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{geopackage.name}}
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
          <v-row no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Features
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{featureCount}}
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
          <v-row no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Description
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{description}}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <v-container class="ma-0 pa-0">
          <v-row no-gutters>
            <p style="font-size: 16px; font-weight: 500;">Fields</p>
          </v-row>
          <v-row no-gutters>
            <v-btn block color="accent" class="detail-bg" @click="addFieldDialog = true">Add Field</v-btn>
          </v-row>
          <v-row no-gutters class="mt-4 detail-bg">
            <v-list style="width: 100%" class="detail-bg ma-0 pa-0">
              <v-list-item
                v-for="item in tableFields"
                class="detail-bg"
                :key="item.id"
                @click="item.click"
              >
                <v-list-item-icon>
                  <v-icon>{{item.icon}}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title :title="item.name" v-html="item.name"></v-list-item-title>
                  <v-list-item-subtitle :title="item.type" v-html="item.type"></v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-row>
        </v-container>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
  import _ from 'lodash'
  import { GeoPackageAPI, GeoPackageDataType } from '@ngageoint/geopackage'
  import StyleEditor from '../StyleEditor/StyleEditor'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import FeatureLayerField from './FeatureLayerField'
  import ActionUtilities from '../../lib/ActionUtilities'
  import EventBus from '../../EventBus'

  export default {
    props: {
      projectId: String,
      project: Object,
      geopackage: Object,
      tableName: String,
      back: Function,
      renamed: Function
    },
    components: {
      StyleEditor,
      FeatureLayerField
    },
    created () {
      let _this = this
      this.loading = true
      this.styleExtensionEnabled().then(function (hasStyleExtension) {
        _this.hasStyleExtension = hasStyleExtension
        _this.loading = false
      })
    },
    data () {
      return {
        columnNames: [],
        showCopiedAlert: false,
        styleEditorVisible: false,
        showFeatureLayerField: false,
        featureColumnNames: [],
        featureLayerField: null,
        indexDialog: false,
        indexingDone: false,
        indexMessage: 'Indexing Started',
        loading: true,
        hasStyleExtension: false,
        deleteDialog: false,
        renameValid: false,
        renameDialog: false,
        renamedTable: this.tableName,
        renamedTableRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name already exists'
        ],
        copyDialog: false,
        copyValid: false,
        copiedTable: this.tableName + '_copy',
        copiedTableRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name already exists'
        ],
        addFieldDialog: false,
        addFieldValid: false,
        addFieldValue: '',
        addFieldRules: [
          v => !!v || 'Field name is required',
          v => this.columnNames.map(name => name.toLowerCase()).indexOf(v.toLowerCase()) === -1 || 'Field name already exists'
        ],
        addFieldType: GeoPackageDataType.TEXT,
        TEXT: GeoPackageDataType.TEXT,
        FLOAT: GeoPackageDataType.FLOAT,
        BOOLEAN: GeoPackageDataType.BOOLEAN,
        DATETIME: GeoPackageDataType.DATETIME,
        DATE: GeoPackageDataType.DATE
      }
    },
    computed: {
      visible: {
        get () {
          return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].visible : false
        },
        set (value) {
          ActionUtilities.setGeoPackageFeatureTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
        }
      },
      indexed () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].indexed : true
      },
      featureCount () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].featureCount : 0
      },
      description () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].description : ''
      },
      styleKey () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].styleKey : 0
      }
    },
    asyncComputed: {
      tableFields: {
        get () {
          return GeoPackageUtilities.getFeatureColumns(this.geopackage.path, this.tableName).then(columns => {
            const tableFields = []
            this.columnNames = columns._columns.map(c => c.name)
            columns._columns.forEach((column, index) => {
              if (!column.primaryKey && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
                tableFields.push({
                  id: column.name + '_' + index,
                  name: column.name.toLowerCase(),
                  type: GeoPackageUtilities.getSimplifiedType(column.dataType),
                  icon: GeoPackageUtilities.getSimplifiedTypeIcon(column.dataType),
                  click: () => {
                    this.featureLayerField = {
                      name: column.name,
                      icon: GeoPackageUtilities.getSimplifiedTypeIcon(column.dataType),
                      type: GeoPackageUtilities.getSimplifiedType(column.dataType)
                    }
                    this.featureColumnNames = this.columnNames
                    this.showFeatureLayerField = true
                  }
                })
              }
            })
            return _.orderBy(tableFields, ['name'], ['asc'])
          })
        },
        default: []
      }
    },
    methods: {
      async styleExtensionEnabled () {
        let hasStyle = false
        let gp = await GeoPackageAPI.open(this.geopackage.path)
        try {
          hasStyle = gp.featureStyleExtension.has(this.tableName)
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error)
        }
        try {
          gp.close()
          gp = undefined
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error)
        }
        return hasStyle
      },
      rename () {
        this.renamed(this.renamedTable)
        this.copiedTable = this.renamedTable + '_copy'
        ActionUtilities.renameGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, oldTableName: this.tableName, newTableName: this.renamedTable})
        this.$nextTick(() => {
          this.renameDialog = false
        })
      },
      copy () {
        this.copyDialog = false
        ActionUtilities.copyGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, copyTableName: this.copiedTable})
        this.showCopiedAlert = true
      },
      deleteTable () {
        this.deleteDialog = false
        ActionUtilities.deleteGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      showRenameDialog () {
        this.renameValid = false
        this.renameDialog = true
        this.$nextTick(() => {
          this.$refs.renameForm.validate()
        })
      },
      showCopyDialog () {
        this.copyValid = false
        this.copyDialog = true
        this.$nextTick(() => {
          this.$refs.copyForm.validate()
        })
      },
      indexTable () {
        let _this = this
        this.indexingDone = false
        this.indexMessage = 'Indexing Started'
        this.indexDialog = true
        setTimeout(function () {
          _this.indexMessage = 'Indexing...'
          GeoPackageUtilities.indexFeatureTable(_this.geopackage.path, _this.tableName, true).then(function () {
            setTimeout(function () {
              _this.indexingDone = true
              _this.indexMessage = 'Indexing Completed'
              ActionUtilities.updateFeatureTable({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: _this.tableName})
            }, 2000)
          })
        }, 1000)
      },
      hideStyleEditor () {
        this.styleEditorVisible = false
      },
      hideFeatureLayerField () {
        this.showFeatureLayerField = false
        this.featureLayerField = null
        this.featureColumnNames = []
      },
      featureLayerFieldRenamed (name) {
        this.featureColumnNames.splice(this.featureColumnNames.indexOf(this.featureLayerField.name), 1, name)
        this.featureLayerField.name = name
      },
      async zoomToLayer () {
        const extent = await GeoPackageUtilities.getBoundingBoxForTable(this.geopackage.path, this.tableName)
        ActionUtilities.zoomToExtent({projectId: this.projectId, extent})
      },
      addField () {
        this.addFieldDialog = false
        ActionUtilities.addGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, columnName: this.addFieldValue, columnType: this.addFieldType})
        this.addFieldValue = ''
        this.addFieldType = GeoPackageDataType.TEXT
      },
      cancelAddField () {
        this.addFieldDialog = false
        this.addFieldValue = ''
        this.addFieldType = GeoPackageDataType.TEXT
      },
      showFeatureTable () {
        const payload = {
          id: this.geopackage.id,
          tableName: this.tableName,
          isGeoPackage: true
        }
        EventBus.$emit('show-feature-table', payload)
      }
    },
    watch: {
      styleKey: {
        async handler (styleKey, oldValue) {
          if (styleKey !== oldValue) {
            let _this = this
            _this.loading = true
            this.styleExtensionEnabled().then(function (hasStyleExtension) {
              _this.hasStyleExtension = hasStyleExtension
              _this.loading = false
            })
          }
        },
        deep: true
      }
    }
  }
</script>

<style scoped>
  .btn-background {
    background-color: var(--v-main_active_background-base) !important;
  }
</style>
