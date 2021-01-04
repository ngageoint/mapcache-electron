<template>
  <v-sheet>
    <v-dialog
      v-model="deleteUrlDialog"
      max-width="400"
      persistent>
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Delete URL
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete {{urlToDelete}} from your saved URLs?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelDeleteUrl">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="removeUrlFromHistory">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="addUrlDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>
          <v-icon color="primary" class="pr-2">mdi-pencil</v-icon>
          Add URL
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="urlValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field :rules="urlRules" label="URL" v-model="addUrlValue"/>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelAddNewUrl">
            Cancel
          </v-btn>
          <v-btn
            v-if="urlValid"
            color="primary"
            text
            @click="addNewUrl">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="editUrlDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>
          <v-icon color="primary" class="pr-2">mdi-pencil</v-icon>
          Edit URL
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="editUrlValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field :rules="editUrlRules" label="URL" v-model="editUrlValue"/>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelEditUrl">
            Cancel
          </v-btn>
          <v-btn
            v-if="editUrlValid"
            color="primary"
            text
            @click="editSavedUrl">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card>
      <v-card-title>
        <v-icon color="primary" class="pr-2">mdi-cloud-outline</v-icon>
        Saved URLs
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item dense :key="item" v-for="item in urls.map(url => url.url)">
            <v-list-item-content>
              <span class="text-break">{{item}}</span>
            </v-list-item-content>
            <v-list-item-action>
              <v-row no-gutters justify="end">
                <v-btn icon color="primary" @click.stop.prevent="showEditUrlDialog(item)">
                  <v-icon>mdi-pencil-outline</v-icon>
                </v-btn>
                <v-btn icon color="warning" @click.stop.prevent="showDeleteUrlDialog(item)">
                  <v-icon>mdi-trash-can</v-icon>
                </v-btn>
              </v-row>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn
          text
          color="primary"
          @click="showAddUrlDialog">
          Add URL
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          text
          @click="close">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-sheet>
</template>

<script>
  import Vue from 'vue'
  import { mapState, mapActions } from 'vuex'
  import URLUtilities from '../../lib/URLUtilities'

  export default {
    props: {
      close: Function
    },
    computed: {
      ...mapState({
        urls: state => {
          return state.URLs.savedUrls || []
        }
      })
    },
    data () {
      return {
        urlToDelete: null,
        deleteUrlDialog: false,
        savedUrlDialog: false,
        addUrlValue: 'https://',
        addUrlDialog: false,
        urlRules: [
          v => !!v || 'URL is required',
          v => URLUtilities.isUrlValid(v) || 'Invalid URL',
          v => !this.urls.find(url => url.url.toLowerCase() === v) || 'URL already exists'
        ],
        urlValid: false,
        editUrlValue: null,
        editUrlInitialValue: null,
        editUrlDialog: false,
        editUrlRules: [
          v => !!v || 'URL is required',
          v => URLUtilities.isUrlValid(v) || 'Invalid URL',
          v => v !== this.editUrlInitialValue || 'URL unchanged',
          v => !this.urls.find(url => url.url === v) || 'URL already exists'
        ],
        editUrlValid: false
      }
    },
    methods: {
      ...mapActions({
        addUrl: 'URLs/addUrl',
        editUrl: 'URLs/editUrl',
        removeUrl: 'URLs/removeUrl'
      }),
      cancelAddNewUrl () {
        this.addUrlDialog = false
      },
      showAddUrlDialog () {
        this.addUrlValue = 'https://'
        Vue.nextTick(() => {
          this.addUrlDialog = true
        })
      },
      addNewUrl () {
        this.addUrlDialog = false
        this.addUrl({url: this.addUrlValue})
      },
      cancelDeleteUrl () {
        this.deleteUrlDialog = false
        Vue.nextTick(() => {
          this.urlToDelete = null
        })
      },
      showDeleteUrlDialog (url) {
        this.urlToDelete = url
        this.deleteUrlDialog = true
      },
      removeUrlFromHistory () {
        this.removeUrl(this.urlToDelete)
        this.deleteUrlDialog = false
        Vue.nextTick(() => {
          this.urlToDelete = null
        })
      },
      showEditUrlDialog (url) {
        this.editUrlInitialValue = url
        this.editUrlValue = url
        this.editUrlDialog = true
      },
      cancelEditUrl () {
        this.editUrlDialog = false
        Vue.nextTick(() => {
          this.editUrlInitialValue = null
          this.editUrlValue = null
        })
      },
      editSavedUrl () {
        this.editUrlDialog = false
        this.editUrl({oldUrl: this.editUrlInitialValue, newUrl: this.editUrlValue})
        Vue.nextTick(() => {
          this.editUrlInitialValue = null
          this.editUrlValue = null
        })
      }
    }
  }
</script>

<style scoped>
</style>
