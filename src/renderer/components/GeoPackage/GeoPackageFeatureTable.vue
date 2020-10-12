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
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="remove">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="assignStyleDialog" max-width="400" persistent scrollable>
      <edit-feature-style-assignment
        v-if="styleAssignment"
        :assignment="styleAssignment"
        :table-name="table.tableName"
        :project-id="projectId"
        :id="geopackage.id"
        :is-geo-package="true"
        :close="closeStyleAssignment"/>
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
      <template v-slot:item.code_actions="{ item }">
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
      <template v-slot:item.code_style="{ item }">
        <v-btn
          icon
          small
          @click="(e) => {
              e.stopPropagation()
              e.preventDefault()
              showStyleAssignment(item)
            }">
          <v-icon
            small
            title="Style"
          >
            mdi-palette
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
  import EditFeatureStyleAssignment from '../StyleEditor/EditFeatureStyleAssignment'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      table: Object,
      zoomToFeature: Function,
      close: Function
    },
    components: {
      FeatureEditor,
      EditFeatureStyleAssignment
    },
    data () {
      return {
        editDialog: false,
        removeDialog: false,
        featureToRemove: null,
        selected: [],
        editFeature: null,
        editFeatureColumns: {},
        assignStyleDialog: false,
        styleAssignment: null
      }
    },
    computed: {
      tableEntries () {
        return this.table.features.map(feature => {
          const item = {
            code_key: feature.id + '_' + this.table.tableName + '_' + this.geopackage.name,
            code_geopackage: this.geopackage.name,
            code_geopackageId: this.geopackage.id,
            code_layer: this.table.tableName,
            id: feature.id,
            code_type: feature.geometry.type,
            code_style: null
          }
          _.keys(feature.properties).forEach(key => {
            let value = feature.properties[key] || ''
            try {
              const column = this.table.columns.getColumn(key)
              if (column.dataType === GeoPackageDataType.BOOLEAN) {
                value = value === 1 || value === true
              }
              if (value !== '' && (column.dataType === GeoPackageDataType.DATE || column.dataType === GeoPackageDataType.DATETIME)) {
                value = new Date(value).toISOString()
              }
            } catch (e) {}
            item[key.toLowerCase() + '_table'] = value
          })
          return item
        })
      },
      headers () {
        const headers = [
          { text: 'Actions', value: 'code_actions', sortable: false },
          { text: 'Style', value: 'code_style' },
          { text: 'Geometry Type', value: 'code_type', width: 150 }
        ]
        const tableHeaders = []
        this.table.columns._columns.forEach(column => {
          if (!column.primaryKey && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
            tableHeaders.push({
              text: column.name.toLowerCase(),
              value: column.name.toLowerCase() + '_table'
            })
          }
        })
        return headers.concat(_.orderBy(tableHeaders, ['text'], ['asc']))
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
      async showStyleAssignment (item) {
        this.styleAssignment = await GeoPackageUtilities.getStyleItemsForFeature(this.geopackage.path, this.table.tableName, item.id)
        this.assignStyleDialog = true
      },
      closeStyleAssignment () {
        this.assignStyleDialog = false
        this.styleAssignment = null
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
