<template>
  <v-sheet>
    <v-card flat tile :loading="!error && workflowState !== 4">
      <v-card-title>
        <span class="processing-title">
          {{((workflowState === 4 ? 'Cancelled ' : (error ? 'Failed ' : (status + ' ')))) + displayName}}
        </span>
      </v-card-title>
      <v-card-text>
        <v-row no-gutters v-if="source.url" class="align-start left-margin"><p class="text-wrap full-width">Url: {{displayName}}</p></v-row>
        <v-row no-gutters v-else class="align-start left-margin"><p class="text-wrap full-width">File name: {{displayName}}</p></v-row>
        <div v-if="error">
          <v-row no-gutters class="align-start left-margin" v-if="error"><p class="warning-text text-wrap full-width">{{'Error: ' + error}}</p></v-row>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="error || workflowState === 4"
          text
          color="warning"
          @click="closeCard">
          Close
        </v-btn>
        <v-btn
          v-else-if="!error && workflowState !== 4"
          :disabled="workflowState === 3"
          text
          color="warning"
          @click="cancelProcessing">
          Cancel Processing
        </v-btn>
      </v-card-actions>
      <v-divider/>
    </v-card>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import {isMapCacheUserCancellationError, SERVICE_TYPE} from '../../lib/network/HttpUtilities'
import PreprocessSource from '../../lib/source/preprocessing/PreprocessSource'

const WORKFLOW_STATES = {
  PREPROCESSING: 0,
  QUEUED: 1,
  PROCESSING: 2,
  CANCELLING: 3,
  CANCELLED: 4,
  COMPLETED: 5
}

export default {
    props: {
      project: Object,
      source: Object,
      onComplete: Function,
      onCancel: Function,
      onClose: Function
    },
    data () {
      return {
        status: 'Preprocesing',
        error: null,
        workflowState: WORKFLOW_STATES.PREPROCESSING
      }
    },
    computed: {
      displayName () {
        if (this.source.url) {
          return window.mapcache.getBaseUrlAndQueryParams(this.source.url).baseUrl
        } else {
          return window.mapcache.getBaseName(this.source.file.path)
        }
      }
    },
    methods: {
      async preprocessSource (sourceConfiguration) {
        this.preprocessor = new PreprocessSource(sourceConfiguration)
        return await this.preprocessor.preprocess()
      },
      sendSourceToProcess (source) {
        const self = this
        self.status = 'Queued'
        self.$nextTick(() => {
          window.mapcache.processSource({project: self.project, source: source})
          self.workflowState = WORKFLOW_STATES.QUEUED
        })
      },
      reportCancelled () {
        const self = this
        setTimeout(() => {
          self.workflowState = WORKFLOW_STATES.CANCELLED
        }, 500)
      },
      cancelProcessing () {
        const self = this
        if (this.preprocessor != null) {
          this.preprocessor.cancel()
        }
        // processing has not yet been sent to the server side to run
        if (self.workflowState === WORKFLOW_STATES.QUEUED || self.workflowState === WORKFLOW_STATES.PROCESSING) {
          self.onCancel().then(() => {
            self.reportCancelled()
          })
        } else {
          self.reportCancelled()
        }
        self.workflowState = WORKFLOW_STATES.CANCELLING
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
        if (isNil(result.error)) {
          setTimeout(() => {
            window.mapcache.addDataSources({projectId: self.project.id, dataSources: result.dataSources})
            self.$nextTick(() => {
              self.onComplete()
            })
          }, 1000)
        } else {
          self.error = result.error
          if (result.error.message) {
            self.error = self.error.message
          }
        }
      })

      self.$nextTick(() => {
        // wfs and arcgis fs will require accessing features in browser, as opposed to trying that in node, given credentials
        if (source.serviceType === SERVICE_TYPE.WFS || source.serviceType === SERVICE_TYPE.ARCGIS_FS) {
          self.preprocessSource(source).then(updatedSource => {
            if (self.workflowState !== WORKFLOW_STATES.CANCELLING && self.workflowState !== WORKFLOW_STATES.CANCELLED) {
              self.sendSourceToProcess(updatedSource)
            }
          }).catch((error) => {
            if (!isMapCacheUserCancellationError(error)) {
              self.error = error
              if (error.message) {
                self.error = error.message
              }
            }
          })
        } else {
          self.sendSourceToProcess(source)
        }
      })
      window.mapcache.addTaskStatusListener(source.id, (status) => {
        if (status === 'Processing') {
          this.workflowState = WORKFLOW_STATES.PROCESSING
        }
        self.status = status
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
