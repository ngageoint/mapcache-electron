<template>
  <expandablecard class="mb-2">
    <div slot="card-header">
      <v-row no-gutters justify="space-between" align="center">
        <v-col class="align-center">
          <view-edit-text :editing-disabled="!allowStyleNameEditing" :value="styleRow.getName()" :appendedText="showId ? ' (' + styleRow.id + ')' : ''" font-size="14px" font-weight="400" font-color="black" label="Style Name" :on-save="saveName"/>
        </v-col>
        <v-col>
          <v-row no-gutters class="justify-end" align="center">
            <svg height="25" width="25">
              <circle cx="12.5" cy="12.5" r="5" :stroke="color" :fill="color" :stroke-width="(Math.min(width, 5) + 'px')"></circle>
            </svg>
            <svg height="25" width="25">
              <polyline points="5,20 20,15, 5,10, 20,5" :stroke="color" :stroke-width="(Math.min(width, 5) + 'px')" fill="none"></polyline>
            </svg>
            <svg height="25" width="25">
              <polygon points="5,10 20,5 20,20 5,20" :stroke="color" :fill="fillColor" :stroke-width="(Math.min(width, 5) + 'px')"></polygon>
            </svg>
          </v-row>
        </v-col>
      </v-row>
    </div>
    <div slot="card-expanded-body">
      <v-container>
        <v-row no-gutters class="mb-2">
          <v-col cols="10">
            <label class="v-label v-label--active theme--light v-label--active fs12">Color</label>
            <colorpicker :color="color" v-model="color" />
          </v-col>
        </v-row>
        <v-row v-if="(geometryType === 'POLYGON' || geometryType === 'MULTIPOLYGON' || geometryType === undefined) && styleRow.getFillHexColor() !== null && styleRow.getFillOpacity() !== null" no-gutters class="mb-2">
          <v-col cols="10">
            <label class="v-label v-label--active theme--light v-label--active fs12">Fill Color</label>
            <colorpicker :color="fillColor" v-model="fillColor" />
          </v-col>
        </v-row>
        <v-row no-gutters class="justify-space-between" align="center">
          <v-col cols="6" class="align-center">
            <numberpicker :number="styleRow.getWidth()" label="Width (px)" :step="Number(0.1)" :min="Number(0.1)" @update-number="updateWidth" />
          </v-col>
          <v-col cols="6">
            <v-row v-if="deletable" no-gutters class="justify-end" align="center">
              <v-btn text dark color="#ff4444" @click.stop="deleteStyle()">
                <v-icon>mdi-trash-can</v-icon> Delete Style
              </v-btn>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </expandablecard>
</template>

<script>
  import { mapActions } from 'vuex'
  import ColorPicker from '../Common/ColorPicker'
  import NumberPicker from '../Common/NumberPicker'
  import _ from 'lodash'
  import ExpandableCard from '../Card/ExpandableCard'
  import ViewEditText from '../Common/ViewEditText'

  export default {
    props: {
      id: String,
      tableName: String,
      defaultName: String,
      allowStyleNameEditing: Boolean,
      deletable: Boolean,
      geometryType: String,
      styleRow: Object,
      projectId: String,
      showId: Boolean,
      isGeoPackage: {
        type: Boolean,
        default: true
      }
    },
    created () {
      this.debounceColorOpacity = _.debounce((val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          if (this.styleRow.getHexColor() !== color || this.styleRow.getOpacity() !== opacity) {
            let styleRow = {
              id: this.styleRow.id,
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
              id: this.id,
              tableName: this.tableName,
              styleRow: styleRow,
              isGeoPackage: this.isGeoPackage
            })
          }
        }
      }, 500)
      this.debounceFillColorOpacity = _.debounce((val) => {
        if (val) {
          const {color, opacity} = this.parseColor(val)
          if (this.styleRow.getFillHexColor() !== color || this.styleRow.getFillOpacity() !== opacity) {
            let styleRow = {
              id: this.styleRow.id,
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
              id: this.id,
              tableName: this.tableName,
              styleRow: styleRow,
              isGeoPackage: this.isGeoPackage
            })
          }
        }
      }, 500)
      this.debounceWidth = _.debounce((val) => {
        if (val) {
          if (this.styleRow.getWidth() !== val) {
            let styleRow = {
              id: this.styleRow.id,
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
              id: this.id,
              tableName: this.tableName,
              styleRow: styleRow,
              isGeoPackage: this.isGeoPackage
            })
          }
        }
      }, 500)
    },
    components: {
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker,
      'expandablecard': ExpandableCard,
      ViewEditText
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
      }
    },
    methods: {
      ...mapActions({
        updateProjectLayerStyleRow: 'Projects/updateProjectLayerStyleRow',
        deleteProjectLayerStyleRow: 'Projects/deleteProjectLayerStyleRow'
      }),
      updateWidth (val) {
        this.debounceWidth(val)
      },
      saveName (val) {
        if (this.styleRow.getName() !== val) {
          let styleRow = {
            id: this.styleRow.id,
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
            id: this.id,
            tableName: this.tableName,
            styleRow: styleRow,
            isGeoPackage: this.isGeoPackage
          })
        }
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
      },
      deleteStyle () {
        this.deleteProjectLayerStyleRow({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          styleId: this.styleRow.id,
          isGeoPackage: this.isGeoPackage
        })
      }
    }
  }
</script>

<style scoped>
  .subtitle-card {
    color: dimgray;
    font-size: 16px;
    font-weight: normal;
  }
  .title-card {
    color: dimgray;
    font-size: 18px;
    font-weight: 500;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .delete-button {
    margin-right: .25rem;
    cursor: pointer;
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
  .fs12 {
    font-size: 12px;
  }
</style>
