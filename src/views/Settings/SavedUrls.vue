<template>
  <v-card>
    <v-dialog v-model="deleteUrlDialog" max-width="400" persistent @keydown.esc="cancelDeleteUrl">
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
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
    <v-dialog v-model="addUrlDialog" max-width="400" persistent @keydown.esc="cancelAddNewUrl">
      <edit-text-modal v-if="addUrlDialog" prevent-spaces autofocus :icon="mdiPencil" title="Add URL" :rules="urlRules" save-text="Add" :on-cancel="cancelAddNewUrl" :value="addUrlValue" font-size="16px" font-weight="bold" label="URL" :on-save="addNewUrl"/>
    </v-dialog>
    <v-dialog v-model="editUrlDialog" max-width="400" persistent @keydown.esc="cancelEditUrl">
      <edit-text-modal v-if="editUrlDialog" prevent-spaces autofocus :icon="mdiPencil" title="Edit URL" :rules="editUrlRules" save-text="Save" :on-cancel="cancelEditUrl" :value="editUrlValue" font-size="16px" font-weight="bold" label="URL" :on-save="editSavedUrl"/>
    </v-dialog>
    <v-card-title>
      <v-icon color="primary" class="pr-2">{{mdiCloudOutline}}</v-icon>
      Saved URLs
    </v-card-title>
    <v-card-text class="pb-0">
      <v-card-subtitle v-if="urls.length === 0">No saved urls.</v-card-subtitle>
      <v-list style="max-height: 400px;" v-else>
        <v-list-item dense :key="item" v-for="item in urls.map(url => url.url)">
          <v-list-item-content>
            <span class="text-break">{{item}}</span>
          </v-list-item-content>
          <v-list-item-action>
            <v-row no-gutters justify="end">
              <v-btn icon color="primary" @click.stop.prevent="showEditUrlDialog(item)">
                <v-icon>{{mdiPencil}}</v-icon>
              </v-btn>
              <v-btn icon color="warning" @click.stop.prevent="showDeleteUrlDialog(item)">
                <v-icon>{{mdiTrashCan}}</v-icon>
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
</template>

<script>
import {mapActions, mapState} from 'vuex'
import {mdiCloudOutline, mdiPencil, mdiTrashCan} from '@mdi/js'
import EditTextModal from '../Common/EditTextModal'

export default {
    components: {
      EditTextModal
    },
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
        mdiPencil: mdiPencil,
        mdiTrashCan: mdiTrashCan,
        mdiCloudOutline: mdiCloudOutline,
        urlToDelete: null,
        deleteUrlDialog: false,
        savedUrlDialog: false,
        addUrlValue: 'https://',
        addUrlDialog: false,
        urlRules: [
          v => !!v || 'URL is required',
          v => window.mapcache.isUrlValid(v) || 'Invalid URL',
          v => !this.urls.find(url => url.url.toLowerCase() === v) || 'URL already exists'
        ],
        urlValid: false,
        editUrlValue: null,
        editUrlInitialValue: null,
        editUrlDialog: false,
        editUrlRules: [
          v => !!v || 'URL is required',
          v => window.mapcache.isUrlValid(v) || 'Invalid URL',
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
        this.$nextTick(() => {
          this.addUrlDialog = true
        })
      },
      addNewUrl (url) {
        this.addUrlDialog = false
        this.addUrl({url})
      },
      cancelDeleteUrl () {
        this.deleteUrlDialog = false
        this.$nextTick(() => {
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
        this.$nextTick(() => {
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
        this.$nextTick(() => {
          this.editUrlInitialValue = null
          this.editUrlValue = null
        })
      },
      editSavedUrl (url) {
        this.editUrlDialog = false
        this.editUrl({oldUrl: this.editUrlInitialValue, newUrl: url})
        this.$nextTick(() => {
          this.editUrlInitialValue = null
          this.editUrlValue = null
        })
      }
    }
  }
</script>

<style scoped>
</style>
