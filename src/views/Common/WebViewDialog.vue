<template>
  <v-dialog :width="width" v-model="showDialog" persistent>
    <v-card>
      <v-card-text class="ma-0 pa-0">
        <webview style="display:inline-flex; width: 100%; height: 600px;" :src="url" partition="persist:mapcache"></webview>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn text color="warning" @click="cancelAuth">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>

export default {
  props: {
    url: String,
    width: Number,
    cancel: Function
  },
  data () {
    return {
      showDialog: false
    }
  },
  methods: {
    hide() {
      this.showDialog = false
    },
    show () {
      this.showDialog = true
    },
    cancelAuth () {
      this.hide()
      this.cancel()
    }
  },
  mounted () {
    this.show()
  }
}
</script>

<style scoped>
</style>
