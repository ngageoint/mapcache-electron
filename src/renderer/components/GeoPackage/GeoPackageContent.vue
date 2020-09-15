<template>
  <div>
    <v-layout row justify-center>
      <v-dialog v-model="addGeoPackageDialog" max-width="300">
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
                <v-card class="text-left mt-4 mb-4 clickable" :elevation="hover ? 4 : 1" @click.stop="displayURLModal">
                  <v-card-text>
                    <v-container style="padding: 4px">
                      <v-row>
                        <v-col cols="2">
                          <v-icon color="black">mdi-cloud-download-outline</v-icon>
                        </v-col>
                        <v-col cols="8">
                          Download from URL
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
        </v-card>
      </v-dialog>
    </v-layout>
    <div v-show="!styleEditorVisible">
      <geo-package-card
        v-for="geopackage in geopackages"
        :key="geopackage.id"
        :geopackage="geopackage"
        :projectId="projectId"/>
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
        dark
        fab
        color="#3b779a"
        @click.stop="addGeoPackageDialog = true">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-alert class="alert-position" dismissible v-model="addGeoPackageError" type="error">
        GeoPackage already exists in project.
      </v-alert>
    </div>
    <style-editor v-if="styleEditorVisible" :tableName="styleEditor.tableName" :projectId="projectId" :geopackage="geopackages[styleEditor.geopackageId]" :style-key="styleKey"/>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import jetpack from 'fs-jetpack'
  import { remote } from 'electron'
  import _ from 'lodash'

  import GeoPackageCard from './GeoPackageCard'
  import StyleEditor from './StyleEditor'

  let options = {
    addGeoPackageDialog: false,
    addGeoPackageError: false
  }

  export default {
    props: {
      geopackages: Object,
      styleEditor: Object,
      projectId: String
    },
    data () {
      return options
    },
    computed: {
      styleKey () {
        return this.styleEditor && this.geopackages[this.styleEditor.geopackageId].tables.features[this.styleEditor.tableName] ? this.geopackages[this.styleEditor.geopackageId].tables.features[this.styleEditor.tableName].styleKey : 0
      },
      styleEditorVisible () {
        return !_.isNil(this.styleEditor)
      }
    },
    components: {
      GeoPackageCard,
      StyleEditor
    },
    methods: {
      ...mapActions({
        addGeoPackage: 'Projects/addGeoPackage'
      }),
      createNewGeoPackage () {
        this.addGeoPackageDialog = false
        const geopackages = this.geopackages
        remote.dialog.showSaveDialog((filePath) => {
          if (!filePath.endsWith('.gpkg')) {
            filePath = filePath + '.gpkg'
          }
          const exists = Object.values(geopackages).findIndex(geopackage => geopackage.path === filePath) !== -1
          if (!exists) {
            this.addGeoPackage({projectId: this.projectId, filePath: filePath})
          } else {
            this.addGeoPackageError = true
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
              this.addGeoPackage({projectId: this.projectId, filePath: fileInfo.absolutePath})
            } else {
              this.addGeoPackageError = true
            }
          }
        })
        this.addGeoPackageDialog = false
      },
      displayURLModal () {
        // TODO:
        console.log('url geopackage')
        this.addGeoPackageDialog = false
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
