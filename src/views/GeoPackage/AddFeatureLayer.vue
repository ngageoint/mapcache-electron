<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>{{geopackage.name + ': Add feature layer'}}</v-toolbar-title>
    </v-toolbar>
    <v-sheet v-if="processing" class="mapcache-sheet-content detail-bg">
      <v-card flat tile class="ma-0 pa-0">
        <v-card-title>{{'Adding ' + layerName}}</v-card-title>
        <v-card-text>
          <v-card-subtitle>{{status.message}}</v-card-subtitle>
          <p v-if="status.error">
            {{ status.error }}
          </p>
          <v-progress-linear class="mt-4" :indeterminate="status.progress === -1" :value="status.error ? 100 : status.progress" :color="status.error ? 'warning' : 'primary'"></v-progress-linear>
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
                  label="Layer name"
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
          Select data sources
          <small class="pt-1">{{selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length}} selected</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile>
            <v-card-subtitle v-if="dataSourceLayers.length > 0">
              Select data sources to populate the <b>{{layerName}}</b> feature layer.
            </v-card-subtitle>
            <v-card-subtitle v-else>
              No data source layers.
            </v-card-subtitle>
            <v-card-text v-if="dataSourceLayers.length > 0">
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
                            <img v-if="$vuetify.theme.dark" :style="{verticalAlign: 'middle'}" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                            <img v-else :style="{verticalAlign: 'middle'}" src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
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
            <v-card-subtitle v-if="geopackageFeatureLayers.length > 0">
              Select existing GeoPackage feature layers to populate the <b>{{layerName}}</b> feature layer.
            </v-card-subtitle>
            <v-card-subtitle v-else>
              No existing GeoPackage feature layers.
            </v-card-subtitle>
            <v-card-text v-if="geopackageFeatureLayers.length > 0">
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
                            <img v-if="$vuetify.theme.dark" :style="{verticalAlign: 'middle'}" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                            <img v-else :style="{verticalAlign: 'middle'}" src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
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
        <v-stepper-step editable :complete="step > 4" step="4" :rules="[() => !isEditingBoundingBox() || (Number(step) === 4)]" color="primary">
          Specify bounding box filter (optional)
          <small class="pt-1">{{isEditingBoundingBox() ? 'Editing bounding box' : (boundingBoxFilter ? 'Bounding box applied' : 'No bounding box')}}</small>
        </v-stepper-step>
        <v-stepper-content step="4">
          <v-card flat tile>
            <v-card-subtitle>
              Restrict features to a specified area of the map. If not provided, all features from your selected data source and GeoPackage layers will be added.
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" allow-extent :project="project" :boundingBox="boundingBoxFilter" :update-bounding-box="updateBoundingBoxFilter"></bounding-box-editor>
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
              <b>{{filteredFeatureCount}}</b>{{(boundingBoxFilter ? ' filtered' : '') + ' features from ' + dataSourceLayers.filter(item => item.visible).length + ' data source' + (dataSourceLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' and ' + geopackageFeatureLayers.filter(item => item.visible).length + ' GeoPackage feature layer' + (geopackageFeatureLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' will be added to the '}}<b>{{geopackage.name}}</b>{{' GeoPackage as the '}}<b>{{layerName}}</b>{{' feature layer.'}}
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
          v-if="Number(step) === 5 && !done && !isEditingBoundingBox() && layerNameValid"
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
import SourceVisibilitySwitch from '../DataSources/SourceVisibilitySwitch'
import BoundingBoxEditor from '../Common/BoundingBoxEditor'
import {zoomToGeoPackageTable, zoomToSource} from '../../lib/util/ZoomUtilities'

export default {
    components: {
      BoundingBoxEditor,
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
        layerName: 'New feature layer',
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
        cancelling: false,
        boundingBoxFilter: null
      }
    },
    methods: {
      async cancelAddFeatureLayer () {
        const self = this
        this.cancelling = true
        window.mapcache.cancelAddFeatureLayer(this.configuration).then(() => {
          setTimeout(() => {
            window.mapcache.deleteGeoPackageTable(self.geopackage.path, self.configuration.table).then(() => {
              self.done = true
              self.cancelling = false
              self.status.message = 'Cancelled'
              self.status.progress = 100
              window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
            }).catch(() => {
              // table may not have been created yet
              self.done = true
              self.cancelling = false
              self.status.message = 'Cancelled'
              self.status.progress = 100
              window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
            })
          }, 500)
        })
        this.status.message = 'Cancelling...'
        this.status.progress = -1
      },
      async addFeatureLayer () {
        this.processing = true
        this.configuration = {
          id: window.mapcache.createUniqueID(),
          path: this.geopackage.path,
          projectId: this.project.id,
          table: this.layerName,
          sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.value]),
          boundingBoxFilter: this.boundingBoxFilter,
          geopackageLayers: this.geopackageFeatureLayers.filter(item => item.visible).map(item => {
            return {geopackage: this.project.geopackages[item.geopackageId], table: item.tableName}
          })
        }

        window.mapcache.addFeatureLayer(this.configuration, (status) => {
          if (!this.done) {
            this.status = status
          }
        }).then(() => {
          this.done = true
          window.mapcache.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
          window.mapcache.notifyTab({projectId: this.project.id, tabId: 0})
        })
      },
      cancel () {
        if (this.isEditingBoundingBox()) {
          this.$refs.boundingBoxEditor.stopEditing()
        }
        this.back()
      },
      isEditingBoundingBox () {
        if (this.$refs.boundingBoxEditor) {
          return this.$refs.boundingBoxEditor.isEditing()
        }
        return false
      },
      updateBoundingBoxFilter (boundingBox) {
        this.boundingBoxFilter = boundingBox
      },
      async getFilteredFeatures () {
        let numberOfFeatures = 0
        const sourceItems = this.getDataSourceLayers().filter(item => item.visible)
        for (let i = 0; i < sourceItems.length; i++) {
          const source = this.project.sources[sourceItems[i].id]
          if (!isNil(this.boundingBoxFilter)) {
            numberOfFeatures += await window.mapcache.getFeatureCountInBoundingBox(source.geopackageFilePath, source.sourceLayerName, this.boundingBoxFilter)
          } else {
            numberOfFeatures += source.count
          }
        }
        const geopackageItems = (await this.getGeoPackageFeatureLayerItems()).filter(item => item.visible)
        for (let i = 0; i < geopackageItems.length; i++) {
          const item = geopackageItems[i]
          const tableName = item.tableName
          const geopackage = this.project.geopackages[item.geopackageId]
          if (!isNil(this.boundingBoxFilter)) {
            numberOfFeatures += await window.mapcache.getFeatureCountInBoundingBox(geopackage.path, tableName, this.boundingBoxFilter)
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
          if (await window.mapcache.isHealthy(geopackage)) {
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
                  window.mapcache.setGeoPackageFeatureTableVisible({projectId, geopackageId, tableName, visible: !visible})
                }, 100),
                zoomTo: debounce((e) => {
                  e.stopPropagation()
                  zoomToGeoPackageTable(geopackage, tableName)
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
            changeVisibility: debounce(() => {
              window.mapcache.setDataSourceVisible({projectId, sourceId: source.id, visible: !source.visible})
            }, 100),
            zoomTo: debounce((e) => {
              e.stopPropagation()
              zoomToSource(source)
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
    }
  }
</script>

<style scoped>
</style>
