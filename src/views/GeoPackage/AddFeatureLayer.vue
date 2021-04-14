<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>{{geopackage.name + ': Add Feature Layer'}}</v-toolbar-title>
    </v-toolbar>
    <v-sheet v-if="processing" class="mapcache-sheet-content detail-bg">
      <v-card flat tile class="ma-0 pa-0">
        <v-card-title>{{'Adding ' + layerName}}</v-card-title>
        <v-card-text>
          <v-card-subtitle>{{status.message}}</v-card-subtitle>
          <v-progress-linear :indeterminate="status.progress === -1" :value="error ? 100 : status.progress"
                             :color="error ? 'warning' : 'primary'"></v-progress-linear>
        </v-card-text>
        <v-card-actions class="mt-8">
          <v-spacer></v-spacer>
          <v-btn
            v-if="!done"
            text
            :disabled="cancelling"
            color="warning"
            @click.stop="cancelAddFeatureLayer">
            {{cancelling ? 'Cancelling' : 'Cancel'}}
          </v-btn>
          <v-btn
            v-if="done"
            color="primary"
            text
            @click.stop="cancel">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
      <v-divider/>
    </v-sheet>
    <v-sheet v-else class="mapcache-sheet-content">
      <v-stepper v-model="step" non-linear vertical class="background" :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => layerNameValid]" color="primary">
          Name the layer
          <small class="pt-1">{{layerName}}</small>
        </v-stepper-step>
        <v-stepper-content step="1">
          <v-card flat tile>
            <v-card-subtitle>
              Specify a name for the new GeoPackage feature layer.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent ref="layerNameForm" v-model="layerNameValid">
                <v-text-field
                  autofocus
                  v-model="layerName"
                  :rules="layerNameRules"
                  label="Layer Name"
                  required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 2" v-if="layerNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" color="primary">
          Select Data Sources
          <small class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile>
            <v-card-subtitle>
              Select <b>Data Sources</b> to populate the <b>{{layerName}}</b> feature layer.
            </v-card-subtitle>
            <v-card-text>
              <v-list dense>
                <v-list-item-group multiple color="primary" v-model="selectedDataSourceLayers">
                  <template v-for="(item, i) in dataSourceLayers">
                    <v-list-item
                      :key="`data-source-item-${i}`"
                      :value="item.value"
                      @click.stop="item.changeVisibility">
                      <template v-slot:default="{ active }">
                        <v-list-item-icon>
                          <v-btn icon @click.stop="item.zoomTo" color="whitesmoke">
                            <img v-if="$vuetify.theme.dark" :style="{verticalAlign: 'middle'}" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                            <img v-else :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                          </v-btn>
                        </v-list-item-icon>
                        <v-list-item-content>
                          <v-list-item-title v-text="item.text"></v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action>
                          <source-visibility-switch :input-value="active" :project-id="project.id" :source="project.sources[item.id]"></source-visibility-switch>
                        </v-list-item-action>
                      </template>
                    </v-list-item>
                    <v-divider
                      v-if="i < selectedDataSourceLayers.length - 1"
                      :key="'data_source_layer_divider_' + i"
                    ></v-divider>
                  </template>
                </v-list-item-group>
              </v-list>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 3">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 3" step="3" color="primary">
          Select GeoPackage layers
          <small class="pt-1">{{selectedGeoPackageFeatureLayers.length === 0 ? 'None' : selectedGeoPackageFeatureLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle>
              Select existing <b>GeoPackage</b> feature layers to populate the <b>{{layerName}}</b> feature layer.
            </v-card-subtitle>
            <v-card-text>
              <v-list dense>
                <v-list-item-group multiple color="primary" v-model="selectedGeoPackageFeatureLayers">
                  <template v-for="(item, i) in geopackageFeatureLayers">
                    <v-list-item
                      :key="`geopackage-layer-item-${i}`"
                      :value="item.value"
                      @click.stop="item.changeVisibility">
                      <template v-slot:default="{ active }">
                        <v-list-item-icon>
                          <v-btn icon @click.stop="item.zoomTo" color="whitesmoke">
                            <img v-if="$vuetify.theme.dark" :style="{verticalAlign: 'middle'}" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                            <img v-else :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
                          </v-btn>
                        </v-list-item-icon>
                        <v-list-item-content>
                          <v-list-item-title v-text="item.title"></v-list-item-title>
                          <v-list-item-subtitle v-text="item.subtitle"></v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                          <v-switch
                            dense
                            @click.stop="item.changeVisibility"
                            :input-value="active"
                            color="primary"
                          ></v-switch>
                        </v-list-item-action>
                      </template>
                    </v-list-item>
                    <v-divider
                      v-if="i < selectedGeoPackageFeatureLayers.length - 1"
                      :key="'feature_layer_divider_' + i"
                    ></v-divider>
                  </template>
                </v-list-item-group>
              </v-list>
            </v-card-text>
          </v-card>
          <v-btn text color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 4" step="4" :rules="[() => !project.boundingBoxFilterEditing || (Number(step) === 4 && project.boundingBoxFilterEditing)]" color="primary">
          Apply bounding box filter
          <small class="pt-1">{{project.boundingBoxFilterEditing ? 'Setting filter' : (project.boundingBoxFilter ? 'Filter applied' : 'No filter')}}</small>
        </v-stepper-step>
        <v-stepper-content step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Provide a bounding box to restrict content from selected data sources and GeoPackage feature layers
            </v-card-subtitle>
            <v-card-text>
              <v-row no-gutters justify="end">
                <v-btn class="mr-2" outlined v-if="!project.boundingBoxFilterEditing && project.boundingBoxFilter" color="red" @click.stop="resetBoundingBox">
                  Clear
                </v-btn>
                <v-btn v-if="project.boundingBoxFilterEditing" outlined color="warning" @click.stop="stopEditingBoundingBox">
                  Finish
                </v-btn>
                <v-menu
                  v-else
                  top
                  close-on-click
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      color="primary"
                      dark
                      v-bind="attrs"
                      v-on="on"
                    >
                      {{project.boundingBoxFilter ? 'Edit bounds' : 'Set bounds'}}
                    </v-btn>
                  </template>

                  <v-list>
                    <v-list-item-group>
                      <v-list-item @click="() => editBoundingBox('manual')">
                        <v-list-item-title>Manually</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="setBoundingBoxFilterToExtent">
                        <v-list-item-title>Use Extent</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="() => editBoundingBox('grid')">
                        <v-list-item-title>Use Grid</v-list-item-title>
                      </v-list-item>
                    </v-list-item-group>
                  </v-list>
                </v-menu>
              </v-row>
            </v-card-text>
          </v-card>
          <v-btn
            text
            color="primary"
            @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable step="5" color="primary">
          Summary
        </v-stepper-step>
        <v-stepper-content step="5">
          <v-card flat tile>
            <v-card-text>
              <b>{{filteredFeatureCount}}</b>{{(project.boundingBoxFilter ? ' filtered' : '') + ' features from ' + dataSourceLayers.filter(item => item.visible).length + ' Data Source' + (dataSourceLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' and ' + geopackageFeatureLayers.filter(item => item.visible).length + ' GeoPackage feature layer' + (geopackageFeatureLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' will be added to the '}}<b>{{geopackage.name + ' GeoPackage'}}</b>{{' as the '}}<b>{{layerName}}</b>{{' feature layer.'}}
            </v-card-text>
          </v-card>
        </v-stepper-content>
      </v-stepper>
    </v-sheet>
    <div v-if="!processing" class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          text
          @click.stop="cancel">
          Cancel
        </v-btn>
        <v-btn
          v-if="Number(step) === 5 && !done && !processing && !project.boundingBoxFilterEditing && layerNameValid && ((dataSourceLayers.filter(item => item.visible).length + geopackageFeatureLayers.filter(item => item.visible).length) > 0)"
          color="primary"
          text
          @click.stop="addFeatureLayer">
          Add
        </v-btn>
      </v-card-actions>
    </div>
  </v-sheet>
</template>

<script>
  import isNil from 'lodash/isNil'
  import keys from 'lodash/keys'
  import debounce from 'lodash/debounce'
  import { ipcRenderer } from 'electron'
  import UniqueIDUtilities from '../../lib/util/UniqueIDUtilities'
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import SourceVisibilitySwitch from '../DataSources/SourceVisibilitySwitch'
  import GeoPackageCommon from '../../lib/geopackage/GeoPackageCommon'
  import GeoPackageFeatureTableUtilities from '../../lib/geopackage/GeoPackageFeatureTableUtilities'

  export default {
    components: {
      SourceVisibilitySwitch
    },
    props: {
      project: Object,
      geopackage: Object,
      back: Function
    },
    data () {
      return {
        step: 1,
        layerNameValid: true,
        layerName: 'New Feature Layer',
        layerNameRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        status: {
          message: 'Starting...',
          progress: 0.0
        },
        processing: false,
        error: false,
        done: false,
        dataSourceLayers: this.getDataSourceLayers(),
        configuration: null,
        cancelling: false
      }
    },
    methods: {
      async cancelAddFeatureLayer () {
        const self = this
        this.cancelling = true
        ipcRenderer.removeAllListeners('build_feature_layer_status_' + this.configuration.id)
        ipcRenderer.removeAllListeners('build_feature_layer_completed_' + this.configuration.id)
        this.status.message = 'Cancelling...'
        self.status.progress = -1
        ipcRenderer.once('cancel_build_feature_layer_completed_' + this.configuration.id, () => {
          GeoPackageCommon.deleteGeoPackageTable(self.geopackage.path, self.configuration.table).then(() => {
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100
            ProjectActions.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
          }).catch(() => {
            // table may not have been created yet
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100
            ProjectActions.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
          })
        })
        ipcRenderer.send('cancel_build_feature_layer', {configuration: this.configuration})
      },
      async addFeatureLayer () {
        this.processing = true
        this.configuration = {
          id: UniqueIDUtilities.createUniqueID(),
          path: this.geopackage.path,
          projectId: this.project.id,
          table: this.layerName,
          sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.value]),
          boundingBoxFilter: this.project.boundingBoxFilter,
          geopackageLayers: this.geopackageFeatureLayers.filter(item => item.visible).map(item => {
            return {geopackage: this.project.geopackages[item.geopackageId], table: item.tableName}
          })
        }

        ipcRenderer.once('build_feature_layer_completed_' + this.configuration.id, () => {
          this.done = true
          ipcRenderer.removeAllListeners('build_feature_layer_status_' + this.configuration.id)
          ProjectActions.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
          ProjectActions.notifyTab({projectId: this.project.id, tabId: 0})
        })
        ipcRenderer.on('build_feature_layer_status_' + this.configuration.id, (event, status) => {
          if (!this.done) {
            this.status = status
          }
        })
        ipcRenderer.send('build_feature_layer', {configuration: this.configuration})
      },
      cancel () {
        if (!isNil(this.project.boundingBoxFilterEditing)) {
          ProjectActions.clearBoundingBoxFilter({projectId: this.project.id})
        }
        this.back()
      },
      setBoundingBoxFilterToExtent () {
        // eslint-disable-next-line no-unused-vars
        ProjectActions.setBoundingBoxFilterToExtent(this.project.id).catch((e) => {
          // eslint-disable-next-line no-console
          console.error('Failed to set bounding box filter to the extent of visible layers.')
        })
      },
      resetBoundingBox () {
        ProjectActions.clearBoundingBoxFilter({projectId: this.project.id})
      },
      editBoundingBox (mode) {
        ProjectActions.setBoundingBoxFilterEditingEnabled({projectId: this.project.id, mode})
      },
      stopEditingBoundingBox () {
        ProjectActions.setBoundingBoxFilterEditingDisabled({projectId: this.project.id})
      },
      async getFilteredFeatures () {
        let numberOfFeatures = 0
        const sourceItems = this.getDataSourceLayers().filter(item => item.visible)
        for (let i = 0; i < sourceItems.length; i++) {
          const source = this.project.sources[sourceItems[i].id]
          if (!isNil(this.project.boundingBoxFilter)) {
            numberOfFeatures += await GeoPackageFeatureTableUtilities.getFeatureCountInBoundingBox(source.geopackageFilePath, source.sourceLayerName, this.project.boundingBoxFilter)
          } else {
            numberOfFeatures += source.count
          }
        }
        const geopackageItems = (await this.getGeoPackageFeatureLayerItems()).filter(item => item.visible)
        for (let i = 0; i < geopackageItems.length; i++) {
          const item = geopackageItems[i]
          const tableName = item.tableName
          const geopackage = this.project.geopackages[item.geopackageId]
          if (!isNil(this.project.boundingBoxFilter)) {
            numberOfFeatures += await GeoPackageFeatureTableUtilities.getFeatureCountInBoundingBox(geopackage.path, tableName, this.project.boundingBoxFilter)
          } else {
            numberOfFeatures += geopackage.tables.features[tableName].featureCount
          }
        }
        return numberOfFeatures
      },
      async getGeoPackageFeatureLayerItems () {
        const projectId = this.project.id
        const items = []
        const geopackageKeys = keys(this.project.geopackages)
        for (let i = 0; i < geopackageKeys.length; i++) {
          const geopackage = this.project.geopackages[geopackageKeys[i]]
          if (await GeoPackageCommon.isHealthy(geopackage)) {
            Object.keys(geopackage.tables.features).forEach(table => {
              const tableName = table
              const visible = geopackage.tables.features[table].visible
              const geopackageId = geopackage.id
              items.push({
                value: geopackageId + '_' + tableName,
                geopackageId: geopackageId,
                tableName: tableName,
                title: geopackage.name,
                subtitle: table,
                visible,
                changeVisibility: debounce(() => {
                  ProjectActions.setGeoPackageFeatureTableVisible({projectId, geopackageId, tableName, visible: !visible})
                }, 100),
                zoomTo: debounce((e) => {
                  e.stopPropagation()
                  GeoPackageCommon.getBoundingBoxForTable(geopackage.path, tableName).then(extent => {
                    ProjectActions.zoomToExtent({projectId, extent})
                  })
                }, 100)
              })
            })
          }
        }
        return items
      },
      getDataSourceLayers () {
        const projectId = this.project.id
        return Object.values(this.project.sources).filter(source => source.pane === 'vector').map(source => {
          return {
            text: source.displayName ? source.displayName : source.name,
            value: source.id,
            id: source.id,
            visible: source.visible,
            zoomTo: debounce((e) => {
              e.stopPropagation()
              ProjectActions.zoomToExtent({projectId, extent: source.extent})
            }, 100)
          }
        })
      }
    },
    asyncComputed: {
      filteredFeatureCount: {
        async get () {
          return this.getFilteredFeatures()
        },
        default: 0
      },
      geopackageFeatureLayers: {
        async get () {
          return this.getGeoPackageFeatureLayerItems()
        },
        default: []
      },
      selectedGeoPackageFeatureLayers: {
        async get () {
          return (await this.getGeoPackageFeatureLayerItems()).filter(item => item.visible).map(item => item.value)
        },
        default: []
      },
      selectedDataSourceLayers: {
        get () {
          return this.getDataSourceLayers().filter(item => item.visible).map(item => item.value)
        },
        default: []
      }
    },
    computed: {
      boundingBoxText () {
        let boundingBoxText = 'Not specified'
        if (!isNil(this.project.boundingBoxFilter)) {
          const bbox = this.project.boundingBoxFilter
          boundingBoxText = '(' + bbox[1].toFixed(4) + ',' + bbox[0].toFixed(4) + '), (' + bbox[3].toFixed(4) + ',' + bbox[2].toFixed(4) + ')'
        }
        return boundingBoxText
      }
    },
    watch: {
      project: {
        async handler () {
          this.dataSourceLayers = this.getDataSourceLayers()
          this.selectedDataSourceLayers = this.dataSourceLayers.filter(item => item.visible).map(item => item.value)
          this.geopackageFeatureLayers = await this.getGeoPackageFeatureLayerItems()
          this.selectedGeoPackageFeatureLayers = this.geopackageFeatureLayers.filter(item => item.visible).map(item => item.value)
        },
        deep: true
      }
    },
    mounted () {
      this.$nextTick(() => {
        if (this.$refs.layerNameForm) {
          this.$refs.layerNameForm.validate()
        }
      })
      ProjectActions.clearBoundingBoxFilter({projectId: this.project.id})
    },
    beforeUnmount () {
      ProjectActions.resetBoundingBox()
    }
  }
</script>

<style scoped>
</style>
