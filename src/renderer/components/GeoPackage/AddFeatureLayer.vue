<template>
  <v-container class="ma-0 pa-0">
    <v-toolbar
      color="primary"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-toolbar-title>{{geopackage.name + ': Add Feature Layer'}}</v-toolbar-title>
    </v-toolbar>
    <v-card flat class="ma-0 pa-0" style="padding-bottom: 56px !important;" v-if="processing">
      <v-card-title>{{'Creating ' + layerName + ' Feature Layer'}}</v-card-title>
      <v-card-text>
        <v-card-subtitle>{{status.message}}</v-card-subtitle>
        <v-progress-linear :value="error ? 100 : status.progress"
                           :color="error ? 'warning' : 'primary'"></v-progress-linear>
      </v-card-text>
    </v-card>
    <v-card flat class="ma-0 pa-0" v-else>
      <v-card-text>
        <v-form v-on:submit.prevent ref="layerNameForm" v-model="layerNameValid">
          <v-container class="mb-0 pb-0">
            <v-row no-gutters>
              <v-col>
                <v-text-field
                  v-model="layerName"
                  :rules="layerNameRules"
                  label="Feature Layer Name"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
        <v-card-title>
          Feature Layer Content Selection
        </v-card-title>
        <v-card-subtitle>
          Select features from <b>Data Sources</b> and existing <b>GeoPackges</b> to populate your new GeoPackage
          feature layer.
        </v-card-subtitle>
        <v-container v-if="dataSourceLayers.length > 0" class="ma-0 pa-0">
          <v-card-title class="pb-0" style="font-size: 1rem;">
            Data Source Layers
          </v-card-title>
          <v-card-text>
            <v-list style="max-height: 150px" class="overflow-y-auto">
              <v-list-item-group
                multiple
              >
                <template v-for="(item, i) in dataSourceLayers">
                  <v-list-item
                    :key="`data-source-item-${i}`"
                    :value="item.value"
                  >
                    <template>
                      <v-list-item-icon>
                        <v-btn icon @click="item.zoomTo"><img :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"></v-btn>
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title style="color: rgba(0, 0, 0, .6)" v-text="item.text"></v-list-item-title>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-switch
                          @click.stop="item.changeVisibility"
                          :input-value="item.visible"
                          color="primary"
                        ></v-switch>
                      </v-list-item-action>
                    </template>
                  </v-list-item>
                </template>
              </v-list-item-group>
            </v-list>
          </v-card-text>
        </v-container>
        <v-container v-if="geopackageFeatureLayers.length > 0" class="ma-0 pa-0">
          <v-card-title class="pb-0" style="font-size: 1rem;">
            GeoPackage Layers
          </v-card-title>
          <v-card-text>
            <v-list style="max-height: 150px" class="overflow-y-auto">
              <v-list-item-group
                multiple
              >
                <template v-for="(item, i) in geopackageFeatureLayers">
                  <v-list-item
                    :key="`geopackage-layer-item-${i}`"
                    :value="item.value"
                  >
                    <template>
                      <v-list-item-icon>
                        <v-btn icon @click="item.zoomTo"><img :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"></v-btn>
                      </v-list-item-icon>
                      <v-list-item-content>
                        <v-list-item-title style="color: rgba(0, 0, 0, .6)" v-text="item.text"></v-list-item-title>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-switch
                          @click.stop="item.changeVisibility"
                          :input-value="item.visible"
                          color="primary"
                        ></v-switch>
                      </v-list-item-action>
                    </template>
                  </v-list-item>
                </template>
              </v-list-item-group>
            </v-list>
          </v-card-text>
        </v-container>
        <v-container class="ma-0 pa-0 mt-4">
          <v-card-title>
            Bounding Box Filter
          </v-card-title>
          <v-card-subtitle>
            Provide a bounding box to restrict content from selected data sources and GeoPackage feature layers
          </v-card-subtitle>
          <v-card-text>
            <v-row no-gutters justify="end">
              <v-btn class="mr-2" outlined v-if="!project.boundingBoxFilterEditingEnabled && project.boundingBoxFilter" color="red" @click.stop="resetBoundingBox">
                Clear
              </v-btn>
              <v-btn outlined :color="project.boundingBoxFilterEditingEnabled ? 'warning' : 'primary'" @click.stop="editBoundingBox">
                {{project.boundingBoxFilterEditingEnabled ? 'Finish' : (project.boundingBoxFilter ? 'Edit bounds' : 'Set bounds')}}
              </v-btn>
            </v-row>
          </v-card-text>
        </v-container>
        <v-container
          class="ma-0 pa-0 mt-2"
          v-if="!project.boundingBoxFilterEditingEnabled && layerNameValid && ((dataSourceLayers.filter(item => item.visible).length + geopackageFeatureLayers.filter(item => item.visible).length) > 0)">
          <v-card-title>
            Summary
          </v-card-title>
          <v-card-subtitle>
            <b>{{filteredFeatureCount}}</b>{{(project.boundingBoxFilter ? ' filtered' : '') + ' features from ' + dataSourceLayers.filter(item => item.visible).length + ' Data Source' + (dataSourceLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' and ' + geopackageFeatureLayers.filter(item => item.visible).length + ' GeoPackage feature layer' + (geopackageFeatureLayers.filter(item => item.visible).length !== 1 ? 's' : '') + ' will be added to the '}}<b>{{geopackage.name + ' GeoPackage'}}</b>{{' as the '}}<b>{{layerName}}</b>{{' feature layer.'}}
          </v-card-subtitle>
        </v-container>
      </v-card-text>
    </v-card>

    <div v-if="!processing || done" class="sticky-card-action-footer">
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="done || !processing"
          color="primary"
          text
          @click.stop="cancel">
          {{done ? 'Close' : 'Cancel'}}
        </v-btn>
        <v-btn
          v-if="!done && !processing && !project.boundingBoxFilterEditingEnabled && layerNameValid && ((dataSourceLayers.filter(item => item.visible).length + geopackageFeatureLayers.filter(item => item.visible).length) > 0)"
          color="primary"
          text
          @click.stop="addFeatureLayer">
          Add
        </v-btn>
      </v-card-actions>
    </div>
  </v-container>
</template>

<script>
  import Vue from 'vue'
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import ViewEditText from '../Common/ViewEditText'
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'

  export default {
    props: {
      project: Object,
      geopackage: Object,
      back: Function
    },
    components: {
      ViewEditText
    },
    data () {
      return {
        layerNameValid: false,
        layerName: 'New Feature Layer',
        layerNameRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        status: {
          message: 'Starting',
          progress: 0.0
        },
        processing: false,
        error: false,
        done: false,
        dataSourceLayers: this.getDataSourceLayers()
      }
    },
    methods: {
      ...mapActions({
        synchronizeGeoPackage: 'Projects/synchronizeGeoPackage',
        setDataSourceVisible: 'Projects/setDataSourceVisible',
        setGeoPackageFeatureTableVisible: 'Projects/setGeoPackageFeatureTableVisible',
        setBoundingBoxFilterEditingEnabled: 'Projects/setBoundingBoxFilterEditingEnabled',
        clearBoundingBoxFilter: 'Projects/clearBoundingBoxFilter',
        zoomToExtent: 'Projects/zoomToExtent'
      }),
      async addFeatureLayer () {
        this.processing = true
        const configuration = {
          id: UniqueIDUtilities.createUniqueID(),
          path: this.geopackage.path,
          projectId: this.project.id,
          table: this.layerName,
          sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.value]),
          boundingBoxFilter: this.project.boundingBoxFilter,
          geopackageLayers: this.geopackageFeatureLayers.filter(item => item.visible).map(({value}) => {
            return {geopackage: this.project.geopackages[value.geopackageId], table: value.table}
          })
        }

        this.$electron.ipcRenderer.once('build_feature_layer_completed_' + configuration.id, (event, result) => {
          this.done = true
          if (result && result.error) {
            this.status.message = result.error
            this.error = true
          } else {
            this.status.message = 'Completed'
            this.status.progress = 100
          }
          this.$electron.ipcRenderer.removeAllListeners('build_feature_layer_status_' + configuration.id)
          this.synchronizeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
        })
        this.$electron.ipcRenderer.on('build_feature_layer_status_' + configuration.id, (event, status) => {
          if (!this.done) {
            this.status = status
          }
        })
        this.$electron.ipcRenderer.send('build_feature_layer', {configuration: configuration})
      },
      cancel () {
        this.back()
      },
      resetBoundingBox () {
        this.clearBoundingBoxFilter({projectId: this.project.id})
      },
      editBoundingBox () {
        this.setBoundingBoxFilterEditingEnabled({projectId: this.project.id, enabled: !this.project.boundingBoxFilterEditingEnabled})
      },
      async getFilteredFeatures () {
        let numberOfFeatures = 0
        const sourceItems = this.dataSourceLayers.filter(item => item.visible)
        for (let i = 0; i < sourceItems.length; i++) {
          const source = this.project.sources[sourceItems[i].value]
          if (!_.isNil(this.project.boundingBoxFilter)) {
            numberOfFeatures += await GeoPackageUtilities.getFeatureCountInBoundingBox(source.geopackageFilePath, source.sourceLayerName, this.project.boundingBoxFilter)
          } else {
            numberOfFeatures += source.count
          }
        }
        const geopackageItems = this.geopackageFeatureLayers.filter(item => item.visible)
        for (let i = 0; i < geopackageItems.length; i++) {
          const item = geopackageItems[i]
          const table = item.value.table
          const geopackage = this.project.geopackages[item.value.geopackageId]
          if (!_.isNil(this.project.boundingBoxFilter)) {
            numberOfFeatures += await GeoPackageUtilities.getFeatureCountInBoundingBox(geopackage.path, table, this.project.boundingBoxFilter)
          } else {
            numberOfFeatures += geopackage.tables.features[table].featureCount
          }
        }
        return numberOfFeatures
      },
      async getGeoPackageFeatureLayerItems () {
        const self = this
        const projectId = this.project.id
        const items = []
        const keys = _.keys(this.project.geopackages)
        for (let i = 0; i < keys.length; i++) {
          const geopackage = this.project.geopackages[keys[i]]
          if (await GeoPackageUtilities.isHealthy(geopackage)) {
            _.keys(geopackage.tables.features).forEach(table => {
              const tableName = table
              const visible = geopackage.tables.features[table].visible
              const geopackageId = geopackage.id
              items.push({
                value: {geopackageId: geopackage.id, table: table},
                text: geopackage.name + ': ' + table,
                visible,
                changeVisibility: () => {
                  self.setGeoPackageFeatureTableVisible({projectId, geopackageId, tableName, visible: !visible})
                },
                zoomTo: (e) => {
                  GeoPackageUtilities.getBoundingBoxForTable(geopackage.path, tableName).then(extent => {
                    self.zoomToExtent({projectId, extent})
                  })
                  e.stopPropagation()
                }
              })
            })
          }
        }
        return items
      },
      getDataSourceLayers () {
        const self = this
        const projectId = this.project.id
        return Object.values(this.project.sources).filter(source => source.pane === 'vector').map(source => {
          const sourceId = source.id
          const visible = !source.visible
          return {
            text: source.displayName ? source.displayName : source.name,
            value: source.id,
            visible: source.visible,
            changeVisibility: () => {
              self.setDataSourceVisible({projectId, sourceId, visible})
            },
            zoomTo: (e) => {
              self.zoomToExtent({projectId, extent: source.extent})
              e.stopPropagation()
            }
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
      }
    },
    computed: {
      boundingBoxText () {
        let boundingBoxText = 'Not specified'
        if (!_.isNil(this.project.boundingBoxFilter)) {
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
          this.geopackageFeatureLayers = await this.getGeoPackageFeatureLayerItems()
        },
        deep: true
      }
    },
    mounted () {
      Vue.nextTick(() => {
        this.$refs.layerNameForm.validate()
      })
    },
    beforeDestroy () {
      this.resetBoundingBox()
    }
  }
</script>

<style scoped>
</style>
