<template>
  <v-sheet>
    <v-card flat tile :loading="!error && !cancelled">
      <v-card-title>
        <span class="processing-title">
          {{(cancelling ? 'Cancelling ' : (cancelled ? 'Cancelled ' : (error ? 'Failed ' : 'Processing '))) + displayName}}
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
          v-if="error || cancelled"
          text
          color="warning"
          @click="closeCard">
          Close
        </v-btn>
        <v-btn
          v-else-if="!cancelling"
          text
          color="warning"
          @click="cancelProcessing">
          Cancel Processing
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-sheet>
</template>

<script>
export default {
    props: {
      source: Object
    },
    data () {
      return {
        cancelling: false,
        cancelled: false
      }
    },
    computed: {
      error () {
        let error = this.source.error
        if (error && error.message) {
          error = error.message
        }
        return error
      },
      displayName () {
        if (this.source.url) {
          return window.mapcache.getBaseUrlAndQueryParams(this.source.url).baseUrl
        } else {
          return window.mapcache.getBaseName(this.source.file.path)
        }
      }
    },
    methods: {
      cancelProcessing () {
        console.log('cancelling')
        const self = this
        self.cancelling = true
        this.$nextTick(() => {
          window.mapcache.cancelProcessingSource(self.source).then(() => {
            setTimeout(() => {
              self.cancelling = false
              self.cancelled = true
            }, 500)
          })
        })
      },
      closeCard () {
        this.$emit('clear-processing', this.source)
      }
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
