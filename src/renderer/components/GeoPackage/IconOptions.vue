<template>
  <expandable-card class="mb-2">
    <div slot="card-header">
      <v-row no-gutters class="justify-space-between" align="center">
        <v-col cols="10" class="align-center">
          <view-edit-text :editing-disabled="!allowIconNameEditing" :value="iconRow.name" :appendedText="showId ? ' (' + iconRow.id + ')' : ''" font-size="14px" font-weight="400" label="Icon Name" :on-save="saveName"/>
        </v-col>
        <v-col cols="2">
          <v-row no-gutters class="justify-end" align="center">
            <img class="icon-box" :src="iconUrl"/>
          </v-row>
        </v-col>
      </v-row>
    </div>
    <div slot="card-expanded-body">
      <div class="icon-options">
        <v-container>
          <v-row no-gutters class="icon-row">
            <v-col cols="10">
              <label class="v-label v-label--active theme--light v-label--active fs12">Icon</label>
              <img class="icon" :src="iconUrl" @click.stop="getIconClick"/>
            </v-col>
          </v-row>
          <v-row no-gutters class="justify-space-between">
            <v-col cols="6">
              <v-select v-model="anchorSelection" :items="anchorLocations" label="Anchor" dense/>
            </v-col>
            <v-col cols="6">
              <v-row v-if="deletable" no-gutters class="justify-end" align="center">
                <v-btn text dark color="#ff4444" @click.stop="deleteIcon()">
                  <v-icon>mdi-trash-can</v-icon> Delete Icon
                </v-btn>
              </v-row>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </div>
  </expandable-card>
</template>

<script>
  import { mapActions } from 'vuex'
  import ExpandableCard from '../Card/ExpandableCard'
  import ViewEditText from '../Common/ViewEditText'
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import fs from 'fs'
  import path from 'path'

  export default {
    props: {
      geopackage: Object,
      tableName: String,
      defaultName: String,
      allowIconNameEditing: Boolean,
      deletable: Boolean,
      geometryType: String,
      iconRow: Object,
      projectId: String,
      showId: Boolean,
      isTableIcon: Boolean
    },
    components: {
      ExpandableCard,
      ViewEditText
    },
    computed: {
      anchorSelection: {
        get () {
          return this.getAnchorLocation(this.iconRow.anchorU, this.iconRow.anchorV)
        },
        set (value) {
          let result = this.getAnchorUV(value)
          let iconRow = {
            id: this.iconRow.id,
            data: this.iconRow.data,
            width: this.iconRow.width,
            height: this.iconRow.height,
            anchorU: result.anchorU,
            anchorV: result.anchorV,
            name: this.iconRow.name,
            contentType: this.iconRow.contentType
          }
          this.updateProjectLayerIconRow({
            projectId: this.projectId,
            geopackageId: this.geopackage.id,
            tableName: this.tableName,
            iconRow: iconRow
          })
          this.updateIconAnchor(value)
        }
      },
      iconUrl: {
        get () {
          return 'data:' + this.iconRow.contentType + ';base64,' + this.iconRow.data.toString('base64')
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
      ...mapActions({
        updateProjectLayerIconRow: 'Projects/updateProjectLayerIconRow',
        deleteProjectLayerIconRow: 'Projects/deleteProjectLayerIconRow'
      }),
      deleteIcon () {
        this.deleteProjectLayerIconRow({
          projectId: this.projectId,
          geopackageId: this.geopackage.id,
          tableName: this.tableName,
          iconId: this.iconRow.id
        })
      },
      saveName (val) {
        if (this.iconRow.name !== val) {
          let iconRow = {
            id: this.iconRow.id,
            data: this.iconRow.data,
            width: this.iconRow.width,
            height: this.iconRow.height,
            anchorU: this.iconRow.anchorU,
            anchorV: this.iconRow.anchorV,
            name: val,
            contentType: this.iconRow.contentType
          }
          this.updateProjectLayerIconRow({
            projectId: this.projectId,
            geopackageId: this.geopackage.id,
            tableName: this.tableName,
            iconRow: iconRow
          })
        }
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
      updateIconAnchor (anchorLocation) {
        let result = this.getAnchorUV(anchorLocation)
        let iconRow = {
          id: this.iconRow.id,
          data: this.iconRow.data,
          width: this.iconRow.width,
          height: this.iconRow.height,
          anchorU: result.anchorU,
          anchorV: result.anchorV,
          name: this.iconRow.name,
          contentType: this.iconRow.contentType
        }
        this.updateProjectLayerIconRow({
          projectId: this.projectId,
          geopackageId: this.geopackage.id,
          tableName: this.tableName,
          iconRow: iconRow
        })
      },
      getIconClick (ev) {
        remote.dialog.showOpenDialog({
          filters: [
            {
              name: 'All Files',
              extensions: ['jpeg', 'jpg', 'gif', 'png']
            }
          ],
          properties: ['openFile']
        }, async (files) => {
          if (files) {
            for (const file of files) {
              let fileInfo = jetpack.inspect(file, {
                times: true,
                absolutePath: true
              })
              fileInfo.lastModified = fileInfo.modifyTime.getTime()
              fileInfo.lastModifiedDate = fileInfo.modifyTime
              fileInfo.path = fileInfo.absolutePath
              let extension = path.extname(fileInfo.path).slice(1)
              if (extension === 'jpg') {
                extension = 'jpeg'
              }
              let url = 'data:image/' + extension + ';base64,' + fs.readFileSync(fileInfo.path).toString('base64')
              const uploadedImage = await new Promise(function (resolve) {
                var image = new Image()
                image.onload = () => { resolve(image) }
                image.src = url
              })
              let result = this.getAnchorUV(this.anchorSelection)
              let iconRow = {
                id: this.iconRow.id,
                data: Buffer.from(url.split(',')[1], 'base64'),
                width: uploadedImage.width,
                height: uploadedImage.height,
                anchorU: result.anchorU,
                anchorV: result.anchorV,
                name: this.isTableIcon ? this.iconRow.name : path.basename(fileInfo.path),
                contentType: 'image/' + extension
              }
              this.updateProjectLayerIconRow({
                projectId: this.projectId,
                geopackageId: this.geopackage.id,
                tableName: this.tableName,
                iconRow: iconRow
              })
            }
          }
        })
      }
    }
  }
</script>

<style>
  .title-card {
    color: dimgray;
    font-size: 18px;
    font-weight: 500;
  }
  .subtitle-card {
    color: dimgray;
    font-size: 16px;
    font-weight: normal;
  }
  .icon-options {
    margin: 0 8px 0;
  }
  .icon-box {
    border: 1px solid #ffffff00;
    border-radius: 4px;
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    margin: 0.25rem;
  }
  .icon {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px;
    width: 64px;
    height: 64px;
    display: block;
    object-fit: contain;
    cursor: pointer;
  }
  .icon:hover {
    box-shadow: 0 0 2px 1px rgba(0, 140, 186, 0.5);
  }
  .icon-row {
    margin-bottom: 16px;
  }
  .control-label {
    font-size: 12px;
    color: #000;
  }
  .danger {
    color: #d50000;
  }
  .danger:hover {
    color: #9b0000;
  }
  .delete-button {
    margin-right: .25rem;
    cursor: pointer;
  }
  .fs12 {
    font-size: 12px;
  }
</style>
