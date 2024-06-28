<template>
  <v-card>
    <v-card-title>
      Sign in
    </v-card-title>
    <v-card-text class="pt-0">
      <v-card-subtitle class="pl-0 pt-0 pb-0">
        {{ protocol + authInfo.host + ':' + authInfo.port }}
      </v-card-subtitle>
      <v-form v-on:submit.prevent="() => {}" ref="signInForm" v-model="signInValid">
        <v-text-field
            variant="underlined"
            autofocus
            tabindex="1"
            label="Username"
            clearable
            v-model="username"
            :rules="basicAuthUsernameRules"
            required/>
        <v-text-field
            variant="underlined"
            tabindex="2"
            label="Password"
            clearable
            v-model="password"
            :type="visible ? 'text' : 'password'"
            :append-icon="visible ? mdiEyeOff : mdiEye"
            @click:append="() => (visible = !visible)"
            :rules="basicAuthPasswordRules"
            required/>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="() => {cancel(eventUrl)}">
        Cancel
      </v-btn>
      <v-btn
          :disabled="!signInValid"
          color="primary"
          variant="text"
          @click="callSignIn">
        Sign in
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { CREDENTIAL_TYPE_BASIC } from '../../../../lib/network/HttpUtilities'

export default {
  props: {
    cancel: Function,
    signIn: Function,
    authInfo: Object,
    details: Object,
    eventUrl: String
  },
  methods: {
    async callSignIn () {
      const credentials = await this.getCredentials()
      this.signIn(this.eventUrl, credentials)
    },
    async getCredentials () {
      const { encrypted, iv, key } = window.mapcache.encryptPassword(this.password)
      return {
        type: CREDENTIAL_TYPE_BASIC,
        username: this.username,
        password: encrypted,
        iv: iv,
        key: key
      }
    }
  },
  computed: {
    protocol () {
      return this.details.url.split('//')[0] + '//'
    }
  },
  data () {
    return {
      signInValid: false,
      basicAuthUsernameRules: [v => !!v || 'Username is required'],
      basicAuthPasswordRules: [v => !!v || 'Password is required'],
      username: '',
      password: String,
      visible: false
    }
  }
}
</script>

<style scoped>

</style>
