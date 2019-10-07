<template>
  <div>
    <div class="layer__face__stats">
      <editstylename v-if="allowStyleNameEditing"
                     :name="name"
                     :icon-or-style="iconOrStyle"
                     :icon-or-style-id="id"
                     :layer-id="layer.id"
                     :project-id="projectId"/>
      <p class="layer__face__stats__weight" v-if="!allowStyleNameEditing">
        {{name}}
      </p>
      <div class="container">
        <div class="flex-row" v-if="allowSwitchBetweenIconAndStyle && (geometryType === 'Point' || geometryType === 'MultiPoint')">
          <div>
            <label>
              <input type="radio" v-model="useIconorStyle" value="icon"> Icon
            </label>
            <label>
              <input type="radio" v-model="useIconorStyle" value="style"> Style
            </label>
          </div>
        </div>
        <div class="flex-row" v-if="useIconorStyle === 'icon'">
          <div>
            <label class="control-label">Point Icon</label>
            <img class="icon" :src="icon.url" @click.stop="getIconClick"/>
            <div class="layer__face__stats">
              <p class="layer__face__stats__weight">
                Anchor
              </p>
              <div class="preset-select">
                <select v-model="anchorSelection">
                  <option v-for="anchorLoc in anchorLocations" :value="anchorLoc.value">{{anchorLoc.name}}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div v-if="useIconorStyle === 'style'">
          <div class="flex-row">
            <div>
              <label class="control-label">Color</label>
              <div>
                <colorpicker :color="color" v-model="color" />
              </div>
            </div>
          </div>
          <div class="flex-row" v-if="geometryType === 'Polygon' || geometryType === 'MultiPolygon'">
            <div>
              <label class="control-label">Fill Color</label>
              <div>
                <colorpicker :color="fillColor" v-model="fillColor" />
              </div>
            </div>
          </div>
          <div class="flex-row">
            <div>
              <label class="control-label">Width (px)</label>
              <div>
                <numberpicker :number="width" v-model="width" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import ColorPicker from './ColorPicker'
  import NumberPicker from './NumberPicker'
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import fs from 'fs'
  import _ from 'lodash'
  import path from 'path'
  import EditStyleName from './EditStyleName'

  export default {
    props: {
      defaultName: String,
      allowStyleNameEditing: Boolean,
      geometryType: String,
      iconOrStyle: String,
      styleId: String,
      iconId: String,
      layer: Object,
      projectId: String,
      allowSwitchBetweenIconAndStyle: {
        type: Boolean,
        default: false
      }
    },
    created () {
      this.debounceColorOpacityInStyleField = _.debounce((colorField, opacityField, val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          let style = Object.assign({}, this.layer.style.styleRowMap[this.styleId])
          style[colorField] = color
          style[opacityField] = Number(opacity)
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            styleId: this.styleId,
            style: style
          })
        }
      }, 500)
      this.debounceFloatFieldInStyle = _.debounce((field, val) => {
        if (val) {
          let style = Object.assign({}, this.layer.style.styleRowMap[this.styleId])
          style[field] = parseFloat(val)
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            styleId: this.styleId,
            style: style
          })
        }
      }, 500)
    },
    components: {
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker,
      'editstylename': EditStyleName
    },
    computed: {
      useIconorStyle: {
        get () {
          return this.iconOrStyle
        },
        set (val) {
          this.updateProjectLayerDefaultIconOrStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            geometryType: this.geometryType,
            iconOrStyle: val
          })
        }
      },
      id: function () {
        return !_.isNil(this.styleId) ? this.styleId : this.iconId
      },
      style: function () {
        return !_.isNil(this.styleId) ? Object.assign({}, this.layer.style.styleRowMap[this.styleId]) : undefined
      },
      color: {
        get () {
          return !_.isNil(this.styleId)
            ? this.getRGBA(this.layer.style.styleRowMap[this.styleId].color, this.layer.style.styleRowMap[this.styleId].opacity)
            : undefined
        },
        set (val) {
          this.debounceColorOpacityInStyleField('color', 'opacity', val)
        }
      },
      fillColor: {
        get () {
          return !_.isNil(this.styleId)
            ? this.getRGBA(this.layer.style.styleRowMap[this.styleId].fillColor, this.layer.style.styleRowMap[this.styleId].fillOpacity)
            : undefined
        },
        set (val) {
          this.debounceColorOpacityInStyleField('fillColor', 'fillOpacity', val)
        }
      },
      width: {
        get () {
          return !_.isNil(this.styleId) ? this.layer.style.styleRowMap[this.styleId].width : undefined
        },
        set (val) {
          this.debounceFloatFieldInStyle('width', val)
        }
      },
      icon: function () {
        return !_.isNil(this.iconId) ? Object.assign({}, this.layer.style.iconRowMap[this.iconId]) : undefined
      },
      name: function () {
        return !_.isNil(this.styleId)
          ? !_.isNil(this.layer.style.styleRowMap[this.styleId].name)
            ? this.layer.style.styleRowMap[this.styleId].name
            : this.defaultName
          : !_.isNil(this.layer.style.iconRowMap[this.iconId].name)
            ? this.layer.style.iconRowMap[this.iconId].name
            : this.defaultName
      },
      anchorSelection: {
        get () {
          return this.icon.anchorSelection || 0
        },
        set (value) {
          let updatedIcon = Object.assign({}, this.layer.style.iconRowMap[this.iconId])
          updatedIcon.anchorSelection = value
          this.updateProjectLayerIcon({
            projectId: this.projectId,
            layerId: this.layer.id,
            iconId: this.iconId,
            icon: updatedIcon
          })
          this.updateIconAnchor(value)
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
        updateProjectLayerDefaultIconOrStyle: 'Projects/updateProjectLayerDefaultIconOrStyle',
        updateProjectLayerStyle: 'Projects/updateProjectLayerStyle',
        updateProjectLayerIcon: 'Projects/updateProjectLayerIcon'
      }),
      getAnchorUV (anchorLocation) {
        let result = {}
        if (anchorLocation === 0) {
          result.anchor_u = 0.5
          result.anchor_v = 1.0
        } else if (anchorLocation === 1) {
          result.anchor_u = 0
          result.anchor_v = 1.0
        } else if (anchorLocation === 2) {
          result.anchor_u = 1.0
          result.anchor_v = 1.0
        } else if (anchorLocation === 3) {
          result.anchor_u = 0.5
          result.anchor_v = 0
        } else if (anchorLocation === 4) {
          result.anchor_u = 0
          result.anchor_v = 0
        } else if (anchorLocation === 5) {
          result.anchor_u = 1.0
          result.anchor_v = 0
        } else if (anchorLocation === 6) {
          result.anchor_u = 0.5
          result.anchor_v = 0.5
        } else if (anchorLocation === 7) {
          result.anchor_u = 0
          result.anchor_v = 0.5
        } else if (anchorLocation === 8) {
          result.anchor_u = 1.0
          result.anchor_v = 0.5
        }
        return result
      },
      updateIconAnchor (anchorLocation) {
        let icon = Object.assign({}, this.layer.style.iconRowMap[this.iconId])
        let result = this.getAnchorUV(anchorLocation)
        icon.anchor_u = result.anchor_u
        icon.anchor_v = result.anchor_v
        icon.anchorSelection = anchorLocation
        this.updateProjectLayerIcon({
          projectId: this.projectId,
          layerId: this.layer.id,
          iconId: this.iconId,
          icon: icon
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
              let url = 'data:image/png;base64,' + fs.readFileSync(fileInfo.path).toString('base64')
              const pointImage = await new Promise(function (resolve) {
                var image = new Image()
                image.onload = () => { resolve(image) }
                image.src = url
              })
              let result = this.getAnchorUV(this.anchorSelection)
              let icon = {
                url: url,
                width: pointImage.width,
                height: pointImage.height,
                anchor_u: result.anchor_u,
                anchor_v: result.anchor_v,
                anchorSelection: this.anchorSelection,
                name: path.basename(fileInfo.path)
              }
              console.log('new icon url: ' + url)
              this.updateProjectLayerIcon({
                projectId: this.projectId,
                layerId: this.layer.id,
                iconId: this.iconId,
                icon: icon
              })
            }
          }
        })
      },
      parseColor (val) {
        let color = '#FFFFFF'
        let opacity = 1.0
        if (val.slice(0, 1) === '#') {
          color = val
        } else if (val.slice(0, 4) === 'rgba') {
          const rgba = val.replace(/^rgba?\(|\s+|\)$/g, '').split(',')
          color = ('#' + ((1 << 24) + (parseInt(rgba[0]) << 16) + (parseInt(rgba[1]) << 8) + parseInt(rgba[2])).toString(16).slice(1)).toUpperCase()
          opacity = parseFloat(rgba[3])
        }
        return {color, opacity}
      },
      getRGBA (color, opacity) {
        return 'rgba(' + parseInt(color.substring(1, 3), 16) + ' ,' + parseInt(color.substring(3, 5), 16) + ' ,' + parseInt(color.substring(5, 7), 16) + ' ,' + opacity + ')'
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
    margin: 10px;
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

</style>
