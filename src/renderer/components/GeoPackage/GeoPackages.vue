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
      <v-layout row justify-center>
        <v-dialog v-model="addGeoPackageDialog" max-width="300" persistent>
          <v-card class="text-center">
            <v-card-title class="headline">
              <v-container class="pa-0 ma-0">
                <v-row no-gutters>
                  <v-col class="align-center">
                    New GeoPackage
                  </v-col>
                </v-row>
                <v-row no-gutters>
                  <v-divider class="mt-2 mb-2"/>
                </v-row>
              </v-container>
            </v-card-title>
            <v-card-text>
              <v-hover>
                <template v-slot="{ hover }">
                  <v-card class="text-left mb-4 clickable" :elevation="hover ? 4 : 1" @click.stop="createNewGeoPackage">
                    <v-card-text>
                      <v-container style="padding: 4px">
                        <v-row>
                          <v-col cols="2">
                            <v-icon color="black">mdi-plus-box-outline</v-icon>
                          </v-col>
                          <v-col cols="8">
                            Create New
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>
                  </v-card>
                </template>
              </v-hover>
              <v-hover>
                <template v-slot="{ hover }">
                  <v-card class="text-left mt-4 clickable" :elevation="hover ? 4 : 1" @click.stop="importGeoPackage">
                    <v-card-text>
                      <v-container style="padding: 4px">
                        <v-row>
                          <v-col cols="2">
                            <v-icon color="black">mdi-file-document-outline</v-icon>
                          </v-col>
                          <v-col cols="8">
                            Import from File
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>
                  </v-card>
                </template>
              </v-hover>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                text
                @click="addGeoPackageDialog = false">
                cancel
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-layout>
      <div>
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
        <v-btn
          class="fab-position"
          fab
          color="primary"
          title="Add geopackage"
          @click.stop="addGeoPackageDialog = true">
          <img style="color: white;" src="../../assets/new-geopackage.svg" width="20px" height="20px">
        </v-btn>
        <v-alert class="alert-position" dismissible v-model="addGeoPackageError" type="error">
          GeoPackage already exists in project.
        </v-alert>
      </div>
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
    addGeoPackageDialog: false,
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
        this.addGeoPackageDialog = false
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
        this.addGeoPackageDialog = false
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
  .fab-position {
    position: absolute;
    left: 384px;
    bottom: 16px;
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
