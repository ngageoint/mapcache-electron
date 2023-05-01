<template>
  <v-container class="ma-0 pa-0">
    <v-dialog
        v-model="addFieldDialog"
        max-width="575"
        persistent
        @keydown.esc="cancelAddField">
      <v-card v-if="addFieldDialog">
        <v-card-title>
          <v-row no-gutters justify="start" align="center">
            Add field
          </v-row>
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent ref="copyForm" v-model="addFieldValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                      variant="underlined"
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
                      <v-icon left :color="addFieldType === TEXT ? 'primary' : ''" icon="mdi-format-text"/>
                      <span class="hidden-sm-and-down">Text</span>
                    </v-btn>
                    <v-btn :value="FLOAT">
                      <v-icon left :color="addFieldType === FLOAT ? 'primary' : ''" icon="mdi-pound"/>
                      <span class="hidden-sm-and-down">Number</span>
                    </v-btn>
                    <v-btn :value="BOOLEAN">
                      <v-icon left :color="addFieldType === BOOLEAN ? 'primary' : ''" icon="mdi-toggle-switch"/>
                      <span class="hidden-sm-and-down">Checkbox</span>
                    </v-btn>
                    <v-btn :value="DATE">
                      <v-icon left :color="addFieldType === DATE ? 'primary' : ''" icon="mdi-calendar"/>
                      <span class="hidden-sm-and-down">Date</span>
                    </v-btn>
                    <v-btn :value="DATETIME">
                      <v-icon left :color="addFieldType === DATETIME ? 'primary' : ''" icon="mdi-calendar-clock"/>
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
              :disabled="!addFieldValid"
              color="primary"
              text
              @click="addField">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-row no-gutters>
      <p style="font-size: 16px; font-weight: 500;">Fields</p>
    </v-row>
    <v-row no-gutters>
      <v-btn block color="accent" class="detail-bg" @click="addFieldDialog = true">Add field</v-btn>
    </v-row>
    <v-row no-gutters class="mt-4 detail-bg">
      <v-list
          v-if="tableFields != null && columnOrder != null"
          id="sortable-list"
          style="width: 100%"
          class="detail-bg ma-0 pa-0"
          v-sortable-list="{onEnd:updateColumnOrder}">
        <div v-for="column in columnOrder" :key="column">
          <v-list-item
              v-if="tableFields[column] != null"
              class="detail-bg sortable-list-item"
              @click="tableFields[column].click">
            <template v-slot:prepend>
              <v-icon :icon="tableFields[column].icon"/>
            </template>
            <div>
              <v-list-item-title :title="tableFields[column].name"
                                 v-text="tableFields[column].name"></v-list-item-title>
              <v-list-item-subtitle :title="tableFields[column].type"
                                    v-text="tableFields[column].type"></v-list-item-subtitle>
            </div>
            <template v-slot:append>
              <v-icon class="sortHandle" icon="mdi-drag-horizontal-variant"/>
            </template>
          </v-list-item>
        </div>
      </v-list>
    </v-row>
  </v-container>
</template>

<script>
import Sortable from 'sortablejs'
import {
  addGeoPackageFeatureTableColumn,
  updateGeoPackageFeatureTableColumnOrder
} from '../../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    projectId: String,
    project: Object,
    geopackagePath: String,
    id: String,
    object: Object,
    tableName: String,
    isGeoPackage: {
      type: Boolean,
      default: false
    },
    fieldClicked: Function
  },
  directives: {
    'sortable-list': {
      inserted: (el, binding) => {
        Sortable.create(el, binding.value ? {
          ...binding.value,
          handle: '.sortHandle',
          ghostClass: 'ghost',
          forceFallback: true,
          onChoose: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onStart: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onUnchoose: function () {
            document.body.style.cursor = 'default'
          }, // Dragging started
        } : {})
      },
    },
  },
  data () {
    return {
      showFeatureLayerField: false,
      featureLayerField: null,
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
      featureColumns: [],
      tableFields: null,
      columnOrder: []
    }
  },
  created () {
    this.getTableFields().then(this.getColumnOrder)
  },
  watch: {
    object: {
      async handler () {
        await this.getTableFields()
        await this.getColumnOrder()
      },
      deep: true
    },
  },
  methods: {
    async getColumnOrder () {
      this.columnOrder = this.isGeoPackage ? (this.object.tables.features[this.tableName] ? this.object.tables.features[this.tableName].columnOrder.slice() : await this.getColumnNames()) : (this.object.table ? this.object.table.columnOrder.slice() : await this.getColumnNames())
    },
    async getTableFields () {
      this.tableFields = window.mapcache.getFeatureColumns(this.object.geopackageFilePath || this.object.path, this.tableName).then(columns => {
        const tableFields = {}
        const columnNames = columns._columns.map(column => column.name.toLowerCase())
        columns._columns.forEach((column, index) => {
          // excluding primary key column, blob columns, and _feature_id columns
          if (!column.primaryKey && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id') {
            tableFields[column.name.toLowerCase()] = {
              id: column.name + '_' + index,
              name: column.name.toLowerCase(),
              type: this.getSimplifiedType(column.dataType),
              icon: this.getSimplifiedTypeIcon(column.dataType),
              click: () => {
                const featureLayerField = {
                  name: column.name,
                  icon: this.getSimplifiedTypeIcon(column.dataType),
                  type: this.getSimplifiedType(column.dataType)
                }
                this.fieldClicked(featureLayerField, columnNames)
              }
            }
          }
        })
        return tableFields
      })
    },
    async getColumnNames () {
      const columns = await window.mapcache.getFeatureColumns(this.object.geopackageFilePath || this.object.path, this.tableName)
      return columns._columns.map(column => column.name.toLowerCase())
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
      let simplifiedTypeIcon = 'mdi-pound'
      switch (dataType) {
        case window.mapcache.GeoPackageDataType.BOOLEAN:
          simplifiedTypeIcon = 'mdi-toggle-switch'
          break
        case window.mapcache.GeoPackageDataType.TEXT:
          simplifiedTypeIcon = 'mdi-format-text'
          break
        case window.mapcache.GeoPackageDataType.DATE:
          simplifiedTypeIcon = 'mdi-calendar'
          break
        case window.mapcache.GeoPackageDataType.DATETIME:
          simplifiedTypeIcon = 'mdi-calendar-clock'
          break
        default:
          break
      }
      return simplifiedTypeIcon
    },
    hideFeatureLayerField () {
      this.showFeatureLayerField = false
      this.featureLayerField = null
    },
    featureLayerFieldRenamed (name) {
      this.featureLayerField.name = name
    },
    addField () {
      this.addFieldDialog = false
      addGeoPackageFeatureTableColumn(this.projectId, this.id, this.isGeoPackage, this.tableName, this.addFieldValue, this.addFieldType).then(() => {
        this.addFieldValue = ''
        this.addFieldType = window.mapcache.GeoPackageDataType.TEXT
      })
    },
    cancelAddField () {
      this.addFieldDialog = false
      this.addFieldValue = ''
      this.addFieldType = window.mapcache.GeoPackageDataType.TEXT
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
      updateGeoPackageFeatureTableColumnOrder(this.projectId, this.id, this.isGeoPackage, this.tableName, headersTmp)
    },
  },

}
</script>

<style scoped>
</style>
