<template>
  <v-sheet>
    <v-sheet v-if="styleEditorVisible">
      <style-editor
        :tableName="tableName"
        :projectId="projectId"
        :id="geopackage.id"
        :path="geopackage.path"
        :style-key="styleKey"
        :back="hideStyleEditor"
        :style-assignment="geopackage.styleAssignment"
        :table-style-assignment="geopackage.tableStyleAssignment"
        :icon-assignment="geopackage.iconAssignment"
        :table-icon-assignment="geopackage.tableIconAssignment"/>
    </v-sheet>
    <v-sheet v-else-if="showFeatureLayerField">
      <feature-layer-field
        :tableName="tableName"
        :projectId="projectId"
        :geopackage="geopackage"
        :column="featureLayerField"
        :columnNames="featureColumnNames"
        :back="hideFeatureLayerField"
        :renamed="featureLayerFieldRenamed"/>
    </v-sheet>
    <v-sheet v-else>
      <v-toolbar
        color="primary"
        dark
        flat
        class="sticky-toolbar"
      >
        <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
        <v-toolbar-title :title="tableName">{{tableName}}</v-toolbar-title>
      </v-toolbar>
      <v-container fluid>
        <v-dialog
          v-model="indexDialog"
          max-width="500"
          persistent>
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-speedometer</v-icon><span class="pl-1 pr-1">Indexing</span><b>{{tableName}}</b>
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-row
                align-content="center"
                justify="center"
              >
                <v-col
                  class="subtitle-1 text-center"
                  cols="12"
                >
                  {{indexMessage}}
                </v-col>
                <v-col cols="6">
                  <v-progress-linear
                    color="primary"
                    indeterminate
                    rounded
                    height="6"
                  ></v-progress-linear>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-dialog>
        <v-dialog
          v-model="renameDialog"
          max-width="500"
          persistent>
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-pencil-outline</v-icon>Rename {{tableName}}
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-form v-on:submit.prevent ref="renameForm" v-model="renameValid">
                <v-container class="ma-0 pa-0">
                  <v-row no-gutters>
                    <v-col cols="12">
                      <v-text-field
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
          max-width="500"
          persistent>
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-content-copy</v-icon>Copy {{tableName}}
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-form v-on:submit.prevent ref="copyForm" v-model="copyValid">
                <v-container class="ma-0 pa-0">
                  <v-row no-gutters>
                    <v-col cols="12">
                      <v-text-field
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
          persistent>
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-content-copy</v-icon>New Field
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-form v-on:submit.prevent ref="copyForm" v-model="addFieldValid">
                <v-container class="ma-0 pa-0">
                  <v-row no-gutters>
                    <v-col cols="12">
                      <v-text-field
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
          max-width="500"
          persistent>
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-trash-can-outline</v-icon>Remove {{tableName}}
              </v-row>
            </v-card-title>
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
                Remove
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-row no-gutters justify="center" class="mb-2">
          <v-col>
            <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
              <v-btn icon @click="zoomToLayer">
                <img src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
              </v-btn>
              <span>Feature Layer</span>
            </p>
          </v-col>
        </v-row>
        <v-row no-gutters class="pt-2" justify="center" align-content="center">
          <v-hover>
            <template v-slot="{ hover }">
              <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showRenameDialog">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small>mdi-pencil-outline</v-icon>
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
                    <v-icon small>mdi-trash-can-outline</v-icon>
                  </v-row>
                  <v-row no-gutters align-content="center" justify="center">
                    Remove
                  </v-row>
                </v-card-text>
              </v-card>
            </template>
          </v-hover>
          <v-hover v-if="!indexed" >
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
        <v-row no-gutters class="detail-bg detail-section-margins-and-padding">
          <v-col>
            <v-row no-gutters justify="space-between">
              <v-col>
                <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  GeoPackage
                </p>
                <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                  {{geopackage.name}}
                </p>
              </v-col>
              <v-col>
                <v-row no-gutters justify="end">
                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    Enable
                  </p>
                  <v-switch class="ml-2" :style="{marginTop: '-4px'}" dense v-model="visible" hide-details></v-switch>
                </v-row>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Features
                </p>
                <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                  {{featureCount}}
                </p>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Description
                </p>
                <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                  {{description}}
                </p>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
        <v-row no-gutters class="detail-bg detail-section-margins-and-padding">
          <v-container class="ma-0 pa-0">
            <v-row no-gutters>
              <p style="color: black; font-size: 16px; font-weight: 500;">Fields</p>
            </v-row>
            <v-row no-gutters>
              <v-btn block color="accent" class="detail-bg" @click="addFieldDialog = true">Add Field</v-btn>
            </v-row>
            <v-row no-gutters class="mt-4 detail-bg">
              <v-list style="width: 100%" class="detail-bg ma-0 pa-0">
                <template v-for="item in tableFields">
                  <v-list-item
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
                </template>
              </v-list>
            </v-row>
          </v-container>
        </v-row>
      </v-container>
      <v-snackbar
        v-model="copySnackBar"
      >
        Layer copied.
        <template v-slot:action="{ attrs }">
          <v-btn
            color="primary"
            text
            v-bind="attrs"
            @click="copySnackBar = false"
          >
            Close
          </v-btn>
        </template>
      </v-snackbar>
    </v-sheet>
  </v-sheet>
