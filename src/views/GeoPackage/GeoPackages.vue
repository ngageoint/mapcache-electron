<template>
  <geo-package v-if="selectedGeoPackage !== null && selectedGeoPackage !== undefined" :project="project"
               :geopackage="selectedGeoPackage" :display-feature="displayFeature" :back="deselectGeoPackage"
               :allow-notifications="allowNotifications"></geo-package>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
      <v-toolbar-title>GeoPackages</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <geo-package-list :geopackages="geopackages" :projectId="project.id"
                        :geopackage-selected="geopackageSelected"></geo-package-list>
      <v-card class="card-position" v-if="Object.keys(geopackages).length === 0">
        <v-row no-gutters justify="space-between" align="end">
          <v-col>
            <v-row class="pa-0" no-gutters>
              <v-col class="pa-0 align-center">
                <h5 class="align-self-center">No GeoPackage files found</h5>
              </v-col>
            </v-row>
            <v-row class="pa-0" no-gutters>
              <h5 class="align-self-center primary--text fake-link" @click="showFab">Get started</h5>
            </v-row>
          </v-col>
        </v-row>
      </v-card>
      <v-dialog
          v-model="geopackageExistsDialog"
          max-width="400"
          persistent
          @keydown.esc="geopackageExistsDialog = false">
        <v-card v-if="geopackageExistsDialog">
          <v-card-title>
            <v-icon color="orange" class="pr-2">{{ mdiAlert }}</v-icon>
            Create GeoPackage warning
          </v-card-title>
          <v-card-text>
            <v-card-subtitle>
              The name of the geopackage you tried to create already exists. Would you like try another file name?
            </v-card-subtitle>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                text
                @click="geopackageExistsDialog = false">
              Cancel
            </v-btn>
            <v-btn
                color="primary"
                text
                @click="createNewGeoPackage">
              OK
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-sheet>
    <v-tooltip location="end" text="Add GeoPackage">
      <template v-slot:activator="{ props }">
        <v-btn
            class="fab-container"
            v-bind="props"
            icon
            color="primary"
            @click="fab = !fab">
          <template v-slot:default>
            <v-img style="color: white;" src="/images/new-geopackage.svg" width="20px" height="20px"/>
          </template>
        </v-btn>
      </template>
    </v-tooltip>

<!--    <v-speed-dial-->
<!--        class="fab-position"-->
<!--        v-model="fab"-->
<!--        transition="slide-y-reverse-transition"-->
<!--    >-->
<!--      <template v-slot:activator>-->
<!--        <v-tooltip location="end" :disabled="!project.showToolTips">-->
<!--          <template v-slot:activator="{ props }">-->

