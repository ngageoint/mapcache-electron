<template>
  <div v-if="showColorMapping">
    <div class="layer__face__stats">
      <p class="layer__face__stats__weight">
        Color Mapping
        <div class="flex-column option-block">
          <div class="preset-select">
            <select v-model="mappingPreset">
              <!-- <option value="">Custom</option> -->
              <option v-for="preset in colorPresets" :value="preset.value">{{preset.name}}</option>
            </select>
          </div>
          <div class="color-flex flex-row">
            <div class="color-select red-color">
              <select v-model="redBandMapping">
                <option value="None"></option>
                <option v-for="n in this.layer.srcBands.length" :value="n">{{n}}</option>
              </select>
              <div class="color-band-name">Red</div>
            </div>
            <div class="color-select green-color">
              <select v-model="greenBandMapping">
                <option value="None"></option>
                <option v-for="n in this.layer.srcBands.length" :value="n">{{n}}</option>
              </select>
              <div class="color-band-name">Green</div>
            </div>
            <div class="color-select blue-color">
              <select v-model="blueBandMapping">
                <option value="None"></option>
                <option v-for="n in this.layer.srcBands.length" :value="n">{{n}}</option>
              </select>
              <div class="color-band-name">Blue</div>
            </div>
          </div>
        </div>
      </p>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'

  export default {
    data () {
      return {
        colors: [{
          name: 'Red',
          value: 1
        }, {
          name: 'Green',
          value: 2
        }, {
          name: 'Blue',
          value: 3
        }, {
          name: 'Alpha',
          value: 4
        }]
      }
    },
    props: {
      layer: Object,
      projectId: String
    },
    computed: {
      mappingPreset: {
        get () {
          return this.layer.dstRedBand + '-' + this.layer.dstGreenBand + '-' + this.layer.dstBlueBand
        },
        set (value) {
          if (!value) return
          let bands = value.split('-')
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstRedBand = Number(bands[0])
          updatedLayer.dstGreenBand = Number(bands[1])
          updatedLayer.dstBlueBand = Number(bands[2])
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      colorPresets () {
        let presets = []
        if (this.layer.srcBands.length === 4) {
          // Maybe Four Band
          presets.push({
            name: 'Natural Color',
            value: 0,
            bands: [1, 2, 3, undefined]
          })
          presets.push({
            name: 'Color Infrared',
            value: 1,
            bands: [4, 1, 2, undefined]
          })
        } else if (this.layer.srcBands.length === 11) {
          // Landsat 8
          presets.push({
            name: 'Natural Color',
            value: 0,
            bands: [4, 3, 2, undefined]
          })
          presets.push({
            name: 'Near Infrared',
            value: 1,
            bands: [5, undefined, undefined, undefined]
          })
          presets.push({
            name: 'False Color',
            value: 2,
            bands: [7, 5, 1, undefined]
          })
          presets.push({
            name: 'Clouds',
            value: 3,
            bands: [9, undefined, undefined, undefined]
          })
          presets.push({
            name: '5-6-4',
            value: 4,
            bands: [5, 6, 4, undefined]
          })
        } else if (this.layer.srcBands.length === 3) {
          presets.push({
            name: 'Natural Color',
            value: '1-2-3',
            bands: [1, 2, 3]
          })
          presets.push({
            name: 'Not Natural Color',
            value: '2-1-3',
            bands: [2, 1, 3]
          })
        }
        return presets
      },
      bandMappings: {
        get () {
          let m = []
          for (let i = 1; i <= this.layer.srcBands.length; i++) {
            if (this.layer.dstRedBand === i) {
              m.push(1)
            } else if (this.layer.dstGreenBand === i) {
              m.push(2)
            } else if (this.layer.dstBlueBand === i) {
              m.push(3)
            } else if (this.layer.dstAlphaBand === i) {
              m.push(4)
            } else {
              m.push(undefined)
            }
          }
          return m
        },
        set (value) {
          console.log('new value', value)
        }
      },
      showColorMapping: {
        get () {
          return this.layer.srcBands.length >= 3
        }
      },
      redBandMapping: {
        get () {
          return this.layer.dstRedBand
        },
        set (band) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstRedBand = Number(band)
          if (updatedLayer.dstGreenBand === band) {
            updatedLayer.dstGreenBand = undefined
          }
          if (updatedLayer.dstBlueBand === band) {
            updatedLayer.dstBlueBand = undefined
          }
          if (updatedLayer.dstAlphaBand === band) {
            updatedLayer.dstAlphaBand = undefined
          }
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      greenBandMapping: {
        get () {
          return this.layer.dstGreenBand
        },
        set (band) {
          console.log('update the green band mapping')
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstGreenBand = Number(band)
          if (updatedLayer.dstRedBand === band) {
            updatedLayer.dstRedBand = undefined
          }
          if (updatedLayer.dstBlueBand === band) {
            updatedLayer.dstBlueBand = undefined
          }
          if (updatedLayer.dstAlphaBand === band) {
            updatedLayer.dstAlphaBand = undefined
          }
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      blueBandMapping: {
        get () {
          return this.layer.dstBlueBand
        },
        set (band) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstBlueBand = Number(band)
          if (updatedLayer.dstRedBand === band) {
            updatedLayer.dstRedBand = undefined
          }
          if (updatedLayer.dstGreenBand === band) {
            updatedLayer.dstGreenBand = undefined
          }
          if (updatedLayer.dstAlphaBand === band) {
            updatedLayer.dstAlphaBand = undefined
          }
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      alphaBandMapping: {
        get () {
          return this.layer.dstAlphaBand
        },
        set (band) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstAlphaBand = Number(band)
          if (updatedLayer.dstRedBand === band) {
            updatedLayer.dstRedBand = undefined
          }
          if (updatedLayer.dstGreenBand === band) {
            updatedLayer.dstGreenBand = undefined
          }
          if (updatedLayer.dstBlueBand === band) {
            updatedLayer.dstBlueBand = undefined
          }
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      sourceAlphaBand: {
        get () {
          return this.layer.srcAlphaBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.srcAlphaBand = value === '' ? undefined : Number(value)
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      },
      destinationAlphaBand: {
        get () {
          return this.layer.dstAlphaBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstAlphaBand = value === '' ? undefined : Number(value)
          this.updateLayer({
            projectId: this.projectId,
            layer: updatedLayer
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateLayer: 'Projects/updateProjectLayer'
      }),
      bandMappingChange (band, value) {
        let updatedLayer = Object.assign({}, this.layer)
        switch (value) {
          case 1:
            updatedLayer.dstRedBand = Number(band)
            if (updatedLayer.dstGreenBand === band) {
              updatedLayer.dstGreenBand = undefined
            }
            if (updatedLayer.dstBlueBand === band) {
              updatedLayer.dstBlueBand = undefined
            }
            if (updatedLayer.dstAlphaBand === band) {
              updatedLayer.dstAlphaBand = undefined
            }
            break
          case 2:
            updatedLayer.dstGreenBand = Number(band)
            if (updatedLayer.dstRedBand === band) {
              updatedLayer.dstRedBand = undefined
            }
            if (updatedLayer.dstBlueBand === band) {
              updatedLayer.dstBlueBand = undefined
            }
            if (updatedLayer.dstAlphaBand === band) {
              updatedLayer.dstAlphaBand = undefined
            }
            break
          case 3:
            updatedLayer.dstBlueBand = Number(band)
            if (updatedLayer.dstRedBand === band) {
              updatedLayer.dstRedBand = undefined
            }
            if (updatedLayer.dstGreenBand === band) {
              updatedLayer.dstGreenBand = undefined
            }
            if (updatedLayer.dstAlphaBand === band) {
              updatedLayer.dstAlphaBand = undefined
            }
            break
          case 4:
            updatedLayer.dstAlphaBand = Number(band)
            if (updatedLayer.dstRedBand === band) {
              updatedLayer.dstRedBand = undefined
            }
            if (updatedLayer.dstGreenBand === band) {
              updatedLayer.dstGreenBand = undefined
            }
            if (updatedLayer.dstBlueBand === band) {
              updatedLayer.dstBlueBand = undefined
            }
            break
          case '':
            if (updatedLayer.dstRedBand === band) {
              updatedLayer.dstRedBand = undefined
            }
            if (updatedLayer.dstGreenBand === band) {
              updatedLayer.dstGreenBand = undefined
            }
            if (updatedLayer.dstBlueBand === band) {
              updatedLayer.dstBlueBand = undefined
            }
            if (updatedLayer.dstAlphaBand === band) {
              updatedLayer.dstAlphaBand = undefined
            }
            break
        }
        this.updateLayer({
          projectId: this.projectId,
          layer: updatedLayer
        })
      },
      zoomToExtent (extent) {
        console.log({extent})
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      },
      colorChanged (colorHex, layerId) {
        console.log('source', this.source)
        console.log('color changed arguments', arguments)
      },
      openDetail () {
        this.expanded = !this.expanded
      }
    }
  }
</script>

<style scoped>
  .flex-column {
    display: flex;
    flex-direction: column;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
  }
  .layer__face__stats {
    color: #777;
    text-transform: uppercase;
    font-size: 12px;
  }
  .layer__face__stats p {
    font-size: 15px;
    color: #777;
    font-weight: bold;
  }
  .option-block {
    width: 100%;
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
  /* .preset-select {
    width: 100%;
  } */
  .color-flex {
    justify-content: center;
  }
  .color-chooser {
    display:flex;
    flex-direction: column;
    justify-content: center;
    height: 50px;
    width: 50px;
    text-align: center;
    border-radius: 25px;
    border-width: 4px;
    border-style: solid;
    border-color: grey;
    margin: 10px;
  }
  .color-band-number {
    font-weight: bold;
    font-size: 20px;
    line-height: 20px;
    padding-top: 3px;
  }
  .color-band-name {
    font-size: 8px;
    text-align: center;
  }

  .color-select {
    display:flex;
    flex-direction: column;
    justify-content: center;
    height: 60px;
    width: 60px;
    border-radius: 30px;
    border-width: 4px;
    border-style: solid;
    margin: 10px;
  }

  .color-select select {
    display: flex;
    flex-direction: row;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
    border: none;
    background: transparent;
    width: 90%;
    text-align-last: center;
  }
  .color-select select:focus {
    outline: none;
  }
  .red-color, .red-color select {
    border-color: #C21807;
    color: #C21807;
  }
  .green-color, .green-color select {
    border-color: #0b6623;
    color: #0b6623;
  }
  .blue-color, .blue-color select {
    border-color: #1034A6;
    color: #1034A6;
  }
  .alpha-color, .alpha-color select {
    border-color: rgba(0, 0, 0, .3);
    color: rgba(0, 0, 0, .3);
  }
</style>
