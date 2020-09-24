<template>
  <v-card v-if="processing" style="background-color: white;">
    <v-card-title>Creating Feature Layer</v-card-title>
    <v-card-text>
      <v-card-subtitle>{{status.message}}</v-card-subtitle>
      <v-progress-linear :value="error ? 100 : status.progress" :color="error ? 'pink' : '#3b779a'"></v-progress-linear>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        v-if="done"
        color="#3b779a"
        text
        @click.stop="back">
        close
      </v-btn>
    </v-card-actions>
  </v-card>
  <v-card v-else style="background-color: white;">
    <v-card-title>Add Feature Layer</v-card-title>
    <v-card-text>
      <v-form v-on:submit.prevent ref="layerNameForm" v-model="layerNameValid">
        <v-container class="ma-4 pa-0">
          <v-row no-gutters>
            <v-col cols="12">
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
        Select features from <b>Data Sources</b> and existing <b>GeoPackges</b> to populate your new feature layer.
      </v-card-subtitle>
      <v-card v-if="dataSourceLayers.length > 0">
        <v-card-title>
          Data Source Layers
        </v-card-title>
        <v-card-text>
          <v-list style="max-height: 150px" class="overflow-y-auto">
            <v-list-item-group
              v-model="dataSourceSelection"
              multiple
            >
              <template v-for="(item, i) in dataSourceLayers">
                <v-list-item
                  :key="`data-source-item-${i}`"
                  :value="item.value"
                >
                  <template v-slot:default="{ active }">
                    <v-list-item-content>
                      <v-list-item-title v-text="item.text"></v-list-item-title>
                    </v-list-item-content>
                    <v-list-item-action>
                      <v-checkbox
                        :input-value="active"
                        color="#3b779a"
                      ></v-checkbox>
                    </v-list-item-action>
                  </template>
                </v-list-item>
              </template>
            </v-list-item-group>
          </v-list>
        </v-card-text>
      </v-card>
      <v-card v-if="geopackageFeatureLayers.length > 0" class="mt-4">
        <v-card-title>
          GeoPackage Layers
        </v-card-title>
        <v-card-text>
          <v-list style="max-height: 150px" class="overflow-y-auto">
            <v-list-item-group
              v-model="geopackageLayerSelection"
              multiple
            >
              <template v-for="(item, i) in geopackageFeatureLayers">
                <v-list-item
                  :key="`geopackage-layer-item-${i}`"
                  :value="item.value"
                >
                  <template v-slot:default="{ active }">
                    <v-list-item-content>
                      <v-list-item-title v-text="item.text"></v-list-item-title>
                    </v-list-item-content>
                    <v-list-item-action>
                      <v-checkbox
                        :input-value="active"
                        color="#3b779a"
                      ></v-checkbox>
                    </v-list-item-action>
                  </template>
                </v-list-item>
              </template>
            </v-list-item-group>
          </v-list>
        </v-card-text>
      </v-card>
      <!--        <v-container>-->
      <!--          <v-card-subtitle>-->
      <!--            Feature Data Source Selection-->
      <!--          </v-card-subtitle>-->
      <!--          <v-card-text>-->
      <!--            <v-row no-gutters>-->
      <!--              <v-select-->
      <!--                v-model="layersToInclude"-->
      <!--                :items="vectorLayers"-->
      <!--                label="Vector Layers"-->
      <!--                multiple-->
      <!--                dense-->
      <!--                item-text="name"-->
      <!--                item-value="id"-->
      <!--                hide-details-->
      <!--                return-object-->
      <!--                chips/>-->
      <!--            </v-row>-->
      <!--          </v-card-text>-->
      <!--          <v-card-title>-->
      <!--            Bounding Box-->
      <!--          </v-card-title>-->
      <!--          <v-container class="mt-0 mb-0">-->
      <!--            <div class="flex-container" :style="{justifyContent: 'start'}">-->
      <!--              <v-text-field label="Specify Bounding Box" readonly :value="boundingBoxText" clearable @click.clear="resetBoundingBox"/>-->
      <!--              <v-btn text icon :color="vectorConfiguration.boundingBoxEditingEnabled ? 'red' : 'black'" @click.stop="editBoundingBox">-->
      <!--                <v-icon>{{vectorConfiguration.boundingBoxEditingEnabled ? 'mdi-stop' : 'mdi-crop-free'}}</v-icon>-->
      <!--              </v-btn>-->
      <!--            </div>-->
      <!--            <v-row no-gutters class="mb-2" v-if="layersToInclude.length > 0">-->
      <!--              <v-chip-->
      <!--                class="mr-2"-->
      <!--                @click="setBoundingBoxToDataExtent"-->
      <!--              >-->
      <!--                Use Extent of All Layers-->
      <!--              </v-chip>-->
      <!--            </v-row>-->
      <!--            <v-row no-gutters>-->
      <!--              <p>{{'Features in Bounding Box: ' + featuresInBounds}}</p>-->
      <!--            </v-row>-->
      <!--          </v-container>-->
      <!--        </v-container>-->
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="#3b779a"
        text
        @click.stop="cancel">
        cancel'
      </v-btn>
      <v-btn
        v-if="layerNameValid && ((dataSourceSelection.length + geopackageLayerSelection.length) > 0)"
        color="#3b779a"
        text
        @click.stop="addFeatureLayer">
        add
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import Vue from 'vue'
  import { mapActions } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import Modal from '../Modal'
  import _ from 'lodash'
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'

  export default {
    props: {
      project: Object,
      geopackage: Object,
      back: Function
    },
    components: {
      ViewEditText,
      Modal
    },
    data () {
      return {
        layerNameValid: false,
        layerName: 'New Feature Layer',
        layerNameRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        dataSourceSelection: [],
        geopackageLayerSelection: [],
        status: {
          message: 'Starting',
          progress: 0.0
        },
        cancelBuildFeatureLayer: undefined,
        processing: false,
        error: false,
        done: false
      }
    },
    methods: {
      ...mapActions({
        synchronizeGeoPackage: 'Projects/synchronizeGeoPackage'
      }),
      async addFeatureLayer () {
        this.processing = true
        const configuration = {
          id: UniqueIDUtilities.createUniqueID(),
          path: this.geopackage.path,
          projectId: this.project.id,
          table: this.layerName,
          layerExtent: null,
          includeStyles: false,
          sourceLayers: this.dataSourceSelection.map(sourceId => this.project.layers[sourceId]),
          geopackageLayers: this.geopackageLayerSelection.map(({geopackageId, table}) => {
            return {geopackage: this.project.geopackages[geopackageId], table}
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
      }
    },
    computed: {
      geopackageFeatureLayers () {
        const items = []
        _.keys(this.project.geopackages).forEach(geopackageKey => {
          const geopackage = this.project.geopackages[geopackageKey]
          _.keys(geopackage.tables.features).forEach(table => {
            items.push({value: {geopackageId: geopackage.id, table: table}, text: geopackage.name + ': ' + table})
          })
        })
        return items
      },
      dataSourceLayers () {
        return Object.values(this.project.layers).filter(layer => layer.pane === 'vector').map(layer => {
          return {text: layer.displayName ? layer.displayName : layer.name, value: layer.id}
        })
      }
    },
    mounted () {
      Vue.nextTick(() => {
        this.$refs.layerNameForm.validate()
      })
    }
  }
</script>

<style scoped>
</style>
