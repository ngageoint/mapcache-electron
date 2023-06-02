<template>
  <feature-view v-if="displayFeature && displayFeature.isGeoPackage" :name="geopackage.name" :project="project"
                :projectId="project.id" is-geo-package :geopackage-path="geopackage.path" :id="geopackage.id"
                :tableName="tableName" :feature-id="displayFeature.featureId" :object="geopackage" :back="hideFeature"/>
  <v-sheet v-else-if="styleEditorVisible" class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="hideStyleEditor"/>
      <v-toolbar-title>
        <v-icon large color="white" class="pr-2" icon="mdi-palette"/>
        {{ tableName }}
      </v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-card flat tile>
        <style-editor v-if="styleEditorVisible"
                      :tableName="tableName"
                      :projectId="project.id"
                      :project="project"
                      :id="geopackage.id"
                      :path="geopackage.path"
                      :style-key="styleKey"
                      :back="hideStyleEditor"
                      :style-assignment="geopackage.styleAssignment"
                      :table-style-assignment="geopackage.tableStyleAssignment"
                      :icon-assignment="geopackage.iconAssignment"
                      :table-icon-assignment="geopackage.tableIconAssignment"/>
      </v-card>
    </v-sheet>
  </v-sheet>
  <feature-layer-field v-else-if="showFeatureLayerField"
                       :tableName="tableName"
                       :projectId="project.id"
                       :id="geopackage.id"
                       is-geo-package
                       :object="geopackage"
                       :column="featureLayerField"
                       :columnNames="featureLayerColumnNames"
                       :back="hideFeatureLayerField"
                       :renamed="featureLayerFieldRenamed"/>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
      <v-toolbar-title :title="tableName">{{ tableName }}</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-dialog
          v-model="indexDialog"
          max-width="400"
          persistent>
        <v-card>
          <v-card-title>
            <v-icon color="primary" class="pr-2" icon="mdi-speedometer"/>
            Indexing feature table
          </v-card-title>
          <v-card-text>
            <v-row
                no-gutters
                class="pt-2 pb-2"
            >
              {{ indexMessage }}
            </v-row>
            <v-row no-gutters class="pb-4" v-if="!indexingDone">
              <v-progress-linear
                  color="primary"
                  indeterminate
                  rounded
                  height="6"
              ></v-progress-linear>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                v-if="indexingDone"
                variant="text"
                @click="indexDialog = false">
              Close
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
          v-model="renameDialog"
          max-width="400"
          persistent
          @keydown.esc="closeRenameDialog">
        <v-card v-if="renameDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2" icon="mdi-pencil"/>
            Rename feature layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent="() => {}" ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                        variant="underlined"
                        autofocus
                        v-model="renamedTable"
                        :rules="renamedTableRules"
                        label="Name"
                        required
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                :disabled="renaming"
                variant="text"
                @click="renameDialog = false">
              Cancel
            </v-btn>
            <v-btn
                :loading="renaming"
                :disabled="!renameValid"
                color="primary"
                variant="text"
                @click="rename">
              Rename
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
          v-model="copyDialog"
          max-width="400"
          persistent
          @keydown.esc="closeCopyDialog">
        <v-card v-if="copyDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2" icon="mdi-content-copy"/>
            Copy feature layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent="() => {}" ref="copyForm" v-model="copyValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                        variant="underlined"
                        autofocus
                        v-model="copiedTable"
                        :rules="copiedTableRules"
                        label="Name"
                        required
                    ></v-text-field>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                :disabled="copying"
                variant="text"
                @click="copyDialog = false">
              Cancel
            </v-btn>
            <v-btn
                :loading="copying"
                :disabled="!copyValid"
                color="primary"
                variant="text"
                @click="copy">
              Copy
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
          v-model="deleteDialog"
          max-width="400"
          persistent
          @keydown.esc="closeDeleteDialog">
        <v-card v-if="deleteDialog">
          <v-card-title>
            <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
            Delete feature layer
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete the <b>{{ tableName }}</b> feature layer from the
            <b>{{ geopackage.name }}</b> GeoPackage? This action can't be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                :disabled="deleting"
                variant="text"
                @click="deleteDialog = false">
              Cancel
            </v-btn>
            <v-btn
                :loading="deleting"
                color="warning"
                variant="text"
                @click="deleteTable">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters class="pl-3 pt-3 pr-3 background" justify="center">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn variant="text" icon @click="zoomToLayer" color="whitesmoke">
              <v-img v-if="project.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
              <v-img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
            <span class="ml-2" style="vertical-align: middle;">Feature layer</span>
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="showRenameDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-pencil"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Rename
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="showCopyDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-content-copy"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Copy
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="styleEditorVisible = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-palette"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Style
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-trash-can"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Delete
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover v-if="!indexed">
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="indexTable">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-speedometer"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Index
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <v-col>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                GeoPackage
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ geopackage.name }}
              </p>
            </v-col>
            <v-spacer/>
            <v-col cols="4" style="margin-right: -23px;">
              <v-switch color="primary" :style="{marginTop: '-16px'}" dense v-model="visible" hide-details>
                <template v-slot:prepend>
                  <span class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginTop: '2px !important'}">Enable</span>
                </template>
              </v-switch>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Features
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ featureCount }}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <v-btn class="btn-background" @click.stop="showFeatureTable" :disabled="featureCount === 0" prepend-icon="mdi-table-eye">
                  View features
                </v-btn>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Description
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ description }}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <feature-layer-fields :id="geopackage.id" is-geo-package :project-id="project.id" :project="project" :table-name="tableName" :object="geopackage" :field-clicked="showFieldManagementView"></feature-layer-fields>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import StyleEditor from '../StyleEditor/StyleEditor.vue'
import EventBus from '../../lib/vue/EventBus'
import { zoomToGeoPackageTable } from '../../lib/leaflet/map/ZoomUtilities.js'
import FeatureView from '../Common/FeatureView.vue'
import FeatureLayerField from '../Common/GeoPackageFeatureLayer/FeatureLayerField.vue'
import FeatureLayerFields from '../Common/GeoPackageFeatureLayer/FeatureLayerFields.vue'
import {
  copyGeoPackageTable, deleteGeoPackageTable, renameGeoPackageTable,
  setGeoPackageFeatureTableVisible, updateFeatureTable,
  updateGeoPackageFeatureTableColumnOrder
} from '../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    project: Object,
    geopackage: Object,
    tableName: String,
    back: Function,
    renamed: Function,
    displayFeature: Object
  },
  components: {
    FeatureLayerField,
    StyleEditor,
    FeatureLayerFields,
    FeatureView
  },
  created () {
    let _this = this
    this.loading = true
    window.mapcache.hasStyleExtension(this.geopackage.path, this.tableName).then(function (hasStyleExtension) {
      _this.hasStyleExtension = hasStyleExtension
      _this.loading = false
    })
  },
  data () {
    return {
      styleEditorVisible: false,
      showFeatureLayerField: false,
      featureLayerField: null,
      indexDialog: false,
      indexingDone: false,
      indexMessage: 'Indexing started',
      loading: true,
      hasStyleExtension: false,
      deleteDialog: false,
      renameValid: false,
      renameDialog: false,
      renamedTable: this.tableName,
      renamedTableRules: [
        v => !!v || 'Layer name is required',
        v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name already exists'
      ],
      copyDialog: false,
      copyValid: false,
      copiedTable: this.tableName + '_copy',
      copiedTableRules: [
        v => !!v || 'Layer name is required',
        v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name already exists'
      ],
      renaming: false,
      deleting: false,
      copying: false,
      shownFeatureData: null,
      featureLayerColumnNames: []
    }
  },
  computed: {
    visible: {
      get () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].visible : false
      },
      set (value) {
        setGeoPackageFeatureTableVisible(this.project.id, this.geopackage.id, this.tableName, value)
      }
    },
    indexed () {
      return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].indexed : true
    },
    featureCount () {
      return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].featureCount : 0
    },
    description () {
      return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].description : ''
    },
    styleKey () {
      return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].styleKey : 0
    }
  },
  methods: {
    hideFeature () {
      EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE)
    },
    closeRenameDialog () {
      if (!this.renaming) {
        this.renameDialog = false
      }
    },
    closeDeleteDialog () {
      if (!this.deleting) {
        this.deleteDialog = false
      }
    },
    closeCopyDialog () {
      if (!this.copying) {
        this.copyDialog = false
      }
    },
    rename () {
      this.renamed(this.renamedTable)
      this.copiedTable = this.renamedTable + '_copy'
      this.renaming = true
      renameGeoPackageTable(this.project.id, this.geopackage.id, this.geopackage.path, this.tableName, this.renamedTable, 'feature').then(() => {
        this.renaming = false
        this.$nextTick(() => {
          this.renameDialog = false
        })
      })
    },
    copy () {
      this.copying = true
      copyGeoPackageTable(this.project.id, this.geopackage.id, this.geopackage.path, this.tableName, this.copiedTable, 'feature').then(() => {
        this.$nextTick(() => {
          EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Feature layer copied', 'primary')
        })
      }).finally(() => {
        this.copying = false
        this.copyDialog = false
      })
    },
    deleteTable () {
      this.deleting = true
      deleteGeoPackageTable(this.project.id, this.geopackage.id, this.geopackage.path, this.tableName, 'feature').then(() => {
        this.deleting = false
        this.$nextTick(() => {
          this.deleteDialog = false
        })
      })
    },
    showRenameDialog () {
      this.renameValid = false
      this.renameDialog = true
      this.$nextTick(() => {
        this.$refs.renameForm.validate()
      })
    },
    showCopyDialog () {
      this.copyValid = false
      this.copyDialog = true
      this.$nextTick(() => {
        this.$refs.copyForm.validate()
      })
    },
    indexTable () {
      let _this = this
      this.indexingDone = false
      this.indexMessage = 'Indexing started'
      this.indexDialog = true
      setTimeout(function () {
        _this.indexMessage = 'Indexing...'
        window.mapcache.indexFeatureTable(_this.geopackage.path, _this.tableName, true).then(function () {
          setTimeout(function () {
            _this.indexingDone = true
            _this.indexMessage = 'Indexing completed'
            updateFeatureTable(_this.project.id, _this.geopackage.id, _this.tableName)
          }, 2000)
        })
      }, 1000)
    },
    hideStyleEditor () {
      this.styleEditorVisible = false
    },
    showFieldManagementView (field, columnNames) {
      this.featureLayerField = field
      this.showFeatureLayerField = true
      this.featureLayerColumnNames = columnNames
    },
    hideFeatureLayerField () {
      this.showFeatureLayerField = false
      this.featureLayerField = null
    },
    featureLayerFieldRenamed (name) {
      const index = this.featureLayerColumnNames.indexOf(this.featureLayerField.name)
      this.featureLayerColumnNames.splice(index, 1, name)
      this.featureLayerField.name = name
    },
    zoomToLayer () {
      zoomToGeoPackageTable(this.geopackage, this.tableName)
    },
    showFeatureTable () {
      const payload = {
        id: this.geopackage.id,
        tableName: this.tableName,
        isGeoPackage: true
      }
      EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE_TABLE, payload)
    },
    updateColumnOrder (evt) {
      document.body.style.cursor = 'default'
      const headersTmp = this.columnOrder.slice()
      const oldIndex = evt.oldIndex
      let newIndex = Math.max(0, evt.newIndex)
      if (newIndex >= headersTmp.length) {
        let k = newIndex - headersTmp.length + 1
        while (k--) {
          headersTmp.push(undefined)
        }
      }
      headersTmp.splice(newIndex, 0, headersTmp.splice(oldIndex, 1)[0])
      updateGeoPackageFeatureTableColumnOrder(this.project.id, this.geopackage.id, true, this.tableName, headersTmp)
    },
  },
  watch: {
    styleKey: {
      async handler (styleKey, oldValue) {
        if (styleKey !== oldValue) {
          this.loading = true
          this.hasStyleExtension = await window.mapcache.hasStyleExtension(this.geopackage.path, this.tableName)
          this.loading = false
        }
      },
      deep: true
    },
    displayFeature: {
      handler (newVal) {
        if (newVal != null) {
          this.styleEditorVisible = false
          this.showFeatureLayerField = false
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.btn-background {
  background-color: rgb(var(--v-theme-main_active_background)) !important;
}
</style>
