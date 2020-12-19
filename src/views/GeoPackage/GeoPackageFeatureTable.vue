<template>
  <v-sheet>
    <v-dialog
      v-model="removeDialog"
      max-width="400"
      persistent>
      <v-card v-if="featureToRemove !== null">
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Delete feature
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete feature <b>{{featureToRemove.id}}</b> from the {{table.tableName}} feature layer? This action can't be undone.
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
            Delete
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
      item-key="key"
      hide-default-footer
      :page.sync="page"
      :options="{hideDefaultFooter: true, itemsPerPage: 5}"
      class="elevation-1"
      @page-count="pageCount = $event"
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
            title="Edit feature"
          >
            mdi-pencil
          </v-icon>
        </v-btn>
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
            title="Style assignment"
          >
            mdi-palette
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
            title="Delete feature"
          >
            mdi-trash-can
          </v-icon>
        </v-btn>
      </template>
    </v-data-table>
    <div class="text-center pt-2">
      <v-pagination
        v-model="page"
        :length="pageCount"
        :total-visible="7"
      ></v-pagination>
    </div>
    <v-dialog
      v-model="editDialog"
      max-width="500"
      scrollable
      persistent>
      <feature-editor v-if="editDialog" :projectId="projectId" :geopackage-path="geopackage.path" :id="geopackage.id" :tableName="table.tableName" :columns="editFeatureColumns" :feature="editFeature" :close="closeEditor" :is-editing="true"></feature-editor>
    </v-dialog>
  </v-sheet>
</template>

<script>
  import _ from 'lodash'
  import moment from 'moment'
  import { GeoPackageDataType } from '@ngageoint/geopackage'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import FeatureEditor from '../Common/FeatureEditor'
  import EditFeatureStyleAssignment from '../StyleEditor/EditFeatureStyleAssignment'
  import ActionUtilities from '../../lib/ActionUtilities'

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
        styleAssignment: null,
        page: 1,
        pageCount: 0
      }
    },
    computed: {
      tableEntries () {
        return this.table.features.map(feature => {
          const item = {
            key: feature.id + '_' + this.table.tableName + '_' + this.geopackage.name,
            geopackage: this.geopackage.name,
            geopackageId: this.geopackage.id,
            layer: this.table.tableName,
            id: feature.id,
            type: feature.geometry.type,
            styleAssignmentType: this.table.featureStyleAssignmentTypes[feature.id] || 'None'
          }
          _.keys(feature.properties).forEach(key => {
            let value = feature.properties[key] || ''
            try {
              const column = this.table.columns.getColumn(key)
              if (column.dataType === GeoPackageDataType.BOOLEAN) {
                value = value === 1 || value === true
              }
              if (value !== '' && column.dataType === GeoPackageDataType.DATE) {
                value = moment.utc(value).format('MM/DD/YYYY')
              }
              if (value !== '' && column.dataType === GeoPackageDataType.DATETIME) {
                value = moment.utc(value).format('MM/DD/YYYY h:mm:ss a')
              }
              if (column.dataType === GeoPackageDataType.TEXT && value.length > 15) {
                value = value.substring(0, 15) + '...'
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(e)
            }
            item[key.toLowerCase() + '_table'] = value
          })
          return item
        })
      },
      headers () {
        const headers = [
          { text: 'Actions', value: 'actions', sortable: false, width: 150 },
          { text: 'Style Assignment', value: 'styleAssignmentType', width: 150 },
          { text: 'Geometry Type', value: 'type', width: 150 }
        ]
        const tableHeaders = []
        this.table.columns._columns.forEach(column => {
          if (!column.primaryKey && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
            tableHeaders.push({
              text: column.name.toLowerCase(),
              value: column.name.toLowerCase() + '_table',
              width: 200
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
          ActionUtilities.removeFeatureFromGeopackage({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.table.tableName, featureId: this.featureToRemove.id})
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
          this.zoomToFeature(this.geopackage.path, value.layer, value.id)
        }
      }
    }
  }
</script>

<style scoped>

</style>
