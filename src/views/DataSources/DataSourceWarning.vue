<template>
  <v-btn v-if="source.warning" color="#F4D03F" @click.stop="() => showTroubleshooting()" title="Warning" icon="mdi-information">
    <v-dialog v-model="showWarningDialog" max-width="500" persistent @keydown.esc="closeTroubleshooting">
      <v-card v-if="showWarningDialog">
        <v-card-title>
          <v-icon color="#F4D03F" class="pr-2" icon="mdi-information"/>
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
  </v-btn>
  <div v-else></div>
</template>

<script>
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import { setSourceWarning } from '../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    source: {
      type: Object,
      default: () => {
        return {
          name: '',
        }
      }
    }
  },
  computed: {
    ...mapState({
      initialDisplayName () {
        return isNil(this.source.displayName) ? this.source.name : this.source.displayName
      }
    }),
    troubleShootingMessage () {
      return this.source.warning
    }
  },
  data () {
    return {
      showWarningDialog: false,
    }
  },
  methods: {
    closeTroubleshooting () {
      this.showWarningDialog = false
    },
    showTroubleshooting () {
      this.showWarningDialog = true
    },
    dismissWarning () {
      this.clearWarning(this.source)
      this.showWarningDialog = false
    },
    clearWarning (theSource) {
      setSourceWarning(theSource.id, '')
    }
  }
}
</script>

<style scoped>
</style>
