<template>
  <div>
    <expandablecard>
      <div slot="card-header">
        <div class="title-card">
          <p>
            Feature Tile Settings
          </p>
        </div>
      </div>
      <div slot="card-expanded-body">
        <div class="subtitle-card">
          <label class="control-label">Max Features</label>
          <div>
            <numberpicker :number="maxFeatures" v-model="maxFeatures" />
          </div>
        </div>
      </div>
    </expandablecard>
    <div v-if="!loading">
      <expandablecard>
        <div slot="card-header">
          <div class="title-card">
            <p>
              Default Styles and Icons
            </p>
          </div>
        </div>
        <div slot="card-expanded-body">
          <card>
            <div slot="card">
              <div class="subtitle-card">
                <p>
                  Default Point Style/Icon
                </p>
              </div>
              <div class="flex-row">
                <input type="checkbox" :id="layer.id" name="set-name" class="switch-input" v-model="usePointIconDefault">
                <label :for="layer.id" class="switch-label">Use <span class="toggle--on">Icon</span><span class="toggle--off">Style</span></label>
              </div>
              <styleoptions
                      v-if="!usePointIconDefault && tablePointStyleRow"
                      defaultName="Point Style"
                      :deletable="false"
                      :allowStyleNameEditing="false"
                      geometry-type="Point"
                      :style-row="tablePointStyleRow"
                      :layer="layer"
                      :project-id="projectId"
                      :show-id="false"/>
              <iconoptions
                      v-if="usePointIconDefault && tablePointIconRow"
                      defaultName="Point Icon"
                      :allowStyleNameEditing="false"
                      geometry-type="Point"
                      :icon-row="tablePointIconRow"
                      :layer="layer"
                      :project-id="projectId"
                      :show-id="false"
                      :is-table-icon="true"/>
            </div>
          </card>
          <styleoptions
                  defaultName="LineString Style"
                  :deletable="false"
                  :allowStyleNameEditing="false"
                  geometry-type="LineString"
                  :style-row="tableLineStringStyleRow"
                  :layer="layer"
                  :project-id="projectId"
                  :show-id="false"/>
          <styleoptions
                  defaultName="Polygon Style"
                  :deletable="false"
                  :allowStyleNameEditing="false"
                  geometry-type="Polygon"
                  :style-row="tablePolygonStyleRow"
                  :layer="layer"
                  :project-id="projectId"
                  :show-id="false"/>
        </div>
      </expandablecard>
      <expandablecard>
        <div slot="card-header">
          <div class="flex-row">
            <div class="title-card">
              <p>
                Feature Styles
              </p>
            </div>
            <div class="add-button" @click.stop="addFeatureStyle()">
              <font-awesome-icon icon="plus-circle" class="new" size="2x"/>
            </div>
          </div>
        </div>
        <div slot="card-expanded-body">
          <ul style="list-style-type:none">
            <li v-for="styleRow in featureStyleRows">
              <styleoptions
                      :deletable="true"
                      :defaultName="styleRow.getId() + ''"
                      :allowStyleNameEditing="true"
                      :style-row="styleRow"
                      :layer="layer"
                      :project-id="projectId"
                      :show-id="true"/>
            </li>
          </ul>
          <expandablecard v-if="Object.keys(featureStyleRows).length > 0">
            <div slot="card-header">
              <div class="subtitle-card">
                <p>
                  Feature Style Assignment
                </p>
              </div>
            </div>
            <div slot="card-expanded-body">
              <div class="flex-row">
                <div class="flex-row">
                  <div class="preset-select">
                    <label class="control-label">Feature</label>
                    <select v-model="styleAssignmentFeature">
                      <option value="-1">Select Feature</option>
                      <option v-for="feature in features" :value="feature">{{feature}}</option>
                    </select>
                  </div>
                  <div class="preset-select">
                    <label class="control-label">Style</label>
                    <select v-model="featureStyleSelection">
                      <option :value="-1">Use Defaults</option>
                      <option v-for="style in featureStyleRows" :value="style.getId()">{{style.getName() + ' (' + style.getId() + ')'}}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </expandablecard>
        </div>
      </expandablecard>
      <expandablecard>
        <div slot="card-header">
          <div class="flex-row">
            <div class="title-card">
              <p>
                Feature Icons
              </p>
            </div>
            <div class="add-button" @click.stop="addFeatureIcon()">
              <font-awesome-icon icon="plus-circle" class="new" size="2x"/>
            </div>
          </div>
        </div>
        <div slot="card-expanded-body">
          <ul style="list-style-type:none">
            <li v-for="iconRow in featureIconRows">
              <iconoptions
                :deletable="true"
                :defaultName="iconRow.getId() + ''"
                :allowStyleNameEditing="true"
                geometry-type="Point"
                :icon-row="iconRow"
                :layer="layer"
                :project-id="projectId"
                :show-id="true"
                :is-table-icon="false"/>
            </li>
          </ul>
          <expandablecard v-if="Object.keys(featureIconRows).length > 0">
            <div slot="card-header">
              <div class="subtitle-card">
                <p>
                  Feature Icon Assignment
                </p>
              </div>
            </div>
            <div slot="card-expanded-body">
              <div class="flex-row">
                <div class="flex-row">
                  <div>
                    <label class="control-label">Feature</label>
                    <div class="preset-select">
                      <select v-model="iconAssignmentFeature">
                        <option value="-1">Select Feature</option>
                        <option v-for="feature in features" :value="feature">{{feature}}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="control-label">Icon</label>
                    <div class="preset-select">
                      <select v-model="featureIconSelection">
                        <option value="-1">Use Defaults</option>
                        <option v-for="icon in featureIconRows" :value="icon.getId()">{{icon.getName() + ' (' + icon.getId() + ')'}}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </expandablecard>
        </div>
      </expandablecard>
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
  import Card from '../Card/Card'
  import ExpandableCard from '../Card/ExpandableCard'

  export default {
    props: {
      layer: Object,
      layerKey: Number,
      projectId: String
    },
    data () {
      return {
        loading: true,
        updatingStyle: true,
        tablePointStyleRow: null,
        tablePointIconRow: null,
        tableLineStringStyleRow: null,
        tablePolygonStyleRow: null,
        featureStyleRows: null,
        featureIconRows: null,
        features: [],
        featureStyleSelection: -1,
        featureIconSelection: -1,
        usePointIconDefault: false
      }
    },
    components: {
      'styleoptions': StyleOptions,
      'iconoptions': IconOptions,
      'numberpicker': NumberPicker,
      'modal': Modal,
      'card': Card,
      'expandablecard': ExpandableCard
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
        _this.updatingStyle = false
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
      styleAssignmentFeature: {
        get () {
          return this.layer.styleAssignmentFeature || '-1'
        },
        set (value) {
          this.updateStyleAssignmentFeature({
            projectId: this.projectId,
            layerId: this.layer.id,
            styleAssignmentFeature: value
          })
        }
      },
      iconAssignmentFeature: {
        get () {
          return this.layer.iconAssignmentFeature || '-1'
        },
        set (value) {
          this.updateIconAssignmentFeature({
            projectId: this.projectId,
            layerId: this.layer.id,
            iconAssignmentFeature: value
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateFeatureStyleSelection: 'Projects/updateFeatureStyleSelection',
        updateFeatureIconSelection: 'Projects/updateFeatureIconSelection',
        updateStyleAssignmentFeature: 'Projects/updateStyleAssignmentFeature',
        updateIconAssignmentFeature: 'Projects/updateIconAssignmentFeature',
        updateProjectLayerStyleMaxFeatures: 'Projects/updateProjectLayerStyleMaxFeatures',
        createProjectLayerStyleRow: 'Projects/createProjectLayerStyleRow',
        createProjectLayerIconRow: 'Projects/createProjectLayerIconRow',
        updateProjectLayerUsePointIconDefault: 'Projects/updateProjectLayerUsePointIconDefault'
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
      determineStyleForStyleAssignment (gp, featureId) {
        if (featureId !== -1) {
          let featureStyle = GeoPackageUtilities.getFeatureStyle(gp, this.layer.sourceLayerName, featureId)
          if (_.isNil(featureStyle)) {
            this.featureStyleSelection = -1
          } else {
            this.featureStyleSelection = featureStyle.id
          }
        }
      },
      determineIconForIconAssignment (gp, featureId) {
        if (featureId !== -1) {
          let featureIcon = GeoPackageUtilities.getFeatureIcon(gp, this.layer.sourceLayerName, featureId)
          if (_.isNil(featureIcon)) {
            this.featureIconSelection = -1
          } else {
            this.featureIconSelection = featureIcon.id
          }
        }
      },
      async getStyle () {
        let gp = await GeoPackage.open(this.layer.geopackageFilePath)
        let featureTableName = this.layer.sourceLayerName
        this.tablePointStyleRow = GeoPackageUtilities.getTableStyle(gp, featureTableName, 'Point')
        this.tablePointIconRow = GeoPackageUtilities.getTableIcon(gp, featureTableName, 'Point')
        this.usePointIconDefault = !_.isNil(this.tablePointIconRow)
        if (!this.usePointIconDefault) {
          this.tablePointIconRow = GeoPackageUtilities.getIconById(gp, featureTableName, this.layer.tablePointIconRowId)
        }
        this.tableLineStringStyleRow = GeoPackageUtilities.getTableStyle(gp, featureTableName, 'LineString')
        this.tablePolygonStyleRow = GeoPackageUtilities.getTableStyle(gp, featureTableName, 'Polygon')
        this.featureStyleRows = GeoPackageUtilities.getFeatureStyleRows(gp, featureTableName)
        this.featureIconRows = GeoPackageUtilities.getFeatureIconRows(gp, featureTableName)
        this.features = GeoPackageUtilities.getFeatureIds(gp, this.layer.sourceLayerName)
        this.determineStyleForStyleAssignment(gp, this.styleAssignmentFeature)
        this.determineIconForIconAssignment(gp, this.iconAssignmentFeature)
      }
    },
    watch: {
      layerKey: {
        async handler (layerKey, oldValue) {
          if (layerKey !== oldValue) {
            let _this = this
            this.updatingStyle = true
            this.getStyle().then(function () {
              _this.updatingStyle = false
            })
          }
        },
        deep: true
      },
      featureStyleSelection: {
        async handler (newValue, oldValue) {
          // the user edited the value
          if (newValue !== oldValue && !this.updatingStyle) {
            this.updateFeatureStyleSelection({
              projectId: this.projectId,
              layerId: this.layer.id,
              featureId: this.styleAssignmentFeature,
              styleId: newValue
            })
          }
        }
      },
      featureIconSelection: {
        async handler (newValue, oldValue) {
          // the user edited the value
          if (Number(newValue) !== oldValue && !this.updatingStyle) {
            this.updateFeatureIconSelection({
              projectId: this.projectId,
              layerId: this.layer.id,
              featureId: this.iconAssignmentFeature,
              iconId: Number(newValue)
            })
          }
        }
      },
      styleAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackage.open(this.layer.geopackageFilePath)
          this.determineStyleForStyleAssignment(gp, newValue)
        }
      },
      iconAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackage.open(this.layer.geopackageFilePath)
          this.determineIconForIconAssignment(gp, newValue)
        }
      },
      usePointIconDefault: {
        async handler (newValue, oldValue) {
          if (!this.updatingStyle) {
            this.updateProjectLayerUsePointIconDefault({
              projectId: this.projectId,
              layerId: this.layer.id,
              usePointIconDefault: newValue
            })
          }
        }
      }
    }
  }
