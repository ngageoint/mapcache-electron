<template>
  <v-card>
    <v-progress-linear v-if="!source.error"
            :active="true"
            :indeterminate="true"
            color="light-blue"
    ></v-progress-linear>
    <v-card-title>
      {{'Processing ' + source.file.path}}
    </v-card-title>
    <v-card-text>
      <div v-if="source.error">
        <div class="card__header__close-btn" @click="closeCard"></div>
        <div class="card__face__source-error-name contrast-text">
          Error - {{source.file.name}}
        </div>
      </div>
      <v-row class="align-start left-margin">Path: {{source.file.path}}</v-row>
      <v-row class="align-start left-margin">Size: {{source.file.size}}</v-row>
      <v-row class="align-start left-margin" v-if="source.status">Status: {{source.status}}</v-row>
      <v-row class="align-start left-margin" v-if="source.error">{{source.error}}</v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          text
          color="light darken-1"
          @click="closeCard">
        {{source.error ? 'Close' : 'Cancel Processing'}}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  export default {
    props: {
      source: Object
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
