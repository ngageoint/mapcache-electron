<template>
  <v-sheet>
    <v-sheet v-if="selectedGeoPackage !== null && selectedGeoPackage !== undefined">
      <geo-package :project="project" :geopackage="selectedGeoPackage" :back="deselectGeoPackage"></geo-package>
    </v-sheet>
    <v-sheet v-else>
      <v-toolbar
        dark
        color="main"
        flat
        class="sticky-toolbar"
      >
        <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
        <v-toolbar-title>GeoPackages</v-toolbar-title>
      </v-toolbar>
      <v-sheet>
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
                <v-col class="pa-0 align-center">
                  <h5 class="align-self-center primary--text">Get Started</h5>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card>
        <v-alert class="alert-position" dismissible v-model="addGeoPackageError" type="error">
          GeoPackage already exists in project.
        </v-alert>
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
                <img style="color: white;" src="../../assets/new-geopackage.svg" width="20px" height="20px">
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
              <v-icon>mdi-file-document-outline</v-icon>
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
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>New GeoPackage</span>
        </v-tooltip>
      </v-speed-dial>
    </v-sheet>
  </v-sheet>
</template>

<script>
  import jetpack from 'fs-jetpack'
  import { remote } from 'electron'
  import _ from 'lodash'

  import GeoPackage from './GeoPackage'
  import GeoPackageList from './GeoPackageList'
  import ActionUtilities from '../../lib/ActionUtilities'

  let options = {
    fab: false,
    addGeoPackageError: false,
    selectedGeoPackage: null
  }

  export default {
    props: {
      geopackages: Object,
      project: Object,
      back: Function
    },
    data () {
      return options
    },
    components: {
      GeoPackageList,
      GeoPackage
    },
    methods: {
      createNewGeoPackage () {
        this.fab = false
        const geopackages = this.geopackages
        remote.dialog.showSaveDialog().then(({canceled, filePath}) => {
          if (!canceled && !_.isNil(filePath)) {
            if (!filePath.endsWith('.gpkg')) {
              filePath = filePath + '.gpkg'
            }
            const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === filePath) !== -1
            if (!exists) {
              ActionUtilities.addGeoPackage({projectId: this.project.id, filePath: filePath})
            } else {
              this.addGeoPackageError = true
            }
          }
        })
      },
      importGeoPackage () {
        this.fab = false
        const geopackages = this.geopackages
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'GeoPackage Extensions',
              extensions: ['gpkg', 'geopackage']
            }
          ],
          properties: ['openFile']
        }).then((result) => {
          if (result.filePaths && !_.isEmpty(result.filePaths)) {
            let fileInfo = jetpack.inspect(result.filePaths[0], {
              times: true,
              absolutePath: true
            })
            const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === fileInfo.absolutePath) !== -1
            if (!exists) {
              ActionUtilities.addGeoPackage({projectId: this.project.id, filePath: fileInfo.absolutePath})
            } else {
              this.addGeoPackageError = true
            }
          }
        })
      },
      geopackageSelected (geopackageId) {
        this.selectedGeoPackage = this.geopackages[geopackageId]
        ActionUtilities.setActiveGeoPackage({projectId: this.project.id, geopackageId: geopackageId})
      },
      deselectGeoPackage () {
        this.selectedGeoPackage = null
        ActionUtilities.setActiveGeoPackage({projectId: this.project.id, geopackageId: null})
      }
    },
    watch: {
      geopackages: {
        handler (newGeoPackages) {
          if (!_.isNil(this.selectedGeoPackage)) {
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