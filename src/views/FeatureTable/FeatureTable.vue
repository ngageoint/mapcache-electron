// eslint-disable vue/valid-v-slot
<template>
  <v-sheet>
    <v-dialog
      v-model="removeDialog"
      max-width="400"
      persistent
      @keydown.esc="removeDialog = false">
      <v-card v-if="removeDialog && selected !== null && selected.length > 0">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete feature
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the {{selected.length}} selected features? This action can't be undone.
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
            @click="deleteSelected">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-data-table
      v-model="selected"
      :height="tableHeight"
      calculate-widths
      :headers="headers"
      :items="tableEntries"
      item-key="id"
      hide-default-footer
      :server-items-length="table.featureCount"
      :loading="loading"
      :page.sync="page"
      :options="options"
      v-on:update:sort-by="handleSortUpdate"
      v-on:update:sort-desc="handleDescendingSortUpdate"
      class="elevation-1"
      show-select
    >
      <template v-slot:top>
        <v-row no-gutters justify="end">
          <v-btn :disabled="selected.length === 0" text color="red" @click="showDeleteConfirmation"><v-icon>{{mdiTrashCan}}</v-icon>Delete</v-btn>
        </v-row>
      </template>
      <template v-slot:[`header.attachments`]="{ }">
        <v-icon style="margin-left: -4px !important;" small>{{mdiPaperclip}}</v-icon>
      </template>
      <template v-slot:item="{ item, headers, index, isSelected, select }">
        <tr class="clickable" @dblclick="() => zoomTo(item)" @click="() => handleClick(item)" @mouseover="() => handleHover(item)" @mouseleave="() => handleMouseLeave(item)">
          <td class="text-start">
            <v-simple-checkbox v-ripple @click="e => {
              select(!isSelected)
              e.stopPropagation()
            }" :value="isSelected"></v-simple-checkbox>
          </td>
          <td class="text-start">
            {{item.attachments > 0 ? item.attachments : null}}
          </td>
          <td class="text-start"  v-for="header in headers.slice(2)" :key="index + '_' + header.value">
            {{item[header.value]}}
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-row no-gutters>
      <v-col class="mt-2">
        <v-pagination
            v-model="page"
            :length="pageCount"
            :total-visible="7"
        ></v-pagination>
      </v-col>
      <div v-if="showItemsPerPage" class="pr-4 items-per-page-select">
        <v-select v-model="options.itemsPerPage" :items="itemsPerPageOptions" label="items per page"></v-select>
      </div>
    </v-row>
  </v-sheet>
</template>

<script>
import keys from 'lodash/keys'
import orderBy from 'lodash/orderBy'
import isNil from 'lodash/isNil'
import moment from 'moment/moment'
import {mdiPaperclip, mdiTrashCan} from '@mdi/js'

