<template>
  <v-dialog v-model="dialog" persistent :fullscreen="fullScreen" max-width="400">
    <v-card>
      <v-card-title :class="'headline ' + headerClass">
        {{header}}
      </v-card-title>
      <v-card-text>
        {{cardText}}
        <slot name="body">
        </slot>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          text
          v-if="cancel"
          :color="cancelColor || 'light darken-1'"
          @click="modalCancel">
          {{cancelText || "Cancel"}}
        </v-btn>
        <v-btn
          text
          v-if="ok"
          :color="okColor || 'primary darken-1'"
          @click="modalOK">
          {{okText || "Ok"}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    props: {
      header: String,
      headerClass: {
        type: String,
        default: ''
      },
      cardText: String,
      ok: Function,
      okText: String,
      okColor: String,
      cancel: Function,
      cancelText: String,
      cancelColor: String,
      fullScreen: {
        type: Boolean,
        default: false
      }
    },
    data () {
      return {
        dialog: true
      }
    },
    methods: {
      modalCancel () {
        this.dialog = false
        if (this.cancel) {
          this.cancel()
        }
      },
      modalOK () {
        this.dialog = false
        if (this.ok) {
          this.ok()
        }
      }
    }
  }
</script>
