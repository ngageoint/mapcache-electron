<template>
  <v-sheet>
    <v-card flat tile :loading="!error">
      <v-card-title>
        {{'Processing ' + displayName}}
      </v-card-title>
      <v-card-text>
        <div v-if="error">
          <div class="card__header__close-btn" @click="closeCard"></div>
          <v-row no-gutters class="align-start left-margin" v-if="error"><p class="text-wrap full-width">{{error}}</p></v-row>
        </div>
        <div v-else>
          <v-row no-gutters v-if="source.isUrl" class="align-start left-margin"><p class="text-wrap full-width">Url: {{displayName}}</p></v-row>
          <v-row no-gutters v-else class="align-start left-margin"><p class="text-wrap full-width">File name: {{displayName}}</p></v-row>
          <v-row no-gutters class="align-start left-margin" v-if="source.status"><p class="text-wrap full-width">Status: {{source.status}}</p></v-row>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="!cancelling"
          text
          color="warning"
          @click="closeCard">
          {{error ? 'Close' : 'Cancel Processing'}}
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
      error () {
        return this.source.error
      },
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
  .full-width {
    width: 100%;
  }
</style>
