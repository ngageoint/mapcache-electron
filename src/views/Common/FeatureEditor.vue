<template>
  <v-card>
    <v-card-title>
      {{isEditing ? 'Edit feature' : 'New feature'}}
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
import moment from 'moment'
import {mdiCalendar, mdiClock} from '@mdi/js'

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
        TEXT: window.mapcache.GeoPackageDataType.TEXT,
        FLOAT: window.mapcache.GeoPackageDataType.FLOAT,
        BOOLEAN: window.mapcache.GeoPackageDataType.BOOLEAN,
        DATETIME: window.mapcache.GeoPackageDataType.DATETIME,
        DATE: window.mapcache.GeoPackageDataType.DATE,
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
          return window.mapcache.getGeoPackageEditableColumnsForFeature(this.geopackagePath, this.tableName, this.feature, this.columns)
        },
        default: []
      }
    },
    methods: {
      async save () {
        if (this.isEditing) {
          const result = await window.mapcache.saveGeoPackageEditedFeature(this.geopackagePath, this.tableName, this.feature, this.editableColumns)
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
          if (this.isGeoPackage) {
            window.mapcache.addFeatureToGeoPackage({projectId: this.projectId, geopackageId: this.id, tableName: this.tableName, feature: feature})
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
