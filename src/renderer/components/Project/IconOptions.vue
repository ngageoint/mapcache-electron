<template>
  <div class="layer__face__stats">
    <editstylename v-if="allowStyleNameEditing"
                   :name="name"
                   icon-or-style="icon"
                   :icon-or-style-id="iconRow.getId() + ''"
                   :layer-id="layer.id"
                   :project-id="projectId"/>
    <p class="layer__face__stats__weight" v-if="!allowStyleNameEditing">
      {{name}}
    </p>
    <div class="container">
      <div class="flex-row">
        <div>
          <label class="control-label">Icon</label>
          <img class="icon" :src="iconUrl" @click.stop="getIconClick"/>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="flex-row">
        <div>
          <label class="control-label">Anchor</label>
          <div class="preset-select">
            <select v-model="anchorSelection">
              <option v-for="anchorLoc in anchorLocations" :value="anchorLoc.value">{{anchorLoc.name}}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <div v-if="deletable">
      <button type="button" class="layer__request-btn" @click.stop="deleteIcon()">
        <span class="layer__request-btn__text-1">Delete Icon</span>
      </button>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import NumberPicker from './NumberPicker'
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import fs from 'fs'
  import path from 'path'
  import EditStyleName from './EditStyleName'

  export default {
    props: {
      defaultName: String,
      allowStyleNameEditing: Boolean,
      deletable: Boolean,
      geometryType: String,
      iconRow: Object,
      layer: Object,
      projectId: String
    },
    components: {
      'numberpicker': NumberPicker,
      'editstylename': EditStyleName
    },
    computed: {
      name: function () {
        return this.iconRow.getName()
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
                name: path.basename(fileInfo.path),
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

<style scoped>
  .flex-row {
    display: flex;
    flex-direction: row;
  }
  .layer__face__stats {
    color: #777;
    text-transform: uppercase;
    font-size: 12px
  }
  .layer__face__stats p {
    font-size: 15px;
    color: #777;
    font-weight: bold;
  }
  .flex-row {
    margin-left: 10px;
    margin-bottom: 10px;
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
  .icon:hover {
    box-shadow: 0 0 2px 1px rgba(0, 140, 186, 0.5);
  }
  .preset-select {
    display:flex;
    flex-direction: column;
    justify-content: center;
    border-width: 4px;
    border-style: solid;
    color: #222;
  }
  .preset-select select {
    display: flex;
    flex-direction: row;
    font-weight: bold;
    font-size: 20px;
    border: none;
    background: transparent;
    width: 100%;
    text-align-last: center;
  }
  .preset-select select:focus {
    outline: none;
  }
  .layer__request-btn__text-1 {
    -webkit-transition: opacity 0.48s;
    transition: opacity 0.48s;
  }
  .layer.req-active1 .layer__request-btn__text-1 {
    opacity: 0;
  }
  .layer.req-active2 .layer__request-btn__text-1 {
    display: none;
  }
  .layer__request-btn:hover {
    letter-spacing: 5px;
  }

  /* Style buttons */
  .layer__request-btn {
    position: relative;
    width: 100%;
    height: 24px;
    margin-bottom: 10px;
    background-color: #C00;
    text-transform: uppercase;
    font-size: 16px;
    color: #FFF;
    outline: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0;
    -webkit-transition: letter-spacing 0.3s;
    transition: letter-spacing 0.3s;
  }

</style>