</template>

<script>
  import Vue from 'vue'
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import { GeoPackageAPI, GeoPackageDataType } from '@ngageoint/geopackage'
  import ViewEditText from '../Common/ViewEditText'
  import StyleEditor from '../StyleEditor/StyleEditor'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import FeatureLayerField from './FeatureLayerField'
  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String,
      back: Function,
      renamed: Function
    },
    components: {
      ViewEditText,
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
        copySnackBar: false,
        styleEditorVisible: false,
        showFeatureLayerField: false,
        featureColumnNames: [],
        featureLayerField: null,
        indexDialog: false,
        indexProgressPercentage: 0,
        indexMessage: 'Indexing Started',
        loading: true,
        hasStyleExtension: false,
        deleteDialog: false,
        renameValid: false,
        renameDialog: false,
        renamedTable: this.tableName,
        renamedTableRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        copyDialog: false,
        copyValid: false,
        copiedTable: this.tableName + '_copy',
        copiedTableRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        addFieldDialog: false,
        addFieldValid: false,
        addFieldValue: '',
        addFieldRules: [
          v => !!v || 'Field name is required',
          v => this.columnNames.map(name => name.toLowerCase()).indexOf(v.toLowerCase()) === -1 || 'Field name must be unique'
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
          this.setGeoPackageFeatureTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
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
      ...mapActions({
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        setGeoPackageFeatureTableVisible: 'Projects/setGeoPackageFeatureTableVisible',
        copyGeoPackageFeatureTable: 'Projects/copyGeoPackageFeatureTable',
        renameGeoPackageFeatureTable: 'Projects/renameGeoPackageFeatureTable',
        deleteGeoPackageFeatureTable: 'Projects/deleteGeoPackageFeatureTable',
        addGeoPackageFeatureTableColumn: 'Projects/addGeoPackageFeatureTableColumn',
        updateFeatureTable: 'Projects/updateFeatureTable',
        zoomToExtent: 'Projects/zoomToExtent'
      }),
      async styleExtensionEnabled () {
        let hasStyle = false
        let gp = await GeoPackageAPI.open(this.geopackage.path)
        try {
          hasStyle = gp.featureStyleExtension.has(this.tableName)
        } catch (error) {
          console.error(error)
        }
        try {
          gp.close()
        } catch (error) {
          console.error(error)
        }
        return hasStyle
      },
      rename () {
        this.renameDialog = false
        this.renameGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, oldTableName: this.tableName, newTableName: this.renamedTable})
        this.renamed(this.renamedTable)
      },
      copy () {
        this.copyDialog = false
        this.copyGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, copyTableName: this.copiedTable})
        this.copySnackBar = true
      },
      deleteTable () {
        this.deleteDialog = false
        this.deleteGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      showRenameDialog () {
        this.renameValid = false
        this.renameDialog = true
        Vue.nextTick(() => {
          this.$refs.renameForm.validate()
        })
      },
      showCopyDialog () {
        this.copyValid = false
        this.copyDialog = true
        Vue.nextTick(() => {
          this.$refs.copyForm.validate()
        })
      },
      indexTable () {
        let _this = this
        this.indexDialog = true
        setTimeout(function () {
          _this.indexMessage = 'Indexing...'
          GeoPackageUtilities.indexFeatureTable(_this.geopackage.path, _this.tableName, true).then(function () {
            setTimeout(function () {
              _this.indexMessage = 'Indexing Completed'
              setTimeout(function () {
                _this.indexDialog = false
                _this.indexMessage = 'Indexing Started'
                _this.updateFeatureTable({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: _this.tableName})
              }, 1000)
            }, 1000)
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
        this.zoomToExtent({projectId: this.projectId, extent})
      },
      addField () {
        this.addFieldDialog = false
        this.addGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, columnName: this.addFieldValue, columnType: this.addFieldType})
        this.addFieldValue = ''
        this.addFieldType = GeoPackageDataType.TEXT
      },
      cancelAddField () {
        this.addFieldDialog = false
        this.addFieldValue = ''
        this.addFieldType = GeoPackageDataType.TEXT
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

</style>
