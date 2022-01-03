<template>
  <feature-view v-if="displayFeature && displayFeature.isGeoPackage" :name="geopackage.name" :project="project" :projectId="projectId" is-geo-package :geopackage-path="geopackage.path" :id="geopackage.id" :tableName="tableName" :feature-id="displayFeature.featureId" :object="geopackage" :back="hideFeature"/>
  <v-sheet v-else-if="styleEditorVisible" class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="hideStyleEditor"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title><v-icon large color="white" class="pr-2">{{mdiPalette}}</v-icon>{{tableName}}</v-toolbar-title>
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
  <feature-layer-field v-else-if="showFeatureLayerField && columnOrder != null"
    :tableName="tableName"
    :projectId="projectId"
    :geopackage="geopackage"
    :column="featureLayerField"
    :columnNames="columnOrder"
    :back="hideFeatureLayerField"
    :renamed="featureLayerFieldRenamed"/>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
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
            <v-icon color="primary" class="pr-2">{{mdiSpeedometer}}</v-icon>
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
        @keydown.esc="closeRenameDialog">
        <v-card v-if="renameDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2">{{mdiPencil}}</v-icon>
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
              :disabled="renaming"
              text
              @click="renameDialog = false">
              Cancel
            </v-btn>
            <v-btn
              :loading="renaming"
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
        @keydown.esc="closeCopyDialog">
        <v-card v-if="copyDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2">{{mdiContentCopy}}</v-icon>
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
              :disabled="copying"
              text
              @click="copyDialog = false">
              Cancel
            </v-btn>
            <v-btn
              :loading="copying"
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
              New field
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
                          {{mdiFormatText}}
                        </v-icon>
                        <span class="hidden-sm-and-down">Text</span>
                      </v-btn>
                      <v-btn :value="FLOAT">
                        <v-icon left :color="addFieldType === FLOAT ? 'primary' : ''">
                          {{mdiPound}}
                        </v-icon>
                        <span class="hidden-sm-and-down">Number</span>
                      </v-btn>
                      <v-btn :value="BOOLEAN">
                        <v-icon left :color="addFieldType === BOOLEAN ? 'primary' : ''">
                          {{mdiToggleSwitch}}
                        </v-icon>
                        <span class="hidden-sm-and-down">Checkbox</span>
                      </v-btn>
                      <v-btn :value="DATE">
                        <v-icon left :color="addFieldType === DATE ? 'primary' : ''">
                          {{mdiCalendar}}
                        </v-icon>
                        <span class="hidden-sm-and-down">Date</span>
                      </v-btn>
                      <v-btn :value="DATETIME">
                        <v-icon left :color="addFieldType === DATETIME ? 'primary' : ''">
                          {{mdiCalendarClock}}
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
        @keydown.esc="closeDeleteDialog">
        <v-card v-if="deleteDialog">
          <v-card-title>
            <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
            Delete feature layer
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete the <b>{{tableName}}</b> feature layer from the <b>{{geopackage.name}}</b> GeoPackage? This action can't be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :disabled="deleting"
              text
              @click="deleteDialog = false">
              Cancel
            </v-btn>
            <v-btn
              :loading="deleting"
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
              <img v-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
              <img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
            <span style="vertical-align: middle;">Feature layer</span>
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showRenameDialog">
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showCopyDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiContentCopy}}</v-icon>
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
                  <v-icon small>{{mdiPalette}}</v-icon>
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
                  <v-icon small>{{mdiTrashCan}}</v-icon>
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
                  <v-icon small>{{mdiSpeedometer}}</v-icon>
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
          <v-row class="pb-2" no-gutters justify="space-between">
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
          <v-row class="pb-2" no-gutters justify="space-between">
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
                <v-btn class="btn-background" @click.stop="showFeatureTable" :disabled="featureCount === 0">
                  <v-icon left>
                    {{mdiTableEye}}
                  </v-icon>View features
                </v-btn>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
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
            <v-list
                v-if="tableFields != null && columnOrder != null"
                id="sortable-list"
                style="width: 100%"
                class="detail-bg ma-0 pa-0"
                v-sortable-list="{onEnd:updateColumnOrder}">
              <v-list-item
                v-for="column in columnOrder"
                class="detail-bg sortable-list-item"
                :key="tableFields[column].name"
                @click="tableFields[column].click">
                <v-list-item-icon>
                  <v-icon>{{tableFields[column].icon}}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title :title="tableFields[column].name" v-html="tableFields[column].name"></v-list-item-title>
                  <v-list-item-subtitle :title="tableFields[column].type" v-html="tableFields[column].type"></v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-icon class="sortHandle">
                  <v-icon>{{mdiDragHorizontalVariant}}</v-icon>
                </v-list-item-icon>
              </v-list-item>
            </v-list>
          </v-row>
        </v-container>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import StyleEditor from '../StyleEditor/StyleEditor'
