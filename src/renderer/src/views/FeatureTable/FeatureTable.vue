// eslint-disable vue/valid-v-slot
<template>
  <v-dialog
      v-model="removeDialog"
      max-width="400"
      persistent
      @keydown.esc="removeDialog = false">
    <v-card v-if="removeDialog && selected !== null && selected.length > 0">
      <v-card-title>
        <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
        Delete feature
      </v-card-title>
      <v-card-text>
        Are you sure you want to delete the selected {{ selected.length === 1 ? 'feature' : 'features' }}? This action
        can't be undone.
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn
            variant="text"
            @click="cancelRemove">
          Cancel
        </v-btn>
        <v-btn
            color="warning"
            variant="text"
            @click="deleteSelected">
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-data-table
      density="compact"
      v-model="selected"
      fixed-header
      :height="tableHeight"
      calculate-widths
      :headers="headers"
      :items="tableEntries"
      :items-per-page="itemsPerPage"
      disable-pagination
      :server-items-length="table.featureCount"
      :loading="loading"
      :page="page"
      class="elevation-1"
      v-on:update:sort-by="handleSortUpdate"
      v-on:update:sort-desc="handleDescendingSortUpdate"
      v-sortable-table="{onEnd:updateColumnOrder}"
      :key="tableKey"
      show-select
      item-value="selectId"
      select-strategy="page"
      :return-object="true"
  >
    <template v-slot:top>
      <v-row no-gutters justify="space-between" class="ml-4 mr-2">
        <v-text-field
            density="comfortable"
            variant="underlined"
            autofocus
            v-model="search"
            color="primary"
            append-inner-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
            clearable
        />
        <v-btn style="margin-top: 4px;" variant="text" :disabled="selected.length === 0" color="warning" @click="showDeleteConfirmation" icon="mdi-trash-can"/>
      </v-row>
    </template>
    <template v-slot:column.attachments="{ column }">
      <v-icon size="x-small" style="margin-left: -4px !important; margin-top: -4px !important;" small icon="mdi-paperclip"/>
    </template>
    <template v-slot:item="{ item, index, columns, isSelected, toggleSelect }">
      <tr style="max-height: 75px !important;" class="clickable" @dblclick="() => zoomTo(item)" @click="() => handleClick(item)" @mouseover="() => handleHover(item)" @mouseleave="() => handleMouseLeave(item)">
        <td v-for="column of columns" :key="index + '_' + column.key" class="text-start text-truncate" :style="{maxWidth: column.maxWidth, minWidth: (column.key === 'attachments' || column.key === 'data-table-select') ? '16px' : column.minWidth}">
          <div class="ma=0 pa-0" v-if="column.key === 'attachments'">
            {{ item.attachments > 0 ? item.attachments : null }}
          </div>
          <v-checkbox hide-details style="margin-left: -8px;" v-else-if="column.key === 'data-table-select'" @click="(e) => {
              toggleSelect(item)
              e.stopPropagation()
            }" :model-value="isSelected(item)"></v-checkbox>
          <div class="ma-0 pa-0 text-truncate" v-else>
            {{item[column.key]}}
          </div>
        </td>
      </tr>
    </template>
    <template v-slot:bottom>
      <v-row no-gutters justify="center" class="pt-2 pb-4">
        <v-col cols="12">
          <v-pagination
              density="comfortable"
              v-model="page"
              :length="pageCount"
              :total-visible="6"
              active-color="primary"
          ></v-pagination>
        </v-col>
        <v-select class="items-per-page-select" density="compact" hide-details v-if="showItemsPerPage" variant="underlined" v-model="itemsPerPage" :items="itemsPerPageOptions" label="items per page"></v-select>
      </v-row>
    </template>
  </v-data-table>
</template>

<script>
import keys from 'lodash/keys'
import debounce from 'lodash/debounce'
import isNil from 'lodash/isNil'
import moment from 'moment/moment'
import Sortable from 'sortablejs'
import {
  deleteFeatureIdsFromDataSource,
  deleteFeatureIdsFromGeoPackage,
  updateGeoPackageFeatureTableColumnOrder
} from '../../../../lib/vue/vuex/ProjectActions'

