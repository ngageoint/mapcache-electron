<template>
  <v-card>
    <v-card-title>
      {{ isEditing ? 'Edit feature' : 'Specify feature information' }}
    </v-card-title>
    <v-card-text style="max-height: 500px;">
      <v-card-subtitle v-if="editableColumns.length > 0">
        <span v-if="isEditing">Edit the feature's fields</span>
        <span v-else>The <strong>{{ tableName }}</strong> layer has several fields defined. Enter values for those fields and then save.</span>
      </v-card-subtitle>
      <v-form v-on:submit.prevent v-model="formValid">
        <v-list style="width: 100%">
          <v-list-item :key="'editor-' + column.name" v-for="(column, index) in editableColumns">
            <div class="ma-0 pa-0">
              <feature-editor-column :id="column.name + '_' + index" v-bind="column"
                                     :update-column-property="updateEditableColumn"
                                     :index="index"></feature-editor-column>
            </div>
          </v-list-item>
        </v-list>
        <v-card-subtitle v-if="!isEditing && unrecognizedColumns.length > 0">
          The following fields are not defined in the <b>{{ tableName }}</b> feature layer. Selected fields will be
          added to the layer.
        </v-card-subtitle>
        <v-list v-if="!isEditing && unrecognizedColumns.length > 0" style="width: 100%">
          <v-list-item>
            <div class="ma-0 pa-0">
            </div>
            <v-list-item-action>
              <v-row no-gutters>
                <p style="padding-right: 16px;">Select all</p>
                <v-checkbox v-model="allColumnsSelected"></v-checkbox>
              </v-row>
            </v-list-item-action>
          </v-list-item>
          <v-list-item :key="'editor-' + column.name" v-for="(column, index) in unrecognizedColumns">
            <div class="ma-0 pa-0">
              <feature-editor-column :id="column.name + '_' + index" :index="index" v-bind="column"
                                     :update-column-property="updateUnrecognizedColumn"></feature-editor-column>
            </div>
            <v-list-item-action>
              <v-checkbox v-model="columnsToAdd" :value="index"></v-checkbox>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-form>
      <v-card-subtitle v-if="editableColumns.length === 0 && unrecognizedColumns.length === 0">No fields to edit.
      </v-card-subtitle>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="close">
        {{ editableColumns.length > 0 ? 'Cancel' : 'Close' }}
      </v-btn>
      <v-btn
          :disabled="!formValid"
          color="primary"
          variant="text"
          @click="save">
        Save
      </v-btn>
    </v-card-actions>
    <v-snackbar
        v-model="failedToSaveSnackBar"
    >
      Failed to save: {{ failedToSaveErrorMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn
            color="primary"
            text
            v-bind="attrs"
            @click="failedToSaveSnackBar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import isObject from 'lodash/isObject'
import cloneDeep from 'lodash/cloneDeep'
import orderBy from 'lodash/orderBy'
import moment from 'moment'
import FeatureEditorColumn from './FeatureEditorColumn.vue'
// import EventBus from '../../lib/vue/EventBus'
import { synchronizeDataSource, synchronizeGeoPackage } from '../../lib/vue/vuex/ProjectActions'

export default {
  components: { FeatureEditorColumn },
  props: {
    projectId: String,
    geopackagePath: String,
    id: String,
    tableName: String,
    object: Object,
    columns: Object,
    feature: Object,
    close: Function,
    isEditing: {
      type: Boolean,
      default: false
    },
    isGeoPackage: {
      type: Boolean,
      default: true
    },
    saveNewFeature: Function
  },
  data () {
    return {
      TEXT: window.mapcache.GeoPackageDataType.TEXT,
      FLOAT: window.mapcache.GeoPackageDataType.FLOAT,
      BOOLEAN: window.mapcache.GeoPackageDataType.BOOLEAN,
      DATETIME: window.mapcache.GeoPackageDataType.DATETIME,
      DATE: window.mapcache.GeoPackageDataType.DATE,
      dateMenu: false,
      date: null,
      formValid: false,
      failedToSaveErrorMessage: '',
      failedToSaveSnackBar: false,
      columnsToAdd: [],
      editableColumns: []
    }
  },
  computed: {
    unrecognizedColumns () {
      if (this.isEditing) {
        return []
      } else {
        const deproxiedFeature = window.deproxy(this.feature)
        const featureColumns = window.mapcache.getLayerColumns({
          type: 'FeatureCollection',
          features: [deproxiedFeature]
        }).columns
        const featureProperties = isNil(deproxiedFeature) ? {} : cloneDeep(deproxiedFeature.properties)
        return orderBy(featureColumns.filter(column => this.columns._columnNames.findIndex(name => name === column.name) === -1 && column.name !== '_feature_id').map(column => {
          column.dataType = window.mapcache.GeoPackageDataType.fromName(column.dataType)
          return window.mapcache.getEditableColumnObject(window.deproxy(column), featureProperties)
        }), ['lowerCaseName'], ['asc'])
      }
    },
    allColumnsSelected: {
      set (val) {
        this.columnsToAdd = []
        if (val) {
          for (let i = 0; i < this.unrecognizedColumns.length; i++) {
            this.columnsToAdd.push(i)
          }
        }
      },
      get () {
        return this.columnsToAdd.length === this.unrecognizedColumns.length
      }
    }
  },
  created () {
    this.updateEditableColumns()
  },
  watch: {
    object: {
      handler () {
        this.updateEditableColumns()
      },
      deep: true
    },
  },
  methods: {
    async updateEditableColumns () {
      const columns = this.columns != null && this.columns._columns != null ? this.columns._columns : []
      const editableColumns = await window.mapcache.getGeoPackageEditableColumnsForFeature(this.geopackagePath, this.tableName, window.deproxy(this.feature), window.deproxy(columns))
      if (this.isGeoPackage &&
          this.object.tables.features[this.tableName] != null &&
          this.object.tables.features[this.tableName].columnOrder != null &&
          editableColumns != null &&
          editableColumns.length > 0) {
        const columnOrder = this.object.tables.features[this.tableName].columnOrder
        editableColumns.sort((a, b) => {
          return columnOrder.indexOf(a.lowerCaseName) < columnOrder.indexOf(b.lowerCaseName) ? -1 : 1
        })
      }
      return editableColumns
    },
    updateUnrecognizedColumn (value, property, index) {
      this.unrecognizedColumns[index][property] = value
    },
    updateEditableColumn (value, property, index) {
      this.editableColumns[index][property] = value
    },
    async save () {
      if (this.isEditing) {
        const result = await window.mapcache.saveGeoPackageEditedFeature(this.geopackagePath, this.tableName, this.feature.id, this.editableColumns)
        if (result.changes > 0) {
          if (this.isGeoPackage) {
            synchronizeGeoPackage(this.projectId, this.id).then(this.close)
          } else {
            synchronizeDataSource(this.projectId, this.id).then(this.close)
          }
        } else if (result.error) {
          this.failedToSaveErrorMessage = result.error
          this.failedToSaveSnackBar = true
        }
      } else {
        const feature = cloneDeep(this.feature)
        this.editableColumns.forEach(column => {
          let value = column.value
          if (column.dataType === window.mapcache.GeoPackageDataType.BOOLEAN) {
            value = value === 1 || value === true || value === 'true' || value === '1'
          }
          if (column.dataType === window.mapcache.GeoPackageDataType.DATE) {
            try {
              if (!isNil(column.dateValue)) {
                value = moment.utc(column.dateValue).toISOString().substring(0, 10)
              } else {
                value = null
              }
            } catch (e) {
              value = null
            }
          }
          if (column.dataType === window.mapcache.GeoPackageDataType.DATETIME) {
            try {
              if (!isNil(column.dateValue)) {
                const dateString = column.dateValue + ' ' + (isNil(column.timeValue) ? '00:00:00' : column.timeValue)
                value = moment.utc(dateString).toISOString()
              } else {
                value = null
              }
            } catch (e) {
              value = null
            }
          }
          if (!isNil(value)) {
            feature.properties[column.name] = value
          }
        })
        keys(feature.properties).forEach(property => {
          const value = feature.properties[property]
          if (isObject(value)) {
            feature.properties[property] = JSON.stringify(value)
          }
        })
        let columnsToAdd = this.unrecognizedColumns.filter((column, index) => this.columnsToAdd.indexOf(index) !== -1)
        columnsToAdd.forEach(column => {
          if (isObject(column.value)) {
            feature.properties[column.name] = JSON.stringify(column.value)
          } else {
            feature.properties[column.name] = column.value
          }
        })
        if (this.isGeoPackage) {
          await this.saveNewFeature(this.projectId, this.id, this.tableName, feature, columnsToAdd)
        }
        this.close()
      }
    }
  }
}
</script>

<style scoped>

</style>
