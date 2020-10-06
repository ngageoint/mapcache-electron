<template>
  <v-sheet>
    <v-dialog
      v-model="removeDialog"
      max-width="500"
      persistent>
      <v-card v-if="featureToRemove !== null">
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-trash-can-outline</v-icon>Delete Feature {{featureToRemove.id}}
          </v-row>
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the feature?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelRemove">
            cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="remove">
            remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-data-table
      v-model="selected"
      dense
      calculate-widths
      :headers="headers"
      :items="tableEntries"
      item-key="code_key"
      class="elevation-1"
      :height="Math.min(160, 32 * (tableEntries.length + 1))"
      @click:row="handleClick"
    >
      <template v-slot:item.actions="{ item }">
        <v-btn
          icon
          small
          @click="(e) => {
            e.stopPropagation()
            e.preventDefault()
            editItem(item)
          }">
          <v-icon
            small
            title="Edit"
          >
            mdi-pencil
          </v-icon>
        </v-btn>
        <v-btn
          icon
          color="warning"
          small
          @click="(e) => {
            e.stopPropagation()
            e.preventDefault()
            showDeleteConfirmation(item)
          }">
          <v-icon
            small
            color="warning"
            title="Delete"
          >
            mdi-trash-can
          </v-icon>
        </v-btn>
      </template>
    </v-data-table>
    <v-dialog
      v-model="editDialog"
      max-width="500"
      scrollable
      persistent>
      <feature-editor v-if="editDialog" :projectId="projectId" :geopackage="geopackage" :tableName="table.tableName" :columns="editFeatureColumns" :feature="editFeature" :close="closeEditor" :is-editing="true"></feature-editor>
    </v-dialog>
  </v-sheet>
</template>

<script>
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import { GeoPackageDataType } from '@ngageoint/geopackage'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import FeatureEditor from './FeatureEditor'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      table: Object,
      zoomToFeature: Function,
      close: Function
    },
    components: {
      FeatureEditor
    },
    data () {
      return {
        editDialog: false,
        removeDialog: false,
        featureToRemove: null,
        selected: [],
        editFeature: null,
        editFeatureColumns: {}
      }
    },
    computed: {
      tableEntries () {
        const entries = this.table.features.map(feature => {
          const item = {
            code_key: feature.id + '_' + this.table.tableName + '_' + this.geopackage.name,
            code_geopackage: this.geopackage.name,
            code_geopackageId: this.geopackage.id,
            code_layer: this.table.tableName,
            id: feature.id,
            code_type: feature.geometry.type
          }

          _.keys(feature.properties).forEach(key => {
            let value = feature.properties[key] || ''
            try {
              const column = this.table.columns.getColumn(key)
              if (column.dataType === GeoPackageDataType.BOOLEAN) {
                if (value === 1 || value === true) {
                  value = true
                } else {
                  value = false
                }
              }
              if (value !== '' && (column.dataType === GeoPackageDataType.DATE || column.dataType === GeoPackageDataType.DATETIME)) {
                value = new Date(value).toISOString()
              }
            } catch (e) {}
            item[key.toLowerCase()] = value
          })
          return item
        })
        return entries
      },
      headers () {
        const headers = [
          { text: 'Actions', value: 'actions', sortable: false },
          { text: 'Geometry Type', value: 'code_type', width: 150 }
        ]
        this.table.columns._columns.forEach(column => {
          if (!column.primaryKey && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
            headers.push({
              text: column.name.toLowerCase(),
              value: column.name.toLowerCase()
            })
          }
        })
        return _.orderBy(headers, ['text'], ['asc'])
      }
    },
    watch: {
      dialog (val) {
        val || this.close()
      }
    },
    methods: {
      ...mapActions({
        removeFeatureFromGeopackage: 'Projects/removeFeatureFromGeopackage'
      }),
      editItem (item) {
        const self = this
        this.editFeature = this.table.features.find(feature => feature.id === item.id)
        GeoPackageUtilities.getFeatureColumns(this.geopackage.path, this.table.tableName).then(columns => {
          self.editFeatureColumns = columns
          self.editDialog = true
        })
      },
      showDeleteConfirmation (item) {
        this.featureToRemove = item
        this.removeDialog = true
      },
      cancelRemove () {
        this.removeDialog = false
        this.featureToRemove = null
      },
      remove () {
        if (!_.isNil(this.featureToRemove)) {
          this.removeFeatureFromGeopackage({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.table.tableName, featureId: this.featureToRemove.id})
          this.table.features = this.table.features.filter(f => f.id !== this.featureToRemove.id)
          if (this.table.features.length === 0) {
            this.close()
          }
          this.removeDialog = false
          this.featureToRemove = null
        }
      },
      closeEditor () {
        this.editDialog = false
        this.$nextTick(() => {
          this.editFeature = null
          this.editFeatureColumns = {}
        })
      },
      handleClick (value) {
        if (!this.removeDialog) {
          this.zoomToFeature(this.geopackage.path, value.code_layer, value.id)
        }
      }
    }
  }
</script>

<style scoped>

</style>
