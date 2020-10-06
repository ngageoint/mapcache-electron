<template>
  <v-card>
    <v-card-title>
      {{isEditing ? 'Edit Feature' : 'New Feature'}}
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text  style="max-height: 500px;">
      <v-form v-model="formValid">
        <v-list style="width: 100%">
          <template v-for="column in editableColumns">
            <v-list-item
              :key="'editor-' + column.name"
            >
              <v-list-item-content class="pa-4" style="margin: -16px;">
                <v-text-field :label="column.name.toLowerCase()" clearable v-if="column.dataType === TEXT" v-model="featureProperties[column.name]" :rules="rules && rules[column.name] ? rules[column.name] : []"></v-text-field>
                <v-switch :label="column.name.toLowerCase()" v-else-if="column.dataType === BOOLEAN" v-model="featureProperties[column.name]"></v-switch>
                <span v-else-if="column.dataType === DATE || column.dataType === DATETIME">
                  <label class="v-label v-label--active theme--light pb-" style="font-size: 11px;">{{column.name.toLowerCase()}}</label>
                  <p class="mt-2" style="font-size: 14px; color: red;">date/time field not yet supported.</p>
                </span>
                <v-text-field :label="column.name.toLowerCase()" clearable type="number" v-else v-model="featureProperties[column.name]" :rules="rules && rules[column.name] ? rules[column.name] : []"></v-text-field>
              </v-list-item-content>
            </v-list-item>
          </template>
        </v-list>
      </v-form>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        cancel
      </v-btn>
      <v-btn
        v-if="formValid"
        color="primary"
        text
        @click="save">
        save
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
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import { GeoPackageDataType } from '@ngageoint/geopackage'
  import ViewEditText from '../Common/ViewEditText'
  import StyleEditor from '../StyleEditor/StyleEditor'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import FeatureLayerField from './FeatureLayerField'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String,
      columns: Object,
      feature: Object,
      close: Function,
      isEditing: {
        type: Boolean,
        default: false
      }
    },
    components: {
      ViewEditText,
      StyleEditor,
      FeatureLayerField
    },
    data () {
      return {
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
    computed: {
      featureProperties () {
        const properties = _.isNil(this.feature) ? {} : _.cloneDeep(this.feature.properties)
        if (!_.isNil(this.columns) && !_.isNil(this.columns._columns)) {
          this.columns._columns.forEach(column => {
            if (!column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id' && _.isNil(properties[column.name])) {
              properties[column.name] = column.defaultValue
              if (_.isNil(properties[column.name]) && column.dataType === GeoPackageDataType.BOOLEAN) {
                properties[column.name] = false
              } else if (column.dataType === GeoPackageDataType.BOOLEAN) {
                properties[column.name] = properties[column.name] === 1 || properties[column.name] === true
              }
            }
          })
        }
        return properties
      },
      editableColumns () {
        if (_.isNil(this.columns) || _.isNil(this.columns._columns)) {
          return []
        }
        const columns = this.columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id')
        return _.orderBy(columns, ['name'], ['asc'])
      }
    },
    asyncComputed: {
      rules: {
        get () {
          return new Promise(resolve => {
            const rules = {}
            if (!_.isNil(this.columns) || !_.isNil(this.columns._columns)) {
              return GeoPackageUtilities.getAllFeatureRows(this.geopackage.path, this.tableName).then((features) => {
                this.columns._columns.forEach(column => {
                  if (!column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
                    rules[column.name] = []
                    if (column.notNull) {
                      rules.push(v => !!v || (column.name.toLowerCase() + ' is required'))
                    }
                    if (column.max) {
                      rules.push(v => v < column.max || (column.name.toLowerCase() + ' exceeds the max of ' + column.max))
                    }
                    if (column.min) {
                      rules.push(v => v < column.min || (column.name.toLowerCase() + ' is below the min of ' + column.min))
                    }
                    if (column.unique) {
                      rules.push(v => features.map(featureRow => featureRow.getValueWithIndex(column.index)).indexOf(v) !== -1 || column.name + ' must be unique')
                    }
                  }
                })
                resolve(rules)
              })
            } else {
              resolve(rules)
            }
          })
        },
        default: {}
      }
    },
    methods: {
      ...mapActions({
        addFeatureToGeoPackage: 'Projects/addFeatureToGeoPackage',
        synchronizeGeoPackage: 'Projects/synchronizeGeoPackage'
      }),
      setProperty (key, value) {
        this.featureProperties[key] = value
      },
      async save () {
        if (this.isEditing) {
          const properties = this.featureProperties
          const filePath = this.geopackage.path
          const featureRow = await GeoPackageUtilities.getFeatureRow(filePath, this.tableName, this.feature.id)
          _.keys(properties).forEach(key => {
            let value = properties[key]
            if (featureRow.featureTable.getUserColumns().getColumn(key).dataType === GeoPackageDataType.BOOLEAN) {
              if (value === 0 || value === false || value === 'false' || value === '0') {
                value = false
              } else {
                value = true
              }
            }
            featureRow.setValueWithColumnName(key, value)
          })
          const result = await GeoPackageUtilities.updateFeatureRow(filePath, this.tableName, featureRow)
          if (result.changes > 0) {
            this.synchronizeGeoPackage({projectId: this.projectId, geopackageId: this.geopackage.id})
            this.close()
          } else if (result.error) {
            this.failedToSaveErrorMessage = result.error
            this.failedToSaveSnackBar = true
          }
        } else {
          const feature = _.cloneDeep(this.feature)
          feature.properties = this.featureProperties
          this.addFeatureToGeoPackage({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, feature: feature})
          this.close()
        }
      }
    }
  }
</script>

<style scoped>

</style>
