<template>
  <v-sheet>
    <v-card flat tile>
      <v-card-title>
        <span class="processing-title">
          {{ getTitle(workflowState) + ' ' + displayName }}
        </span>
      </v-card-title>
      <v-card-text class="mb-0 pb-0">
        <v-row class="pb-2 ml-2 mr-2 pl-2 pr-2" no-gutters justify="start" v-if="source.url">
          <v-col>
            <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
              URL
            </p>
            <p class="regular--text"
               :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
              {{ displayUrl }}
            </p>
          </v-col>
        </v-row>
        <v-row class="pb-2 ml-2 mr-2 pl-2 pr-2" no-gutters justify="start" v-else>
          <v-col>
            <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
              File
            </p>
            <p class="regular--text"
               :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
              {{ displayFile }}
            </p>
          </v-col>
        </v-row>
        <v-row class="pb-2 ml-2 mr-2 pl-2 pr-2" no-gutters justify="start" v-if="error">
          <v-col>
            <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
              Error
            </p>
            <p class="warning-text"
               :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
              {{ error }}
            </p>
          </v-col>
        </v-row>
        <v-row class="pb-2 ml-2 mr-2 pl-2 pr-2" no-gutters justify="start" v-else-if="workflowState !== 4">
          <v-col>
            <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
              Status
            </p>
            <p class="regular--text"
               :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
              {{ status + ': ' + completionPercentage + '%' }}
            </p>
            <p class="pt-2">
              <v-progress-linear :value="completionPercentage"></v-progress-linear>
            </p>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            v-if="error || workflowState === 4"
            variant="text"
            color="warning"
            @click="closeCard">
          Close
        </v-btn>
        <v-btn
            v-else-if="!error && workflowState !== 4"
            :disabled="workflowState === 3"
            variant="text"
            color="warning"
            @click="cancelProcessing">
          Cancel processing
        </v-btn>
      </v-card-actions>
      <v-divider/>
    </v-card>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import { isMapCacheUserCancellationError, SERVICE_TYPE } from '../../../../lib/network/HttpUtilities'
import PreprocessSource from '../../../../lib/source/preprocessing/PreprocessSource'
import { PROCESSING_STATES, getTitleForProcessingState } from '../../../../lib/source/SourceProcessing'
import { addDataSources } from '../../../../lib/vue/vuex/ProjectActions'
import { prepareObjectForWindowFunction } from '../../../../lib/util/common/CommonUtilities'

export default {
  props: {
    project: Object,
    source: Object,
    allowNotifications: Boolean,
    onComplete: Function,
    onCancel: Function,
    onClose: Function
  },
  data () {
    return {
      status: '',
      error: null,
      workflowState: PROCESSING_STATES.PREPROCESSING,
      completionPercentage: 0,
    }
  },
  computed: {
    displayName () {
      if (this.source.name) {
        return this.source.name
      } else if (this.source.url) {
        return window.mapcache.getBaseUrlAndQueryParams(this.source.url).baseUrl
      } else {
        return window.mapcache.getBaseName(this.source.file.path)
      }
    },
    displayUrl () {
      if (this.source.url) {
        return window.mapcache.getBaseUrlAndQueryParams(this.source.url).baseUrl
      } else {
        return null
      }
    },
    displayFile () {
      if (this.source.file && this.source.file.path) {
        return window.mapcache.getBaseName(this.source.file.path)
      } else {
        return null
      }
    }
  },
  methods: {
    async preprocessSource (sourceConfiguration, statusCallback) {
      this.preprocessor = new PreprocessSource(sourceConfiguration)
      return await this.preprocessor.preprocess(statusCallback)
    },
    getTitle (state) {
      return getTitleForProcessingState(state)
    },
    sendSourceToProcess (source) {
      const self = this
      self.status = 'Queued'
      self.$nextTick(() => {
        window.mapcache.processSource({ source: prepareObjectForWindowFunction(source) })
        self.workflowState = PROCESSING_STATES.QUEUED
      })
    },
    reportCancelled () {
      const self = this
      setTimeout(() => {
        self.workflowState = PROCESSING_STATES.CANCELLED
      }, 500)
    },
    cancelProcessing () {
      const self = this
      if (this.preprocessor != null) {
        this.preprocessor.cancel()
      }
      // processing has not yet been sent to the server side to run
      if (self.workflowState === PROCESSING_STATES.QUEUED || self.workflowState === PROCESSING_STATES.PROCESSING) {
        self.onCancel().then(() => {
          self.reportCancelled()
        })
      } else {
        self.reportCancelled()
      }
      self.workflowState = PROCESSING_STATES.CANCELLING
    },
    closeCard () {
      this.onClose()
    }
  },
  mounted () {
    const self = this
    const source = this.source
    // setup listener for when processing is completed
    window.mapcache.onceProcessSourceCompleted(source.id).then((result) => {
      const fileOrUrl = source.file ? source.file.path : source.url

      if (isNil(result.error)) {
        if (this.allowNotifications) {
          new Notification('Data source imported', {
            body: 'Successfully imported data from ' + fileOrUrl,
          }).onclick = () => {
            window.mapcache.sendWindowToFront()
          }
        }
        setTimeout(() => {
          addDataSources(self.project.id, result.dataSources).then(() => {
            self.$nextTick(() => {
              self.onComplete()
            })
          })
        }, 1000)
      } else {
        if (this.allowNotifications) {
          new Notification('Data source import failed', {
            body: 'Failed to import ' + fileOrUrl,
          }).onclick = () => {
            window.mapcache.sendWindowToFront()
          }
        }
        self.error = result.error
        if (result.error.message) {
          self.error = self.error.message
        }
      }
    })

    const statusCallback = (status) => {
      self.workflowState = status.type
      self.status = status.message || self.status
      if (status.completionPercentage != null) {
        status.completionPercentage = status.completionPercentage.toFixed(1)
      }
      self.completionPercentage = status.completionPercentage || self.completionPercentage
    }

    window.mapcache.addTaskStatusListener(source.id, statusCallback)

    self.$nextTick(() => {
      // wfs and arcgis fs will require accessing features in browser, as opposed to trying that in node, given credentials
      if (source.serviceType === SERVICE_TYPE.WFS || source.serviceType === SERVICE_TYPE.ARCGIS_FS || source.serviceType === SERVICE_TYPE.OVERPASS) {
        self.preprocessSource(source, statusCallback).then(updatedSource => {
          if (self.workflowState !== PROCESSING_STATES.CANCELLING && self.workflowState !== PROCESSING_STATES.CANCELLED) {
            self.sendSourceToProcess(updatedSource)
          }
        }).catch((error) => {
          if (!isMapCacheUserCancellationError(error)) {
            self.error = error
            if (error.message) {
              self.error = error.message
            }
          }
          window.mapcache.deleteSourceDirectory(source)
        })
      } else {
        self.sendSourceToProcess(source)
      }
    })
  },
  beforeDestroy () {
    window.mapcache.removeTaskStatusListener(this.source.id)
  }
}
</script>

<style scoped>
.left-margin {
  margin-left: 8px;
}

.full-width {
  width: 100%;
}

.processing-title {
  flex-wrap: nowrap !important;
  overflow: hidden !important;
  overflow-wrap: unset !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  word-break: unset !important;
}
</style>
