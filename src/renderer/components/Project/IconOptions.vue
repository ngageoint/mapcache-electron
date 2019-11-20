<template>
  <expandablecard>
    <div slot="card-header">
      <div class="flex-row">
        <div class="subtitle-card">
          <p>
            {{name + (showId ? ' (' + iconRow.getId() + ')' : '')}}
          </p>
        </div>
        <img class="icon-box" :src="iconUrl"/>
      </div>
    </div>
    <div slot="card-expanded-body">
      <div class="flex-row">
        <div v-if="allowStyleNameEditing">
          <label class="control-label">Name</label>
          <div>
            <input
              type="text"
              class="text-box"
              v-model="name"/>
          </div>
        </div>
      </div>
      <div class="flex-row">
        <div>
          <label class="control-label">Icon</label>
          <img class="icon" :src="iconUrl" @click.stop="getIconClick"/>
        </div>
      </div>
      <div class="flex-row">
        <div>
          <label class="control-label">Anchor</label>
          <div class="preset-select">
            <select v-model="anchorSelection">
              <option v-for="anchorLoc in anchorLocations" :value="anchorLoc.value">{{anchorLoc.name}}</option>
            </select>
          </div>
        </div>
        <div>
          <div v-if="deletable" class="delete-button" @click.stop="deleteIcon()">
            <font-awesome-icon icon="trash" class="danger" size="2x"/>
          </div>
        </div>
      </div>
    </div>
  </expandablecard>
</template>

<script>
  import { mapActions } from 'vuex'
  import NumberPicker from './NumberPicker'
  import ExpandableCard from '../Card/ExpandableCard'
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import fs from 'fs'
  import path from 'path'
  import _ from 'lodash'

  export default {
    props: {
      defaultName: String,
      allowStyleNameEditing: Boolean,
      deletable: Boolean,
      geometryType: String,
      iconRow: Object,
      layer: Object,
      projectId: String,
      showId: Boolean,
      isTableIcon: Boolean
    },
    created () {
      this.debounceName = _.debounce((val) => {
        if (this.iconRow.getName() !== val) {
          let iconRow = {
            id: this.iconRow.getId(),
            data: this.iconRow.getData(),
            width: this.iconRow.getWidth(),
            height: this.iconRow.getHeight(),
            anchorU: this.iconRow.getAnchorU(),
            anchorV: this.iconRow.getAnchorV(),
            name: val,
            contentType: this.iconRow.getContentType()
          }
          this.updateProjectLayerIconRow({
            projectId: this.projectId,
            layerId: this.layer.id,
            iconRow: iconRow
          })
        }
      }, 500)
    },
    components: {
      'numberpicker': NumberPicker,
      'expandablecard': ExpandableCard
    },
    computed: {
      name: {
        get () {
          return this.iconRow.getName()
        },
        set (val) {
          this.debounceName(val)
        }
      },
      anchorSelection: {
        get () {
          return this.getAnchorLocation(this.iconRow.getAnchorU(), this.iconRow.getAnchorV())
        },
        set (value) {
          let result = this.getAnchorUV(value)
          let iconRow = {
            id: this.iconRow.getId(),
            data: this.iconRow.getData(),
            width: this.iconRow.getWidth(),
            height: this.iconRow.getHeight(),
            anchorU: result.anchorU,
            anchorV: result.anchorV,
            name: this.iconRow.getName(),
            contentType: this.iconRow.getContentType()
          }
          this.updateProjectLayerIconRow({
            projectId: this.projectId,
            layerId: this.layer.id,
            iconRow: iconRow
          })
          this.updateIconAnchor(value)
        }
      },
      iconUrl: {
        get () {
          return 'data:' + this.iconRow.getContentType() + ';base64,' + this.iconRow.getData().toString('base64')
        }
      },
      anchorLocations () {
        let anchorLocations = []
        anchorLocations.push({name: 'Bottom Center', value: 0})
        anchorLocations.push({name: 'Bottom Left', value: 1})
        anchorLocations.push({name: 'Bottom Right', value: 2})
        anchorLocations.push({name: 'Top Center', value: 3})
        anchorLocations.push({name: 'Top Left', value: 4})
        anchorLocations.push({name: 'Top Right', value: 5})
        anchorLocations.push({name: 'Center', value: 6})
        anchorLocations.push({name: 'Center Left', value: 7})
        anchorLocations.push({name: 'Center Right', value: 8})
        return anchorLocations
      }
    },
    methods: {
      ...mapActions({
        updateProjectLayerIconRow: 'Projects/updateProjectLayerIconRow',
        deleteProjectLayerIconRow: 'Projects/deleteProjectLayerIconRow'
      }),
      deleteIcon () {
        this.deleteProjectLayerIconRow({projectId: this.projectId, layerId: this.layer.id, iconId: this.iconRow.getId()})
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
          id: this.iconRow.getId(),
          data: this.iconRow.getData(),
          width: this.iconRow.getWidth(),
          height: this.iconRow.getHeight(),
          anchorU: result.anchorU,
          anchorV: result.anchorV,
          name: this.iconRow.getName(),
          contentType: this.iconRow.getContentType()
        }
        this.updateProjectLayerIconRow({
          projectId: this.projectId,
          layerId: this.layer.id,
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
              let extension = path.extname(fileInfo.path)
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
                id: this.iconRow.getId(),
                data: Buffer.from(url.split(',')[1], 'base64'),
                width: uploadedImage.width,
                height: uploadedImage.height,
                anchorU: result.anchorU,
                anchorV: result.anchorV,
                name: this.isTableIcon ? this.iconRow.getName() : path.basename(fileInfo.path),
                contentType: 'image/' + extension
              }
              this.updateProjectLayerIconRow({
                projectId: this.projectId,
                layerId: this.layer.id,
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
  .subtitle-card {
    display: inline-block;
    vertical-align: middle;
    line-height: normal;
  }
  .subtitle-card p {
    color: #000;
    font-size: 16px;
    font-weight: normal;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .icon {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
    width: 64px;
    height: 64px;
    display: block;
    object-fit: contain;
    cursor: pointer;
  }
  .icon-box {
    border: 1px solid #ffffff00;
    border-radius: 4px;
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    margin: 0.25rem;
  }
  .icon:hover {
    box-shadow: 0 0 2px 1px rgba(0, 140, 186, 0.5);
  }
  .preset-select {
    display:flex;
    flex-direction: column;
    justify-content: center;
    border-width: 1px;
    border-style: solid;
  }
  .preset-select select {
    display: flex;
    flex-direction: row;
    font-weight: normal;
    font-size: 14px;
    border: none;
    background: transparent;
    width: 100%;
    text-align-last: center;
  }
  .preset-select select:focus {
    outline: none;
  }
  .text-box {
    height: 32px;
    font-size: 14px;
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
    padding-top: 1.5rem;
    margin-right: .25rem;
    cursor: pointer;
  }
</style>
