<template>
  <div>
    <modal
      v-if="confirmOverwrite"
      header="GeoPackage Already Exists"
      card-text="Are you sure you want to overwrite the existing GeoPackage?"
      :ok="build"
      :cancel="doNotBuild">
    </modal>
    <div slot="card">
      <v-card-text>
        <v-row align="center" class="justify-start" no-gutters v-if="geopackage.buildMode === null || geopackage.buildMode === undefined">
          <div v-if="fileUnnamed" color="red">{{fileNeededMessage}}</div>
          <v-btn class="align-self-start" :disabled="fileUnnamed == 1" @click.stop="checkGeoPackageExists">Export GeoPackage</v-btn>
        </v-row>
        <v-row no-gutters>
          <v-card class="mb-2" v-if="geopackage.buildMode !== null && geopackage.buildMode !== undefined">
            <v-progress-linear :active="true"
                               :indeterminate="true"
                               color="light-blue"
                               v-if="geopackage.buildMode === BUILD_MODES.STARTED"
            ></v-progress-linear>
            <v-card-title>
              <p>{{overallStatusMessage}}</p>
            </v-card-title>
            <v-card-text>
              <div v-if="geopackage.buildMode === BUILD_MODES.STARTED">
                <p v-if="configurationStatus">{{'Working on ' + configurationStatus.name}}</p>
                <p v-if="configurationStatus">{{configurationStatus.message}}</p>
              </div>
              <div v-if="geopackage.buildMode === BUILD_MODES.FAILED">
                <div @click="cancelOrComplete" class="card__header__close-btn"></div>
                <div class="card__face__source-error-name contrast-text">
                  Error - {{geopackage.status}}
                </div>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                @click="cancelOrComplete"
                color="light darken-1"
                text>
                {{geopackage.buildMode === BUILD_MODES.STARTED ? 'Cancel' : 'Close'}}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-row>
      </v-card-text>
    </div>
  </div>
</template>

<script>
  import {mapActions} from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import Card from '../Card/Card'
  import GeoPackageBuilder from '../../../lib/source/GeoPackageBuilder'
  import store from '../../../store'
  import fs from 'fs'
  import Modal from '../Modal'

  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    components: {
      Card,
      ViewEditText,
      Modal
    },
    data () {
      return {
        BUILD_MODES: GeoPackageBuilder.BUILD_MODES,
        confirmOverwrite: false,
        fileLocationSelected: false
      }
    },
    computed: {
      configurationStatus () {
        let status
        if (this.geopackage.status && this.geopackage.status.configurationExecuting) {
          let configStatus = this.geopackage.status.configurationStatus[this.geopackage.status.configurationExecuting]
          status = {
            name: configStatus.configurationName,
            message: configStatus.type === 'vector'
              ? (configStatus.indexing
                ? 'Indexing ' + configStatus.featuresAdded + ' features...'
                : ('Adding ' + configStatus.featuresToAdd + ' features'))
              : ('Completed ' + (100.0 * (configStatus.tilesAdded / configStatus.tilesToAdd)).toFixed(4) + '% of tiles')
          }
        }
        return status
      },
      overallStatusMessage () {
        let message = ''
        if (this.geopackage.buildMode === this.BUILD_MODES.FAILED) {
          message = this.geopackage.fileName + ' Failed'
        } else if (this.geopackage.buildMode === this.BUILD_MODES.COMPLETED) {
          message = 'Completed building ' + this.geopackage.fileName
        } else {
          message = 'Building ' + this.geopackage.fileName
        }
        return message
      },
      fileNeededMessage () {
        // Message to display when a file name hasn't been selected for the GeoPackage file export
        let fileNameMessage = '* Cannot export until file name is selected'
        return fileNameMessage
      },
      fileUnnamed () {
        // Returns true if the File Location for the export hasn't been chosen yet
        return this.geopackage.fileName === null || this.geopackage.fileName === undefined
      }
    },
    methods: {
      ...mapActions({
        setGeoPackageLocation: 'Projects/setGeoPackageLocation'
      }),
      checkGeoPackageExists () {
        if (fs.existsSync(this.geopackage.fileName)) {
          // display modal and ask user if the want to overwrite existing geopackage
          this.confirmOverwrite = true
        } else {
          this.build()
        }
      },
      doNotBuild () {
        this.confirmOverwrite = false
      },
      build () {
        // let _this = this
        this.$electron.ipcRenderer.send('build_geopackage', {project: this.project, geopackage: this.geopackage})
        this.$electron.ipcRenderer.once('build_geopackage_completed_' + this.geopackage.id, (event, result) => {
          if (result.error) {
            console.error(result.error)
          }
        })
      },
      cancelOrComplete () {
        if (this.geopackage.buildMode !== this.BUILD_MODES.COMPLETED) {
          this.$electron.ipcRenderer.send('cancel_geopackage_build', {geopackage: this.geopackage})
        }
        store.dispatch('Projects/setGeoPackageBuildMode', {
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          buildMode: null
        })
        store.dispatch('Projects/setGeoPackageStatus', {
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          status: null
        })
      }
    }
  }
</script>

<style scoped>
</style>
