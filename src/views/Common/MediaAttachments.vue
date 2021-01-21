<template>
  <v-card style="height: 100%">
    <v-dialog
      v-model="deleteDialog"
      max-width="350"
      persistent
      @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Delete media attachment
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete this media attachment? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelDeleteAttachment">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="deleteAttachment">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="attachError"
      max-width="350"
      persistent
      @keydown.esc="attachError = false">
      <v-card v-if="attachError">
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-alert-circle-outline</v-icon>
          Error attaching file
        </v-card-title>
        <v-card-text>
          {{attachErrorMessage}}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="hideError">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card-title>
      <v-icon color="primary" class="pr-2">mdi-paperclip</v-icon>
      Feature Media Attachments
      <v-spacer/>
      <v-btn :loading="attaching" text color="primary" @click.stop="attach"><v-icon small >mdi-plus</v-icon> Attachment</v-btn>
      <v-btn icon @click="toggleFullScreen"><v-icon>{{isFullScreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'}}</v-icon></v-btn>
    </v-card-title>
    <v-card-text class="pb-0" style="height: calc(100% - 114px)">
      <v-carousel v-model="model" v-if="attachments.length > 0"
                  :dark="$vuetify.theme.dark"
                  :light="!$vuetify.theme.dark"
                  :height="'100% !important'">
        <template v-slot:prev="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
          ><v-icon>mdi-chevron-left</v-icon></v-btn>
        </template>
        <template v-slot:next="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
          ><v-icon>mdi-chevron-right</v-icon></v-btn>
        </template>
        <v-carousel-item
          v-for="(attachment, i) in attachments"
          :key="i + '-media'"
        >
          <v-card
            tile
            flat
            style="height: 100%; min-height: 500px;"
          >
            <v-card-text class="pa-0" style="height: calc(100% - 50px);">
              <iframe v-if="!loadingContent && model === i" class="iframe" :id="i + '-iframe'" :src="contentSrc" frameborder="0" seamless width="100%" height="100%" style="display: none;"></iframe>
            </v-card-text>
          </v-card>
        </v-carousel-item>
      </v-carousel>
      <v-card-subtitle v-else>This feature has no media attachments.</v-card-subtitle>
      <v-snackbar
        v-if="downloaded"
        v-model="downloaded"
        timeout="2000"
        absolute
      >
        Attachment downloaded.
      </v-snackbar>
    </v-card-text>
    <v-card-actions>
      <v-btn :disabled="attaching" v-if="attachments.length > 0" @click="showDeleteAttachmentDialog()" text color="warning">Delete</v-btn>
      <v-btn :disabled="attaching" v-if="attachments.length > 0" text color="primary" @click.stop="downloadAttachment">Download</v-btn>
      <v-spacer></v-spacer>
      <v-btn
        :disabled="attaching"
        text
        @click="back">
        Close
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import { remote, ipcRenderer } from 'electron'
  import _ from 'lodash'
  import jetpack from 'fs-jetpack'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import ActionUtilities from '../../lib/ActionUtilities'
  import MediaUtilities from '../../lib/MediaUtilities'
  import FileUtilities from '../../lib/FileUtilities'

  export default {
    props: {
      projectId: String,
      geopackagePath: String,
      id: String,
      isGeoPackage: Boolean,
      tableName: String,
      featureId: Number,
      back: Function,
      toggleFullScreen: Function,
      isFullScreen: Boolean
    },
    data () {
      return {
        attaching: false,
        model: -1,
        attachments: [],
        deleteDialog: false,
        loadingContent: false,
        contentSrc: null,
        loading: true,
        attachError: false,
        attachErrorMessage: '',
        downloaded: false
      }
    },
    methods: {
      async loadContent (mediaToLoad) {
        this.loadingContent = true
        this.contentSrc = await GeoPackageUtilities.getMediaObjectUrl(this.geopackagePath, mediaToLoad.relatedTable, mediaToLoad.relatedId)
        this.$nextTick(() => {
          this.loadingContent = false
        })
      },
      hideError () {
        this.attachError = false
        this.attachErrorMessage = ''
      },
      showDeleteAttachmentDialog () {
        this.deleteDialog = true
      },
      cancelDeleteAttachment () {
        this.deleteDialog = false
      },
      async deleteAttachment () {
        const self = this
        let currentIndex = this.model
        const attachmentToDelete = this.attachments.splice(currentIndex, 1)[0]

        if (currentIndex > this.attachments.length - 1) {
          this.model = currentIndex - 1
        } else {
          this.loadContent(this.attachments[this.model])
        }

        await GeoPackageUtilities.deleteMediaAttachment(this.geopackagePath, attachmentToDelete)
        if (self.isGeoPackage) {
          ActionUtilities.synchronizeGeoPackage({projectId: self.projectId, geopackageId: self.id})
        } else {
          ActionUtilities.updateStyleKey(self.projectId, self.id, self.tableName, self.isGeoPackage)
        }
        this.cancelDeleteAttachment()
      },
      async downloadAttachment () {
        remote.dialog.showSaveDialog({
          title: 'Save Attachment',
          defaultPath: 'attachment'
        }).then(async ({canceled, filePath}) => {
          if (!canceled && !_.isNil(filePath)) {
            const mediaRow = await GeoPackageUtilities.getMediaRow(this.geopackagePath, this.attachments[this.model].relatedTable, this.attachments[this.model].relatedId)
            const extension = MediaUtilities.getExtension(mediaRow.contentType)
            let file = filePath
            if (extension !== false) {
              file = filePath + '.' + extension
            }
            await jetpack.writeAsync(file, mediaRow.data)
            this.downloaded = true
          }
        })
      },
      attach () {
        const self = this
        self.attaching = true
        remote.dialog.showOpenDialog({
          properties: ['openFile']
        }).then((result) => {
          if (result.filePaths && !_.isEmpty(result.filePaths)) {
            const filePath = result.filePaths[0]
            self.$nextTick(() => {
              if (!MediaUtilities.exceedsFileSizeLimit(filePath)) {
                ipcRenderer.once('attach_media_completed_' + this.id, (event, success) => {
                  if (success) {
                    GeoPackageUtilities.getMediaRelationships(self.geopackagePath, self.tableName, self.featureId).then(relationships => {
                      self.attachments = relationships
                      self.model = relationships.length - 1
                    })
                  }
                  self.attaching = false
                })
                ipcRenderer.send('attach_media', {
                  projectId: self.projectId,
                  id: this.id,
                  isGeoPackage: self.isGeoPackage,
                  geopackagePath: self.geopackagePath,
                  tableName: self.tableName,
                  featureId: self.featureId,
                  filePath: result.filePaths[0]
                })
              } else {
                self.attaching = false
                self.attachErrorMessage = 'File exceeds maximum file size allowed of ' + FileUtilities.toHumanReadable(MediaUtilities.getMaxFileSize())
                self.attachError = true
              }
            })
          } else {
            self.attaching = false
          }
        }).catch(e => {
          // eslint-disable-next-line no-console
          console.error(e)
          self.attaching = false
          self.attachErrorMessage = 'Unable to attach file'
          self.attachError = true
        })
      }
    },
    mounted () {
      GeoPackageUtilities.getMediaRelationships(this.geopackagePath, this.tableName, this.featureId).then(attachments => {
        this.attachments = attachments
        this.loading = false
      })
    },
    beforeDestroy () {
      ipcRenderer.removeAllListeners('attach_media_completed_' + this.id)
    },
    watch: {
      model: {
        async handler (newValue) {
          if (newValue >= 0 && this.attachments.length > 0) {
            this.loadContent(this.attachments[newValue])
          } else {
            this.contentSrc = null
          }
        }
      },
      loading: {
        handler (newValue) {
          this.$nextTick(() => {
            if (!newValue) {
              if (this.attachments.length > 0) {
                this.model = 0
              }
            }
          })
        }
      },
      loadingContent: {
        async handler () {
          if (this.loadingContent === false) {
            const isDark = this.$vuetify.theme.dark
            this.$nextTick(() => {
              const frame = document.getElementById(this.model + '-iframe')
              frame.onload = function () {
                const body = frame.contentWindow.document.querySelector('body')
                if (body) {
                  body.style.color = isDark ? 'whitesmoke' : '#000'
                }
                const img = frame.contentWindow.document.querySelector('img')
                if (img) {
                  img.style['object-fit'] = 'scale-down'
                  img.style['width'] = '100%'
                  img.style['height'] = '100%'
                }
                const svg = frame.contentWindow.document.querySelector('svg')
                if (svg) {
                  svg.style['object-fit'] = 'scale-down'
                  svg.style['width'] = '100%'
                  svg.style['height'] = '100%'
                }
                frame.style.display = 'inherit'
              }
            })
          }
        }
      }
    }
  }
</script>

<style scoped>
  .iframe {
    background-color: var(--v-background-base) !important;
    color: var(--v-text-base) !important;
  }
  .v-carousel {
    min-height: 450px !important;
    height: 100% !important;
  }
</style>
