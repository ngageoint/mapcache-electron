// eslint-disable vue/valid-v-slot
<template>
  <v-sheet>
    <v-dialog
      v-model="removeDialog"
      max-width="400"
      persistent
      @keydown.esc="removeDialog = false">
      <v-card v-if="removeDialog && featureToRemove !== null">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete feature
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete feature <b>{{featureToRemove.id}}</b> from the {{name}} {{isGeoPackage ? 'feature layer' : 'data source'}}? This action can't be undone.
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
    <v-dialog v-model="assignStyleDialog" max-width="400" persistent scrollable @keydown.esc="closeStyleAssignment">
      <edit-feature-style-assignment
        v-if="styleAssignment"
        :assignment="styleAssignment"
        :table-name="table.tableName"
        :project-id="projectId"
        :id="id"
        :is-geo-package="isGeoPackage"
        :close="closeStyleAssignment"/>
    </v-dialog>
    <v-dialog v-model="showFeatureMediaAttachments" max-width="600" persistent @keydown.esc="closeFeatureMediaAttachments" :fullscreen="attachmentDialogFullScreen" style="overflow-y: hidden;">
      <media-attachments
        v-if="showFeatureMediaAttachments"
        :tableName="table.tableName"
        :project-id="projectId"
        :geopackage-path="filePath"
        :id="id"
        :feature-id="mediaFeatureId"
        :is-geo-package="isGeoPackage"
        :back="closeFeatureMediaAttachments"
        :toggle-full-screen="toggleAttachmentDialogFullScreen"
        :is-full-screen="attachmentDialogFullScreen"/>
    </v-dialog>
    <v-data-table
      v-model="selected"
      dense
      calculate-widths
      :headers="headers"
      :items="tableEntries"
      item-key="key"
      hide-default-footer
      :server-items-length="table.featureCount"
      :loading="loading"
      :page.sync="page"
      :options="options"
      class="elevation-1"
      @click:row="handleClick"
    >
      <template v-slot:[`item.actions`]="{ item }">
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
            {{mdiPencil}}
          </v-icon>
        </v-btn>
        <v-btn
          v-if="item.geometry != null"
          icon
          small
          @click="(e) => {
            e.stopPropagation()
            e.preventDefault()
            editDrawing(item)
          }">
          <v-icon
            small
            title="Edit feature geometry"
          >
            {{mdiVectorSquare}}
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
            {{mdiTrashCan}}
          </v-icon>
        </v-btn>
      </template>
      <template v-slot:[`item.style`]="{ item }">
        <v-btn icon v-if="item.style && (item.style.style || item.style.icon)" @click.stop.prevent="(e) => {
              e.stopPropagation()
              e.preventDefault()
              showStyleAssignment(item)
            }"
               title="Assign style">
          <geometry-style-svg v-if="item.style.style" :color="item.style.style.color" :fill-color="item.style.style.fillColor" :fill-opacity="item.style.style.fillOpacity" :geometry-type="item.geometryTypeCode"/>
          <img v-else-if="item.style.icon" class="icon-box" style="width: 25px; height: 25px;" :src="item.style.icon.url"/>
        </v-btn>
        <v-row v-else justify="start" align="center" no-gutters>
          <v-btn small icon @click.stop.prevent="(e) => {
              e.stopPropagation()
              e.preventDefault()
              showStyleAssignment(item)
            }"
                 title="Assign style">
            <v-icon small>{{mdiPalette}}</v-icon>
          </v-btn>
          None
        </v-row>
      </template>
      <template v-slot:[`item.attachments`]="{ item }">
        <v-row justify="start" align="center" no-gutters>
          <v-btn title="Edit attachments" small icon @click.stop.prevent="(e) => {
              e.stopPropagation()
              e.preventDefault()
              editFeatureMediaAttachments(item)
            }">
            <v-icon small>{{mdiPaperclip}}</v-icon>
          </v-btn>
          {{item.attachmentCount}}
        </v-row>
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
      persistent
      @keydown.esc="closeEditor">
      <feature-editor v-if="editDialog" :projectId="projectId" :is-geo-package="isGeoPackage" :geopackage-path="filePath" :id="id" :tableName="table.tableName" :columns="editFeatureColumns" :feature="editFeature" :close="closeEditor" :is-editing="true"></feature-editor>
    </v-dialog>
  </v-sheet>
