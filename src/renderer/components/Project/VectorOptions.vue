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
    <div class="layer__face__stats" v-if="!loading">
      <styleoptions
              defaultName="Point Style Default"
              :deletable="false"
              :allowStyleNameEditing="false"
              geometry-type="Point"
              :style-row="tablePointStyleRow"
              :layer="layer"
              :project-id="projectId"/>
      <iconoptions
              defaultName="Point Icon Default"
              :allowStyleNameEditing="false"
              geometry-type="Point"
              :icon-row="tablePointIconRow"
              :layer="layer"
              :project-id="projectId"/>
      <styleoptions
              defaultName="LineString Style Default"
              :deletable="false"
              :allowStyleNameEditing="false"
              geometry-type="LineString"
              :style-row="tableLineStringStyleRow"
              :layer="layer"
              :project-id="projectId"/>
      <styleoptions
              defaultName="Polygon Style Default"
              :deletable="false"
              :allowStyleNameEditing="false"
              geometry-type="Polygon"
              :style-row="tablePolygonStyleRow"
              :layer="layer"
              :project-id="projectId"/>
      <hr style="margin: 10px"/>
      <div class="layer__face__stats">
        <div class="container">
          <div class="flex-row">
            <p class="layer__face__stats__weight">
              Feature Styles
            </p>
            <button type="button" class="layer__request-btn" @click.stop="addFeatureStyle()">
              <span class="layer__request-btn__text-1">New</span>
            </button>
          </div>
          <div class="flex-row">
            <ul>
              <li v-for="styleRow in featureStyleRows">
                <styleoptions
                  :deletable="true"
                  :defaultName="styleRow.getId() + ''"
                  :allowStyleNameEditing="true"
                  :style-row="styleRow"
                  :layer="layer"
                  :project-id="projectId"/>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <hr style="margin: 10px"/>
      <div class="layer__face__stats">
        <div class="container">
          <div class="flex-row">
            <p class="layer__face__stats__weight">
              Feature Icons
            </p>
            <button type="button" class="layer__request-btn" @click.stop="addFeatureIcon()">
              <span class="layer__request-btn__text-1">New</span>
            </button>
          </div>
          <div class="flex-row">
            <ul>
              <li v-for="iconRow in featureIconRows">
                <iconoptions
                  :deletable="true"
                  :defaultName="iconRow.getId() + ''"
                  :allowStyleNameEditing="true"
                  geometry-type="Point"
                  :icon-row="iconRow"
                  :layer="layer"
                  :project-id="projectId"/>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="layer__face__stats">
        <p class="layer__face__stats__weight">
          Set Feature Style
        </p>
        <div class="preset-select">
          <select v-model="featureSelection">
            <option value="-1">Select Feature</option>
            <option v-for="feature in features" :value="feature.id">{{feature.id}}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import StyleOptions from './StyleOptions'
  import IconOptions from './IconOptions'
  import NumberPicker from './NumberPicker'
  import _ from 'lodash'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import GeoPackage from '@ngageoint/geopackage'
  import Modal from '../Modal'

  export default {
    props: {
      layer: Object,
      layerKey: Number,
      projectId: String
    },
    data () {
      return {
        loading: true,
        tablePointStyleRow: null,
        tablePointIconRow: null,
        tableLineStringStyleRow: null,
        tablePolygonStyleRow: null,
        featureStyleRows: null,
        featureIconRows: null,
        features: []
      }
    },
    components: {
      'styleoptions': StyleOptions,
      'iconoptions': IconOptions,
      'numberpicker': NumberPicker,
      'modal': Modal
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
      let _this = this
      this.getStyle().then(function () {
        _this.loading = false
      })
    },
    computed: {
      maxFeatures: {
        get () {
          return this.layer.maxFeatures
        },
        set (val) {
          this.debounceUpdateMaxFeatures(val)
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
        createProjectLayerStyleRow: 'Projects/createProjectLayerStyleRow',
        createProjectLayerIconRow: 'Projects/createProjectLayerIconRow'
      }),
      addFeatureStyle () {
        this.createProjectLayerStyleRow({
          projectId: this.projectId,
          layerId: this.layer.id
        })
      },
      addFeatureIcon () {
        this.createProjectLayerIconRow({
          projectId: this.projectId,
          layerId: this.layer.id
        })
      },
      async getStyle () {
        let gp = await GeoPackage.open(this.layer.geopackageFilePath)
        let featureTableName = this.layer.sourceLayerName
        this.tablePointStyleRow = GeoPackageUtilities.getTableStyle(gp, featureTableName, 'Point')
        this.tablePointIconRow = GeoPackageUtilities.getTableIcon(gp, featureTableName, 'Point')
        this.tableLineStringStyleRow = GeoPackageUtilities.getTableStyle(gp, featureTableName, 'LineString')
        this.tablePolygonStyleRow = GeoPackageUtilities.getTableStyle(gp, featureTableName, 'Polygon')
        this.featureStyleRows = GeoPackageUtilities.getFeatureStyleRows(gp, featureTableName)
        this.featureIconRows = GeoPackageUtilities.getFeatureIconRows(gp, featureTableName)
        this.features = GeoPackageUtilities.getFeatureIds(this.layer.geopackageFilePath, this.layer.sourceLayerName)
      }
    },
    watch: {
      layerKey: {
        async handler (layerKey, oldValue) {
          await this.getStyle()
        },
        deep: true
      }
    }
  }
</script>

<style scoped>
  .flex-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
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
    width: 64px;
    height: 24px;
    margin-right: 10px;
    background-color: rgba(51 ,136 ,255 ,1);
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
