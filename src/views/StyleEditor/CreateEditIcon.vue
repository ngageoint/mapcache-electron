<template>
  <v-card>
    <v-dialog
      v-model="deleteDialog"
      max-width="350"
      persistent
      @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete icon
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the <b>{{this.iconRow.name}}</b> icon? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="deleteIcon">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card-title>{{isNew ? 'Create Icon' : 'Edit Icon'}}</v-card-title>
    <v-card-text>
      <v-form v-on:submit.prevent v-model="formValid">
        <v-row no-gutters>
          <v-col cols="4" align-self="center">
            <v-row no-gutters justify="center" align="center">
              <v-card @click.stop="getIconClick" class="pa-0 ma-0" style="width: 112px; height: 112px;">
                <v-row no-gutters justify="center" style="height: 100%;">
                  <v-col align-self="center">
                    <v-row no-gutters justify="center" class="pa-0 mx-auto">
                      <img class="icon" :src="iconUrl"/>
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
                <v-text-field autofocus label="Name" :rules="nameRules" v-model="name"></v-text-field>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <v-text-field label="Description" v-model="description"></v-text-field>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
        <v-row no-gutters align="center">
          <v-col cols="5">
            <v-text-field v-model.number="width" v-on:input="setWidth($event)" :rules="widthRules" type="number" label="width" :step="Number(1)" @keydown="handleKeyDown($event)"/>
          </v-col>
          <v-col cols="2">
            <v-btn icon @click="toggleAspectRatioLock" :title="aspectRatioLock ? 'Unlock aspect ratio' : 'Lock aspect ratio'"><v-icon>{{aspectRatioLock ? mdiLink : mdiLinkOff}}</v-icon></v-btn>
          </v-col>
          <v-col cols="5">
            <v-text-field v-model.number="height" v-on:input="setHeight($event)" :rules="heightRules"  type="number" label="height" :step="Number(1)" @keydown="handleKeyDown($event)"/>
          </v-col>
        </v-row>
        <v-row no-gutters class="pt-2">
          <v-col cols="5">
            <v-select v-model="anchorSelection" :items="anchorLocations" label="Anchor" dense/>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn
        v-if="iconRow.id !== null && iconRow.id !== undefined"
        color="warning"
        text
        @click="deleteDialog = true">
        Delete
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        Close
      </v-btn>
      <v-btn
        v-if="formValid"
        color="primary"
        text
        @click="save">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import jetpack from 'fs-jetpack'
  import fs from 'fs'
  import path from 'path'
  import isNil from 'lodash/isNil'
  import isEmpty from 'lodash/isEmpty'
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import { mdiTrashCan, mdiLink, mdiLinkOff } from '@mdi/js'

  export default {
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
        mdiTrashCan: mdiTrashCan,
        mdiLink: mdiLink,
        mdiLinkOff: mdiLinkOff,
        formValid: true,
        name: this.iconRow.name,
        data: this.iconRow.data,
        width: this.iconRow.width,
        height: this.iconRow.height,
        anchorU: this.iconRow.anchorU,
        anchorV: this.iconRow.anchorV,
        contentType: this.iconRow.contentType,
        description: this.iconRow.description,
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
      anchorSelection: {
        get () {
          return this.getAnchorLocation(this.anchorU, this.anchorV)
        },
        set (value) {
          let result = this.getAnchorUV(value)
          this.anchorU = result.anchorU
          this.anchorV = result.anchorV
        }
      },
      iconUrl: {
        get () {
          return 'data:' + this.contentType + ';base64,' + this.data.toString('base64')
        }
      },
      anchorLocations () {
        let anchorLocations = []
        anchorLocations.push({text: 'Bottom Center', value: 0})
        anchorLocations.push({text: 'Bottom Left', value: 1})
        anchorLocations.push({text: 'Bottom Right', value: 2})
        anchorLocations.push({text: 'Top Center', value: 3})
        anchorLocations.push({text: 'Top Left', value: 4})
        anchorLocations.push({text: 'Top Right', value: 5})
        anchorLocations.push({text: 'Center', value: 6})
        anchorLocations.push({text: 'Center Left', value: 7})
        anchorLocations.push({text: 'Center Right', value: 8})
        return anchorLocations
      }
    },
    methods: {
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
      deleteIcon () {
        ProjectActions.deleteIconRow({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          iconId: this.iconRow.id,
          isGeoPackage: this.isGeoPackage,
          isBaseMap: this.isBaseMap
        })
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
          ProjectActions.updateIconRow({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            iconRow: iconRow,
            isGeoPackage: this.isGeoPackage,
            isBaseMap: this.isBaseMap
          })
        } else {
          ProjectActions.createIconRow({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            icon: iconRow,
            isGeoPackage: this.isGeoPackage,
            isBaseMap: this.isBaseMap
          })
        }
        this.close()
      },
      getAnchorUV (anchorLocation) {
        let result = {}
        if (anchorLocation === 0) {
          result.anchorU = 0.5
          result.anchorV = 1.0
        } else if (anchorLocation === 1) {
          result.anchorU = 0
          result.anchorV = 1.0
        } else if (anchorLocation === 2) {
          result.anchorU = 1.0
          result.anchorV = 1.0
        } else if (anchorLocation === 3) {
          result.anchorU = 0.5
          result.anchorV = 0
        } else if (anchorLocation === 4) {
          result.anchorU = 0
          result.anchorV = 0
        } else if (anchorLocation === 5) {
          result.anchorU = 1.0
          result.anchorV = 0
        } else if (anchorLocation === 6) {
          result.anchorU = 0.5
          result.anchorV = 0.5
        } else if (anchorLocation === 7) {
          result.anchorU = 0
          result.anchorV = 0.5
        } else if (anchorLocation === 8) {
          result.anchorU = 1.0
          result.anchorV = 0.5
        }
        return result
      },
      getAnchorLocation (anchorU, anchorV) {
        let anchorLoc = 0
        if (anchorU === 0) {
          if (anchorV === 0) {
            anchorLoc = 4
          } else if (anchorV === 0.5) {
            anchorLoc = 7
          } else if (anchorV === 1) {
            anchorLoc = 1
          }
        } else if (anchorU === 0.5) {
          if (anchorV === 0) {
            anchorLoc = 3
          } else if (anchorV === 0.5) {
            anchorLoc = 6
          } else if (anchorV === 1) {
            anchorLoc = 0
          }
        } else if (anchorU === 1) {
          if (anchorV === 0) {
            anchorLoc = 5
          } else if (anchorV === 0.5) {
            anchorLoc = 8
          } else if (anchorV === 1) {
            anchorLoc = 2
          }
        }
        return anchorLoc
      },
      getIconClick () {
        window.mapcache.showOpenDialog({
          filters: [
            {
              name: 'All Files',
              extensions: ['jpeg', 'jpg', 'gif', 'png']
            }
          ],
          properties: ['openFile']
        }).then(async (result) => {
          if (result.filePaths && !isEmpty(result.filePaths)) {
            for (const file of result.filePaths) {
              const fileInfo = jetpack.inspect(file, {times: true, absolutePath: true})
              let extension = path.extname(fileInfo.absolutePath).slice(1)
              if (extension === 'jpg') {
                extension = 'jpeg'
              }
              let url = 'data:image/' + extension + ';base64,' + fs.readFileSync(fileInfo.absolutePath).toString('base64')
              const uploadedImage = await new Promise(function (resolve) {
                const image = new Image()
                image.onload = () => { resolve(image) }
                image.src = url
              })
              this.aspectRatio = uploadedImage.width / uploadedImage.height
              this.width = uploadedImage.width
              this.height = uploadedImage.height
              this.contentType = 'image/' + extension
              this.data = Buffer.from(url.split(',')[1], 'base64')
            }
          }
        })
      }
    }
  }
</script>

<style>
  .icon {
    width: 48px;
    height: 48px;
    display: block;
    object-fit: contain;
  }
</style>