import FeatureLayerField from './FeatureLayerField'
import EventBus from '../../lib/vue/EventBus'
import {
  mdiCalendar,
  mdiCalendarClock,
  mdiChevronLeft,
  mdiContentCopy,
  mdiFormatText,
  mdiPalette,
  mdiPencil,
  mdiPound,
  mdiSpeedometer,
  mdiTableEye,
  mdiToggleSwitch,
  mdiTrashCan,
  mdiDragHorizontalVariant
} from '@mdi/js'
import {zoomToGeoPackageTable} from '../../lib/leaflet/map/ZoomUtilities'
import FeatureView from '../Common/FeatureView'
import Sortable from 'sortablejs'

export default {
    props: {
      projectId: String,
      project: Object,
      geopackage: Object,
      tableName: String,
      back: Function,
      renamed: Function,
      displayFeature: Object
    },
    components: {
      StyleEditor,
      FeatureLayerField,
      FeatureView
    },
    directives: {
      'sortable-list': {
        inserted: (el, binding) => {
          Sortable.create(el, binding.value ? {
            ...binding.value,
            handle: '.sortHandle',
            ghostClass: 'ghost',
            forceFallback : true,
            onChoose: function () { document.body.style.cursor = 'grabbing' }, // Dragging started
            onStart: function () { document.body.style.cursor = 'grabbing' }, // Dragging started
            onUnchoose: function () { document.body.style.cursor = 'default' }, // Dragging started
          } : {})
        },
      },
    },
    created () {
      let _this = this
      this.loading = true
      window.mapcache.hasStyleExtension(this.geopackage.path, this.tableName).then(function (hasStyleExtension) {
        _this.hasStyleExtension = hasStyleExtension
        _this.loading = false
      })
    },
    data () {
      return {
        mdiChevronLeft: mdiChevronLeft,
        mdiSpeedometer: mdiSpeedometer,
        mdiPencil: mdiPencil,
        mdiContentCopy: mdiContentCopy,
        mdiFormatText: mdiFormatText,
        mdiPound: mdiPound,
        mdiToggleSwitch: mdiToggleSwitch,
        mdiCalendar: mdiCalendar,
        mdiCalendarClock: mdiCalendarClock,
        mdiTableEye: mdiTableEye,
        mdiTrashCan: mdiTrashCan,
        mdiPalette: mdiPalette,
        mdiDragHorizontalVariant: mdiDragHorizontalVariant,
        showCopiedAlert: false,
        styleEditorVisible: false,
        showFeatureLayerField: false,
        featureLayerField: null,
        indexDialog: false,
        indexingDone: false,
        indexMessage: 'Indexing started',
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
          v => this.columnOrder.map(name => name).indexOf(v.toLowerCase()) === -1 || 'Field name already exists'
        ],
        addFieldType: window.mapcache.GeoPackageDataType.TEXT,
        TEXT: window.mapcache.GeoPackageDataType.TEXT,
        FLOAT: window.mapcache.GeoPackageDataType.FLOAT,
        BOOLEAN: window.mapcache.GeoPackageDataType.BOOLEAN,
        DATETIME: window.mapcache.GeoPackageDataType.DATETIME,
        DATE: window.mapcache.GeoPackageDataType.DATE,
        renaming: false,
        deleting: false,
        copying: false,
        shownFeatureData: null,
        featureColumns: []
      }
    },
    computed: {
      visible: {
        get () {
          return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].visible : false
        },
        set (value) {
          window.mapcache.setGeoPackageFeatureTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
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
          return window.mapcache.getFeatureColumns(this.geopackage.path, this.tableName).then(columns => {
            const tableFields = {}
            columns._columns.forEach((column, index) => {
              // excluding primary key column, blob columns, and _feature_id columns
              if (!column.primaryKey && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id') {
                tableFields[column.name.toLowerCase()] = {
                  id: column.name + '_' + index,
                  name: column.name.toLowerCase(),
                  type: this.getSimplifiedType(column.dataType),
                  icon: this.getSimplifiedTypeIcon(column.dataType),
                  click: () => {
                    this.featureLayerField = {
                      name: column.name,
                      icon: this.getSimplifiedTypeIcon(column.dataType),
                      type: this.getSimplifiedType(column.dataType)
                    }
                    this.showFeatureLayerField = true
                  }
                }
              }
            })
            return tableFields
          })
        },
        default: null
      },
      columnOrder: {
        get () {
          return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].columnOrder.slice() : []
        },
        default: []
      }
    },
    methods: {
      hideFeature () {
        EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE)
      },
      getSimplifiedType (dataType) {
        let simplifiedType = 'Number'
        switch (dataType) {
          case window.mapcache.GeoPackageDataType.BOOLEAN:
            simplifiedType = 'Boolean'
            break
          case window.mapcache.GeoPackageDataType.TEXT:
            simplifiedType = 'Text'
            break
          case window.mapcache.GeoPackageDataType.DATE:
            simplifiedType = 'Date'
            break
          case window.mapcache.GeoPackageDataType.DATETIME:
            simplifiedType = 'Date & Time'
            break
          default:
            break
        }
        return simplifiedType
      },
      getSimplifiedTypeIcon (dataType) {
        let simplifiedTypeIcon = mdiPound
        switch (dataType) {
          case window.mapcache.GeoPackageDataType.BOOLEAN:
            simplifiedTypeIcon = mdiToggleSwitch
            break
          case window.mapcache.GeoPackageDataType.TEXT:
            simplifiedTypeIcon = mdiFormatText
            break
          case window.mapcache.GeoPackageDataType.DATE:
            simplifiedTypeIcon = mdiCalendar
            break
          case window.mapcache.GeoPackageDataType.DATETIME:
            simplifiedTypeIcon = mdiCalendarClock
            break
          default:
            break
        }
        return simplifiedTypeIcon
      },
      closeRenameDialog () {
        if (!this.renaming) {
          this.renameDialog = false
        }
      },
      closeDeleteDialog () {
        if (!this.deleting) {
          this.deleteDialog = false
        }
      },
      closeCopyDialog () {
        if (!this.copying) {
          this.copyDialog = false
        }
      },
      rename () {
        this.renamed(this.renamedTable)
        this.copiedTable = this.renamedTable + '_copy'
        this.renaming = true
        window.mapcache.renameGeoPackageTable({projectId: this.projectId, geopackageId: this.geopackage.id, filePath: this.geopackage.path, tableName: this.tableName, newTableName: this.renamedTable, type: 'feature'}).then(() => {
          this.renaming = false
          this.$nextTick(() => {
            this.renameDialog = false
          })
        })
      },
      copy () {
        this.copying = true
        window.mapcache.copyGeoPackageTable({projectId: this.projectId, geopackageId: this.geopackage.id, filePath: this.geopackage.path, tableName: this.tableName, copyTableName: this.copiedTable, type: 'feature'}).then(() => {
          this.copying = false
          this.$nextTick(() => {
            this.copyDialog = false
            this.showCopiedAlert = true
          })
        })
      },
      deleteTable () {
        this.deleting = true
        window.mapcache.deleteGeoPackageTable({projectId: this.projectId, geopackageId: this.geopackage.id, filePath: this.geopackage.path, tableName: this.tableName, type: 'feature'}).then(() => {
          this.deleting = false
          this.$nextTick(() => {
            this.deleteDialog = false
          })
        })
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
        this.indexMessage = 'Indexing started'
        this.indexDialog = true
        setTimeout(function () {
          _this.indexMessage = 'Indexing...'
          window.mapcache.indexFeatureTable(_this.geopackage.path, _this.tableName, true).then(function () {
            setTimeout(function () {
              _this.indexingDone = true
              _this.indexMessage = 'Indexing completed'
              window.mapcache.updateFeatureTable({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: _this.tableName})
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
      },
      featureLayerFieldRenamed (name) {
        this.featureLayerField.name = name
      },
      zoomToLayer () {
        zoomToGeoPackageTable(this.geopackage, this.tableName)
      },
      addField () {
        this.addFieldDialog = false
        window.mapcache.addGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, columnName: this.addFieldValue, columnType: this.addFieldType})
        this.addFieldValue = ''
        this.addFieldType = window.mapcache.GeoPackageDataType.TEXT
      },
      cancelAddField () {
        this.addFieldDialog = false
        this.addFieldValue = ''
        this.addFieldType = window.mapcache.GeoPackageDataType.TEXT
      },
      showFeatureTable () {
        const payload = {
          id: this.geopackage.id,
          tableName: this.tableName,
          isGeoPackage: true
        }
        EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE_TABLE, payload)
      },
      updateColumnOrder (evt) {
        document.body.style.cursor = 'default'
        const headersTmp = this.columnOrder.slice()
        const oldIndex = evt.oldIndex
        let newIndex = Math.max(0, evt.newIndex)
        if (newIndex >= headersTmp.length) {
          let k = newIndex - headersTmp.length + 1
          while (k--) {
            headersTmp.push(undefined)
          }
        }
        headersTmp.splice(newIndex, 0, headersTmp.splice(oldIndex, 1)[0])
        window.mapcache.updateGeoPackageFeatureTableColumnOrder({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, columnOrder: headersTmp})
      },
    },
    watch: {
      styleKey: {
        async handler (styleKey, oldValue) {
          if (styleKey !== oldValue) {
            this.loading = true
            this.hasStyleExtension = await window.mapcache.hasStyleExtension(this.geopackage.path, this.tableName)
            this.loading = false
          }
        },
        deep: true
      },
      displayFeature: {
        handler (newVal) {
          if (newVal != null) {
            this.styleEditorVisible = false
            this.showFeatureLayerField = false
          }
        }
      }
    }
  }
</script>

<style scoped>
  .btn-background {
    background-color: var(--v-main_active_background-base) !important;
  }
</style>
