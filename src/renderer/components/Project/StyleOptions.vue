<template>
  <div class="layer__face__stats">
    <editstylename v-if="allowStyleNameEditing"
                   :name="name"
                   icon-or-style="style"
                   :icon-or-style-id="styleRow.getId() + ''"
                   :layer-id="layer.id"
                   :project-id="projectId"/>
    <p class="layer__face__stats__weight" v-if="!allowStyleNameEditing">
      {{name}}
    </p>
    <div class="container">
      <div>
        <div class="flex-row">
          <div>
            <label class="control-label">Color</label>
            <div>
              <colorpicker :color="color" v-model="color" />
            </div>
          </div>
        </div>
        <div class="flex-row" v-if="geometryType === 'Polygon' || geometryType === 'MultiPolygon' || geometryType === undefined">
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
        <div v-if="deletable">
          <button type="button" class="layer__request-btn" @click.stop="deleteStyle()">
            <span class="layer__request-btn__text-1">Delete Style</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import ColorPicker from './ColorPicker'
  import NumberPicker from './NumberPicker'
  import _ from 'lodash'
  import EditStyleName from './EditStyleName'

  export default {
    props: {
      defaultName: String,
      allowStyleNameEditing: Boolean,
      deletable: Boolean,
      geometryType: String,
      styleRow: Object,
      layer: Object,
      projectId: String
    },
    created () {
      this.debounceColorOpacity = _.debounce((val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          if (this.styleRow.getHexColor() !== color || this.styleRow.getOpacity() !== opacity) {
            let styleRow = {
              id: this.styleRow.getId(),
              name: this.styleRow.getName(),
              description: this.styleRow.getDescription(),
              color: color,
              opacity: Number(opacity),
              fillColor: this.styleRow.getFillHexColor(),
              fillOpacity: this.styleRow.getFillOpacity(),
              width: this.styleRow.getWidth()
            }
            this.updateProjectLayerStyleRow({
              projectId: this.projectId,
              layerId: this.layer.id,
              styleRow: styleRow
            })
          }
        }
      }, 500)
      this.debounceFillColorOpacity = _.debounce((val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          if (this.styleRow.getFillHexColor() !== color || this.styleRow.getFillOpacity() !== opacity) {
            let styleRow = {
              id: this.styleRow.getId(),
              name: this.styleRow.getName(),
              description: this.styleRow.getDescription(),
              color: this.styleRow.getHexColor(),
              opacity: this.styleRow.getOpacity(),
              fillColor: color,
              fillOpacity: Number(opacity),
              width: this.styleRow.getWidth()
            }
            this.updateProjectLayerStyleRow({
              projectId: this.projectId,
              layerId: this.layer.id,
              styleRow: styleRow
            })
          }
        }
      }, 500)
      this.debounceWidth = _.debounce((val) => {
        if (val) {
          if (this.styleRow.getWidth() !== val) {
            let styleRow = {
              id: this.styleRow.getId(),
              name: this.styleRow.getName(),
              description: this.styleRow.getDescription(),
              color: this.styleRow.getHexColor(),
              opacity: this.styleRow.getOpacity(),
              fillColor: this.styleRow.getFillHexColor(),
              fillOpacity: this.styleRow.getFillOpacity(),
              width: parseFloat(val)
            }
            this.updateProjectLayerStyleRow({
              projectId: this.projectId,
              layerId: this.layer.id,
              styleRow: styleRow
            })
          }
        }
      }, 500)
    },
    components: {
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker,
      'editstylename': EditStyleName
    },
    computed: {
      color: {
        get () {
          return this.getRGBA(this.styleRow.getHexColor(), this.styleRow.getOpacity())
        },
        set (val) {
          this.debounceColorOpacity(val)
        }
      },
      fillColor: {
        get () {
          return this.getRGBA(this.styleRow.getFillHexColor(), this.styleRow.getFillOpacity())
        },
        set (val) {
          this.debounceFillColorOpacity(val)
        }
      },
      width: {
        get () {
          return this.styleRow.getWidth()
        },
        set (val) {
          this.debounceWidth(val)
        }
      },
      name: function () {
        return this.styleRow.getName()
      }
    },
    methods: {
      ...mapActions({
        updateProjectLayerStyleRow: 'Projects/updateProjectLayerStyleRow',
        deleteProjectLayerStyleRow: 'Projects/deleteProjectLayerStyleRow'
      }),
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
      },
      deleteStyle () {
        this.deleteProjectLayerStyleRow({
          projectId: this.projectId,
          layerId: this.layer.id,
          styleId: this.styleRow.getId()
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
