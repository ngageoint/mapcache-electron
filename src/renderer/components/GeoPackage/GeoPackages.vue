<template>
  <v-sheet>
    <v-sheet v-if="selectedGeoPackage !== null && selectedGeoPackage !== undefined">
      <geo-package :project="project" :geopackage="selectedGeoPackage" :back="deselectGeoPackage"></geo-package>
    </v-sheet>
    <v-sheet v-else>
      <v-toolbar
        dark
        color="primary"
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
                  <h5 class="align-self-center"style="color: #9A9E9E">No GeoPackage files found</h5>
                </v-col>
              </v-row>
              <v-row class="pa-0" no-gutters>
                <v-col class="pa-0 align-center">
                  <h5 class="align-self-center" style="color: #3b779a">Get Started</h5>
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
              @click="importGeoPackage"
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
              @click="createNewGeoPackage"
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
  import { mapActions } from 'vuex'
  import jetpack from 'fs-jetpack'
  import { remote } from 'electron'
  import _ from 'lodash'

  import GeoPackage from './GeoPackage'
  import GeoPackageList from './GeoPackageList'

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
      ...mapActions({
        addGeoPackage: 'Projects/addGeoPackage'
      }),
      createNewGeoPackage () {
        this.fab = false
        const geopackages = this.geopackages
        remote.dialog.showSaveDialog((filePath) => {
          if (!_.isNil(filePath)) {
            if (!filePath.endsWith('.gpkg')) {
              filePath = filePath + '.gpkg'
            }
            const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === filePath) !== -1
            if (!exists) {
              this.addGeoPackage({projectId: this.project.id, filePath: filePath})
            } else {
              this.addGeoPackageError = true
            }
          }
        })
      },
      importGeoPackage () {
        const geopackages = this.geopackages
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'GeoPackage Extensions',
              extensions: ['gpkg', 'geopackage']
            }
          ],
          properties: ['openFile']
        }, (files) => {
          if (files) {
            let fileInfo = jetpack.inspect(files[0], {
              times: true,
              absolutePath: true
            })
            const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === fileInfo.absolutePath) !== -1
            if (!exists) {
              this.addGeoPackage({projectId: this.project.id, filePath: fileInfo.absolutePath})
            } else {
              this.addGeoPackageError = true
            }
          }
        })
        this.fab = false
      },
      geopackageSelected (geopackageId) {
        this.selectedGeoPackage = this.geopackages[geopackageId]
      },
      deselectGeoPackage () {
        this.selectedGeoPackage = null
      }
    },
    watch: {
      geopackages: {
        handler (newGeoPackages, oldGeoPackages) {
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
    background-color: white;
    padding: 16px;
    height: 72px;
    width: 384px;
    left: 64px;
    bottom: 8px;
  }
  .alert-position {
    position: absolute;
    margin-left: auto;
    margin-right: auto;
    left: 15rem;
    right: 15rem;
    text-align: center;
    top: 16px;
  }
</style>
