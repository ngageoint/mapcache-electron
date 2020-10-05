<template>
  <div>
    <v-toolbar
      :color="toolbarColor"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title :title="tableName + ' Style Editor'"><b class="ml-2">{{tableName}}</b> Style Editor</v-toolbar-title>
    </v-toolbar>
    <v-card>
      <v-card-text>
        <div>
          <div v-if="!loading">
            <expandablecard v-if="hasStyleExtension" :allow-expand="Object.keys(styleRows).length > 0" class="mb-2">
              <div slot="card-header">
                <v-row justify="space-between" align="center" no-gutters>
                  <v-col class="title" align-content="center">
                    {{'Styles (' + Object.keys(styleRows).length + ')'}}
                  </v-col>
                  <v-col>
                    <v-row no-gutters justify="end">
                      <v-btn class="button-width" dark color="#73c1c5" @click.stop="addStyle()">
                        <v-icon left>mdi-plus</v-icon> add style
                      </v-btn>
                    </v-row>
                  </v-col>
                </v-row>
              </div>
              <div slot="card-expanded-body" class="mt-2">
                <styleoptions
                  v-for="styleRow in styleRows"
                  :key="'style_' + styleRow.id"
                  :deletable="true"
                  :defaultName="styleRow.id + ''"
                  :allowStyleNameEditing="true"
                  :style-row="styleRow"
                  :id="id"
                  :table-name="tableName"
                  :project-id="projectId"
                  :show-id="true"
                  :is-geo-package="isGeoPackage"/>
                <expandablecard class="mb-2" v-if="Object.keys(styleRows).length > 0 && featureItems.length > 1">
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
                <expandablecard class="mb-2" v-if="Object.keys(styleRows).length > 0">
                  <div slot="card-header">
                    <v-row no-gutters class="subtitle">
                      <v-card-title class="ma-0 pa-0 full-width">
                        <v-row no-gutters class="full-width">
                          <v-col class="title-edit align-center" cols="12">
                            <p class="assignment-title">Table Style Assignment</p>
                          </v-col>
                        </v-row>
                      </v-card-title>
                    </v-row>
                  </div>
                  <div slot="card-expanded-body">
                    <v-container fluid>
                      <v-row>
                        <v-col cols="12">
                          <v-select v-model="tableStyleGeometry" :items="styleGeometryItems" label="Geometry Type" dense hide-details class="subtitle">
                          </v-select>
                        </v-col>
                        <v-col cols="12">
                          <v-select v-model="tableStyleSelection" :items="styleItems" label="Style" dense hide-details class="subtitle">
                          </v-select>
                        </v-col>
                      </v-row>
                    </v-container>
                  </div>
                </expandablecard>
              </div>
            </expandablecard>
            <expandablecard v-if="hasStyleExtension" :allow-expand="Object.keys(iconRows).length > 0" class="mb-2">
              <div slot="card-header">
                <v-row justify="space-between" align="center" no-gutters>
                  <v-col class="title" align-content="center">
                    {{'Icons (' + Object.keys(iconRows).length + ')'}}
                  </v-col>
                  <v-col>
                    <v-row no-gutters justify="end">
                      <v-btn class="button-width" dark color="#73c1c5" @click.stop="addIcon()">
                        <v-icon left>mdi-plus</v-icon> add icon
                      </v-btn>
                    </v-row>
                  </v-col>
                </v-row>
              </div>
              <div slot="card-expanded-body" class="mt-2">
                <iconoptions
                  v-for="iconRow in iconRows"
                  :key="'icon' + iconRow.id"
                  :deletable="true"
                  :defaultName="iconRow.id + ''"
                  :allowIconNameEditing="true"
                  geometry-type="POINT"
                  :icon-row="iconRow"
                  :id="id"
                  :table-name="tableName"
                  :project-id="projectId"
                  :show-id="true"
                  :is-table-icon="false"
                  :is-geo-package="isGeoPackage"/>
                <expandablecard class="mb-2" v-if="Object.keys(iconRows).length > 0 && iconFeatureItems.length > 1">
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
                <expandablecard class="mb-2" v-if="Object.keys(iconRows).length > 0">
                  <div slot="card-header">
                    <v-row no-gutters class="subtitle">
                      <v-card-title class="ma-0 pa-0 full-width">
                        <v-row no-gutters class="full-width">
                          <v-col class="title-edit align-center" cols="12">
                            <p class="assignment-title">Table Icon Assignment</p>
                          </v-col>
                        </v-row>
                      </v-card-title>
                    </v-row>
                  </div>
                  <div slot="card-expanded-body">
                    <v-container fluid>
                      <v-row>
                        <v-col cols="12">
                          <v-select v-model="tableIconGeometry" :items="iconGeometryItems" label="Geometry Type" dense hide-details class="subtitle">
                          </v-select>
                        </v-col>
                        <v-col cols="12">
                          <v-select v-model="tableIconSelection" :items="iconItems" label="Icon" dense hide-details class="subtitle">
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
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn v-if="!loading && !hasStyleExtension" text dark color="#73c1c5" @click.stop="addStyleExtensionAndDefaultStyles()">
          <v-icon>mdi-palette</v-icon> Enable Styling
        </v-btn>
        <v-btn v-if="!loading && hasStyleExtension" text dark color="#ff4444" @click.stop="removeStyleExtensionAndTableStyles()">
          <v-icon>mdi-trash-can</v-icon> Remove Styling
        </v-btn>
      </v-card-actions>
    </v-card>
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
      id: String,
      path: String,
      tableName: String,
      projectId: String,
      styleKey: Number,
      tableStyleAssignment: Object,
      tableIconAssingment: Object,
      styleAssignment: Object,
      iconAssignment: Object,
      back: Function,
      isGeoPackage: {
        type: Boolean,
        default: true
      },
      toolbarColor: {
        type: String,
        default: '#3b779a'
      }
    },
    data () {
      return {
        loading: true,
        hasStyleExtension: false,
        updatingStyle: true,
        styleRows: null,
        iconRows: null,
        featureItems: null,
        iconFeatureItems: null,
        iconGeometryItems: [
          {text: 'None Selected', value: -1},
          {text: 'Point', value: GeometryType.POINT},
          {text: 'MultiPoint', value: GeometryType.MULTIPOINT}
        ],
        styleGeometryItems: [
          {text: 'None Selected', value: -1},
          {text: 'Point', value: GeometryType.POINT},
          {text: 'LineString', value: GeometryType.LINESTRING},
          {text: 'Polygon', value: GeometryType.POLYGON},
          {text: 'MultiPoint', value: GeometryType.MULTIPOINT},
          {text: 'MultiLineString', value: GeometryType.MULTILINESTRING},
          {text: 'MultiPoint', value: GeometryType.MULTIPOLYGON}
        ],
        styleItems: null,
        iconItems: null,
        features: [],
        iconFeatures: [],
        featureStyleSelection: -1,
        featureIconSelection: -1,
        tableIconSelection: -1,
        tableStyleSelection: -1
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
      tableStyleGeometry: {
        get () {
          return this.tableStyleAssignment ? this.tableStyleAssignment.geometryType : -1
        },
        set (value) {
          this.updateTableStyleAssignmentGeometryType({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            geometryType: value,
            isGeoPackage: this.isGeoPackage
          })
        }
      },
      tableIconGeometry: {
        get () {
          return this.tableIconAssignment ? this.tableIconAssignment.geometryType : -1
        },
        set (value) {
          this.updateTableIconAssignmentGeometryType({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            geometryType: value,
            isGeoPackage: this.isGeoPackage
          })
        }
      },
      styleAssignmentFeature: {
        get () {
          return this.styleAssignment ? this.styleAssignment.featureId : -1
        },
        set (value) {
          this.updateStyleAssignmentFeature({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            featureId: value,
            isGeoPackage: this.isGeoPackage
          })
        }
      },
      iconAssignmentFeature: {
        get () {
          return this.iconAssignment ? this.iconAssignment.featureId : -1
        },
        set (value) {
          this.updateIconAssignmentFeature({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            featureId: value,
            isGeoPackage: this.isGeoPackage
          })
        }
      }
    },
    methods: {
      ...mapActions({
        updateTableStyleSelection: 'Projects/updateTableStyleSelection',
        updateTableIconSelection: 'Projects/updateTableIconSelection',
        updateFeatureStyleSelection: 'Projects/updateFeatureStyleSelection',
        updateFeatureIconSelection: 'Projects/updateFeatureIconSelection',
        updateStyleAssignmentFeature: 'Projects/updateStyleAssignmentFeature',
        updateIconAssignmentFeature: 'Projects/updateIconAssignmentFeature',
        updateTableStyleAssignmentGeometryType: 'Projects/updateTableStyleAssignmentGeometryType',
        updateTableIconAssignmentGeometryType: 'Projects/updateTableIconAssignmentGeometryType',
        createProjectLayerStyleRow: 'Projects/createProjectLayerStyleRow',
        createProjectLayerIconRow: 'Projects/createProjectLayerIconRow',
        addStyleExtensionForTable: 'Projects/addStyleExtensionForTable',
        removeStyleExtensionForTable: 'Projects/removeStyleExtensionForTable'
      }),
      updateMaxFeatures (val) {
        this.debounceUpdateMaxFeatures(val)
      },
      addStyle () {
        this.createProjectLayerStyleRow({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          isGeoPackage: this.isGeoPackage
        })
      },
      addIcon () {
        this.createProjectLayerIconRow({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          isGeoPackage: this.isGeoPackage
        })
      },
      determineStyleForGeometryAssignment (gp, geometryType) {
        if (geometryType !== -1) {
          let geometryStyle = GeoPackageUtilities._getTableStyle(gp, this.tableName, geometryType)
          if (_.isNil(geometryStyle)) {
            this.tableStyleSelection = -1
          } else {
            this.tableStyleSelection = geometryStyle.id
          }
        }
      },
      determineIconForGeometryAssignment (gp, geometryType) {
        if (geometryType !== -1) {
          let geometryIcon = GeoPackageUtilities._getTableIcon(gp, this.tableName, geometryType)
          if (_.isNil(geometryIcon)) {
            this.tableIconSelection = -1
          } else {
            this.tableIconSelection = geometryIcon.id
          }
        }
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
        let gp = await GeoPackageAPI.open(this.path)
        try {
          let featureTableName = this.tableName
          this.hasStyleExtension = gp.featureStyleExtension.has(featureTableName)
          if (this.hasStyleExtension) {
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
            let styleRows = GeoPackageUtilities._getStyleRows(gp, featureTableName)
            this.styleItems = [{text: 'Use Defaults', value: -1}]
            for (let styleId in styleRows) {
              let style = styleRows[styleId]
              this.styleItems.push({text: style.getName() + ' (' + style.id + ')', value: style.id})
            }
            this.styleRows = styleRows
            let iconRows = GeoPackageUtilities._getIconRows(gp, featureTableName)
            this.iconItems = [{text: 'Use Defaults', value: -1}]
            for (let iconId in iconRows) {
              let icon = iconRows[iconId]
              this.iconItems.push({text: icon.name + ' (' + icon.id + ')', value: icon.id})
            }
            this.iconRows = iconRows
            this.determineStyleForStyleAssignment(gp, this.styleAssignmentFeature)
            this.determineIconForIconAssignment(gp, this.iconAssignmentFeature)
            this.determineStyleForGeometryAssignment(gp, this.styleAssignmentFeature)
            this.determineIconForGeometryAssignment(gp, this.iconAssignmentFeature)
          }
        } catch (error) {
          console.error(error)
        }
        try {
          gp.close()
        } catch (error) {
          console.error(error)
        }
      },
      addStyleExtensionAndDefaultStyles () {
        this.addStyleExtensionForTable({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          isGeoPackage: this.isGeoPackage
        })
      },
      removeStyleExtensionAndTableStyles () {
        this.removeStyleExtensionForTable({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          isGeoPackage: this.isGeoPackage
        })
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
              id: this.id,
              tableName: this.tableName,
              featureId: this.styleAssignmentFeature,
              styleId: newValue,
              isGeoPackage: this.isGeoPackage
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
              id: this.id,
              tableName: this.tableName,
              featureId: this.iconAssignmentFeature,
              iconId: newValue,
              isGeoPackage: this.isGeoPackage
            })
          }
        }
      },
      tableStyleSelection: {
        async handler (newValue, oldValue) {
          // the user edited the value
          if (newValue !== oldValue && !this.updatingStyle) {
            this.updateTableStyleSelection({
              projectId: this.projectId,
              id: this.id,
              tableName: this.tableName,
              geometryType: this.tableStyleGeometry,
              styleId: newValue,
              isGeoPackage: this.isGeoPackage
            })
          }
        }
      },
      tableIconSelection: {
        async handler (newValue, oldValue) {
          // the user edited the value
          if (newValue !== oldValue && !this.updatingStyle) {
            this.updateTableIconSelection({
              projectId: this.projectId,
              id: this.id,
              tableName: this.tableName,
              geometryType: this.tableIconGeometry,
              iconId: newValue,
              isGeoPackage: this.isGeoPackage
            })
          }
        }
      },
      styleAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.path)
          this.determineStyleForStyleAssignment(gp, newValue)
        }
      },
      iconAssignmentFeature: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.path)
          this.determineIconForIconAssignment(gp, newValue)
        }
      },
      tableStyleGeometry: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.path)
          this.determineStyleForGeometryAssignment(gp, newValue)
        }
      },
      tableIconGeometry: {
        async handler (newValue, oldValue) {
          let gp = await GeoPackageAPI.open(this.path)
          this.determineIconForGeometryAssignment(gp, newValue)
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
  .button-width {
    width: 140px;
  }
</style>
