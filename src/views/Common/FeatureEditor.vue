<template>
  <v-card>
    <v-card-title>
      {{isEditing ? 'Edit feature' : 'Save feature'}}
    </v-card-title>
    <v-card-text style="max-height: 500px;">
      <v-card-subtitle v-if="editableColumns.length > 0">
        {{isEditing ? 'Edit the feature\'s fields' : 'Adjust the feature\'s fields.'}}
      </v-card-subtitle>
      <v-form v-on:submit.prevent v-model="formValid">
        <v-list style="width: 100%">
          <v-list-item :key="'editor-' + column.name" v-for="(column, index) in editableColumns">
            <v-list-item-content class="ma-0 pa-0">
              <feature-editor-column :id="column.name + '_' + index" v-bind="column" :update-column-property="updateEditableColumn" :index="index"></feature-editor-column>
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <v-card-subtitle v-if="!isEditing && unrecognizedColumns.length > 0">
          The following fields are not defined in the <b>{{tableName}}</b> feature layer. Selected fields will be added to the layer.
        </v-card-subtitle>
        <v-list v-if="!isEditing && unrecognizedColumns.length > 0" style="width: 100%">
          <v-list-item>
            <v-list-item-content class="ma-0 pa-0">
            </v-list-item-content>
            <v-list-item-action>
              <v-row no-gutters>
                <p style="padding-right: 16px;">Select all</p>
                <v-checkbox v-model="allColumnsSelected"></v-checkbox>
              </v-row>
            </v-list-item-action>
          </v-list-item>
          <v-list-item :key="'editor-' + column.name" v-for="(column, index) in unrecognizedColumns">
            <v-list-item-content class="ma-0 pa-0">
              <feature-editor-column :id="column.name + '_' + index" :index="index" v-bind="column" :update-column-property="updateUnrecognizedColumn"></feature-editor-column>
            </v-list-item-content>
            <v-list-item-action>
              <v-checkbox v-model="columnsToAdd" :value="index"></v-checkbox>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-form>
      <v-card-subtitle v-if="editableColumns.length === 0 && unrecognizedColumns.length === 0">No fields to edit.</v-card-subtitle>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        {{editableColumns.length > 0 ? 'Cancel' : 'Close'}}
      </v-btn>
      <v-btn
        v-if="formValid"
        color="primary"
        text
        @click="save">
        Save
      </v-btn>
    </v-card-actions>
    <v-snackbar
      v-model="failedToSaveSnackBar"
    >
      Failed to save: {{failedToSaveErrorMessage}}
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
import moment from 'moment'
import {mdiCalendar, mdiClock} from '@mdi/js'
import orderBy from 'lodash/orderBy'
import FeatureEditorColumn from './FeatureEditorColumn'

export default {
  components: {FeatureEditorColumn},
  props: {
      projectId: String,
      geopackagePath: String,
      id: String,
      tableName: String,
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
        mdiCalendar: mdiCalendar,
        mdiClock: mdiClock,
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
        columnsToAdd: []
      }
    },
    asyncComputed: {
      editableColumns: {
        async get () {
          return window.mapcache.getGeoPackageEditableColumnsForFeature(this.geopackagePath, this.tableName, this.feature, this.columns)
        },
        default: []
      }
    },
    computed: {
      unrecognizedColumns () {
        if (this.isEditing) {
          return []
        } else {
          const featureColumns = window.mapcache.getLayerColumns({type: 'FeatureCollection', features: [this.feature]}).columns
          const featureProperties = isNil(this.feature) ? {} : cloneDeep(this.feature.properties)
          return orderBy(featureColumns.filter(column => this.columns._columnNames.findIndex(name => name === column.name) === -1 && column.name !== '_feature_id').map(column => {
            column.dataType = window.mapcache.GeoPackageDataType.fromName(column.dataType)
            return window.mapcache.getEditableColumnObject(column, featureProperties)
          }), ['lowerCaseName'], ['asc'])
        }
      },
      allColumnsSelected: {
        set(val) {
          this.columnsToAdd = []
          if (val) {
            for(let i = 0; i < this.unrecognizedColumns.length; i++) {
              this.columnsToAdd.push(i)
            }
          }
        },
        get() {
          return this.columnsToAdd.length === this.unrecognizedColumns.length
        }
      }
    },
    methods: {
      updateUnrecognizedColumn (value, property, index) {
        this.unrecognizedColumns[index][property] = value
      },
      updateEditableColumn (value, property, index) {
        this.editableColumns[index][property] = value
      },
      async save () {
        if (this.isEditing) {
          const result = await window.mapcache.saveGeoPackageEditedFeature(this.geopackagePath, this.tableName, this.feature.id, this.editableColumns)
          console.log(result)
          if (result.changes > 0) {
            if (this.isGeoPackage) {
              window.mapcache.synchronizeGeoPackage({projectId: this.projectId, geopackageId: this.id})
            } else {
              window.mapcache.synchronizeDataSource({projectId: this.projectId, sourceId: this.id})
            }
            this.close()
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
