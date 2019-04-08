<template>
  <div>
    GeoTIFF options
    Dst Alpha {{layer.dstAlphaBand}}
    Src Alpha {{layer.srcAlphaBand}}
    <div class="layer__face__stats">
      Source Band Mapping {{layer.srcBands}} -> {{layer.dstBands}}
      Band Mappings {{bandMappings}}
      red band {{layer.dstRedBand}}
      blue band {{layer.dstBlueBand}}
      green band {{layer.dstGreenBand}}
      alpha band {{layer.dstAlphaBand}}
      <p class="layer__face__stats__weight">
        <div v-for="n in layer.srcBands.length">
          Band {{n}}:
          <select v-model="bandMappings[n - 1]" @change='bandMappingChange(n, bandMappings[n-1])'>
              <option value="">None</option>
              <option v-for="color in colors" :value="color.value">{{color.name}}</option>
            </select>
        </div>
        <!-- Red:<select v-model="redBandMapping">
            <option value="">None</option>
            <option v-for="n in layer.srcBands.length">{{n}}</option>
          </select>
            Green:<select v-model="greenBandMapping">
                <option value="">None</option>
                <option v-for="n in layer.srcBands.length">{{n}}</option>
              </select>
              Blue:<select v-model="blueBandMapping">
                  <option value="">None</option>
                  <option v-for="n in layer.srcBands.length">{{n}}</option>
                </select>
                Alpha:<select v-model="sourceAlphaBand">
                    <option value="">None</option>
                    <option v-for="n in layer.srcBands.length">{{n}}</option>
                  </select>
        </span> -->
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
      redBandMapping: {
        get () {
          return this.layer.dstRedBand
        },
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstRedBand = Number(value)
          let m = []
          for (let i = 1; i <= updatedLayer.srcBands.length; i++) {
            if (updatedLayer.dstRedBand === i) {
              m.push(1)
            } else if (updatedLayer.dstGreenBand === i) {
              m.push(2)
            } else if (updatedLayer.dstBlueBand === i) {
              m.push(3)
            } else if (updatedLayer.dstAlphaBand === i) {
              m.push(4)
            } else {
              m.push(undefined)
            }
          }
          // for (let j = 0; j < m.length; j++) {
          //   let band = m[j]
          //
          // }
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
        set (value) {
          console.log('update the green band mapping')
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstGreenBand = Number(value)
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
        set (value) {
          let updatedLayer = Object.assign({}, this.layer)
          updatedLayer.dstBlueBand = Number(value)
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
        console.log('band mapping change', band)
        console.log('band mapping', this.bandMappings[band])
        console.log('value', value)
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
  .layer__face__stats {
    color: #777;
    text-transform: uppercase;
    font-size: 12px;
    margin-right: 15px;
  }
  .layer__face__stats p {
    font-size: 15px;
    color: #777;
    font-weight: bold;
  }
</style>
