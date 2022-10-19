<template>
  <v-btn v-if="source.warning && !dismissed" icon color="#F4D03F" @click.stop="() => showTroubleshooting()" title="Warning">
    <v-dialog v-model="showTroubleshootingDialog" max-width="500" persistent @keydown.esc="closeTroubleshooting">
      <v-card v-if="showTroubleshootingDialog">
        <v-card-title>
          <v-icon color="#F4D03F" class="pr-2">{{ mdiInformation }}</v-icon>
          {{ initialDisplayName + ' Warning' }}
        </v-card-title>
        <v-card-text>
          {{ troubleShootingMessage }}
        </v-card-text>
        <v-card-actions>
          <v-btn id="connectionButton"
              text
              @click.stop="dismissWarning">
            Dismiss
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
              text
              @click.stop="closeTroubleshooting">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-icon>{{ mdiInformation }}</v-icon>
  </v-btn>
  <div v-else></div>
</template>

<script>
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import { mdiInformation } from '@mdi/js'

export default {
  props: {
    source: {
      type: Object,
      default: () => {
        return {
          name: '',
        }
      }
    },
    projectId: String
  },
  computed: {
    ...mapState({
      initialDisplayName () {
        return isNil(this.source.displayName) ? this.source.name : this.source.displayName
      }
    }),
    troubleShootingMessage () {
      let message = this.source.warning

      return message
    }
  },
  data () {
    return {
      mdiInformation: mdiInformation,
      showTroubleshootingDialog: false,
      dismissed: false,
    }
  },
  methods: {
    closeTroubleshooting () {
      this.showTroubleshootingDialog = false
    },
    showTroubleshooting () {
      this.showTroubleshootingDialog = true
    },
    dismissWarning () {
      this.dismissed = true
      this.showTroubleshootingDialog = false
    }
  }
}
</script>

<style scoped>
</style>
