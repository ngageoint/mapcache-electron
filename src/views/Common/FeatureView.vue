<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
        dark
        flat
        class="sticky-toolbar"
    >
      <v-btn icon @click="closeView"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title>Feature</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-dialog
          v-model="removeDialog"
          max-width="400"
          persistent
          @keydown.esc="removeDialog = false">
        <v-card v-if="removeDialog">
          <v-card-title>
            <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
            Delete feature
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete this feature? This action can't be undone.
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
                @click="removeFeature">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="assignStyleDialog" max-width="400" persistent scrollable @keydown.esc="closeStyleAssignment">
        <edit-feature-style-assignment
            v-if="styleAssignment"
            :assignment="styleAssignment"
            :table-name="tableName"
            :project-id="projectId"
            :id="id"
            :is-geo-package="isGeoPackage"
            :close="closeStyleAssignment"/>
      </v-dialog>
      <v-dialog v-model="showFeatureMediaAttachments" max-width="600" persistent @keydown.esc="closeFeatureMediaAttachments" :fullscreen="attachmentDialogFullScreen" style="overflow-y: hidden;">
        <media-attachments
            v-if="showFeatureMediaAttachments"
            :tableName="tableName"
            :project-id="projectId"
            :geopackage-path="geopackagePath"
            :id="id"
            :feature-id="featureId"
            :is-geo-package="isGeoPackage"
            :back="closeFeatureMediaAttachments"
            :toggle-full-screen="toggleAttachmentDialogFullScreen"
            :is-full-screen="attachmentDialogFullScreen"/>
      </v-dialog>
      <v-card flat tile :class="editing ? 'ma-0 pa-0 fill-height' : 'ma-0 pa-0 d-flex flex-column'" style="overflow-y: auto">
        <v-card-text class="ma-0 pa-0">
          <v-row class="pb-2"  v-if="featureImageObjectUrl" no-gutters>
            <v-img class="clickable" @click="showFeatureMediaAttachments = true" :src="featureImageObjectUrl" height="200" max-height="200"/>
          </v-row>
          <v-row no-gutters class="pl-4 pr-4 pt-2">
            <v-col>
              <v-row class="pb-2" no-gutters justify="space-between">
                <v-col>
                  <v-row no-gutters align-content="center" class="align-center">
                    <v-btn @click="zoomTo" class="mr-2" icon v-if="featureViewData.style.style || featureViewData.style.icon">
                      <geometry-style-svg v-if="featureViewData.style.style" :color="featureViewData.style.style.color" :fill-color="featureViewData.style.style.fillColor" :fill-opacity="featureViewData.style.style.fillOpacity" :geometry-type="featureViewData.geometryTypeCode"/>
                      <img v-else-if="featureViewData.style.icon" class="icon-box" style="width: 25px; height: 25px;" :src="featureViewData.style.icon.url"/>
                    </v-btn>
                    <v-col>
                      <p class="regular--text" :style="{fontSize: '16px', fontWeight: '500', marginBottom: '0px'}">
                        {{name}}
                      </p>
                      <p v-if="isGeoPackage" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                        {{tableName}}
                      </p>
                    </v-col>
                  </v-row>
                </v-col>
              </v-row>
              <v-row no-gutters class="mt-4 mb-4" justify="center" align-content="center">
                <v-hover :disabled="editing">
                  <template v-slot="{ hover }">
                    <v-card :disabled="editing" class="ma-0 pa-0 mr-1 clickable card-button" :elevation="editing ? 0 : (hover ? 4 : 1)" @click.stop="enableEdit">
                      <v-card-text class="pa-2">
                        <v-row no-gutters align-content="center" justify="center">
                          <v-icon small>{{mdiPencil}}</v-icon>
                        </v-row>
                        <v-row no-gutters align-content="center" justify="center">
                          Edit
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </template>
                </v-hover>
                <v-hover :disabled="editing">
                  <template v-slot="{ hover }">
                    <v-card :disabled="editing" class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="editing ? 0 : (hover ? 4 : 1)" @click.stop="showStyleAssignment">
                      <v-card-text class="pa-2">
                        <v-row no-gutters align-content="center" justify="center">
                          <v-icon small>{{mdiPalette}}</v-icon>
                        </v-row>
                        <v-row no-gutters align-content="center" justify="center">
                          Style
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </template>
                </v-hover>
                <v-hover :disabled="editing">
                  <template v-slot="{ hover }">
                    <v-card :disabled="editing" class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="editing ? 0 : (hover ? 4 : 1)" @click.stop="editFeatureMediaAttachments">
                      <v-card-text class="pa-2">
                        <v-row no-gutters align-content="center" justify="center">
                          <v-icon small>{{mdiPaperclip}}</v-icon>
                        </v-row>
                        <v-row no-gutters align-content="center" justify="center">
                          Attach
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </template>
                </v-hover>
                <v-hover :disabled="editing">
                  <template v-slot="{ hover }">
                    <v-card :disabled="editing" class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="editing ? 0 : (hover ? 4 : 1)" @click.stop="showDeleteConfirmation">
                      <v-card-text class="pa-2">
                        <v-row no-gutters align-content="center" justify="center">
                          <v-icon small>{{mdiTrashCan}}</v-icon>
                        </v-row>
                        <v-row no-gutters align-content="center" justify="center">
                          Delete
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </template>
                </v-hover>
              </v-row>
            </v-col>
          </v-row>
          <v-row v-if="!editing" no-gutters class="pl-4 pr-4 pt-2 detail-bg">
            <v-col>
              <v-row no-gutters :key="'editor-' + column.name" v-for="(column) in featureViewData.editableColumns">
                <v-col v-if="featureViewData.feature.properties[column.name] != null" class="pb-2">
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    {{ column.name }}
                  </p>
                  <p class="regular--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    <span v-if="column.dataType === TEXT">{{featureViewData.feature.properties[column.name]}}</span>
                    <span v-else-if="column.dataType === BOOLEAN">{{featureViewData.feature.properties[column.name] === 1 ? 'true' : 'false'}}</span>
                    <span v-else-if="column.dataType === DATE || column.dataType === DATETIME">{{getHumanReadableDate(featureViewData.feature.properties[column.name])}}</span>
                    <span v-else>{{featureViewData.feature.properties[column.name]}}</span>
                  </p>
                </v-col>
              </v-row>
              <v-row v-if="!featureViewData.hasSetFields" no-gutters>
                No fields set.
              </v-row>
            </v-col>
          </v-row>
          <v-row v-else no-gutters class="pl-4 pr-4 pt-2">
            <v-col>
              <span v-if="featureViewData.editableColumns.length === 0">
                  No fields to edit.
                </span>
              <v-form v-on:submit.prevent v-model="formValid">
                <v-list style="width: 100%">
                  <v-list-item :key="'editor-' + column.name" v-for="(column, index) in featureViewData.editableColumns" class="ma-0 pa-0">
                    <v-list-item-content class="ma-0 pa-0">
                      <feature-editor-column :id="column.name + '_' + index" v-bind="column" :update-column-property="updateEditableColumn" :index="index"></feature-editor-column>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-form>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-sheet>
    <v-divider v-if="editing"/>
    <v-footer class="background" v-if="editing">
      <v-spacer/>
      <v-btn v-if="editing" @click="disableEdit" text>Cancel</v-btn>
      <v-btn v-if="editing" @click="saveChanges" text color="primary">Save</v-btn>
    </v-footer>
  </v-sheet>
