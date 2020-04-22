<template>
  <div>
    <modal
      v-if="showDeleteModal"
      header="Delete Tile Configuration"
      :card-text="'Are you sure you want to delete this tile configuration?'"
      ok-text="Delete"
      ok-color="red darken-1"
      :ok="confirm"
      :cancel="cancel">
    </modal>
    <expandable-card class="mb-2 sub-card">
      <div slot="card-header">
        <v-row no-gutters class="justify-space-between" align="center">
          <v-col cols="12" class="align-center">
            <view-edit-text :value="tileConfiguration.configurationName" editing-disabled font-size="1em" font-weight="500" label="Tile Configuration Name" :on-save="saveConfigurationName"/>
          </v-col>
        </v-row>
      </div>
      <div slot="card-expanded-body">
        <v-container>
          <v-card-title class="pb-0 mb-0">
            <view-edit-text value="Tile Table Name" font-color="#000000" font-size="1em" font-weight="500" :editing-disabled="true"/>
          </v-card-title>
          <v-card-text class="pt-0 mt-0">
						<v-row no-gutters>
	            <v-text-field label="" v-model="tableName" hide-details/>
						</v-row>
          </v-card-text>
          <v-card-title>
            Tile Layers
          </v-card-title>
          <v-card-text>
            <v-row no-gutters>
              <v-select
                v-model="tileLayersToInclude"
                :items="tileLayers"
                label="Choose one or more tile layer"
                multiple
                dense
                item-text="name"
                item-value="id"
                hide-details
                return-object
                deletable-chips
                chips/>
            </v-row>
          </v-card-text>
          <v-card-title>
            Vector Layers
          </v-card-title>
          <v-card-text>
            <v-row no-gutters>
              <v-select
                v-model="vectorLayersToInclude"
                :items="vectorLayers"
                label="Choose one or more vector layers"
                multiple
                dense
                item-text="name"
                item-value="id"
                hide-details
                return-object
                deletable-chips
                chips/>
            </v-row>
          </v-card-text>
          <v-card-title>
            Rendering Order
          </v-card-title>
          <div class="ml-2 mr-2" v-if="layerOrder.length > 0">
            <draggable
              v-model="layerOrder"
              class="list-group"
              ghost-class="ghost"
            >
              <div
                class="list-group-item"
                v-for="element in layerOrder"
                :key="element.id"
              >
                {{ element.name }}
              </div>
            </draggable>
          </div>
          <v-card-text v-if="layerOrder.length === 0">
            Select layers to specify rendering order
          </v-card-text>
          <v-card-title>
            Bounding Box and Zoom
          </v-card-title>

          <v-container class="mt-0 mb-0">
            <div class="flex-container" :style="{justifyContent: 'start'}">
              <v-text-field label="Specify Bounding Box" readonly :value="boundingBoxText" clearable @click.clear="resetBoundingBox"/>
              <v-btn text icon :color="tileConfiguration.boundingBoxEditingEnabled ? 'red' : 'black'" @click.stop="editBoundingBox">
                <v-icon>{{tileConfiguration.boundingBoxEditingEnabled ? 'mdi-stop' : 'mdi-crop-free'}}</v-icon>
              </v-btn>
            </div>
            <v-row no-gutters class="mb-2" v-if="tileLayersToInclude.length > 0 || vectorLayersToInclude.length > 0">
              <v-chip
                class="mr-2"
                @click="setBoundingBoxToDataExtent"
              >
                Use Extent of All Layers
              </v-chip>
            </v-row>
            <v-row no-gutters>
              <number-picker :number="Number(tileConfiguration.minZoom)" label="Min Zoom" :min="Number(1)" :max="Number(18)" :step="Number(1)" v-model="minZoom" />
            </v-row>
            <v-row no-gutters>
              <number-picker :number="Number(tileConfiguration.maxZoom)" label="Max Zoom" :min="Number(1)" :max="Number(18)" :step="Number(1)" v-model="maxZoom" />
            </v-row>
            <v-row no-gutters>
              <p>{{'Number of Tiles: ' + numberOfTilesToGenerate()}}</p>
            </v-row>
          </v-container>
        </v-container>
        <v-row no-gutters class="justify-end" align="center">
          <v-col cols="2">
            <font-awesome-icon class="delete-button danger" @click.stop="showDeleteGeoPackageVectorConfigurationConfirm()" icon="trash" size="2x"/>
          </v-col>
        </v-row>
      </div>
    </expandable-card>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import Modal from '../Modal'
  // import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import _ from 'lodash'
  import NumberPicker from '../Project/NumberPicker'
  import XYZTileUtilities from '../../../lib/XYZTileUtilities'
  import draggable from 'vuedraggable'

  export default {
    props: {
      project: Object,
      geopackage: Object,
      tileConfiguration: Object
    },
    components: {
      ExpandableCard,
      ViewEditText,
      Modal,
      NumberPicker,
      draggable
    },
    data () {
      return {
        showDeleteModal: false
      }
    },
    computed: {
      boundingBoxText: {
        get () {
          let boundingBoxText = ''
          if (this.tileConfiguration.boundingBox) {
            const bbox = this.tileConfiguration.boundingBox
            boundingBoxText = '(' + bbox[0][0].toFixed(4) + ',' + bbox[0][1].toFixed(4) + '), (' + bbox[1][0].toFixed(4) + ',' + bbox[1][1].toFixed(4) + ')'
          }
          return boundingBoxText
        }
      },
      tableName: {
        get () {
          return this.tileConfiguration.tableName
        },
        set (val) {
          this.setGeoPackageTileTableName({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            tableName: val
          })
        }
      },
      minZoom: {
        get () {
          return this.tileConfiguration.minZoom
        },
        set (val) {
          this.setGeoPackageTileConfigurationMinZoom({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            minZoom: val
          })
        }
      },
      maxZoom: {
        get () {
          return this.tileConfiguration.maxZoom
        },
        set (val) {
          this.setGeoPackageTileConfigurationMaxZoom({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            maxZoom: val
          })
        }
      },
      tileLayers () {
        return Object.values(this.geopackage.tileLayers).map(layer => {
          return {name: layer.displayName ? layer.displayName : layer.name, value: layer.id}
        })
      },
      vectorLayers () {
        return Object.values(this.geopackage.vectorLayers).map(layer => {
          return {name: layer.displayName ? layer.displayName : layer.name, value: layer.id}
        })
      },
      tileLayersToInclude: {
        get () {
          return Object.values(this.geopackage.tileLayers).map(layer => {
            return {name: layer.displayName ? layer.displayName : layer.name, value: layer.id}
          }).filter(layer => this.tileConfiguration.tileLayers.findIndex(l => l === layer.value) !== -1)
        },
        set (val) {
          const newTileLayers = val.map(v => v.value).filter(v => !_.isNil(v))
          this.setGeoPackageTileConfigurationTileLayers({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            tileLayers: val.map(v => v.value).filter(v => !_.isNil(v))
          })
          console.log('renderingOrder')
          console.log(this.tileConfiguration.renderingOrder)
          let availableLayers = newTileLayers
            .map((layerId) => this.geopackage.tileLayers[layerId])
            .concat(this.tileConfiguration.vectorLayers
              .map((layerId) => this.geopackage.vectorLayers[layerId])
              .map((layer) => {
                return {
                  name: layer.displayName || layer.name,
                  id: layer.id
                }
              }))
          // are there layers in rendering order not in available layers
          const renderingLayers = this.tileConfiguration.renderingOrder.filter(l => availableLayers.findIndex(val => val.id === l.id) > -1)
          const layersToAdd = availableLayers.filter(l => this.tileConfiguration.renderingOrder.findIndex(val => val.id === l.id) === -1).map((layer) => {
            return {
              name: layer.displayName || layer.name,
              id: layer.id
            }
          })
          this.setGeoPackageTileConfigurationRenderingOrder({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            renderingOrder: renderingLayers.concat(layersToAdd)})
        }
      },
      vectorLayersToInclude: {
        get () {
          return Object.values(this.geopackage.vectorLayers).map(layer => {
            return {name: layer.displayName ? layer.displayName : layer.name, value: layer.id}
          }).filter(layer => this.tileConfiguration.vectorLayers.findIndex(l => l === layer.value) !== -1)
        },
        set (val) {
          const newVectorLayers = val.map(v => v.value).filter(v => !_.isNil(v))
          this.setGeoPackageTileConfigurationVectorLayers({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            vectorLayers: newVectorLayers
          })
          // adjust rendering order (entries added placed at bottom... entries removed... removed)
          let availableLayers = this.tileConfiguration.tileLayers
            .map((layerId) => this.geopackage.tileLayers[layerId])
            .concat(newVectorLayers
              .map((layerId) => this.geopackage.vectorLayers[layerId])
              .map((layer) => {
                return {
                  name: layer.displayName || layer.name,
                  id: layer.id
                }
              }))
          // are there layers in rendering order not in available layers
          const renderingLayers = this.tileConfiguration.renderingOrder.filter(l => availableLayers.findIndex(val => val.id === l.id) > -1)
          const layersToAdd = availableLayers.filter(l => this.tileConfiguration.renderingOrder.findIndex(val => val.id === l.id) === -1).map((layer) => {
            return {
              name: layer.displayName || layer.name,
              id: layer.id
            }
          })
          this.setGeoPackageTileConfigurationRenderingOrder({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            renderingOrder: renderingLayers.concat(layersToAdd)})
        }
      },
      layerOrder: {
        get () {
          return _.cloneDeep(this.tileConfiguration.renderingOrder)
        },
        set (value) {
          this.setGeoPackageTileConfigurationRenderingOrder({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.tileConfiguration.id,
            renderingOrder: value})
        }
      }
    },
    methods: {
      ...mapActions({
        setGeoPackageTileConfigurationName: 'Projects/setGeoPackageTileConfigurationName',
        setGeoPackageTileTableName: 'Projects/setGeoPackageTileTableName',
        setGeoPackageTileConfigurationTileLayers: 'Projects/setGeoPackageTileConfigurationTileLayers',
        setGeoPackageTileConfigurationVectorLayers: 'Projects/setGeoPackageTileConfigurationVectorLayers',
        setGeoPackageTileConfigurationMinZoom: 'Projects/setGeoPackageTileConfigurationMinZoom',
        setGeoPackageTileConfigurationMaxZoom: 'Projects/setGeoPackageTileConfigurationMaxZoom',
        setGeoPackageTileConfigurationBoundingBox: 'Projects/setGeoPackageTileConfigurationBoundingBox',
        toggleGeoPackageTileConfigurationBoundingBoxEditing: 'Projects/toggleGeoPackageTileConfigurationBoundingBoxEditing',
        setGeoPackageTileConfigurationRenderingOrder: 'Projects/setGeoPackageTileConfigurationRenderingOrder',
        deleteGeoPackageTileConfiguration: 'Projects/deleteGeoPackageTileConfiguration'
      }),
      showDeleteGeoPackageVectorConfigurationConfirm () {
        this.showDeleteModal = true
      },
      cancel () {
        this.showDeleteModal = false
      },
      confirm () {
        this.showDeleteModal = false
        this.deleteGeoPackageTileConfiguration({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.tileConfiguration.id
        })
      },
      saveConfigurationName (val) {
        this.setGeoPackageTileConfigurationName({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.tileConfiguration.id,
          configurationName: val
        })
      },
      editBoundingBox () {
        this.toggleGeoPackageTileConfigurationBoundingBoxEditing({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.tileConfiguration.id,
          enabled: !this.tileConfiguration.boundingBoxEditingEnabled
        })
      },
      resetBoundingBox (e) {
        this.setGeoPackageTileConfigurationBoundingBox({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.tileConfiguration.id,
          boundingBox: null
        })
        if (this.tileConfiguration.boundingBoxEditingEnabled) {
          this.editBoundingBox()
        }
      },
      setBoundingBoxToDataExtent () {
        let extents = this.tileConfiguration.vectorLayers.map(vectorLayer => this.project.layers[vectorLayer].extent)
        extents = extents.concat(this.tileConfiguration.tileLayers.map(tileLayer => this.project.layers[tileLayer].extent))
        let boundingBox
        extents.forEach(extent => {
          if (_.isNil(boundingBox)) {
            boundingBox = extent
          } else {
            boundingBox[0] = Math.min(boundingBox[0], extent[0])
            boundingBox[1] = Math.min(boundingBox[1], extent[1])
            boundingBox[2] = Math.max(boundingBox[2], extent[2])
            boundingBox[3] = Math.max(boundingBox[3], extent[3])
          }
        })
        this.setGeoPackageTileConfigurationBoundingBox({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.tileConfiguration.id,
          boundingBox: [[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]]
        })
      },
      numberOfTilesToGenerate () {
        if (this.tileConfiguration.minZoom && this.tileConfiguration.maxZoom && this.tileConfiguration.boundingBox) {
          return XYZTileUtilities.tileCountInExtent(this.tileConfiguration.boundingBox, Number(this.tileConfiguration.minZoom), Number(this.tileConfiguration.maxZoom))
        } else {
          return 0
        }
      }
    }
  }
</script>

<style scoped>
  .title-card {
    color: #000;
    font-size: 16px;
  }
  .danger {
    color: #d50000;
  }
  .danger:hover {
    color: #9b0000;
  }
  .delete-button {
    margin-right: .25rem;
    cursor: pointer;
  }

  input[type=radio], p {
    display: inline;
  }

  .list-group {
    display: flex;
    flex-direction: column;
    padding-left: 0;
    margin-bottom: 10px;
  }
  .list-group-item {
    position: relative;
    display: block;
    padding: 10px 10px;
    margin-bottom: 0px;
    color: black;
    background-color: white;
    border-top: 1px solid gray;
    border-left: 1px solid gray;
    border-right: 1px solid gray;
  }
  .list-group-item:last-child {
    border-bottom: 1px solid gray;
  }
  .list-group-item:active {
    z-index: 2;
    color: white;
    background-color: dodgerblue;
    border-color: white;
  }
  .flex-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
  }
  .ghost {
    opacity: 0.5;
    background: #c8ebfb;
  }
</style>
