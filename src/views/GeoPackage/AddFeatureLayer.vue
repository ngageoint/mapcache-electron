<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-toolbar-title>{{ geopackage.name + ': ' + layerName }}</v-toolbar-title>
    </v-toolbar>
    <v-sheet v-if="processing" class="mapcache-sheet-content detail-bg">
      <v-card flat tile class="ma-0 pa-0">
        <v-card-title>{{ 'Adding feature layer' }}</v-card-title>
        <v-card-text>
          <p v-if="status.error">
            {{ status.error }}
          </p>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            Status
          </p>
          <p class="regular--text"
             :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', wordWrap: 'break-word'}">
            {{ status.message + (!cancelling ? (': ' + (status.error ? 100 : status.progress) + '%') : '') }}
          </p>
          <p class="pt-2">
            <v-progress-linear :indeterminate="status.progress === -1" :color="status.error ? 'warning' : 'primary'"
                               :value="status.error ? 100 : status.progress"></v-progress-linear>
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              v-if="!done"
              variant="text"
              :disabled="cancelling"
              color="warning"
              @click.stop="cancelAddFeatureLayer">
            {{ cancelling ? 'Cancelling' : 'Cancel' }}
          </v-btn>
          <v-btn
              v-if="done"
              color="primary"
              variant="text"
              @click.stop="cancel">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
      <v-divider/>
    </v-sheet>
    <v-sheet v-else class="mapcache-sheet-content">
      <v-stepper v-model="step" non-linear vertical class="background"
                 :style="{borderRadius: '0 !important', boxShadow: '0px 0px !important'}">
        <v-stepper-step editable :complete="step > 1" step="1" :rules="[() => layerNameValid]" color="primary">
          Name the layer
          <small class="pt-1">{{ layerName }}</small>
        </v-stepper-step>
        <v-stepper-content step="1">
          <v-card flat tile>
            <v-card-subtitle>
              Specify a name for the new GeoPackage feature layer.
            </v-card-subtitle>
            <v-card-text>
              <v-form v-on:submit.prevent="() => {}" ref="layerNameForm" v-model="layerNameValid">
                <v-text-field
                    variant="underlined"
                    autofocus
                    v-model="layerName"
                    :rules="layerNameRules"
                    label="Layer name"
                    required
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
          <v-btn variant="text" color="primary" @click="step = 2" :disabled="!layerNameValid">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 2" step="2" color="primary">
          Select data sources
          <small class="pt-1">{{ selectedDataSourceLayers.length === 0 ? 'None' : selectedDataSourceLayers.length }}
            selected</small>
        </v-stepper-step>
        <v-stepper-content step="2">
          <v-card flat tile>
            <v-card-subtitle v-if="dataSourceLayers.length > 0">
              Select data sources to populate the <b>{{ layerName }}</b> feature layer.
            </v-card-subtitle>
            <v-card-subtitle v-else>
              No data source layers.
            </v-card-subtitle>
            <v-card-text v-if="dataSourceLayers.length > 0">
              <v-list density="compact">
                <v-list-item-group multiple color="primary" v-model="selectedDataSourceLayers">
                  <template v-for="(item, i) in dataSourceLayers" :key="`data-source-item-${i}`">
                    <v-list-item
                        :value="item.value"
                        @click.stop="item.changeVisibility">
                      <template v-slot:prepend>
                        <v-btn icon @click.stop="item.zoomTo" color="whitesmoke">
                          <v-img v-if="project.dark" :style="{verticalAlign: 'middle'}" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                          <v-img v-else :style="{verticalAlign: 'middle'}" src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                        </v-btn>
                      </template>
                      <template v-slot:default="{ active }">
                        <div>
                          <v-list-item-title v-text="item.text"></v-list-item-title>
                        </div>
                        <v-list-item-action>
                          <source-visibility-switch :model-value="active" :project-id="project.id" :source="project.sources[item.id]"></source-visibility-switch>
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
          <v-btn variant="text" color="primary" @click="step = 3">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 3" step="3" color="primary">
          Select GeoPackage layers
          <small
              class="pt-1">{{
              selectedGeoPackageFeatureLayers.length === 0 ? 'None' : selectedGeoPackageFeatureLayers.length
            }}
            selected</small>
        </v-stepper-step>
        <v-stepper-content step="3">
          <v-card flat tile>
            <v-card-subtitle v-if="geopackageFeatureLayers.length > 0">
              Select existing GeoPackage feature layers to populate the <b>{{ layerName }}</b> feature layer.
            </v-card-subtitle>
            <v-card-subtitle v-else>
              No existing GeoPackage feature layers.
            </v-card-subtitle>
            <v-card-text v-if="geopackageFeatureLayers.length > 0">
              <v-list density="compact">
                <v-list-item-group multiple color="primary" v-model="selectedGeoPackageFeatureLayers">
                  <template v-for="(item, i) in geopackageFeatureLayers" :key="`geopackage-layer-item-${i}`">
                    <v-list-item
                        :value="item.value"
                        @click.stop="item.changeVisibility">
                      <template v-slot:prepend>
                        <v-btn icon @click.stop="item.zoomTo" color="whitesmoke">
                          <v-img v-if="project.dark" :style="{verticalAlign: 'middle'}" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                          <v-img v-else :style="{verticalAlign: 'middle'}" src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                        </v-btn>
                      </template>
                      <template v-slot:default="{ active }">
                        <div>
                          <v-list-item-title v-text="item.title"></v-list-item-title>
                          <v-list-item-subtitle v-text="item.subtitle"></v-list-item-subtitle>
                        </div>
                        <v-list-item-action>
                          <v-switch
                              density="compact"
                              @click.stop="item.changeVisibility"
                              :model-value="active"
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
          <v-btn variant="text" color="primary" @click="step = 4">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 4" step="4" color="primary">
          Order layers
          <small
              class="pt-1">{{
              selectedGeoPackageFeatureLayers.length + selectedDataSourceLayers.length === 0 ? 'No layers selected' : ''
            }}</small>
        </v-stepper-step>
        <v-stepper-content step="4">
          <v-card flat tile>
            <v-card-subtitle class="pt-0">
              Drag the layers to specify the rendering order. Layers at the top of the list will be rendered on top.
            </v-card-subtitle>
            <v-card-text>
              <v-list
                  style="max-height: 350px !important; width: 100% !important; overflow-y: auto !important;"
                  v-sortable="{onEnd:updateSortedLayerOrder}"
                  density="compact">
                <v-list-item
                    v-for="item in sortedLayers"
                    class="sortable-list-item"
                    :key="item.id">
                  <template v-slot:prepend class="mt-1">
                    <v-btn icon @click.stop="item.zoomTo">
                      <v-img v-if="project.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
                      <v-img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
                    </v-btn>
                  </template>
                  <div class="pa-0 ma-0">
                    <v-list-item-title v-text="item.title"></v-list-item-title>
                    <v-list-item-subtitle v-if="item.subtitle" v-text="item.subtitle"></v-list-item-subtitle>
                  </div>
                  <template v-slot:append class="sortHandle" style="vertical-align: middle !important;">
                    <v-icon @click.stop.prevent icon="mdi-drag-horizontal-variant"/>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
          <v-btn variant="text" color="primary" @click="step = 5">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable :complete="step > 5" step="5"
                        :rules="[() => !isEditingBoundingBox() || (Number(step) === 5)]" color="primary">
          Specify bounding box filter (optional)
          <small
              class="pt-1">{{
              isEditingBoundingBox() ? 'Editing bounding box' : (boundingBoxFilter ? 'Bounding box applied' : 'No bounding box')
            }}</small>
        </v-stepper-step>
        <v-stepper-content step="5">
          <v-card flat tile>
            <v-card-subtitle>
              Restrict features to a specified area of the map. If not provided, all features from your selected data
              source and GeoPackage layers will be added.
            </v-card-subtitle>
            <bounding-box-editor ref="boundingBoxEditor" allow-extent :project="project"
                                 :boundingBox="boundingBoxFilter"
                                 :update-bounding-box="updateBoundingBoxFilter"></bounding-box-editor>
          </v-card>
          <v-btn
              variant="text"
              color="primary"
              @click="step = 6">
            Continue
          </v-btn>
        </v-stepper-content>
        <v-stepper-step editable step="6" color="primary">
          Summary
        </v-stepper-step>
        <v-stepper-content step="6">
          <v-card flat tile>
            <v-card-text>
              <b>{{
                  filteredFeatureCount
                }}</b>{{
                (boundingBoxFilter ? ' filtered' : '') + ' features will be added to the '
              }}<b>{{ geopackage.name }}</b>{{ ' GeoPackage as the ' }}<b>{{ layerName }}</b>{{ ' feature layer.' }}
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
            variant="text"
            @click.stop="cancel">
          Cancel
        </v-btn>
        <v-btn
            v-if="!done"
            :disabled="Number(step) !== 6 || isEditingBoundingBox() || !layerNameValid"
            color="primary"
            variant="text"
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
import SourceVisibilitySwitch from '../DataSources/SourceVisibilitySwitch.vue'
import BoundingBoxEditor from '../Common/BoundingBoxEditor.vue'
import { zoomToGeoPackageTable, zoomToSource } from '../../lib/leaflet/map/ZoomUtilities'
import EventBus from '../../lib/vue/EventBus'
import throttle from 'lodash/throttle'
import { setDataSourceVisible } from '../../lib/vue/vuex/CommonActions'
import {
  addFeatureTableToGeoPackage, notifyTab,
  setGeoPackageFeatureTableVisible,
  synchronizeGeoPackage
} from '../../lib/vue/vuex/ProjectActions'

