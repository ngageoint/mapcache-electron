<template>
  <v-card class="betterRendering">
    <v-dialog
        v-model="deleteDialog"
        max-width="350"
        persistent
        @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
          Delete icon
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the <b>{{ this.iconRow.name }}</b> icon? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="deleteIcon">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="anchorDialog"
        max-width="350"
        persistent
        @keydown.esc="anchorDialog = false">
      <v-card style="overflow: hidden;">
        <v-card-title>
          <v-icon color="primary" class="pr-2" icon="mdi-anchor"/>
          Set anchor position
        </v-card-title>
        <v-card-text style="overflow: hidden;">
          Click on the icon to set the anchor point or type it in. The icon's anchor point will be positioned at the feature's geographical location.
          <v-row justify="center" style="overflow: hidden;">
            <v-img id="create-edit-icon" v-observe-visibility="imageVisibilityChanged" @click="handleAnchorChange" class="ma-4 clickable" contain :max-width="displayWidth" :max-height="displayHeight" :src="iconUrl"></v-img>
          </v-row>
          <v-icon id="create-edit-icon-anchor" v-show="anchorLeft !== 0 && anchorTop !== 0 && anchorUValid && anchorVValid" color="red" :style="{position: 'fixed', top: anchorTop, left: anchorLeft}">{{mdiTargetVariant}}</v-icon>
          <v-row>
            <v-col class="pl-2 pr-2" cols="6">
              <number-picker :number="anchorU" :min="0.0" :max="1.0" :step="0.05" label="Horizontal anchor %" @update-number="(val) => {this.anchorU = val}" @update-valid="(val) => {this.anchorUValid = val}"></number-picker>
            </v-col>
            <v-col class="pr-2" cols="6">
              <number-picker :number="anchorV" :min="0.0" :max="1.0" :step="0.05" label="Vertical anchor %" @update-number="(val) => {this.anchorV = val}" @update-valid="(val) => {this.anchorVValid = val}"></number-picker>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="acceptAnchorUpdates">
            Close
          </v-btn>
          <v-btn
              :disabled="iconRow != null && iconRow.anchorU === anchorU && iconRow.anchorV === anchorV"
              color="red"
              variant="text"
              @click="resetAnchor">
            Reset
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card-title>{{ isNew ? 'Create icon' : 'Edit icon' }}</v-card-title>
    <v-card-text>
      <v-form v-on:submit.prevent v-model="formValid">
        <v-row no-gutters>
          <v-col cols="4" align-self="center">
            <v-row no-gutters justify="center" align="center">
              <v-card @click.stop="getIconClick" class="pa-0 ma-0" style="width: 112px; height: 112px;">
                <v-row no-gutters justify="center" style="height: 100%;">
                  <v-col align-self="center">
                    <v-row no-gutters justify="center" class="pa-0 mx-auto">
                      <v-img class="square-icon" :src="iconUrl"/>
                    </v-row>
                    <v-row no-gutters justify="center" class="pa-0 mx-auto">
                      Browse...
                    </v-row>
                  </v-col>
                </v-row>
              </v-card>
            </v-row>
          </v-col>
          <v-col offset="1" cols="7">
            <v-row no-gutters justify="start">
              <v-col>
                <v-text-field variant="underlined" autofocus label="Name" :rules="nameRules" v-model="name"></v-text-field>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <v-text-field variant="underlined" label="Description" v-model="description"></v-text-field>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
        <v-row no-gutters align="center">
          <v-col cols="5">
            <v-text-field variant="underlined" v-model.number="width" v-on:input="setWidth($event)" :rules="widthRules" type="number"
                          label="Width (px)" :step="Number(1)" @keydown="handleKeyDown($event)"/>
          </v-col>
          <v-spacer/>
          <v-btn variant="text" :icon="aspectRatioLock ? 'mdi-link-variant' : 'mdi-link-variant-off'" @click="toggleAspectRatioLock" :title="aspectRatioLock ? 'Unlock aspect ratio' : 'Lock aspect ratio'"/>
          <v-spacer/>
          <v-col cols="5">
            <v-text-field variant="underlined" v-model.number="height" v-on:input="setHeight($event)" :rules="heightRules" type="number"
                          label="Height (px)" :step="Number(1)" @keydown="handleKeyDown($event)"/>
          </v-col>
        </v-row>
        <v-row no-gutters class="pt-2">
          <v-col cols="5">
            <v-btn variant="text" @click="anchorDialog = true" prepend-icon="mdi-anchor">Set anchor</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn
          v-if="iconRow.id !== null && iconRow.id !== undefined"
          color="warning"
          variant="text"
          @click="deleteDialog = true">
        Delete
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="close">
        Close
      </v-btn>
      <v-btn
          :disabled="!formValid"
          color="primary"
          variant="text"
          @click="save">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import NumberPicker from '../Common/NumberPicker.vue'
import debounce from 'lodash/debounce'
import { createIconRow, deleteIconRow, updateIconRow } from '../../lib/vue/vuex/ProjectActions'
import { base64toUInt8Array } from '../../lib/util/Base64Utilities'