</template>

<script>
import keys from 'lodash/keys'
import orderBy from 'lodash/orderBy'
import isNil from 'lodash/isNil'
import moment from 'moment/moment'
import FeatureEditor from '../Common/FeatureEditor'
import EditFeatureStyleAssignment from '../StyleEditor/EditFeatureStyleAssignment'
import MediaAttachments from '../Common/MediaAttachments'
import GeometryStyleSvg from '../Common/GeometryStyleSvg'
import {mdiPalette, mdiPaperclip, mdiPencil, mdiTrashCan, mdiVectorSquare} from '@mdi/js'

export default {
    props: {
      projectId: String,
      id: String,
      filePath: String,
      name: String,
      source: Object,
      geopackage: Object,
      table: Object,
      zoomToFeature: Function,
      close: Function,
      isGeoPackage: Boolean
    },
    components: {
      GeometryStyleSvg,
      MediaAttachments,
      FeatureEditor,
      EditFeatureStyleAssignment
    },
    data () {
      return {
        mdiPencil: mdiPencil,
        mdiVectorSquare: mdiVectorSquare,
        mdiTrashCan: mdiTrashCan,
        mdiPalette: mdiPalette,
        mdiPaperclip: mdiPaperclip,
        editDialog: false,
        removeDialog: false,
        featureToRemove: null,
        selected: [],
        editFeature: null,
        editFeatureColumns: {},
        assignStyleDialog: false,
        styleAssignment: null,
        page: 1,
        showFeatureMediaAttachments: false,
        mediaFeatureId: -1,
        attachmentDialogFullScreen: false,
        loading: false,
        options: {hideDefaultFooter: true, itemsPerPage: 5},
        tableEntries: [],
        features: []
      }
    },
    computed: {
      pageCount () {
        return Math.ceil(this.table.featureCount / this.options.itemsPerPage)
      },
      headers () {
        const headers = [
          { text: 'Actions', value: 'actions', sortable: false, width: 140 },
          { text: 'Attachments', value: 'attachments', width: 140 },
          { text: 'Style', value: 'style', sortable: false, width: 140 },
          { text: 'Geometry type', value: 'geometryType', width: 140 }
        ]
        const tableHeaders = []
        this.table.columns._columns.forEach(column => {
          if (!column.primaryKey && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id') {
            tableHeaders.push({
              text: column.name.toLowerCase(),
              value: column.name.toLowerCase() + '_table',
              width: 200
            })
          }
        })
        return headers.concat(orderBy(tableHeaders, ['text'], ['asc']))
      }
    },
    mounted () {
      this.setPage(0)
    },
    watch: {
      dialog (val) {
        val || this.close()
      },
      source: {
        handler (newValue) {
          if (newValue != null) {
            this.setPage(this.page - 1)
          }
        },
        deep: true
      },
      geopackage: {
        handler (newValue) {
          if (newValue != null) {
            this.setPage(this.page - 1)
          }
        },
        deep: true
      },
      table: {
        handler (newValue) {
          if (newValue != null) {
            this.setPage(this.page - 1)
          }
        },
        deep: true
      },
      page: {
        handler (newPage) {
          this.setPage(newPage - 1)
        }
      }
    },
    methods: {
      setPage (pageIndex) {
        this.loading = true
        this.table.getPage(pageIndex, this.options.itemsPerPage).then(page => {
          this.$nextTick(() => {
            this.tableEntries = this.getTableEntries(page)
            this.loading = false
          })
        })
      },
      getTableEntries (page) {
        return page.features.map(feature => {
          const item = {
            key: feature.id + '_' + this.id,
            id: feature.id,
            feature: feature,
            geometry: feature.geometry,
            geometryType: isNil(feature.geometry) ? null : feature.geometry.type,
            geometryTypeCode: isNil(feature.geometry) ? -1 : window.mapcache.GeometryType.fromName(feature.geometry.type.toUpperCase()),
            style: page.styleAssignments[feature.id],
            attachmentCount: page.mediaCounts[feature.id] || 0
          }
          keys(feature.properties).forEach(key => {
            let value = feature.properties[key] != null ? feature.properties[key] : ''
            try {
              const columnIndex = this.table.columns._columnNames.findIndex(columnName => columnName.toUpperCase() === key.toUpperCase())
              const column = this.table.columns._columns[columnIndex]
              if (column.dataType === window.mapcache.GeoPackageDataType.BOOLEAN) {
                value = value === 1 || value === true
              }
              if (value !== '' && column.dataType === window.mapcache.GeoPackageDataType.DATE) {
                value = moment.utc(value).format('MM/DD/YYYY')
              }
              if (value !== '' && column.dataType === window.mapcache.GeoPackageDataType.DATETIME) {
                value = moment.utc(value).format('MM/DD/YYYY h:mm:ss a')
              }
              if (column.dataType === window.mapcache.GeoPackageDataType.TEXT && value.length > 15) {
                value = value.substring(0, 15) + '...'
              }
              // eslint-disable-next-line no-unused-vars
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Failed to set value for property ' + key)
            }
            item[key.toLowerCase() + '_table'] = value
          })
          return item
        })
      },
      toggleAttachmentDialogFullScreen () {
        this.attachmentDialogFullScreen = !this.attachmentDialogFullScreen
      },
      closeFeatureMediaAttachments () {
        this.showFeatureMediaAttachments = false
        this.$nextTick(() => {
          this.attachmentDialogFullScreen = false
        })
      },
      editFeatureMediaAttachments (item) {
        this.mediaFeatureId = item.id
        this.showFeatureMediaAttachments = true
      },
      editItem (item) {
        const self = this
        this.editFeature = item.feature
        window.mapcache.getFeatureColumns(this.filePath, this.table.tableName).then(columns => {
          self.editFeatureColumns = columns
          self.editDialog = true
        })
      },
      showDeleteConfirmation (item) {
        this.featureToRemove = item.feature
        this.removeDialog = true
      },
      cancelRemove () {
        this.removeDialog = false
        this.featureToRemove = null
      },
      remove () {
        if (!isNil(this.featureToRemove)) {
          if (this.isGeoPackage) {
            window.mapcache.removeFeatureFromGeopackage({projectId: this.projectId, geopackageId: this.id, featureId: this.featureToRemove.id})
          } else {
            window.mapcache.removeFeatureFromDataSource({projectId: this.projectId, sourceId: this.id, featureId: this.featureToRemove.id})
          }
          // eslint-disable-next-line vue/no-mutating-props
          this.table.featureCount--
          if (this.table.featureCount === 0) {
            this.close()
          } else {
            this.loading = true
            this.table.getPage(Math.min(this.pageCount, this.page) - 1, this.options.itemsPerPage).then(page => {
              this.tableEntries = this.getTableEntries(page)
              this.loading = false
            })
          }
          this.removeDialog = false
          this.featureToRemove = null
        }
      },
      async showStyleAssignment (item) {
        this.styleAssignment = await window.mapcache.getStyleItemsForFeature(this.filePath, this.table.tableName, item.id)
        this.assignStyleDialog = true
      },
      async editDrawing (item) {
        window.mapcache.editFeatureGeometry({projectId: this.projectId, id: this.id, isGeoPackage: this.isGeoPackage, tableName: this.table.tableName, featureToEdit: item.feature})
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
          this.zoomToFeature(this.filePath, this.table.tableName, value.id)
        }
      }
    }
  }
</script>

<style scoped>

</style>