export default {
  components: {
    BoundingBoxEditor,
    SourceVisibilitySwitch
  },
  props: {
    project: Object,
    geopackage: Object,
    allowNotifications: Boolean,
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
        message: 'Starting build',
        progress: '0.0'
      },
      processing: false,
      done: false,
      dataSourceLayers: this.getDataSourceLayers(),
      configuration: null,
      cancelling: false,
      boundingBoxFilter: null,
      filteredFeatureCount: 0,
      geopackageFeatureLayers: [],
      selectedGeoPackageFeatureLayers: [],
      selectedDataSourceLayers: [],
      internalRenderingOrder: [],
    }
  },
  methods: {
    async updateProjectData () {
      this.dataSourceLayers = this.getDataSourceLayers()
      this.selectedDataSourceLayers = this.dataSourceLayers.filter(item => item.visible).map(item => item.value)
      this.geopackageFeatureLayers = await this.getGeoPackageFeatureLayerItems()
      this.selectedGeoPackageFeatureLayers = this.geopackageFeatureLayers.filter(item => item.visible).map(item => item.value)
      this.filteredFeatureCount = await this.getFilteredFeatures()
      const items = this.dataSourceLayers.filter(item => item.visible).concat(this.geopackageFeatureLayers.filter(item => item.visible))
      this.internalRenderingOrder = this.project.mapRenderingOrder.map(id => items.find(item => item.id === id)).filter(item => !isNil(item))
    },
    updateSortedLayerOrder (evt) {
      document.body.style.cursor = 'default'
      const layerOrderTmp = this.sortedLayers.slice()
      const oldIndex = evt.oldIndex
      let newIndex = Math.max(0, evt.newIndex)
      if (newIndex >= layerOrderTmp.length) {
        let k = newIndex - layerOrderTmp.length + 1
        while (k--) {
          layerOrderTmp.push(undefined)
        }
      }
      layerOrderTmp.splice(newIndex, 0, layerOrderTmp.splice(oldIndex, 1)[0])
      this.sortedLayers = layerOrderTmp
    },
    async cancelAddFeatureLayer () {
      const self = this
      this.cancelling = true
      window.mapcache.cancelAddFeatureLayer(this.configuration).then(() => {
        setTimeout(() => {
          window.mapcache.deleteGeoPackageTable(self.project.id, self.geopackage.id, self.geopackage.path, self.configuration.table, 'feature', true).then(() => {
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100.0
            synchronizeGeoPackage(this.project.id, this.geopackage.id)
          }).catch(() => {
            // table may not have been created yet
            self.done = true
            self.cancelling = false
            self.status.message = 'Cancelled'
            self.status.progress = 100.0
            synchronizeGeoPackage(this.project.id, this.geopackage.id)
          })
        }, 500)
      })
      this.status.message = 'Cancelling'
      this.status.progress = -1
    },
    async addFeatureLayer () {
      this.configuration = {
        id: window.mapcache.createUniqueID(),
        path: this.geopackage.path,
        projectId: this.project.id,
        table: this.layerName,
        geopackageId: this.geopackage.id,
        sourceLayers: this.dataSourceLayers.filter(item => item.visible).map(item => this.project.sources[item.value]),
        boundingBoxFilter: this.boundingBoxFilter,
        geopackageLayers: this.geopackageFeatureLayers.filter(item => item.visible).map(item => {
          return { geopackage: this.project.geopackages[item.geopackageId], table: item.tableName }
        }),
        layerOrder: this.sortedLayers.map(sortedLayer => sortedLayer.id)
      }

      if (this.configuration.sourceLayers.length === 0 && this.configuration.geopackageLayers.length === 0) {
        await addFeatureTableToGeoPackage(this.project.id,this.geopackage.id, this.layerName)
        this.done = true
        await synchronizeGeoPackage(this.project.id, this.geopackage.id)
        await notifyTab(this.project.id, 0)
        if (this.allowNotifications) {
          new Notification('GeoPackage feature layer created', {}).onclick = window.mapcache.sendWindowToFront
        }
        this.back()
      } else {
        this.processing = true
        const handleStatus = throttle((status) => {
          if (!this.done) {
            this.status = status
            if (this.status.progress != null) {
              this.status.progress = parseFloat(parseFloat(this.status.progress).toFixed(1))
            }
          }
        }, 100)
        window.mapcache.addFeatureLayer(this.configuration, handleStatus).then(() => {
          this.done = true
          synchronizeGeoPackage(this.project.id, this.geopackage.id)
          if (this.status == null || this.status.error == null) {
            notifyTab(this.project.id, 0)
            if (this.allowNotifications) {
              new Notification('GeoPackage feature layer created', {
                body: 'Finished building the "' + this.layerName + '" feature layer',
              }).onclick = () => {
                window.mapcache.sendWindowToFront()
              }
            }
          } else {
            if (this.allowNotifications) {
              new Notification('Failed to create feature layer', {
                body: 'Failed to build the "' + this.layerName + '" feature layer.\r\n' + this.status.error,
              }).onclick = () => {
                window.mapcache.sendWindowToFront()
              }
            }
          }
        })
      }
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
        if (await window.mapcache.isHealthy(geopackage.path, geopackage.modifiedDate)) {
          Object.keys(geopackage.tables.features).forEach(table => {
            const tableName = table
            const visible = geopackage.tables.features[table].visible
            const geopackageId = geopackage.id
            items.push({
              id: geopackageId + '_' + tableName,
              value: geopackageId + '_' + tableName,
              geopackageId: geopackageId,
              tableName: tableName,
              title: geopackage.name,
              subtitle: table,
              visible,
              changeVisibility: debounce(() => {
                setGeoPackageFeatureTableVisible(projectId, geopackageId, tableName, !visible)
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
          title: source.displayName ? source.displayName : source.name,
          value: source.id,
          id: source.id,
          visible: source.visible,
          changeVisibility: debounce(() => {
            setDataSourceVisible(projectId, source.id, !source.visible)
          }, 100),
          zoomTo: debounce((e) => {
            e.stopPropagation()
            zoomToSource(source)
          }, 100)
        }
      })
    },
    fireReorderMapLayers: debounce((layers) => {
      EventBus.$emit(EventBus.EventTypes.REORDER_MAP_LAYERS, layers)
    }, 100)
  },
  computed: {
    sortedLayers: {
      get () {
        return this.internalRenderingOrder
      },
      set (layers) {
        this.internalRenderingOrder = layers
        const newMapRenderingOrder = []
        layers.forEach(item => {
          newMapRenderingOrder.push(item.id)
        })
        this.fireReorderMapLayers(newMapRenderingOrder)
      }
    }
  },
  watch: {
    project: {
      async handler () {
        await this.updateProjectData()
      },
      deep: true
    },
    boundingBoxFilter: {
      async handler () {
        this.filteredFeatureCount = await this.getFilteredFeatures()
      }
    }
  },
  mounted () {
    this.getFilteredFeatures().then(count => {
      this.filteredFeatureCount = count
    })
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