<!--          </template>-->
<!--          <span>Add GeoPackage</span>-->
<!--        </v-tooltip>-->
<!--      </template>-->
<!--      <v-tooltip location="end" :disabled="!project.showToolTips">-->
<!--        <template v-slot:activator="{ props }">-->
<!--          <v-btn-->
<!--              icon="mdi-file-document-outline"-->
<!--              small-->
<!--              color="accent"-->
<!--              @click.stop="importGeoPackage"-->
<!--              v-bind="props">-->
<!--          </v-btn>-->
<!--        </template>-->
<!--        <span>Import from file</span>-->
<!--      </v-tooltip>-->
<!--      <v-tooltip location="end" :disabled="!project.showToolTips">-->
<!--        <template v-slot:activator="{ props }">-->
<!--          <v-btn-->
<!--              icon="mdi-plus"-->
<!--              small-->
<!--              color="accent"-->
<!--              @click.stop="createNewGeoPackage"-->
<!--              v-bind="props">-->
<!--            <v-icon>{{ mdiPlus }}</v-icon>-->
<!--          </v-btn>-->
<!--        </template>-->
<!--        <span>New GeoPackage</span>-->
<!--      </v-tooltip>-->
<!--    </v-speed-dial>-->
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import GeoPackage from './GeoPackage.vue'
import GeoPackageList from './GeoPackageList.vue'
import { mdiAlert, mdiChevronLeft, mdiFileDocumentOutline, mdiPlus } from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'
import { addGeoPackage } from '../../lib/vue/vuex/CommonActions'
import { setActiveGeoPackage } from '../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    geopackages: Object,
    project: Object,
    allowNotifications: Boolean,
    back: Function,
    displayFeature: Object
  },
  data () {
    return {
      mdiAlert: mdiAlert,
      mdiFileDocumentOutline: mdiFileDocumentOutline,
      mdiPlus: mdiPlus,
      mdiChevronLeft: mdiChevronLeft,
      fab: false,
      geopackageExistsDialog: false,
      selectedGeoPackage: null
    }
  },
  components: {
    GeoPackageList,
    GeoPackage
  },
  methods: {
    showFab (e) {
      e.preventDefault()
      e.stopPropagation()
      if (!this.fab) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.fab = true
          }, 100)
        })
      }
    },
    createNewGeoPackage () {
      this.fab = false
      this.geopackageExistsDialog = false
      window.mapcache.showSaveDialog({
        title: 'New GeoPackage'
      }).then(({ canceled, filePath }) => {
        if (!canceled && !isNil(filePath)) {
          if (!filePath.endsWith('.gpkg')) {
            filePath = filePath + '.gpkg'
          }
          if (window.mapcache.fileExists(filePath)) {
            this.geopackageExistsDialog = true
          } else {
            addGeoPackage(this.project.id, filePath).then(added => {
              if (!added) {
                // eslint-disable-next-line no-console
                console.error('Failed to import GeoPackage')
                EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Failed to import GeoPackage')
              }
            })
          }
        }
      })
    },
    importGeoPackage () {
      this.fab = false
      const geopackages = this.geopackages
      window.mapcache.showOpenDialog({
        filters: [
          {
            name: 'GeoPackage files',
            extensions: ['gpkg', 'geopackage']
          }
        ],
        properties: ['openFile']
      }).then((result) => {
        if (result.filePaths && !isEmpty(result.filePaths)) {
          let fileInfo = window.mapcache.getFileInfo(result.filePaths[0])
          const existsInApp = Object.values(geopackages).findIndex(geopackage => geopackage.path === fileInfo.absolutePath) !== -1
          if (!existsInApp) {
            addGeoPackage(this.project.id, fileInfo.absolutePath).then(added => {
              if (!added) {
                // eslint-disable-next-line no-console
                console.error('Failed to import GeoPackage')
                EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Failed to import GeoPackage')
              }
            })
          } else {
            // exists in app, show error
            EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage already exists in project')
          }
        }
      })
    },
    geopackageSelected (geopackageId) {
      this.selectedGeoPackage = this.geopackages[geopackageId]
      setActiveGeoPackage(this.project.id, geopackageId)
    },
    deselectGeoPackage () {
      this.selectedGeoPackage = null
      setActiveGeoPackage(this.project.id, null)
    }
  },
  watch: {
    geopackages: {
      handler (newGeoPackages) {
        if (!isNil(this.selectedGeoPackage)) {
          this.selectedGeoPackage = newGeoPackages[this.selectedGeoPackage.id]
        }
      },
      deep: true
    },
    project: {
      handler (newProject) {
        if (newProject.activeGeoPackage != null) {
          if (this.selectedGeoPackage == null || this.selectedGeoPackage.id !== newProject.activeGeoPackage.geopackageId) {
            this.selectedGeoPackage = newProject.geopackages[newProject.activeGeoPackage.geopackageId]
          }
        }
      },
      deep: true
    },
    displayFeature: {
      handler (newDisplayFeature) {
        if (newDisplayFeature != null && newDisplayFeature.isGeoPackage) {
          if (this.selectedGeoPackage == null || (newDisplayFeature.id != null && newDisplayFeature.id !== this.selectedGeoPackage.id)) {
            this.geopackageSelected(newDisplayFeature.id)
          }
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.card-position {
  position: absolute;
  padding: 16px;
  height: 72px;
  width: 384px;
  left: 64px;
  bottom: 8px;
}
.fab-container {
  position:fixed;
  left: 384px;
  bottom: 20px;
  cursor:pointer;
}
</style>
