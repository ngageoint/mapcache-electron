<template>
  <v-btn v-if="rasterMissing" icon color="#d9534f" @click.stop="() => showTroubleshooting()" title="Error">
    <v-dialog v-model="showTroubleshootingDialog" max-width="500" persistent @keydown.esc="closeTroubleshooting">
      <v-card v-if="showTroubleshootingDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiAlertCircle}}</v-icon>{{initialDisplayName + ' Troubleshooting'}}
        </v-card-title>
        <v-card-text>
          This GeoTIFF's generated data file is missing. If you wish to view this GeoTIFF, please regenerate it's data file.
        </v-card-text>
        <v-card-text v-if="error" color="warning">
          {{error}}
        </v-card-text>
        <v-card-actions>
          <v-btn id="generateRasterButton" :loading="generating" color="primary" text @click.stop="generate">
            Generate
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="generating"
            text
            @click.stop="closeTroubleshooting">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-icon>{{mdiAlertCircle}}</v-icon>
  </v-btn>
  <div v-else></div>
</template>

<script>
import isNil from 'lodash/isNil'
import {mdiAlertCircle} from '@mdi/js'

export default {
    props: {
      sourceOrBaseMap: {
        type: Object,
        default: () => {
          return {
            name: '',
          }
        }
      },
      projectId: {
        type: String,
        default: ''
      }
    },
    computed: {
      initialDisplayName () {
        if (this.sourceOrBaseMap.layerConfiguration) {
          return this.sourceOrBaseMap.layerConfiguration.name
        } else {
          return isNil(this.sourceOrBaseMap.displayName) ? this.sourceOrBaseMap.name : this.sourceOrBaseMap.displayName
        }
      },
      rasterMissing () {
        return window.mapcache.isRasterMissing(this.sourceOrBaseMap.layerConfiguration ? this.sourceOrBaseMap.layerConfiguration : this.sourceOrBaseMap)
      }
    },
    data () {
      return {
        mdiAlertCircle: mdiAlertCircle,
        showTroubleshootingDialog: false,
        generating: false,
        error: null
      }
    },
    methods: {
      closeTroubleshooting () {
        this.showTroubleshootingDialog = false
        this.generating = false
        this.error = null
      },
      showTroubleshooting () {
        this.showTroubleshootingDialog = true
      },
      async generate () {
        this.generating = true
        const isSource = isNil(this.sourceOrBaseMap.layerConfiguration)
        const filePath = isSource ? this.sourceOrBaseMap.filePath : this.sourceOrBaseMap.layerConfiguration.filePath
        window.mapcache.generateGeoTIFFRasterFile(this.sourceOrBaseMap.id, filePath, (result) => {
          this.generating = false
          if (result.error) {
            this.error = result.error
          } else {
            if (isSource) {
              const sourceCopy = Object.assign({}, this.sourceOrBaseMap)
              sourceCopy.rasterFile = result
              window.mapcache.setDataSource({projectId: this.projectId, source: sourceCopy})
              this.closeTroubleshooting()
            } else {
              const baseMapCopy = Object.assign({}, this.sourceOrBaseMap)
              baseMapCopy.layerConfiguration.rasterFile = result
              window.mapcache.editBaseMap(baseMapCopy)
              this.closeTroubleshooting()
            }
          }
        })
      }
    }
  }
</script>

<style scoped>
</style>
