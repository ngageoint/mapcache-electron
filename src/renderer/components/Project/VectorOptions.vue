<template>
  <div>
    <div class="layer__face__stats">
      <p class="layer__face__stats__weight">
        Feature Tile Max Features
      </p>
      <div>
        <label class="control-label">Max Features</label>
        <div>
          <numberpicker :number="maxFeatures" v-model="maxFeatures" />
        </div>
      </div>
    </div>
    <div class="layer__face__stats">
      <styleoptions
              defaultName="Point Style Default"
              :allowStyleNameEditing="false"
              geometry-type="Point"
              :icon-or-style="pointIconOrStyle"
              :style-id="pointStyleId"
              :icon-id="pointIconId"
              :layer="layer"
              :project-id="projectId"
              :allowSwitchBetweenIconAndStyle="true"/>
      <styleoptions
              defaultName="LineString Style Default"
              :allowStyleNameEditing="false"
              geometry-type="LineString"
              icon-or-style="style"
              :style-id="lineStringStyleId"
              :layer="layer"
              :project-id="projectId"/>
      <styleoptions
              defaultName="Polygon Style Default"
              :allowStyleNameEditing="false"
              geometry-type="Polygon"
              icon-or-style="style"
              :style-id="polygonStyleId"
              :layer="layer"
              :project-id="projectId"/>
<!--      <div class="layer__face__stats">-->
<!--        <p class="layer__face__stats__weight">-->
<!--          Set Feature Style-->
<!--        </p>-->
<!--        <div class="preset-select">-->
<!--          <select v-model="featureSelection">-->
<!--             <option value="-1">Select Feature</option>-->
<!--            <option v-for="feature in features" :value="feature.id">{{feature.id}}</option>-->
<!--          </select>-->
<!--        </div>-->
<!--      </div>-->
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Feature Styles
        </p>
        <ul>
          <li v-for="styleId in styleRows">
            <styleoptions
              :defaultName="styleId"
              :allowStyleNameEditing="true"
              icon-or-style="style"
              :style-id="styleId"
              :layer="layer"
              :project-id="projectId"/>
          </li>
        </ul>
        <button type="button" class="layer__request-btn" @click.stop="addFeatureStyle()">
          <span class="layer__request-btn__text-1">Add Style</span>
        </button>
      </div>
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Feature Icons
        </p>
        <ul>
          <li v-for="iconId in iconRows">
            <styleoptions
              :defaultName="iconId"
              :allowStyleNameEditing="true"
              icon-or-style="icon"
              geometry-type="Point"
              :icon-id="iconId"
              :layer="layer"
              :project-id="projectId"/>
          </li>
        </ul>
        <button type="button" class="layer__request-btn" @click.stop="addFeatureIcon()">
          <span class="layer__request-btn__text-1">Add Icon</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import StyleOptions from './StyleOptions'
  import NumberPicker from './NumberPicker'
  import _ from 'lodash'
  import VectorStyleUtilities from '../../../lib/VectorStyleUtilities'

  export default {
    props: {
      layer: Object,
      projectId: String
    },
    components: {
      'styleoptions': StyleOptions,
      'numberpicker': NumberPicker
    },
    created () {
      this.debounceUpdateMaxFeatures = _.debounce((val) => {
        if (val) {
          this.updateProjectLayerStyleMaxFeatures({
            projectId: this.projectId,
            layerId: this.layer.id,
            maxFeatures: val
          })
        }
      }, 500)
    },
    computed: {
      features: {
        get () {
          return this.layer.featureCollection ? this.layer.featureCollection.features : []
        }
      },
      pointIconOrStyle: {
        get () {
          return this.layer.style.default.iconOrStyle['Point']
        }
      },
      pointStyleId: {
        get () {
          return this.layer.style.default.styles['Point'] + ''
        }
      },
      pointIconId: {
        get () {
          return this.layer.style.default.icons['Point'] + ''
        }
      },
      maxFeatures: {
        get () {
          return this.layer.style.maxFeatures
        },
        set (val) {
          this.debounceUpdateMaxFeatures(val)
        }
      },
      lineStringStyleId: {
        get () {
          return this.layer.style.default.styles['LineString'] + ''
        }
      },
      polygonStyleId: {
        get () {
          return this.layer.style.default.styles['Polygon'] + ''
        }
      },
      styleRows: {
        get () {
          let styleRows = Object.assign({}, this.layer.style.styleRowMap)
          delete styleRows[this.layer.style.default.styles['Point']]
          delete styleRows[this.layer.style.default.styles['Polygon']]
          delete styleRows[this.layer.style.default.styles['LineString']]
          return Object.keys(styleRows)
        }
      },
      iconRows: {
        get () {
          let iconRows = Object.assign({}, this.layer.style.iconRowMap)
          delete iconRows[this.layer.style.default.icons['Point']]
          return Object.keys(iconRows)
        }
      },
      featureSelection: {
        get () {
          return this.layer.featureSelection || '-1'
        },
        set (value) {
          this.updateProjectLayerFeatureSelection({
            projectId: this.projectId,
            layerId: this.layer.id,
            featureSelection: value
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateProjectLayerFeatureSelection: 'Projects/updateProjectLayerFeatureSelection',
        updateProjectLayerStyleMaxFeatures: 'Projects/updateProjectLayerStyleMaxFeatures',
        updateProjectLayerStyleRow: 'Projects/updateProjectLayerStyleRow',
        updateProjectLayerIconRow: 'Projects/updateProjectLayerIconRow'
      }),
      addFeatureStyle () {
        // TODO Implement Add Style
      },
      addFeatureIcon () {
        let newIcon = VectorStyleUtilities.getDefaultIcon()
        let existingIconIds = Object.keys(this.layer.style.iconRowMap).map(id => Number(id))
        let iconId = 1
        while (existingIconIds.indexOf(iconId) !== -1) {
          iconId++
        }
        this.updateProjectLayerIconRow({
          projectId: this.projectId,
          layerId: this.layer.id,
          iconId: iconId,
          icon: newIcon
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
  .layer__request-btn {
    position: relative;
    width: 50%;
    height: 30px;
    background-color: rgba(51 ,136 ,255 ,1);
    text-transform: uppercase;
    font-size: 14px;
    color: #FFF;
    outline: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0;
    -webkit-transition: letter-spacing 0.3s;
    transition: letter-spacing 0.3s;
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
