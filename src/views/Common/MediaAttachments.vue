<template>
  <v-card style="height: 100%">
    <v-dialog
      v-model="deleteDialog"
      max-width="350"
      persistent
      @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
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
          <v-icon color="warning" class="pr-2">{{mdiAlertCircle}}</v-icon>
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
      <v-icon color="primary" class="pr-2">{{mdiPaperclip}}</v-icon>
      Feature attachments
      <v-spacer/>
      <v-btn :loading="attaching" text color="primary" @click.stop="attach"><v-icon small >{{mdiPlus}}</v-icon> attachment</v-btn>
      <v-btn icon @click="toggleFullScreen"><v-icon>{{isFullScreen ? mdiFullscreenExit : mdiFullscreen}}</v-icon></v-btn>
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
          ><v-icon>{{mdiChevronLeft}}</v-icon></v-btn>
        </template>
        <template v-slot:next="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
          ><v-icon>{{mdiChevronRight}}</v-icon></v-btn>
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
      <v-card-subtitle v-else>This feature has no attachments.</v-card-subtitle>
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
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import {
  mdiAlertCircle,
  mdiChevronLeft,
  mdiChevronRight,
  mdiFullscreen,
  mdiFullscreenExit,
  mdiPaperclip,
  mdiPlus,
  mdiTrashCan
} from '@mdi/js'

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
        mdiTrashCan: mdiTrashCan,
        mdiAlertCircle: mdiAlertCircle,
        mdiPaperclip: mdiPaperclip,
        mdiPlus: mdiPlus,
        mdiFullscreen: mdiFullscreen,
        mdiFullscreenExit: mdiFullscreenExit,
        mdiChevronLeft: mdiChevronLeft,
        mdiChevronRight: mdiChevronRight,
        attaching: false,
        model: null,
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
        this.contentSrc = (await window.mapcache.getMediaObjectUrl(this.geopackagePath, mediaToLoad.relatedTable, mediaToLoad.relatedId)).src
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

        await window.mapcache.deleteMediaAttachment(this.geopackagePath, attachmentToDelete)
        if (self.isGeoPackage) {
          window.mapcache.synchronizeGeoPackage({projectId: self.projectId, geopackageId: self.id})
        } else {
          window.mapcache.updateStyleKey(self.projectId, self.id, self.tableName, self.isGeoPackage)
        }
        this.cancelDeleteAttachment()
      },
      async downloadAttachment () {
        window.mapcache.showSaveDialog({
          title: 'Save attachment',
          defaultPath: 'attachment'
        }).then(async ({canceled, filePath}) => {
          if (!canceled && !isNil(filePath)) {
            await window.mapcache.downloadAttachment(filePath, this.geopackagePath, this.attachments[this.model].relatedTable, this.attachments[this.model].relatedId)
            this.downloaded = true
          }
        })
      },
      attach () {
        const self = this
        self.attaching = true
        window.mapcache.showOpenDialog({
          properties: ['openFile']
        }).then((result) => {
          if (result.filePaths && !isEmpty(result.filePaths)) {
            const filePath = result.filePaths[0]
            self.$nextTick(() => {
              if (!window.mapcache.exceedsFileSizeLimit(filePath)) {
                window.mapcache.attachMediaToGeoPackage({
                  projectId: self.projectId,
                  id: self.id,
                  isGeoPackage: self.isGeoPackage,
                  geopackagePath: self.geopackagePath,
                  tableName: self.tableName,
                  featureId: self.featureId,
                  filePath: result.filePaths[0]
                }).then((success) => {
                  if (success) {
                    if (self.isGeoPackage) {
                      window.mapcache.synchronizeGeoPackage({projectId: self.projectId, geopackageId: self.id})
                    } else {
                      window.mapcache.updateStyleKey(self.projectId, self.id, self.tableName, self.isGeoPackage)
                    }
                    self.$nextTick(() => {
                      window.mapcache.getMediaRelationships(self.geopackagePath, self.tableName, self.featureId).then(relationships => {
                        self.attachments = relationships
                        self.model = relationships.length - 1
                      })
                    })
                  }
                  self.attaching = false
                })
              } else {
                self.attaching = false
                self.attachErrorMessage = 'File exceeds maximum file size allowed of ' + window.mapcache.getMaxFileSizeString()
                self.attachError = true
              }
            })
          } else {
            self.attaching = false
          }
          // eslint-disable-next-line no-unused-vars
        }).catch(e => {
          // eslint-disable-next-line no-console
          console.error('Failed to attach file.')
          self.attaching = false
          self.attachErrorMessage = 'Unable to attach file'
          self.attachError = true
        })
      }
    },
    mounted () {
      window.mapcache.getMediaRelationships(this.geopackagePath, this.tableName, this.featureId).then(attachments => {
        this.attachments = attachments
        this.loading = false
      })
    },
    beforeDestroy () {
      window.mapcache.removeMediaCompletedListener(this.id)
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
