<template>
  <v-card :loading="!source.error">
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
          text
          color="warning"
          @click="closeCard">
        {{source.error ? 'Close' : 'Cancel Processing'}}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import path from 'path'
  import URLUtilities from '../../../lib/URLUtilities'
  export default {
    props: {
      source: Object
    },
    computed: {
      displayName () {
        if (this.source.isUrl) {
          return URLUtilities.getBaseUrlAndQueryParams(this.source.file.path).baseUrl
        } else {
          path.basename(this.source.file.path)
        }
      }
    },
    methods: {
      closeCard () {
        this.$electron.ipcRenderer.send('cancel_process_source', this.source)
        this.$emit('clear-processing', this.source)
      }
    }
  }
</script>

<style scoped>
.left-margin {
  margin-left: 8px;
}
</style>
