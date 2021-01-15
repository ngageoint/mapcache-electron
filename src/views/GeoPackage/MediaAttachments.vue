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
      <v-btn :loading="attaching" text color="primary" @click.stop="attach">Add attachment</v-btn>
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
      <v-btn v-if="attachments.length > 0" @click="showDeleteAttachmentDialog()" text color="warning">Delete</v-btn>
      <v-btn v-if="attachments.length > 0" text color="primary" @click.stop="downloadAttachment">Download</v-btn>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="back">
        Close
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import { remote } from 'electron'
  import _ from 'lodash'
  import jetpack from 'fs-jetpack'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import ActionUtilities from '../../lib/ActionUtilities'
  import MediaUtilities from '../../lib/MediaUtilities'
  import FileUtilities from '../../lib/FileUtilities'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
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
        attachmentToDelete: -1,
        deleteDialog: false,
        loadingContent: false,
        contentSrc: null,
        loading: true,
        attachError: false,
        attachErrorMessage: '',
        downloaded: false
      }
    },
    asyncComputed: {
      attachments: {
        get () {
          const attachments = GeoPackageUtilities.getMediaRelationships(this.geopackage.path, this.tableName, this.featureId)
          this.loading = false
          return attachments
        },
        default: []
      }
    },
    methods: {
      hideError () {
        this.attachError = false
        this.attachErrorMessage = ''
      },
      showDeleteAttachmentDialog () {
        this.deleteDialog = true
      },
      cancelDeleteAttachment () {
        this.deleteDialog = false
        this.attachmentToDelete = -1
      },
      async deleteAttachment () {
        const self = this
        const attachments = this.attachments.slice()
        let currentIndex = this.model
        const attachmentToDelete = attachments.splice(currentIndex, 1)[0]
        await GeoPackageUtilities.deleteMediaAttachment(this.geopackage.path, attachmentToDelete)
        // check if current index is at edge
        if (attachments.length - 1 < currentIndex) {
          currentIndex = currentIndex - 1
        }
        this.loadingContent = true
        const mediaToLoad = attachments[currentIndex]
        this.contentSrc = await GeoPackageUtilities.getMediaObjectUrl(this.geopackage.path, mediaToLoad.relatedTable, mediaToLoad.relatedId)
        this.$nextTick(() => {
          this.loadingContent = false
        })
        ActionUtilities.synchronizeGeoPackage({projectId: self.projectId, geopackageId: self.geopackage.id})
        this.cancelDeleteAttachment()
      },
      async downloadAttachment () {
        remote.dialog.showSaveDialog({
          title: 'Save Attachment',
          defaultPath: 'attachment'
        }).then(async ({canceled, filePath}) => {
          if (!canceled && !_.isNil(filePath)) {
            const mediaRow = await GeoPackageUtilities.getMediaRow(this.geopackage.path, this.attachments[this.model].relatedTable, this.attachments[this.model].relatedId)
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
        remote.dialog.showOpenDialog({
          properties: ['openFile']
        }).then((result) => {
          if (result.filePaths && !_.isEmpty(result.filePaths)) {
            const filePath = result.filePaths[0]
            if (!MediaUtilities.exceedsFileSizeLimit(filePath)) {
              self.attaching = true
              self.$nextTick(() => {
                GeoPackageUtilities.addMediaAttachment(self.geopackage.path, self.tableName, self.featureId, result.filePaths[0]).then((success) => {
                  self.attaching = false
                  ActionUtilities.synchronizeGeoPackage({projectId: self.projectId, geopackageId: self.geopackage.id})
                  if (success) {
                    GeoPackageUtilities.getMediaRelationships(self.geopackage.path, self.tableName, self.featureId).then(relationships => {
                      self.attachments = relationships
                      self.model = relationships.length - 1
                    })
                  }
                })
              })
            } else {
              this.attachErrorMessage = 'File exceeds maximum file size allowed of ' + FileUtilities.toHumanReadable(MediaUtilities.getMaxFileSize())
              this.attachError = true
            }
          }
        })
      }
    },
    watch: {
      model: {
        handler (newValue) {
          this.$nextTick(async () => {
            this.loadingContent = true
            const mediaToLoad = this.attachments[newValue]
            this.contentSrc = await GeoPackageUtilities.getMediaObjectUrl(this.geopackage.path, mediaToLoad.relatedTable, mediaToLoad.relatedId)
            this.$nextTick(() => {
              this.loadingContent = false
            })
          })
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
