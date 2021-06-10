<template>
  <v-card>
    <v-card-title>
      Sign In
    </v-card-title>
    <v-card-text class="pt-0">
      <v-card-subtitle class="pl-0 pt-0 pb-0">
        {{protocol + authInfo.host + ':' + authInfo.port}}
      </v-card-subtitle>
      <v-form v-on:submit.prevent ref="signInForm" v-model="signInValid">
        <v-text-field
          autofocus
          tabindex="1"
          label="Username"
          clearable
          v-model="username"
          :rules="basicAuthUsernameRules"
          required/>
        <v-text-field
          tabindex="2"
          label="Password"
          clearable
          v-model="password"
          type="password"
          :rules="basicAuthPasswordRules"
          required/>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="cancel">
        Cancel
      </v-btn>
      <v-btn
        v-if="signInValid"
        color="primary"
        text
        @click="callSignIn">
        Sign In
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { CREDENTIAL_TYPE_BASIC } from '../../lib/network/HttpUtilities'

export default {
    props: {
      cancel: Function,
      signIn: Function,
      authInfo: Object,
      details: Object
    },
    methods: {
      async callSignIn () {
        const credentials = await this.getCredentials()
        this.signIn(credentials)
      },
      async getCredentials () {
        const {encrypted, iv, key} = window.mapcache.encryptPassword(this.password)
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
        password: ''
      }
    }
  }
</script>

<style scoped>

</style>
