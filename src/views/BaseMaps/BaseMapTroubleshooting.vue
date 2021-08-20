<template>
  <v-btn v-if="baseMap.error" icon color="#d9534f" @click.stop="() => showTroubleshooting()" title="Error">
    <v-dialog v-model="showTroubleshootingDialog" max-width="500" persistent @keydown.esc="closeTroubleshooting">
      <v-card v-if="showTroubleshootingDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiAlertCircle}}</v-icon>{{initialDisplayName + ' troubleshooting'}}
        </v-card-title>
        <v-card-text>
          {{troubleShootingMessage}}
        </v-card-text>
        <v-card-actions>
          <v-btn id="connectionButton" :loading="reconnecting" :color="connectionAttempts === 0 ? 'primary' : 'warning'" text @click.stop="reconnect">
            {{connectionAttempts === 0 ? 'Connect' : 'Retry'}}
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
    <v-icon>{{mdiAlertCircle}}</v-icon>
  </v-btn>
  <div v-else></div>
</template>

<script>
import {mapState} from 'vuex'
import {mdiAlertCircle} from '@mdi/js'
import {isAuthenticationError, isServerError, isTimeoutError} from '../../lib/network/HttpUtilities'
import {connectToBaseMap} from '../../lib/network/ServiceConnectionUtils'

export default {
    props: {
      baseMap: Object
    },
    computed: {
      ...mapState({
        initialDisplayName () {
          return this.baseMap.name
        }
      }),
      troubleShootingMessage () {
        let message = ''
        if (isAuthenticationError(this.baseMap.error)) {
          message = 'The credentials for this data source are not valid.'
        } else if (isServerError(this.baseMap.error)) {
          message = 'There is something wrong with this data source\'s server. Please contact the server\'s administrator for assistance.'
        } else if (isTimeoutError(this.baseMap.error)) {
          message = 'The request(s) to the server timed out. Consider increasing the request timeout (ms) for this data source.'
        } else {
          message = 'There was an error requesting data from the data source\'s server.'
        }
        return message
      }
    },
    data () {
      return {
        mdiAlertCircle: mdiAlertCircle,
        showTroubleshootingDialog: false,
        reconnecting: false,
        connectionAttempts: 0
      }
    },
    methods: {
      closeTroubleshooting () {
        this.connectionAttempts = 0
        this.showTroubleshootingDialog = false
        this.reconnecting = false
      },
      showTroubleshooting () {
        this.showTroubleshootingDialog = true
      },
      cancelSignIn () {
        this.reconnecting = false
      },
      async signIn () {
        if (await connectToBaseMap(this.baseMap, window.mapcache.editBaseMap)) {
          this.$nextTick(() => {
            this.showTroubleshootingDialog = false
            this.connectionAttempts = 0
          })
        } else {
          setTimeout(() => {
            this.connectionAttempts += 1
            this.reconnecting = false
          }, 500)
        }
      },
      async reconnect () {
        this.reconnecting = true
        this.$nextTick(async () => {
          await this.signIn()
        })
      }
    }
  }
</script>

<style scoped>
</style>