export default {
    props: {
      projectId: String,
      id: String,
      filePath: String,
      name: String,
      source: Object,
      geopackage: Object,
      table: Object,
      showFeature: Function,
      zoomToFeature: Function,
      highlightFeature: Function,
      close: Function,
      isGeoPackage: Boolean,
      showItemsPerPage: Boolean
    },
    data () {
      return {
        mdiTrashCan: mdiTrashCan,
        mdiPaperclip: mdiPaperclip,
        removeDialog: false,
        selected: [],
        page: 1,
        loading: false,
        options: {hideDefaultFooter: false, itemsPerPage: 5},
        tableEntries: [],
        features: [],
        itemsPerPageOptions: [5, 10, 15, 20, 25, 50, 100],
        windowHeight: window.innerHeight,
        previousItemsPerPage: 5,
        itemHeight: 48,
        headerHeight: 48,
        scrollBarHeight: 16,
        sortField: null,
        descending: false,
        headerColumnNameMapping: {}
      }
    },
    computed: {
      tableHeight () {
        const tableOnly = Math.min(this.tableEntries.length, this.options.itemsPerPage) * this.itemHeight + this.headerHeight + this.scrollBarHeight
        const windowAreaAvailable = this.windowHeight - 154
        return Math.min(tableOnly, windowAreaAvailable)
      },
      pageCount () {
        return Math.ceil(this.table.featureCount / this.options.itemsPerPage)
      },
      headers () {
        const headers = [
          { text: 'attachments', value: 'attachments', sortable: false }
        ]
        const tableHeaders = []
        this.table.columns._columns.forEach(column => {
          if (!column.primaryKey && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id') {
            this.headerColumnNameMapping[column.name.toLowerCase() + '_table'] = column.name.toLowerCase()
            tableHeaders.push({
              text: column.name.toLowerCase(),
              value: column.name.toLowerCase() + '_table'
            })
          }
        })
        return headers.concat(orderBy(tableHeaders, ['text'], ['asc']))
      }
    },
    mounted () {
      this.setPage(0)
      const self = this
      this.determinePageSize()
      window.addEventListener('resize', () => {
        self.windowHeight = window.innerHeight
        this.determinePageSize()
      })
    },
    watch: {
      dialog (val) {
        val || this.close()
      },
      options: {
        handler (newOptions) {
          const newVal = newOptions.itemsPerPage
          const oldVal = this.previousItemsPerPage
          const itemStart = (this.page - 1) * oldVal
          const newPage = Math.floor(itemStart / newVal)
          this.previousItemsPerPage = newVal
          if (this.page === (newPage + 1)) {
            this.setPage(this.page - 1)
          } else {
            this.page = newPage + 1
          }
        },
        deep: true
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
      getWidthFromColumnType (type) {
        let width = 200

        if (type === window.mapcache.GeoPackageDataType.INT ||
            type === window.mapcache.GeoPackageDataType.BOOLEAN ||
            type === window.mapcache.GeoPackageDataType.TINYINT ||
            type === window.mapcache.GeoPackageDataType.SMALLINT ||
            type === window.mapcache.GeoPackageDataType.MEDIUMINT ||
            type === window.mapcache.GeoPackageDataType.INT ||
            type === window.mapcache.GeoPackageDataType.INTEGER ||
            type === window.mapcache.GeoPackageDataType.FLOAT ||
            type === window.mapcache.GeoPackageDataType.DOUBLE ||
            type === window.mapcache.GeoPackageDataType.REAL) {
          width = 100
        } else if (type === window.mapcache.GeoPackageDataType.DATE) {
          width = 150
        }

        return width
      },
      determinePageSize () {
        if (this.showItemsPerPage) {
          const maxItems = Math.floor((window.innerHeight - 168) / this.itemHeight)
          let pageSizeIndex = 0
          for (let i = 0; i < this.itemsPerPageOptions.length; i++) {
            if (maxItems > this.itemsPerPageOptions[i]) {
              pageSizeIndex = i + 1
            }
          }
          this.options.itemsPerPage = this.itemsPerPageOptions[Math.min(pageSizeIndex, this.itemsPerPageOptions.length - 1)]
        }
      },
      handleSortUpdate (args) {
        this.sortField = this.headerColumnNameMapping[args[0]]
        this.setPage(this.page - 1)
      },
      handleDescendingSortUpdate (args) {
        this.descending = args[0]
        this.setPage(this.page - 1)
      },
      setPage (pageIndex) {
        this.loading = true
        this.table.getPage(pageIndex, this.options.itemsPerPage, this.filePath, this.table.tableName, this.sortField, this.descending).then(page => {
          this.$nextTick(() => {
            this.tableEntries = this.getTableEntries(page)
            this.loading = false
          })
        })
      },
      getTableEntries (page) {
        if (page && page.features) {
          return page.features.map(feature => {
            const item = {
              key: feature.id + '_' + this.id,
              id: feature.id,
              attachments: page.mediaCounts[feature.id] || 0,
              feature: feature
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
        } else {
          return []
        }
      },
      showDeleteConfirmation () {
        this.removeDialog = true
      },
      cancelRemove () {
        this.removeDialog = false
      },
      deleteSelected () {
        if (!isNil(this.selected) && this.selected.length > 0) {
          const ids = this.selected.map(feature => feature.id)
          if (this.isGeoPackage) {
            window.mapcache.deleteFeatureIdsFromGeoPackage({projectId: this.projectId, geopackageId: this.id, tableName: this.table.tableName, featureIds: ids})
          } else {
            window.mapcache.deleteFeatureIdsFromDataSource({projectId: this.projectId, sourceId: this.id, featureIds: ids})
          }
          // eslint-disable-next-line vue/no-mutating-props
          this.table.featureCount -= ids.length
          const newPageCount = Math.ceil(this.table.featureCount / this.options.itemsPerPage)
          if (this.table.featureCount === 0) {
            this.close()
          } else {
            this.page = Math.min(newPageCount, this.page)
          }
          this.removeDialog = false
          this.selected = []
        }
      },
      handleHover (value) {
        if (this.table.visible) {
          this.highlightFeature(this.filePath, this.table.tableName, value.feature)
        }
      },
      handleClick (value) {
        if (!this.removeDialog) {
          this.showFeature(this.id, this.isGeoPackage, this.table.tableName, value.id)
        }
      },
      zoomTo (value) {
        if (!this.removeDialog) {
          this.zoomToFeature(this.filePath, this.table.tableName, value.id)
        }
      },
      handleMouseLeave () {
        this.highlightFeature()
      }
    }
  }
</script>

<style scoped>
.items-per-page-select {
  position: absolute;
  right: 0;
  max-width: 100px;
  min-width: 100px;
}
.v-data-table-header th {
  white-space: nowrap !important;
}
</style>