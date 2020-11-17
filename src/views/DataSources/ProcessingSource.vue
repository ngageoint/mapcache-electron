<template>
  <v-sheet>
    <v-card flat tile :loading="!source.error">
      <v-card-title>
        {{'Processing ' + displayName}}
      </v-card-title>
      <v-card-text>
        <div v-if="source.error">
          <div class="card__header__close-btn" @click="closeCard"></div>
          <div class="card__face__source-error-name contrast-text">
            Error - {{displayName}}
          </div>
        </div>
        <v-row v-if="source.isUrl" class="align-start left-margin">Url: {{displayName}}</v-row>
        <v-row v-else class="align-start left-margin">File name: {{displayName}}</v-row>
        <v-row class="align-start left-margin" v-if="source.status">Status: {{source.status}}</v-row>
        <v-row class="align-start left-margin" v-if="source.error">{{source.error}}</v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="!cancelling"
          text
          color="warning"
          @click="closeCard">
          {{source.error ? 'Close' : 'Cancel Processing'}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-sheet>
</template>

<script>
  import path from 'path'
  import { ipcRenderer } from 'electron'
  import URLUtilities from '../../lib/URLUtilities'
  export default {
    props: {
      source: Object
    },
    data () {
      return {
        cancelling: false
      }
    },
    computed: {
      displayName () {
        if (this.source.url) {
          return URLUtilities.getBaseUrlAndQueryParams(this.source.url).baseUrl
        } else {
          return path.basename(this.source.file.path)
        }
      }
    },
    methods: {
      closeCard () {
        const self = this
        ipcRenderer.removeAllListeners('process_source_completed_' + self.source.id)
        ipcRenderer.once('cancel_process_source_completed_' + self.source.id, () => {
          self.$emit('clear-processing', self.source)
        })
        self.source.status = 'Cancelling...'
        self.cancelling = true
        ipcRenderer.send('cancel_process_source', self.source)
      }
    }
  }
</script>

<style scoped>
.left-margin {
  margin-left: 8px;
}
</style>
