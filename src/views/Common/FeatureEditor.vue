<template>
  <v-card>
    <v-card-title>
      {{isEditing ? 'Edit Feature' : 'New Feature'}}
    </v-card-title>
    <v-card-text style="max-height: 500px;">
      <v-card-subtitle class="pb-0 mb-0" v-if="editableColumns.length > 0">
        {{isEditing ? 'Edit the feature\'s fields' : 'Set the new feature\'s fields'}}
      </v-card-subtitle>
      <v-form v-on:submit.prevent v-model="formValid">
        <v-list style="width: 100%">
          <v-list-item
            :key="'editor-' + column.name"
            v-for="(column, index) in editableColumns"
          >
            <v-list-item-content class="pa-4" style="margin: -16px;">
              <v-text-field :autofocus="index === 0" :label="column.lowerCaseName" clearable v-if="column.dataType === TEXT" v-model="column.value" :rules="column.rules"></v-text-field>
              <v-row no-gutters align="center" justify="space-between" v-else-if="column.dataType === BOOLEAN">
                <v-col>
                  <v-list-item-subtitle>{{column.lowerCaseName}}</v-list-item-subtitle>
                </v-col>
                <v-switch color="primary" v-model="column.value" class="pt-0" hide-details></v-switch>
              </v-row>
              <v-row no-gutters justify="space-between" v-else-if="column.dataType === DATE || column.dataType === DATETIME">
                <v-col v-if="column.showDate">
                  <v-menu
                    v-model="column.dateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="column.dateValue"
                        :label="column.name"
                        :prepend-icon="mdiCalendar"
                        readonly
                        clearable
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-date-picker
                      v-model="column.dateValue"
                      no-title
                      scrollable
                    >
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="column.dateMenu = false"
                      >
                        OK
                      </v-btn>
                    </v-date-picker>
                  </v-menu>
                </v-col>
                <v-col v-if="column.showTime">
                  <v-menu
                    v-model="column.timeMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                  >
                    <template v-slot:activator="{ on, attrs }">
                      <v-text-field
                        v-model="column.timeValue"
                        label="time"
                        :prepend-icon="mdiClock"
                        readonly
                        clearable
                        v-bind="attrs"
                        v-on="on"
                      ></v-text-field>
                    </template>
                    <v-time-picker
                      v-model="column.timeValue"
                      format="ampm"
                      use-seconds
                    >
                      <v-spacer></v-spacer>
                      <v-btn
                        text
                        color="primary"
                        @click="column.timeMenu = false"
                      >
                        OK
                      </v-btn>
                    </v-time-picker>
                  </v-menu>
                </v-col>
              </v-row>
              <v-text-field :autofocus="index === 0" :label="column.lowerCaseName" clearable type="number" v-else v-model="column.value" :rules="column.rules"></v-text-field>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-form>
      <v-card-subtitle v-if="editableColumns.length === 0">No fields to edit.</v-card-subtitle>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        {{editableColumns.length > 0 ? 'Cancel' : 'Close'}}
      </v-btn>
      <v-btn
        v-if="formValid && editableColumns.length > 0"
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
  import cloneDeep from 'lodash/cloneDeep'
  import orderBy from 'lodash/orderBy'
  import isEmpty from 'lodash/isEmpty'
  import moment from 'moment'
  import { GeoPackageDataType } from '@ngageoint/geopackage'
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import GeoPackageFeatureTableUtilities from '../../lib/geopackage/GeoPackageFeatureTableUtilities'
  import { mdiCalendar, mdiClock } from '@mdi/js'

  export default {
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
      }
    },
    data () {
      return {
        mdiCalendar: mdiCalendar,
        mdiClock: mdiClock,
        TEXT: GeoPackageDataType.TEXT,
        FLOAT: GeoPackageDataType.FLOAT,
        BOOLEAN: GeoPackageDataType.BOOLEAN,
        DATETIME: GeoPackageDataType.DATETIME,
        DATE: GeoPackageDataType.DATE,
        dateMenu: false,
        date: null,
        formValid: false,
        failedToSaveErrorMessage: '',
        failedToSaveSnackBar: false
      }
    },
    asyncComputed: {
      editableColumns: {
        async get () {
          if (isNil(this.columns) || isNil(this.columns._columns)) {
            return []
          }
          const features = await GeoPackageFeatureTableUtilities.getAllFeatureRows(this.geopackagePath, this.tableName)
          const properties = isNil(this.feature) ? {} : cloneDeep(this.feature.properties)
          const columns = this.columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id')
          const columnObjects = columns.map((column) => {
            const columnObject = {
              name: column.name,
              lowerCaseName: column.name.toLowerCase(),
              dataType: column.dataType,
              index: column.index
            }
            let value = this.feature.properties[column.name]
            if (value === undefined || value === null) {
              value = column.defaultValue
            }
            if (isNil(properties[column.name]) && column.dataType === GeoPackageDataType.BOOLEAN) {
              value = false
            } else if (column.dataType === GeoPackageDataType.BOOLEAN) {
              value = properties[column.name] === 1 || properties[column.name] === true
            }
            if (column.dataType === GeoPackageDataType.DATETIME) {
              columnObject.dateMenu = false
              columnObject.showDate = true
              columnObject.timeMenu = false
              columnObject.showTime = true
              if (!isNil(value)) {
                try {
                  const dateVal = moment.utc(value)
                  value = new Date(value)
                  columnObject.dateValue = dateVal.format('YYYY-MM-DD')
                  columnObject.timeValue = dateVal.format('hh:mm:ss')
                } catch (e) {
                  value = null
                }
              }
            }
            if (column.dataType === GeoPackageDataType.DATE) {
              columnObject.dateMenu = false
              columnObject.showDate = true
              if (!isNil(value)) {
                try {
                  const dateVal = moment.utc(value)
                  value = new Date(value)
                  columnObject.dateValue = dateVal.format('YYYY-MM-DD')
                } catch (e) {
                  value = null
                }
              }
            }
            columnObject.value = value
            if (!column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
              columnObject.rules = []
              if (column.notNull) {
                columnObject.rules.push(v => !!v || (column.lowerCaseName + ' is required'))
              }
              if (column.max) {
                columnObject.rules.push(v => v < column.max || (column.lowerCaseName + ' exceeds the max of ' + column.max))
              }
              if (column.min) {
                columnObject.rules.push(v => v < column.min || (column.lowerCaseName + ' is below the min of ' + column.min))
              }
              if (column.unique) {
                columnObject.rules.push(v => features.map(featureRow => featureRow.getValueWithIndex(column.index)).indexOf(v) !== -1 || column.name + ' must be unique')
              }
            }
            return columnObject
          })

          return orderBy(columnObjects, ['lowerCaseName'], ['asc'])
        },
        default: []
      }
    },
    methods: {
      async save () {
        if (this.isEditing) {
          const filePath = this.geopackagePath
          const featureRow = await GeoPackageFeatureTableUtilities.getFeatureRow(filePath, this.tableName, this.feature.id)
          this.editableColumns.forEach(column => {
            let value = column.value
            if (column.dataType === GeoPackageDataType.BOOLEAN) {
              value = (value === 1 || value === true || value === 'true' || value === '1') ? 1 : 0
            }
            if (column.dataType === GeoPackageDataType.DATE) {
              try {
                if (!isEmpty(column.dateValue)) {
                  value = new Date(column.dateValue).toISOString().substring(0, 10)
                } else {
                  value = null
                }
              } catch (e) {
                value = null
              }
            }
            if (column.dataType === GeoPackageDataType.DATETIME) {
              try {
                const dateString = column.dateValue + ' ' + (isNil(column.timeValue) ? '00:00:00' : column.timeValue)
                if (!isEmpty(dateString)) {
                  value = moment.utc(dateString).toISOString()
                } else {
                  value = null
                }
              } catch (e) {
                value = null
              }
            }
            featureRow.setValueNoValidationWithIndex(column.index, value)
          })
          const result = await GeoPackageFeatureTableUtilities.updateFeatureRow(filePath, this.tableName, featureRow)
          if (result.changes > 0) {
            if (this.isGeoPackage) {
              ProjectActions.synchronizeGeoPackage({projectId: this.projectId, geopackageId: this.id})
            } else {
              ProjectActions.synchronizeDataSource({projectId: this.projectId, sourceId: this.id})
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
            if (column.dataType === GeoPackageDataType.BOOLEAN) {
              value = value === 1 || value === true || value === 'true' || value === '1'
            }
            if (column.dataType === GeoPackageDataType.DATE) {
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
            if (column.dataType === GeoPackageDataType.DATETIME) {
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
          if (this.isGeoPackage) {
            ProjectActions.addFeatureToGeoPackage({projectId: this.projectId, geopackageId: this.id, tableName: this.tableName, feature: feature})
          } else {
            // not supported - adding feature to data source
          }
          this.close()
        }
      }
    }
  }
</script>

<style scoped>

</style>