</script>

<style scoped>
  .title-card {
    color: #000;
    font-size: 20px
  }
  .subtitle-card {
    display: inline-block;
    vertical-align: middle;
    line-height: normal;
  }
  .control-label {
    font-size: 12px;
    color: #000;
  }
  .subtitle-card p, label {
    color: #000;
    font-size: 16px;
    font-weight: normal;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .preset-select {
    display:flex;
    flex-direction: column;
    justify-content: center;
    border-width: 1px;
    border-style: solid;
    margin: 0.25rem;
  }
  .preset-select select {
    display: flex;
    flex-direction: row;
    font-weight: normal;
    font-size: 14px;
    border: none;
    background: transparent;
    width: 100%;
    text-align-last: center;
  }
  .preset-select select:focus {
    outline: none;
  }
  .add-button {
    cursor: pointer;
  }
  .switch-input {
    display: none;
  }
  .switch-label {
    position: relative;
    display: inline-block;
    min-width: 112px;
    cursor: pointer;
    font-weight: 500;
    text-align: left;
    margin-left: 10px;
    padding: 16px 0 16px 44px;
  }
  .switch-label:before, .switch-label:after {
    content: "";
    position: absolute;
    margin: 0;
    outline: 0;
    top: 50%;
    -ms-transform: translate(0, -50%);
    -webkit-transform: translate(0, -50%);
    transform: translate(0, -50%);
    -webkit-transition: all 0.3s ease;
    transition: all 0.3s ease;
  }
  .switch-label:before {
    left: 1px;
    width: 34px;
    height: 14px;
    background-color: #9E9E9E;
    border-radius: 8px;
  }
  .switch-label:after {
    left: 0;
    width: 20px;
    height: 20px;
    background-color: #FAFAFA;
    border-radius: 50%;
    box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.14), 0 2px 2px 0 rgba(0, 0, 0, 0.098), 0 1px 5px 0 rgba(0, 0, 0, 0.084);
  }
  .switch-label .toggle--on {
    display: none;
  }
  .switch-label .toggle--off {
    display: inline-block;
  }
  .switch-input:checked + .switch-label:before {
    background-color: #768fff;
  }
  .switch-input:checked + .switch-label:after {
    background-color: #2962ff;
    -ms-transform: translate(80%, -50%);
    -webkit-transform: translate(80%, -50%);
    transform: translate(80%, -50%);
  }
  .switch-input:checked + .switch-label .toggle--on {
    display: inline-block;
  }
  .switch-input:checked + .switch-label .toggle--off {
    display: none;
  }
  .new {
    color: #2962ff;
    margin-right: 0.25rem;
  }
  .new:hover {
    color: #0039cb;
  }
</style>