export default {
  components: { NumberPicker },
  props: {
    id: String,
    tableName: String,
    geometryType: String,
    iconRow: Object,
    projectId: String,
    isGeoPackage: {
      type: Boolean,
      default: true
    },
    isBaseMap: {
      type: Boolean,
      default: false
    },
    close: Function
  },
  data () {
    return {
      formValid: true,
      name: this.iconRow.name,
      data: this.iconRow.data,
      width: this.iconRow.width,
      height: this.iconRow.height,
      anchor: null,
      anchorU: this.iconRow.anchorU,
      anchorV: this.iconRow.anchorV,
      anchorTop: 0,
      anchorLeft: 0,
      contentType: this.iconRow.contentType,
      description: this.iconRow.description,
      anchorDialog: false,
      anchorUValid: true,
      anchorVValid: true,
      deleteDialog: false,
      aspectRatioLock: true,
      isNew: isNil(this.iconRow.id),
      aspectRatio: this.iconRow.width / this.iconRow.height,
      widthRules: [
        v => (v !== null && v !== undefined && v.toString().length > 0) || 'Width is required',
        v => v >= 1 || 'Width must be at least 1 pixel',
        v => v <= 128 || 'Width must be at most 128 pixels'
      ],
      heightRules: [
        v => (v !== null && v !== undefined && v.toString().length > 0) || 'Height is required',
        v => v >= 1 || 'Height must be at least 1 pixel',
        v => v <= 128 || 'Height must be at most 128 pixels'
      ],
      nameRules: [
        v => !!v || 'Name is required'
      ]
    }
  },
  computed: {
    iconUrl: {
      get () {
        return 'data:' + this.contentType + ';base64,' + this.data.toString('base64')
      }
    },
    displayWidth: {
      get () {
        return this.width >= this.height ? 128 : Math.ceil(this.width / this.height * 128)
      }
    },
    displayHeight: {
      get () {
        return this.height >= this.width ? 128 : Math.ceil(this.height / this.width * 128)
      }
    }
  },
  mounted () {
    this.debounceUpdateAnchorPosition = debounce(this.updateAnchorPosition, 50)
  },
  methods: {
    resetAnchor () {
      this.anchorU = this.iconRow.anchorU
      this.anchorV = this.iconRow.anchorV
    },
    acceptAnchorUpdates () {
      this.anchorDialog = false
      this.$nextTick(() => {
        this.anchorUValid = true
        this.anchorVValid = true
        this.anchorTop = 0
        this.anchorLeft = 0
      })
    },
    handleAnchorChange (event) {
      const width = this.displayWidth
      const height = this.displayHeight
      const image = document.getElementById('create-edit-icon-anchor')
      if (image != null) {
        this.anchorU = Math.min(1, Math.max(0, Number((event.offsetX / width).toFixed(3))))
        this.anchorV = Math.min(1, Math.max(0, Number((event.offsetY / height).toFixed(3))))
      }
    },
    updateAnchorPosition () {
      const image = document.getElementById('create-edit-icon')
      const anchor = document.getElementById('create-edit-icon-anchor')
      const rect = image.getBoundingClientRect()
      if (rect != null && anchor != null) {
        this.anchorLeft = Math.round(rect.left + (this.displayWidth * this.anchorU) - 12) + 'px'
        this.anchorTop = Math.round(rect.top + (this.displayHeight * this.anchorV) - 12) + 'px'
      }
    },
    handleKeyDown: (e) => {
      if (e.keyCode === 69) {
        e.stopPropagation()
        e.preventDefault()
        return false
      }
    },
    setWidth (val, quiet = false) {
      this.width = Math.floor(val)
      if (!quiet && this.aspectRatioLock) {
        this.setHeight(val / this.aspectRatio, true)
      }
    },
    setHeight (val, quiet = false) {
      this.height = Math.floor(val)
      if (!quiet && this.aspectRatioLock) {
        this.setWidth(val * this.aspectRatio, true)
      }
    },
    toggleAspectRatioLock () {
      this.aspectRatioLock = !this.aspectRatioLock
      this.aspectRatio = this.width / this.height
    },
    async deleteIcon () {
      await deleteIconRow(this.projectId, this.id, this.iconRow.id, this.isGeoPackage, this.isBaseMap)
      this.close()
    },
    save () {
      const iconRow = {
        data: this.data,
        width: this.width,
        height: this.height,
        anchorU: this.anchorU,
        anchorV: this.anchorV,
        name: this.name,
        description: this.description,
        contentType: this.contentType
      }
      if (this.iconRow.id) {
        iconRow.id = this.iconRow.id
        updateIconRow(this.projectId, this.id, this.tableName, iconRow, this.isGeoPackage, this.isBaseMap)
      } else {
        createIconRow(this.projectId, this.id, this.tableName, iconRow, this.isGeoPackage, this.isBaseMap)
      }
      this.close()
    },
    imageVisibilityChanged (isVisible) {
      if (isVisible) {
        setTimeout(() => {
          if (this.anchorDialog) {
            this.debounceUpdateAnchorPosition()
          }
        }, 500)
      }
    },
    getIconClick () {
      window.mapcache.showOpenDialog({
        filters: [
          {
            name: 'Image files',
            extensions: ['jpeg', 'jpg', 'png']
          }
        ],
        properties: ['openFile']
      }).then(async (result) => {
        if (result.filePaths && !isEmpty(result.filePaths)) {
          for (const file of result.filePaths) {
            const { extension, url } = window.mapcache.getIconImageData(file)
            const uploadedImage = await new Promise(function (resolve) {
              const image = new Image()
              image.onload = () => {
                resolve(image)
              }
              image.src = url
            })
            this.aspectRatio = uploadedImage.width / uploadedImage.height
            this.width = uploadedImage.width
            this.height = uploadedImage.height
            this.contentType = 'image/' + extension
            this.data = base64toUInt8Array(url)
          }
        }
      })
    },
  },
  watch: {
    anchorU: {
      handler () {
        this.debounceUpdateAnchorPosition()
      }
    },
    anchorV: {
      handler () {
        this.debounceUpdateAnchorPosition()
      }
    },
  }
}
</script>

<style>
.square-icon {
  width: 48px;
  height: 48px;
  display: block;
  object-fit: contain;
}
.betterRendering {
  image-rendering: crisp-edges;
}
</style>
