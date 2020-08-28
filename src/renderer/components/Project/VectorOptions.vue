<template>
  <div>
    <expandablecard class="mb-2">
      <div slot="card-header">
        <div class="title-card">
          Feature Tile Settings
        </div>
      </div>
      <div slot="card-expanded-body">
        <v-container fluid>
          <v-row no-gutters>
            <v-col cols="12">
              <div class="subtitle-card">
                <numberpicker :number="Number(layer.maxFeatures)" label="Max Features" :step="Number(10)" @update-number="updateMaxFeatures" :min="Number(0)" />
              </div>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </expandablecard>
    <div v-if="!loading">
      <expandablecard class="mb-2">
        <div slot="card-header">
          <div class="title-card">
            Default Styles and Icons
          </div>
        </div>
        <div slot="card-expanded-body">
          <card class="mb-2">
            <div slot="card">
              <div class="subtitle-card">
                Default Point Style/Icon
              </div>
              <v-row no-gutters>
                <input type="checkbox" :id="layer.id" name="set-name" class="switch-input" v-model="usePointIconDefault">
                <label :for="layer.id" class="switch-label">Use <span class="toggle--on">Icon</span><span class="toggle--off">Style</span></label>
              </v-row>
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
                      :allowIconNameEditing="false"
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
      <expandablecard class="mb-2">
        <div slot="card-header">
          <v-row class="justify-space-between" no-gutters>
            <v-col cols="10" class="title-card">
              {{'Feature Styles (' + Object.keys(featureStyleRows).length + ')'}}
            </v-col>
            <v-col cols="2">
              <v-row no-gutters class="justify-end">
                <font-awesome-icon icon="plus-circle" size="2x" class="add-button" @click.stop="addFeatureStyle()"/>
              </v-row>
            </v-col>
          </v-row>
        </div>
        <div slot="card-expanded-body" class="mt-2">
          <styleoptions
            v-for="styleRow in featureStyleRows"
            :key="'style_' + styleRow.id"
            :deletable="true"
            :defaultName="styleRow.id + ''"
            :allowStyleNameEditing="true"
            :style-row="styleRow"
            :layer="layer"
            :project-id="projectId"
            :show-id="true"/>
          <expandablecard class="mb-2" v-if="Object.keys(featureStyleRows).length > 0">
            <div slot="card-header">
              <v-row no-gutters class="subtitle-card">
                <v-card-title class="ma-0 pa-0 full-width fs-16 fw-500">
                  <v-row no-gutters class="full-width">
                    <v-col class="title-edit align-center" cols="12">
                      <p>Feature Style Assignment</p>
                    </v-col>
                  </v-row>
                </v-card-title>
              </v-row>
            </div>
            <div slot="card-expanded-body">
              <v-container fluid>
                <v-row>
                  <v-col cols="12">
                    <v-select v-model="styleAssignmentFeature" :items="featureItems" label="Feature" dense hide-details>
                    </v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-select v-model="featureStyleSelection" :items="styleItems" label="Style" dense hide-details>
                    </v-select>
                  </v-col>
                </v-row>
              </v-container>
            </div>
          </expandablecard>
        </div>
      </expandablecard>
      <expandablecard class="mb-2">
        <div slot="card-header">
          <v-row class="justify-space-between" no-gutters>
            <v-col cols="10" class="title-card">
              {{'Feature Icons (' + Object.keys(featureIconRows).length + ')'}}
            </v-col>
            <v-col cols="2">
              <v-row no-gutters class="justify-end">
                <font-awesome-icon icon="plus-circle" size="2x" class="add-button" @click.stop="addFeatureIcon()"/>
              </v-row>
            </v-col>
          </v-row>
        </div>
        <div slot="card-expanded-body" class="mt-2">
          <iconoptions
            v-for="iconRow in featureIconRows"
            :key="'icon' + iconRow.id"
            :deletable="true"
            :defaultName="iconRow.id + ''"
            :allowIconNameEditing="true"
            geometry-type="Point"
            :icon-row="iconRow"
            :layer="layer"
            :project-id="projectId"
            :show-id="true"
            :is-table-icon="false"/>
          <expandablecard class="mb-2" v-if="Object.keys(featureIconRows).length > 0">
            <div slot="card-header">
              <v-row no-gutters class="subtitle-card">
                <v-card-title class="ma-0 pa-0 full-width fs-16 fw-500">
                  <v-row no-gutters class="full-width">
                    <v-col class="title-edit align-center" cols="12">
                      <p>Feature Icon Assignment</p>
                    </v-col>
                  </v-row>
                </v-card-title>
              </v-row>
            </div>
            <div slot="card-expanded-body">
              <v-container fluid>
                <v-row>
                  <v-col cols="12">
                    <v-select v-model="iconAssignmentFeature" :items="featureItems" label="Feature" dense hide-details>
                    </v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-select v-model="featureIconSelection" :items="iconItems" label="Icon" dense hide-details>
                    </v-select>
                  </v-col>
                </v-row>
              </v-container>
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
  import { GeoPackageAPI } from '@ngageoint/geopackage'
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
        featureItems: null,
        styleItems: null,
        iconItems: null,
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
      styleAssignmentFeature: {
        get () {
          return this.layer.styleAssignmentFeature || -1
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
          return this.layer.iconAssignmentFeature || -1
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
      updateMaxFeatures (val) {
        this.debounceUpdateMaxFeatures(val)
      },
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
          let featureStyle = GeoPackageUtilities._getFeatureStyle(gp, this.layer.sourceLayerName, featureId)
          if (_.isNil(featureStyle)) {
            this.featureStyleSelection = -1
          } else {
            this.featureStyleSelection = featureStyle.id
          }
        }
      },
      determineIconForIconAssignment (gp, featureId) {
        if (featureId !== -1) {
          let featureIcon = GeoPackageUtilities._getFeatureIcon(gp, this.layer.sourceLayerName, featureId)
          if (_.isNil(featureIcon)) {
            this.featureIconSelection = -1
          } else {
            this.featureIconSelection = featureIcon.id
          }
        }
      },
      async getStyle () {
        let gp = await GeoPackageAPI.open(this.layer.geopackageFilePath)
        try {
          let featureTableName = this.layer.sourceLayerName
          this.tablePointStyleRow = GeoPackageUtilities._getTableStyle(gp, featureTableName, 'Point')
          this.tablePointIconRow = GeoPackageUtilities._getTableIcon(gp, featureTableName, 'Point')
          this.usePointIconDefault = !_.isNil(this.tablePointIconRow)
          if (!this.usePointIconDefault) {
            this.tablePointIconRow = GeoPackageUtilities._getIconById(gp, featureTableName, this.layer.tablePointIconRowId)
          }
          this.tableLineStringStyleRow = GeoPackageUtilities._getTableStyle(gp, featureTableName, 'LineString')
          this.tablePolygonStyleRow = GeoPackageUtilities._getTableStyle(gp, featureTableName, 'Polygon')
          this.features = GeoPackageUtilities._getFeatureIds(gp, this.layer.sourceLayerName)
          this.featureItems = [{text: 'Select Feature', value: -1}]
          for (let featureIdx in this.features) {
            let featureId = this.features[featureIdx]
            this.featureItems.push({text: featureId, value: Number(featureId)})
          }
          let featureStyleRows = GeoPackageUtilities._getFeatureStyleRows(gp, featureTableName)
          this.styleItems = [{text: 'Use Defaults', value: -1}]
          for (let styleId in featureStyleRows) {
            let style = featureStyleRows[styleId]
            this.styleItems.push({text: style.getName() + ' (' + style.id + ')', value: style.id})
          }
          this.featureStyleRows = featureStyleRows
          let featureIconRows = GeoPackageUtilities._getFeatureIconRows(gp, featureTableName)
          this.iconItems = [{text: 'Use Defaults', value: -1}]
          for (let iconId in featureIconRows) {
            let icon = featureIconRows[iconId]
            this.iconItems.push({text: icon.name + ' (' + icon.id + ')', value: icon.id})
          }
          this.featureIconRows = featureIconRows
          this.determineStyleForStyleAssignment(gp, this.styleAssignmentFeature)
          this.determineIconForIconAssignment(gp, this.iconAssignmentFeature)
        } catch (error) {
          console.error(error)
        }
        try {
          gp.close()
        } catch (error) {
          console.error(error)
        }
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
          let gp = await GeoPackageAPI.open(this.layer.geopackageFilePath)
          this.determineStyleForStyleAssignment(gp, newValue)
        }
      },
      iconAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.layer.geopackageFilePath)
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
    color: #000;
    font-size: 16px;
    font-weight: normal;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
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
  .add-button {
    color: #2962ff;
    margin-right: 0.25rem;
  }
  .add-button:hover {
    color: #0039cb;
    cursor: pointer;
  }
  .title-edit {
    min-width: 0;
    display: inherit;
    overflow: hidden;
  }
  .title-edit p {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0 !important;
  }
  .fs-16 {
    font-size: 16px;
  }
  .fw-500 {
    font-weight: 500;
  }
</style>