</template>

<script>
import {mdiCalendar, mdiClock, mdiChevronLeft, mdiChevronRight, mdiTrashCan, mdiPencil, mdiMagnify, mdiCancel, mdiContentSave, mdiPaperclip, mdiPalette, mdiContentCopy} from '@mdi/js'
import cloneDeep from 'lodash/cloneDeep'
import FeatureEditorColumn from './FeatureEditorColumn'
import GeometryStyleSvg from './GeometryStyleSvg'
import {zoomToGeoPackageFeature} from '../../lib/leaflet/map/ZoomUtilities'
import EditFeatureStyleAssignment from '../StyleEditor/EditFeatureStyleAssignment'
import MediaAttachments from './MediaAttachments'
import EventBus from '../../lib/vue/EventBus'

export default {
  components: {MediaAttachments, EditFeatureStyleAssignment, GeometryStyleSvg, FeatureEditorColumn},
  props: {
      projectId: String,
      name: String,
      geopackagePath: String,
      id: String,
      object: Object,
      tableName: String,
      featureId: Number,
      back: Function,
      isGeoPackage: {
        type: Boolean,
        default: false
      },
      saveNewFeature: Function
    },
    data () {
      return {
        mdiContentCopy: mdiContentCopy,
        mdiPalette: mdiPalette,
        mdiPaperclip: mdiPaperclip,
        mdiContentSave: mdiContentSave,
        mdiCancel: mdiCancel,
        mdiMagnify: mdiMagnify,
        mdiPencil: mdiPencil,
        mdiTrashCan: mdiTrashCan,
        mdiCalendar: mdiCalendar,
        mdiClock: mdiClock,
        mdiChevronLeft: mdiChevronLeft,
        mdiChevronRight: mdiChevronRight,
        TEXT: window.mapcache.GeoPackageDataType.TEXT,
        FLOAT: window.mapcache.GeoPackageDataType.FLOAT,
        BOOLEAN: window.mapcache.GeoPackageDataType.BOOLEAN,
        DATETIME: window.mapcache.GeoPackageDataType.DATETIME,
        DATE: window.mapcache.GeoPackageDataType.DATE,
        dateMenu: false,
        date: null,
        formValid: false,
        failedToSaveErrorMessage: '',
        failedToSaveSnackBar: false,
        columnsToAdd: [],
        editing: false,
        geometryTypeCode: this.feature != null ? window.mapcache.GeometryType.fromName(this.feature.geometry.type.toUpperCase()) : 0,
        showAttachmentDialog: false,
        removeDialog: false,
        assignStyleDialog: false,
        styleAssignment: null,
        attachmentDialogFullScreen: false,
        showFeatureMediaAttachments: false,
        attachments: []
      }
    },
    asyncComputed: {
      featureViewData: {
        async get () {
          const featureViewData = await window.mapcache.getFeatureViewData(this.object.geopackageFilePath ? this.object.geopackageFilePath : this.object.path, this.tableName, this.featureId)
          featureViewData.hasSetFields = featureViewData.editableColumns != null ? featureViewData.editableColumns.filter(column => featureViewData.feature.properties[column.name] != null).length > 0 : false
          if (this.isGeoPackage &&
              this.object.tables.features[this.tableName] != null &&
              this.object.tables.features[this.tableName].columnOrder != null &&
              featureViewData.editableColumns != null &&
              featureViewData.editableColumns.length > 0) {
            const columnOrder = this.object.tables.features[this.tableName].columnOrder
            featureViewData.editableColumns.sort((a, b) => {
              return columnOrder.indexOf(a.lowerCaseName) < columnOrder.indexOf(b.lowerCaseName) ? -1 : 1
            })
          }

          return featureViewData
        },
        default: {
          editableColumns: [],
          feature: {
            properties: {}
          },
          style: {
            style: null,
            icon: null
          }
        }
      },
      featureImageObjectUrl: {
        async get () {
          return await window.mapcache.getFeatureImageObjectUrl(this.object.geopackageFilePath ? this.object.geopackageFilePath : this.object.path, this.tableName, this.featureId)
        },
        default: null
      }
    },
    watch: {
      featureId: {
        handler () {
          this.dateMenu = false
          this.date = null
          this.formValid = false
          this.failedToSaveErrorMessage = ''
          this.failedToSaveSnackBar = false
          this.columnsToAdd = []
          this.editing = false
          this.disableEdit()
        }
      },
      object: {
        handler () {
          window.mapcache.featureExists(this.object.geopackageFilePath ? this.object.geopackageFilePath : this.object.path, this.tableName, this.featureId).then(exists => {
            if (!exists) {
              EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE)
            }
          })
        },
        deep: true
      }
    },
    methods: {
      closeView () {
        this.disableEdit()
        this.back()
      },
      showDeleteConfirmation () {
        this.removeDialog = true
      },
      cancelRemove () {
        this.removeDialog = false
      },
      removeFeature () {
        if (this.isGeoPackage) {
          window.mapcache.removeFeatureFromGeopackage({projectId: this.projectId, geopackageId: this.id, tableName: this.tableName, featureId: this.featureId})
        } else {
          window.mapcache.removeFeatureFromDataSource({projectId: this.projectId, sourceId: this.id, featureId: this.featureId})
        }
        this.removeDialog = false
        EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE)
      },
      async showStyleAssignment () {
        this.styleAssignment = await window.mapcache.getStyleItemsForFeature(this.geopackagePath, this.tableName, this.featureId)
        this.assignStyleDialog = true
      },
      closeStyleAssignment () {
        this.assignStyleDialog = false
        this.styleAssignment = null
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
      editFeatureMediaAttachments () {
        this.showFeatureMediaAttachments = true
      },
      zoomTo () {
        zoomToGeoPackageFeature(this.geopackagePath, this.tableName, this.featureId)
      },
      enableEdit () {
        this.$nextTick(() => {
          this.editing = true
          const feature = cloneDeep(this.featureViewData.feature)
          EventBus.$emit(EventBus.EventTypes.EDIT_FEATURE_GEOMETRY, feature)
          this.zoomTo()
        })
      },
      disableEdit () {
        this.editing = false
        EventBus.$emit(EventBus.EventTypes.STOP_EDITING_FEATURE_GEOMETRY)
      },
      async saveChanges () {
        try {
          this.editing = false
          const feature = await new Promise (resolve => {
            EventBus.$once(EventBus.EventTypes.EDITED_FEATURE_GEOMETRY, (feature) => {
              resolve(feature)
            })
            EventBus.$emit(EventBus.EventTypes.STOP_EDITING_FEATURE_GEOMETRY)
          })
          const result = await window.mapcache.saveGeoPackageEditedFeature(this.geopackagePath, this.tableName, this.featureId, this.featureViewData.editableColumns, feature.geometry)
          if (result.changes > 0) {
            if (this.isGeoPackage) {
              window.mapcache.synchronizeGeoPackage({projectId: this.projectId, geopackageId: this.id})
            } else {
              window.mapcache.synchronizeDataSource({projectId: this.projectId, sourceId: this.id})
            }
            window.mapcache.updateStyleKey(this.projectId, this.id, this.tableName, this.isGeoPackage, false)
          } else if (result.error) {
            this.failedToSaveErrorMessage = result.error
            this.failedToSaveSnackBar = true
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to save changes.')
        }
      },
      getHumanReadableDate (dateString) {
        if (dateString != null) {
          const options = { year: 'numeric', month: 'long', day: 'numeric' }
          return new Date(dateString).toLocaleTimeString(undefined, options)
        } else {
          return ''
        }
      },
      updateEditableColumn (value, property, index) {
        this.featureViewData.editableColumns[index][property] = value
      }
    },
    beforeDestroy () {
      EventBus.$off(EventBus.EventTypes.EDITED_FEATURE_GEOMETRY)
    }
  }
</script>

<style scoped>

</style>