const measureTextCanvas = document.createElement('canvas')

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
  directives: {
    'sortable-table': {
      inserted: (el, binding) => {
        Sortable.create(el.querySelector('tr'), binding.value ? {
          ...binding.value,
          handle: '.sortHandle',
          ghostClass: 'ghost',
          forceFallback: true,
          onChoose: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onStart: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onUnchoose: function () {
            document.body.style.cursor = 'default'
          }, // Dragging started
        } : {})
      },
    },
  },
  data () {
    return {
      removeDialog: false,
      selected: [],
      page: 1,
      loading: false,
      itemsPerPage: 5,
      tableEntries: [],
      features: [],
      itemsPerPageOptions: [5, 10, 15, 20, 25, 50],
      windowHeight: window.innerHeight,
      previousItemsPerPage: 5,
      itemHeight: 48,
      headerHeight: 48,
      scrollBarHeight: 16,
      sortField: null,
      descending: false,
      headerColumnNameMapping: {},
      search: '',
      searchCount: 0,
      tableKey: 1
    }
  },
  computed: {
    pageCount () {
      return Math.ceil(this.searchCount / this.itemsPerPage)
    },
    tableHeight () {
      const tableOnly = Math.min(Math.max(this.tableEntries.length, 1), this.itemsPerPage) * this.itemHeight + this.headerHeight + this.scrollBarHeight
      const windowAreaAvailable = this.windowHeight - 164
      return Math.min(tableOnly, windowAreaAvailable)
    },
    headers () {
      let headers = [
        { title: 'attachments', key: 'attachments', sortable: false, class: 'ignore-elements', minWidth: '16px', maxWidth: '16px' }
      ]
      let columnOrder = null
      if (this.isGeoPackage && this.geopackage.tables.features[this.table.tableName] != null && this.geopackage.tables.features[this.table.tableName].columnOrder != null) {
        columnOrder = this.geopackage.tables.features[this.table.tableName].columnOrder
      } else if (!this.isGeoPackage && this.source && this.source.table && this.source.table.columnOrder != null) {
        columnOrder = this.source.table.columnOrder
      } else {
        columnOrder = this.table.columns._columns.filter(column => !column.primaryKey && column.dataType !== window.mapcache.GeoPackageDataType.BLOB && column.name !== '_feature_id').map(column => column.name.toLowerCase())
      }
      const tableHeaders = []
      columnOrder.forEach(column => {
        const lowerCaseName = column.toLowerCase()
        this.headerColumnNameMapping[lowerCaseName + '_table'] = lowerCaseName
        tableHeaders.push({
          title: lowerCaseName,
          key: lowerCaseName + '_table',
          class: 'sortHandle',
          minWidth: (this.getTextWidth(lowerCaseName, '12pt Roboto') + 48) + 'px',
          maxWidth: Math.max(this.getTextWidth(lowerCaseName, '12pt Roboto') + 48, 150) + 'px'
        })
      })
      headers = headers.concat(tableHeaders)
      return headers
    }
  },
  beforeMount () {
    this.determineSearchCount(this.search)
    this.determinePageSize()
    this.setPage(0)
    this.clearSelectedItems()
  },
  mounted () {
    const self = this
    this.debounceSearch = debounce(async (search) => {
      await this.determineSearchCount(search)
      this.setPage(0)
    }, 500)
    window.addEventListener('resize', () => {
      self.windowHeight = window.innerHeight
      this.determinePageSize()
    })
  },
  watch: {
    pageCount (newValue) {
      if (newValue < this.page) {
        this.page = newValue
      }
    },
    dialog (val) {
      val || this.close()
    },
    itemsPerPage: {
      handler (newVal) {
        const oldVal = this.previousItemsPerPage
        const itemStart = (this.page - 1) * oldVal
        const newPage = Math.floor(itemStart / newVal)
        this.previousItemsPerPage = newVal
        if (this.page === (newPage + 1)) {
          this.setPage(this.page - 1)
        } else {
          this.page = newPage + 1
        }
      }
    },
    search: {
      async handler (newSearch) {
        this.loading = true
        this.debounceSearch(newSearch)
      }
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
          this.determineSearchCount(this.search)
          this.setPage(this.page - 1)
        }
      },
      deep: true
    },
    page: {
      handler (newPage) {
        this.clearSelectedItems()
        this.setPage(newPage - 1)
      }
    }
  },
  methods: {
    clearSelectedItems () {
      while (this.selected.length > 0) {
        this.selected.pop()
      }
    },
    getTextWidth (text, font) {
      const context = measureTextCanvas.getContext('2d')
      context.font = font
      return context.measureText(text).width
    },
    updateColumnOrder (evt) {
      document.body.style.cursor = 'default'
      const headersTmp = this.headers.map(header => header.text)
      headersTmp.unshift('checkbox-placeholder')
      const oldIndex = evt.oldIndex
      let newIndex = Math.min(Math.max(2, evt.newIndex), headersTmp.length - 1)
      headersTmp.splice(newIndex, 0, headersTmp.splice(oldIndex, 1)[0])
      // remove the checkbox and attachments
      headersTmp.splice(0, 2)
      updateGeoPackageFeatureTableColumnOrder(this.projectId, this.id, this.isGeoPackage, this.table.tableName, headersTmp)
      this.tableKey++
    },
    async getSearchCount (search) {
      return await window.mapcache.countGeoPackageTable(this.filePath, this.table.tableName, search)
    },
    async determineSearchCount (search) {
      this.searchCount = await this.getSearchCount(search)
    },
    determinePageSize () {
      if (this.showItemsPerPage) {
        const maxItems = Math.floor((window.innerHeight - 186) / this.itemHeight)
        let pageSizeIndex = 0
        for (let i = 0; i < this.itemsPerPageOptions.length; i++) {
          if (maxItems > this.itemsPerPageOptions[i]) {
            pageSizeIndex = i + 1
          }
        }
        this.itemsPerPage = this.itemsPerPageOptions[Math.min(pageSizeIndex, this.itemsPerPageOptions.length - 1)]
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
      window.mapcache.searchGeoPackageTable(this.filePath, this.table.tableName, pageIndex, this.itemsPerPage, this.sortField, this.descending, this.search).then(page => {
        this.tableEntries = this.getTableEntries(page)
        this.loading = false
      })
    },
    getTableEntries (page) {
      if (page && page.features) {
        return page.features.map(feature => {
          const item = {
            id: feature.id,
            selectId: feature.id + '_' + this.id,
            attachments: page.mediaCounts[feature.id] || 0,
            feature: feature,
          }
          keys(feature.properties).forEach(key => {
            let value = feature.properties[key] != null ? feature.properties[key] : ''
            try {
              const columnIndex = this.table.columns._columnNames.findIndex(columnName => columnName.toUpperCase() === key.toUpperCase())
              const column = this.table.columns._columns[columnIndex]
              if (column != null) {
                if (column.dataType === window.mapcache.GeoPackageDataType.BOOLEAN) {
                  if (value !== '') {
                    value = value === 1 || value === true
                  }
                }
                if (value !== '' && column.dataType === window.mapcache.GeoPackageDataType.DATE) {
                  value = moment.utc(value).format('MM/DD/YYYY')
                }
                if (value !== '' && column.dataType === window.mapcache.GeoPackageDataType.DATETIME) {
                  value = moment.utc(value).format('MM/DD/YYYY h:mm:ss a')
                }
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
    async deleteSelected () {
      this.loading = true
      if (!isNil(this.selected) && this.selected.length > 0) {
        const ids = this.selected.map(feature => feature.id)
        if (this.isGeoPackage) {
          await deleteFeatureIdsFromGeoPackage(this.projectId, this.id, this.table.tableName, ids)
        } else {
          await deleteFeatureIdsFromDataSource(this.projectId, this.id, ids)
        }
        const totalFeatureCount = await this.getSearchCount()
        if (totalFeatureCount === 0) {
          this.close()
        } else {
          await this.determineSearchCount(this.search)
        }
        this.removeDialog = false
        this.selected = []
      }
    },
    handleHover (item) {
      if (this.table.visible) {
        this.highlightFeature(this.id, this.isGeoPackage, this.filePath, this.table.tableName, item.raw.id)
      }
    },
    handleClick (item) {
      if (!this.removeDialog) {
        this.showFeature(this.id, this.isGeoPackage, this.table.tableName, item.id)
      }
    },
    zoomTo (item) {
      if (!this.removeDialog) {
        this.zoomToFeature(this.filePath, this.table.tableName, item.raw.id)
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
  right: 16px;
  margin-left: 32px;
  max-width: 92px;
  min-width: 92px;
}

.v-data-table-header th {
  white-space: nowrap !important;
}

.v-data-table-header__icon {
  cursor: pointer !important;
}
</style>
