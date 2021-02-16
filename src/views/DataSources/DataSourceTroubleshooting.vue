<template>
  <v-btn v-if="source.error" icon color="#d9534f" @click.stop="() => showTroubleshooting()" title="Error">
    <v-dialog v-model="showTroubleshootingDialog" max-width="500" persistent @keydown.esc="closeTroubleshooting">
      <v-card v-if="showTroubleshootingDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-alert-circle</v-icon>{{initialDisplayName + ' Troubleshooting'}}
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
    <v-icon>mdi-alert-circle</v-icon>
  </v-btn>
  <div v-else></div>
</template>

<script>
  import { mapState } from 'vuex'
  import _ from 'lodash'
  import ActionUtilities from '../../lib/ActionUtilities'
  import ServiceConnectionUtils from '../../lib/ServiceConnectionUtils'

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
    components: {
    },
    computed: {
      ...mapState({
        initialDisplayName () {
          return _.isNil(this.source.displayName) ? this.source.name : this.source.displayName
        }
      }),
      troubleShootingMessage () {
        let message = ''
        if (ServiceConnectionUtils.isAuthenticationError(this.source.error)) {
          message = 'The credentials for this data source are not valid.'
        } else if (ServiceConnectionUtils.isServerError(this.source.error)) {
          message = 'There is something wrong with this data source\'s server. Please contact the server\'s administrator for assistance.'
        } else {
          message = 'There was an error requesting data from the data source\'s server.'
        }
        return message
      }
    },
    data () {
      return {
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
        if (await ServiceConnectionUtils.connectToSource(this.projectId, this.source, ActionUtilities.setDataSource)) {
          this.$nextTick(() => {
            this.showTroubleshootingDialog = false
            this.connectionAttempts = 0
            this.reconnecting = false
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
