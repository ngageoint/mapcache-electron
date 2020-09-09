<template>
  <div>
    <div v-if="!loading">
      <expandablecard v-if="hasStyleExtension" class="mb-2">
        <div slot="card-header">
          <div class="title">
            Default Styles and Icons
          </div>
        </div>
        <div slot="card-expanded-body" class="detail">
          <card class="mb-2 mt-2">
            <div slot="card">
              <div class="subtitle">
                Default Point Style/Icon
              </div>
              <v-row no-gutters>
                <input type="checkbox" :id="geopackage.id + '_' + tableName" name="set-name" class="switch-input" v-model="usePointIconDefault">
                <label :for="geopackage.id + '_' + tableName" class="switch-label">Use <span class="toggle--on">Icon</span><span class="toggle--off">Style</span></label>
              </v-row>
              <styleoptions
                      v-if="!usePointIconDefault && tablePointStyleRow"
                      defaultName="Point Style"
                      :deletable="false"
                      :allowStyleNameEditing="false"
                      geometry-type="POINT"
                      :style-row="tablePointStyleRow"
                      :geopackage="geopackage"
                      :table-name="tableName"
                      :project-id="projectId"
                      :show-id="false"/>
              <iconoptions
                      v-if="usePointIconDefault && tablePointIconRow"
                      defaultName="Point Icon"
                      :allowIconNameEditing="false"
                      geometry-type="POINT"
                      :icon-row="tablePointIconRow"
                      :geopackage="geopackage"
                      :table-name="tableName"
                      :project-id="projectId"
                      :show-id="false"
                      :is-table-icon="true"/>
            </div>
          </card>
          <styleoptions
                  defaultName="LineString Style"
                  :deletable="false"
                  :allowStyleNameEditing="false"
                  geometry-type="LINESTRING"
                  :style-row="tableLineStringStyleRow"
                  :geopackage="geopackage"
                  :table-name="tableName"
                  :project-id="projectId"
                  :show-id="false"/>
          <styleoptions
                  defaultName="Polygon Style"
                  :deletable="false"
                  :allowStyleNameEditing="false"
                  geometry-type="POLYGON"
                  :style-row="tablePolygonStyleRow"
                  :geopackage="geopackage"
                  :table-name="tableName"
                  :project-id="projectId"
                  :show-id="false"/>
        </div>
      </expandablecard>
      <expandablecard v-if="hasStyleExtension" :allow-expand="Object.keys(featureStyleRows).length > 0" class="mb-2">
        <div slot="card-header">
          <v-row justify="space-between" align="center" no-gutters>
            <v-col class="title" align-content="center">
              {{'Feature Styles (' + Object.keys(featureStyleRows).length + ')'}}
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <v-btn dark color="#73c1c5" @click.stop="addFeatureStyle()">
                  <v-icon left>mdi-plus</v-icon> add style
                </v-btn>
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
            :geopackage="geopackage"
            :table-name="tableName"
            :project-id="projectId"
            :show-id="true"/>
          <expandablecard class="mb-2" v-if="Object.keys(featureStyleRows).length > 0 && featureItems.length > 1">
            <div slot="card-header">
              <v-row no-gutters class="subtitle">
                <v-card-title class="ma-0 pa-0 full-width">
                  <v-row no-gutters class="full-width">
                    <v-col class="title-edit align-center" cols="12">
                      <p class="assignment-title">Feature Style Assignment</p>
                    </v-col>
                  </v-row>
                </v-card-title>
              </v-row>
            </div>
            <div slot="card-expanded-body">
              <v-container fluid>
                <v-row>
                  <v-col cols="12">
                    <v-select v-model="styleAssignmentFeature" :items="featureItems" label="Feature" dense hide-details class="subtitle">
                    </v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-select v-model="featureStyleSelection" :items="styleItems" label="Style" dense hide-details class="subtitle">
                    </v-select>
                  </v-col>
                </v-row>
              </v-container>
            </div>
          </expandablecard>
        </div>
      </expandablecard>
      <expandablecard v-if="hasStyleExtension" :allow-expand="Object.keys(featureIconRows).length > 0" class="mb-2">
        <div slot="card-header">
          <v-row justify="space-between" align="center" no-gutters>
            <v-col class="title" align-content="center">
              {{'Feature Icons (' + Object.keys(featureIconRows).length + ')'}}
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <v-btn dark color="#73c1c5" @click.stop="addFeatureIcon()">
                  <v-icon left>mdi-plus</v-icon> add icon
                </v-btn>
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
            geometry-type="POINT"
            :icon-row="iconRow"
            :geopackage="geopackage"
            :table-name="tableName"
            :project-id="projectId"
            :show-id="true"
            :is-table-icon="false"/>
          <expandablecard class="mb-2" v-if="Object.keys(featureIconRows).length > 0 && iconFeatureItems.length > 1">
            <div slot="card-header">
              <v-row no-gutters class="subtitle">
                <v-card-title class="ma-0 pa-0 full-width">
                  <v-row no-gutters class="full-width">
                    <v-col class="title-edit align-center" cols="12">
                      <p class="assignment-title">Feature Icon Assignment</p>
                    </v-col>
                  </v-row>
                </v-card-title>
              </v-row>
            </div>
            <div slot="card-expanded-body">
              <v-container fluid>
                <v-row>
                  <v-col cols="12">
                    <v-select v-model="iconAssignmentFeature" :items="iconFeatureItems" label="Feature" dense hide-details class="subtitle">
                    </v-select>
                  </v-col>
                  <v-col cols="12">
                    <v-select v-model="featureIconSelection" :items="iconItems" label="Icon" dense hide-details class="subtitle">
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
  import NumberPicker from '../Common/NumberPicker'
  import _ from 'lodash'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import { GeoPackageAPI, GeometryType } from '@ngageoint/geopackage'
  import Card from '../Card/Card'
  import ExpandableCard from '../Card/ExpandableCard'

  export default {
    props: {
      filePath: String,
      geopackage: Object,
      tableName: String,
      projectId: String,
      styleKey: Number
    },
    data () {
      return {
        loading: true,
        hasStyleExtension: false,
        updatingStyle: true,
        tablePointStyleRow: null,
        tablePointIconRow: null,
        tableLineStringStyleRow: null,
        tablePolygonStyleRow: null,
        featureStyleRows: null,
        featureIconRows: null,
        featureItems: null,
        iconFeatureItems: null,
        styleItems: null,
        iconItems: null,
        features: [],
        iconFeatures: [],
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
      let _this = this
      this.getStyle().then(function () {
        _this.loading = false
        _this.updatingStyle = false
      })
    },
    computed: {
      styleAssignmentFeature: {
        get () {
          return this.geopackage.styleAssignment ? this.geopackage.styleAssignment.featureId : -1
        },
        set (value) {
          this.updateStyleAssignmentFeature({
            projectId: this.projectId,
            geopackageId: this.geopackage.id,
            tableName: this.tableName,
            featureId: value
          })
        }
      },
      iconAssignmentFeature: {
        get () {
          return this.geopackage.iconAssignment ? this.geopackage.iconAssignment.featureId : -1
        },
        set (value) {
          this.updateIconAssignmentFeature({
            projectId: this.projectId,
            geopackageId: this.geopackage.id,
            tableName: this.tableName,
            featureId: value
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
          geopackageId: this.geopackage.id,
          tableName: this.tableName
        })
      },
      addFeatureIcon () {
        this.createProjectLayerIconRow({
          projectId: this.projectId,
          geopackageId: this.geopackage.id,
          tableName: this.tableName
        })
      },
      determineStyleForStyleAssignment (gp, featureId) {
        if (featureId !== -1) {
          let featureStyle = GeoPackageUtilities._getFeatureStyle(gp, this.tableName, featureId)
          if (_.isNil(featureStyle)) {
            this.featureStyleSelection = -1
          } else {
            this.featureStyleSelection = featureStyle.id
          }
        }
      },
      determineIconForIconAssignment (gp, featureId) {
        if (featureId !== -1) {
          let featureIcon = GeoPackageUtilities._getFeatureIcon(gp, this.tableName, featureId)
          if (_.isNil(featureIcon)) {
            this.featureIconSelection = -1
          } else {
            this.featureIconSelection = featureIcon.id
          }
        }
      },
      async getStyle () {
        let gp = await GeoPackageAPI.open(this.filePath)
        try {
          let featureTableName = this.tableName
          this.hasStyleExtension = gp.featureStyleExtension.has(featureTableName)
          if (this.hasStyleExtension) {
            this.tablePointStyleRow = GeoPackageUtilities._getTableStyle(gp, featureTableName, GeometryType.POINT)
            this.tablePointIconRow = GeoPackageUtilities._getTableIcon(gp, featureTableName, GeometryType.POINT)
            this.usePointIconDefault = !_.isNil(this.tablePointIconRow)
            this.tableLineStringStyleRow = GeoPackageUtilities._getTableStyle(gp, featureTableName, GeometryType.LINESTRING)
            this.tablePolygonStyleRow = GeoPackageUtilities._getTableStyle(gp, featureTableName, GeometryType.POLYGON)
            this.features = GeoPackageUtilities._getFeatureIds(gp, this.tableName)
            this.featureItems = [{text: 'Select Feature', value: -1}]
            this.features.forEach(featureId => {
              this.featureItems.push({text: featureId, value: featureId})
            })
            this.iconFeatures = GeoPackageUtilities._getPointAndMultiPointFeatureIds(gp, this.tableName)
            this.iconFeatureItems = [{text: 'Select Feature', value: -1}]
            this.iconFeatures.forEach(featureId => {
              this.iconFeatureItems.push({text: featureId, value: featureId})
            })
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
          }
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
      styleKey: {
        async handler (styleKey, oldValue) {
          if (styleKey !== oldValue) {
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
              geopackageId: this.geopackage.id,
              tableName: this.tableName,
              featureId: this.styleAssignmentFeature,
              styleId: newValue
            })
          }
        }
      },
      featureIconSelection: {
        async handler (newValue, oldValue) {
          // the user edited the value
          if (newValue !== oldValue && !this.updatingStyle) {
            this.updateFeatureIconSelection({
              projectId: this.projectId,
              geopackageId: this.geopackage.id,
              tableName: this.tableName,
              featureId: this.iconAssignmentFeature,
              iconId: newValue
            })
          }
        }
      },
      styleAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.filePath)
          this.determineStyleForStyleAssignment(gp, newValue)
        }
      },
      iconAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.filePath)
          this.determineIconForIconAssignment(gp, newValue)
        }
      },
      usePointIconDefault: {
        async handler (newValue, oldValue) {
          if (!this.updatingStyle) {
            this.updateProjectLayerUsePointIconDefault({
              projectId: this.projectId,
              geopackageId: this.geopackage.id,
              tableName: this.tableName,
              usePointIconDefault: newValue
            })
          }
        }
      }
    }
  }
</script>

<style scoped>
  .title {
    font-size: 16px !important;;
    color: black;
    font-weight: 500;
  }
  .subtitle {
    color: dimgray;
    font-size: 14px !important;;
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
    color: dimgray;
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
  .assignment-title {
    color: black;
    font-size: 14px;
    font-weight: normal;
  }
</style>
