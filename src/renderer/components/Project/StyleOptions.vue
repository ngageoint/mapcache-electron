<template>
  <expandablecard>
    <div slot="card-header">
      <div class="flex-row">
        <div class="subtitle-card">
          <p>
            {{name + (showId ? ' (' + styleRow.getId() + ')' : '')}}
          </p>
        </div>
        <div class="color-box" :style="{backgroundColor: ((geometryType === 'Polygon' || geometryType === 'MultiPolygon') ? fillColor : color)}"></div>
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
        <div>
          <div v-if="deletable" class="delete-button" @click.stop="deleteStyle()">
            <font-awesome-icon icon="trash" class="danger" size="2x"/>
          </div>
        </div>
      </div>
    </div>
  </expandablecard>
</template>

<script>
  import { mapActions } from 'vuex'
  import ColorPicker from './ColorPicker'
  import NumberPicker from './NumberPicker'
  import _ from 'lodash'
  import ExpandableCard from '../Card/ExpandableCard'

  export default {
    props: {
      defaultName: String,
      allowStyleNameEditing: Boolean,
      deletable: Boolean,
      geometryType: String,
      styleRow: Object,
      layer: Object,
      projectId: String,
      showId: Boolean
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
      this.debounceName = _.debounce((val) => {
        if (this.styleRow.getName() !== val) {
          let styleRow = {
            id: this.styleRow.getId(),
            name: val,
            description: this.styleRow.getDescription(),
            color: this.styleRow.getHexColor(),
            opacity: this.styleRow.getOpacity(),
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
      'expandablecard': ExpandableCard
    },
    computed: {
      name: {
        get () {
          return this.styleRow.getName()
        },
        set (val) {
          this.debounceName(val)
        }
      },
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
  .color-box {
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    margin: 0.25rem;
    width: 2rem;
    height: 2rem;
  }
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
  .delete-button {
    padding-top: 1.5rem;
    margin-right: .25rem;
    cursor: pointer;
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
</style>
