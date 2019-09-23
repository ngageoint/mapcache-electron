<template>
  <div>
    <div class="layer__face__stats">
      <p class="layer__face__stats__weight">
        Polygon Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label class="control-label">Fill Color</label>
            <div>
              <colorpicker :color="polygonColor" v-model="polygonColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Color</label>
            <div>
              <colorpicker :color="polygonLineColor" v-model="polygonLineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Width (px)</label>
            <div>
              <numberpicker :number="polygonLineWeight" v-model="polygonLineWeight" />
            </div>
          </div>
        </div>
      </div>
      <p class="layer__face__stats__weight">
        Line Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label class="control-label">Color</label>
            <div>
              <colorpicker :color="lineColor" v-model="lineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Width (px)</label>
            <div>
              <numberpicker :number="lineWeight" v-model="lineWeight" />
            </div>
          </div>
        </div>
      </div>
      <p class="layer__face__stats__weight" v-if="layer.layerType === 'Drawing'">
        Circle Style Choices
      </p>
      <div class="container" v-if="layer.layerType === 'Drawing'">
        <div class="flex-row">
          <div>
            <label class="control-label">Fill Color</label>
            <div>
              <colorpicker :color="circleColor" v-model="circleColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Color</label>
            <div>
              <colorpicker :color="circleLineColor" v-model="circleLineColor" />
            </div>
          </div>
        </div>
        <div class="flex-row">
          <div>
            <label class="control-label">Line Width (px)</label>
            <div>
              <numberpicker :number="circleLineWeight" v-model="circleLineWeight" />
            </div>
          </div>
        </div>
      </div>
      <p class="layer__face__stats__weight">
        Point Style Choices
      </p>
      <div class="container">
        <div class="flex-row">
          <div>
            <label>
              <input type="radio" v-model="pointIconOrStyle" value="icon"> Icon
            </label>
            <label>
              <input type="radio" v-model="pointIconOrStyle" value="style"> Style
            </label>
          </div>
        </div>
        <div class="flex-row" v-if="pointIconOrStyle === 'icon'">
          <div>
            <label class="control-label">Point Icon</label>
            <img class="icon" :src="pointIcon.url" @click.stop="getIconClick"/>
            <div class="layer__face__stats">
              <p class="layer__face__stats__weight">
                Anchor
              </p>
              <div class="preset-select">
                <select v-model="anchorSelection">
                  <!-- <option value="">Custom</option> -->
                  <option v-for="anchorLoc in anchorLocations" :value="anchorLoc.value">{{anchorLoc.name}}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div v-if="pointIconOrStyle === 'style'">
          <div class="flex-row">
            <div>
              <label class="control-label">Fill Color</label>
              <div>
                <colorpicker :color="pointColor" v-model="pointColor" />
              </div>
            </div>
          </div>
          <div class="flex-row">
            <div>
              <label class="control-label">Point Radius (px)</label>
              <div>
                <numberpicker :number="pointRadiusInPixels" v-model="pointRadiusInPixels" />
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

  export default {
    props: {
      layer: Object,
      projectId: String
    },
    data () {
      if (!this.layer.style) {
        return {
          polygonColor: 'rgba(255, 0, 0, 1.0)',
          polygonLineColor: 'rgba(255, 0, 0, 1.0)',
          polygonLineWeight: 1.0,
          circleColor: 'rgba(255, 0, 0, 1.0)',
          circleLineColor: 'rgba(255, 0, 0, 1.0)',
          circleLineWeight: 1.0,
          pointColor: 'rgba(255, 0, 0, 1.0)',
          pointRadiusInPixels: 5.0,
          lineColor: 'rgba(255, 0, 0, 1.0)',
          lineWeight: 1.0,
          pointIcon: {
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=',
            width: 25,
            height: 41,
            anchor_u: 0.5,
            anchor_v: 1.0
          },
          pointIconOrStyle: 'icon'
        }
      }
      return {
        polygonColor: this.layer.style.polygonColor && this.layer.style.polygonOpacity ? this.getRGBA(this.layer.style.polygonColor, this.layer.style.polygonOpacity) : 'rgba(255, 0, 0, 1.0)',
        polygonLineColor: this.layer.style.polygonLineColor && this.layer.style.polygonLineOpacity ? this.getRGBA(this.layer.style.polygonLineColor, this.layer.style.polygonLineOpacity) : 'rgba(255, 0, 0, 1.0)',
        polygonLineWeight: this.layer.style.polygonLineWeight || 1.0,
        circleColor: this.layer.style.circleColor && this.layer.style.circleOpacity ? this.getRGBA(this.layer.style.circleColor, this.layer.style.circleOpacity) : 'rgba(255, 0, 0, 1.0)',
        circleLineColor: this.layer.style.circleLineColor && this.layer.style.circleLineOpacity ? this.getRGBA(this.layer.style.circleLineColor, this.layer.style.circleLineOpacity) : 'rgba(255, 0, 0, 1.0)',
        circleLineWeight: this.layer.style.circleLineWeight || 1.0,
        pointColor: this.layer.style.pointColor && this.layer.style.pointColor ? this.getRGBA(this.layer.style.pointColor, this.layer.style.pointOpacity) : 'rgba(255, 0, 0, 1.0)',
        pointRadiusInPixels: this.layer.style.pointRadiusInPixels || 5.0,
        lineColor: this.layer.style.lineColor && this.layer.style.lineOpacity ? this.getRGBA(this.layer.style.lineColor, this.layer.style.lineOpacity) : 'rgba(255, 0, 0, 1.0)',
        lineWeight: this.layer.style.lineWeight || 1.0,
        pointIcon: this.layer.style.pointIcon || {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=',
          width: 25,
          height: 41,
          anchor_u: 0.5,
          anchor_v: 1.0
        },
        pointIconOrStyle: this.layer.style.pointIconOrStyle || 'icon'
      }
    },
    created () {
      this.debounceColorOpacityInStyleField = _.debounce((colorField, opacityField, val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          let style = Object.assign({}, this.layer.style)
          style[colorField] = color
          style[opacityField] = opacity
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
      this.debounceFloatFieldInStyle = _.debounce((field, val) => {
        if (val) {
          let style = Object.assign({}, this.layer.style)
          style[field] = parseFloat(val)
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
      }, 500)
    },
    components: {
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker
    },
    computed: {
      anchorSelection: {
        get () {
          return this.layer.anchorSelection || 0
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.anchorSelection = value
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
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
        updateProjectLayerStyle: 'Projects/updateProjectLayerStyle',
        updateLayer: 'Projects/updateProjectLayer'
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
        let style = Object.assign({}, this.layer.style)
        if (style.pointIcon) {
          let pointIcon = Object.assign({}, style.pointIcon)
          let result = this.getAnchorUV(anchorLocation)
          pointIcon.anchor_u = result.anchor_u
          pointIcon.anchor_v = result.anchor_v
          style.pointIcon = pointIcon
          this.updateProjectLayerStyle({
            projectId: this.projectId,
            layerId: this.layer.id,
            style: style
          })
        }
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
              let style = Object.assign({}, this.layer.style)
              let url = 'data:image/png;base64,' + fs.readFileSync(fileInfo.path).toString('base64')
              const pointImage = await new Promise(function (resolve) {
                var image = new Image()
                image.onload = () => { resolve(image) }
                image.src = url
              })
              let result = this.getAnchorUV(this.anchorSelection)
              this.pointIcon = {
                url: url,
                width: pointImage.width,
                height: pointImage.height,
                anchor_u: result.anchor_u,
                anchor_v: result.anchor_v
              }
              style['pointIcon'] = this.pointIcon
              this.updateProjectLayerStyle({
                projectId: this.projectId,
                layerId: this.layer.id,
                style: style
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
          color = '#' + ((1 << 24) + (parseInt(rgba[0]) << 16) + (parseInt(rgba[1]) << 8) + parseInt(rgba[2])).toString(16).slice(1)
          opacity = parseFloat(rgba[3])
        }
        return {color, opacity}
      },
      getRGBA (color, opacity) {
        return 'rgba(' + parseInt(color.substring(1, 3), 16) + ' ,' + parseInt(color.substring(3, 5), 16) + ' ,' + parseInt(color.substring(5, 7), 16) + ' ,' + opacity + ')'
      }
    },
    watch: {
      pointIconOrStyle (val) {
        let style = Object.assign({}, this.layer.style)
        console.log(val)
        style['pointIconOrStyle'] = val
        this.updateProjectLayerStyle({
          projectId: this.projectId,
          layerId: this.layer.id,
          style: style
        })
      },
      polygonColor (val) {
        this.debounceColorOpacityInStyleField('polygonColor', 'polygonOpacity', val)
      },
      polygonLineColor (val) {
        this.debounceColorOpacityInStyleField('polygonLineColor', 'polygonLineOpacity', val)
      },
      polygonLineWeight (val) {
        this.debounceFloatFieldInStyle('polygonLineWeight', val)
      },
      circleColor (val) {
        this.debounceColorOpacityInStyleField('circleColor', 'circleOpacity', val)
      },
      circleLineColor (val) {
        this.debounceColorOpacityInStyleField('circleLineColor', 'circleLineOpacity', val)
      },
      circleLineWeight (val) {
        this.debounceFloatFieldInStyle('circleLineWeight', val)
      },
      pointColor (val) {
        this.debounceColorOpacityInStyleField('pointColor', 'pointOpacity', val)
      },
      pointRadiusInPixels (val) {
        this.debounceFloatFieldInStyle('pointRadiusInPixels', val)
      },
      lineColor (val) {
        this.debounceColorOpacityInStyleField('lineColor', 'lineOpacity', val)
      },
      lineWeight (val) {
        this.debounceFloatFieldInStyle('lineWeight', val)
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
