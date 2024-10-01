<template>
  <v-card class="pl-2 pr-2 pt-2">
    <v-dialog v-model="deleteUrlDialog" max-width="400" persistent @keydown.esc="cancelDeleteUrl">
      <v-card>
        <v-card-title>
          <v-icon icon="mdi-trash-can-outline" color="warning" class="pr-2"/>
          Delete url
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete {{ urlToDelete }} from your saved urls?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="cancelDeleteUrl">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="removeUrlFromHistory">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="addUrlDialog" max-width="400" persistent @keydown.esc="cancelAddNewUrl">
      <edit-text-modal v-if="addUrlDialog" prevent-spaces autofocus icon="mdi-pencil" title="Add url" :rules="urlRules"
                       save-text="Add" :on-cancel="cancelAddNewUrl" :value="addUrlValue" font-size="16px"
                       font-weight="bold" label="URL" :on-save="addNewUrl"/>
    </v-dialog>
    <v-dialog v-model="editUrlDialog" max-width="400" persistent @keydown.esc="cancelEditUrl">
      <edit-text-modal v-if="editUrlDialog" prevent-spaces autofocus icon="mdi-pencil" title="Edit url"
                       :rules="editUrlRules" save-text="Save" :on-cancel="cancelEditUrl" :value="editUrlValue"
                       font-size="16px" font-weight="bold" label="URL" :on-save="editSavedUrl"/>
    </v-dialog>
    <v-card-title>
      <v-icon color="primary" class="pr-2" icon="mdi-cloud-outline"></v-icon>
      Saved urls
    </v-card-title>
    <v-card-text v-if="!!urls" class="pb-0 pt-0">
      <v-card-subtitle v-if="!urls || urls.length === 0">No saved urls.</v-card-subtitle>
      <v-list style="max-height: 400px;" v-else>
        <v-list-item variant=text class="pa-0" density="compact" :key="item" v-for="item in urls">
          <v-list-item-title class="ma-0 pa-0 text-wrap" @click="copyText(item)">{{ item }}</v-list-item-title>
          <template v-slot:append>
            <v-row no-gutters justify="end">
              <v-btn variant="text" icon="mdi-pencil" color="primary" @click.stop.prevent="showEditUrlDialog(item)">
              </v-btn>
              <v-btn variant="text" icon="mdi-trash-can-outline" color="warning" @click.stop.prevent="showDeleteUrlDialog(item)">
              </v-btn>
            </v-row>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-btn
          variant="text"
          color="primary"
          @click="showAddUrlDialog">
        Add url
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="close">
        Close
      </v-btn>
    </v-card-actions>
  </v-card>
  <v-snackbar
      v-model="snackbar"
      :timeout="timeout"
    >
      URL copied
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import EditTextModal from '../Common/EditTextModal.vue'

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
        return state.URLs.savedUrls.map(url => url.url)
      },
      urlRules: state => [
        v => !!v || 'Url is required',
        v => window.mapcache.isUrlValid(v) || 'Invalid url',
        v => !state.URLs.savedUrls.find(url => url.url.toLowerCase() === v.toLowerCase()) || 'Url already exists'
      ],
      editUrlRules: state => [
        v => !!v || 'Url is required',
        v => window.mapcache.isUrlValid(v) || 'Invalid url',
        v => v !== this.editUrlInitialValue || 'Url unchanged',
        v => !state.URLs.savedUrls.find(url => url.url.toLowerCase() === v.toLowerCase()) || 'Url already exists'
      ]
    })
  },
  data () {
    return {
      urlToDelete: null,
      deleteUrlDialog: false,
      savedUrlDialog: false,
      addUrlValue: 'https://',
      addUrlDialog: false,
      urlValid: false,
      editUrlValue: null,
      editUrlInitialValue: null,
      editUrlDialog: false,
      editUrlValid: false,
      snackbar: false,
      timeout: 2000
    }
  },
  methods: {
    ...mapActions({
      addUrl: 'URLs/addUrl',
      editUrl: 'URLs/editUrl',
      removeUrl: 'URLs/removeUrl'
    }),
    copyText(item) {
      this.snackbar = true;
      navigator.clipboard.writeText(item);
    },
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
      this.addUrl(url)
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
      this.editUrl({ oldUrl: this.editUrlInitialValue, newUrl: url })
      this.$nextTick(() => {
        this.editUrlInitialValue = null
        this.editUrlValue = null
      })
    }
  }
}
</script>

<style scoped>
.v-list-item:nth-child(even) {
  background: rgb(var(--v-theme-list_offset_background));
}

.v-list-item:nth-child(odd) {
  background: rgb(var(--v-theme-background));
}

.v-list-item {
  margin-top: 8px;
  margin-bottom: 8px;
}
</style>
