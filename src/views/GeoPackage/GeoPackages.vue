<template>
  <geo-package v-if="selectedGeoPackage !== null && selectedGeoPackage !== undefined" :project="project" :geopackage="selectedGeoPackage" :back="deselectGeoPackage"></geo-package>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      dark
      color="main"
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title>GeoPackages</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <geo-package-list :geopackages="geopackages" :projectId="project.id" :geopackage-selected="geopackageSelected"></geo-package-list>
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
      <v-alert class="alert-position" dismissible v-model="addGeoPackageError" type="error">
        GeoPackage already exists in project.
      </v-alert>
      <v-dialog
        v-model="geopackageExistsDialog"
        max-width="400"
        persistent
        @keydown.esc="geopackageExistsDialog = false">
        <v-card v-if="geopackageExistsDialog">
          <v-card-title>
            <v-icon color="orange" class="pr-2">{{mdiAlert}}</v-icon>
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
    <v-speed-dial
      class="fab-position"
      v-model="fab"
      transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-tooltip right :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              fab
              color="primary"
              v-bind="attrs"
              v-on="on">
              <img style="color: white;" src="/images/new-geopackage.svg" width="20px" height="20px">
            </v-btn>
          </template>
          <span>Add GeoPackage</span>
        </v-tooltip>
      </template>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            fab
            small
            color="accent"
            @click.stop="importGeoPackage"
            v-bind="attrs"
            v-on="on">
            <v-icon>{{mdiFileDocumentOutline}}</v-icon>
          </v-btn>
        </template>
        <span>Import from file</span>
      </v-tooltip>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            fab
            small
            color="accent"
            @click.stop="createNewGeoPackage"
            v-bind="attrs"
            v-on="on">
            <v-icon>{{mdiPlus}}</v-icon>
          </v-btn>
        </template>
        <span>New GeoPackage</span>
      </v-tooltip>
    </v-speed-dial>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'

import GeoPackage from './GeoPackage'
import GeoPackageList from './GeoPackageList'
import {mdiAlert, mdiChevronLeft, mdiFileDocumentOutline, mdiPlus} from '@mdi/js'

export default {
    props: {
      geopackages: Object,
      project: Object,
      back: Function
    },
    data () {
      return {
        mdiAlert: mdiAlert,
        mdiFileDocumentOutline: mdiFileDocumentOutline,
        mdiPlus: mdiPlus,
        mdiChevronLeft: mdiChevronLeft,
        fab: false,
        addGeoPackageError: false,
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
        }).then(({canceled, filePath}) => {
          if (!canceled && !isNil(filePath)) {
            if (!filePath.endsWith('.gpkg')) {
              filePath = filePath + '.gpkg'
            }
            if (window.mapcache.fileExists(filePath)) {
              this.geopackageExistsDialog = true
            } else {
              window.mapcache.addGeoPackage({projectId: this.project.id, filePath: filePath})
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
              window.mapcache.addGeoPackage({projectId: this.project.id, filePath: fileInfo.absolutePath})
            } else {
              // exists in app, show error
              this.addGeoPackageError = true
            }
          }
        })
      },
      geopackageSelected (geopackageId) {
        this.selectedGeoPackage = this.geopackages[geopackageId]
        window.mapcache.setActiveGeoPackage({projectId: this.project.id, geopackageId: geopackageId})
      },
      deselectGeoPackage () {
        this.selectedGeoPackage = null
        window.mapcache.setActiveGeoPackage({projectId: this.project.id, geopackageId: null})
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
</style>
