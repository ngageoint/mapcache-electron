<template>
  <div>
    <modal
            v-if="showDeleteModal"
            header="Delete Vector Configuration"
            :card-text="'Are you sure you want to delete this vector configuration?'"
            ok-text="Delete"
            ok-color="red darken-1"
            :ok="confirm"
            :cancel="cancel">
    </modal>
    <expandable-card class="mb-2 sub-card">
      <div slot="card-header">
        <v-row no-gutters class="justify-space-between" align="center">
          <v-col cols="12" class="align-center">
            <view-edit-text :value="vectorConfiguration.configurationName" editing-disabled font-size="1em" font-weight="500" label="Vector Configuration Name" :on-save="saveConfigurationName"/>
          </v-col>
        </v-row>
      </div>
      <div slot="card-expanded-body">
        <v-container>
          <v-card-title>
            Vector Layer Selection
          </v-card-title>
          <v-card-text>
            <v-row no-gutters>
              <v-select
                v-model="layersToInclude"
                :items="vectorLayers"
                label="Vector Layers"
                multiple
                dense
                item-text="name"
                item-value="id"
                hide-details
                return-object
                chips/>
            </v-row>
          </v-card-text>
          <v-card-title>
            Bounding Box
          </v-card-title>
          <v-container class="mt-0 mb-0">
            <div class="flex-container" :style="{justifyContent: 'start'}">
              <v-text-field label="Specify Bounding Box" readonly :value="boundingBoxText" clearable @click.clear="resetBoundingBox"/>
              <v-btn text icon :color="vectorConfiguration.boundingBoxEditingEnabled ? 'red' : 'black'" @click.stop="editBoundingBox">
                <v-icon>{{vectorConfiguration.boundingBoxEditingEnabled ? 'mdi-stop' : 'mdi-crop-free'}}</v-icon>
              </v-btn>
            </div>
            <v-row no-gutters class="mb-2" v-if="layersToInclude.length > 0">
              <v-chip
                class="mr-2"
                @click="setBoundingBoxToDataExtent"
              >
                Use Extent of All Layers
              </v-chip>
            </v-row>
            <v-row no-gutters>
              <p>{{'Features in Bounding Box: ' + featuresInBounds}}</p>
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
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  import _ from 'lodash'

  export default {
    props: {
      project: Object,
      geopackage: Object,
      vectorConfiguration: Object
    },
    components: {
      ExpandableCard,
      ViewEditText,
      Modal
    },
    created () {
      let _this = this
      this.getFeaturesInBounds().then(function (result) {
        _this.featuresInBounds = result
      })
    },
    data () {
      return {
        showDeleteModal: false,
        featuresInBounds: 0
      }
    },
    computed: {
      boundingBoxText: {
        get () {
          let boundingBoxText = ''
          if (this.vectorConfiguration.boundingBox) {
            const bbox = this.vectorConfiguration.boundingBox
            boundingBoxText = '(' + bbox[0][0].toFixed(4) + ',' + bbox[0][1].toFixed(4) + '), (' + bbox[1][0].toFixed(4) + ',' + bbox[1][1].toFixed(4) + ')'
          }
          return boundingBoxText
        }
      },
      vectorLayers () {
        return Object.values(this.geopackage.vectorLayers).map(layer => {
          return {name: layer.displayName ? layer.displayName : layer.name, value: layer.id}
        })
      },
      layersToInclude: {
        get () {
          return Object.values(this.geopackage.vectorLayers).map(layer => {
            return {name: layer.displayName ? layer.displayName : layer.name, value: layer.id}
          }).filter(layer => this.vectorConfiguration.vectorLayers.findIndex(l => l === layer.value) !== -1)
        },
        set (val) {
          this.setGeoPackageVectorConfigurationVectorLayers({
            projectId: this.project.id,
            geopackageId: this.geopackage.id,
            configId: this.vectorConfiguration.id,
            vectorLayers: val.map(v => v.value).filter(v => !_.isNil(v))
          })
        }
      }
    },
    methods: {
      ...mapActions({
        setGeoPackageVectorConfigurationName: 'Projects/setGeoPackageVectorConfigurationName',
        setGeoPackageVectorConfigurationVectorLayers: 'Projects/setGeoPackageVectorConfigurationVectorLayers',
        toggleGeoPackageVectorConfigurationBoundingBoxEditing: 'Projects/toggleGeoPackageVectorConfigurationBoundingBoxEditing',
        setGeoPackageVectorConfigurationBoundingBox: 'Projects/setGeoPackageVectorConfigurationBoundingBox',
        deleteGeoPackageVectorConfiguration: 'Projects/deleteGeoPackageVectorConfiguration'
      }),
      showDeleteGeoPackageVectorConfigurationConfirm () {
        this.showDeleteModal = true
      },
      cancel () {
        this.showDeleteModal = false
      },
      confirm () {
        this.showDeleteModal = false
        this.deleteGeoPackageVectorConfiguration({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.vectorConfiguration.id
        })
      },
      saveConfigurationName (val) {
        this.setGeoPackageVectorConfigurationName({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.vectorConfiguration.id,
          configurationName: val
        })
      },
      resetBoundingBox (e) {
        this.setGeoPackageVectorConfigurationBoundingBox({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.tileConfiguration.id,
          boundingBox: null
        })
        if (this.tileConfiguration.boundingBoxEditingEnabled) {
          this.editBoundingBox()
        }
      },
      editBoundingBox () {
        this.toggleGeoPackageVectorConfigurationBoundingBoxEditing({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.vectorConfiguration.id,
          enabled: !this.vectorConfiguration.boundingBoxEditingEnabled
        })
      },
      setBoundingBoxToDataExtent () {
        let boundingBox
        this.vectorConfiguration.vectorLayers.map(vectorLayer => this.project.layers[vectorLayer].extent).forEach(extent => {
          if (_.isNil(boundingBox)) {
            boundingBox = extent
          } else {
            boundingBox[0] = Math.min(boundingBox[0], extent[0])
            boundingBox[1] = Math.min(boundingBox[1], extent[1])
            boundingBox[2] = Math.max(boundingBox[2], extent[2])
            boundingBox[3] = Math.max(boundingBox[3], extent[3])
          }
        })
        this.setGeoPackageVectorConfigurationBoundingBox({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          configId: this.vectorConfiguration.id,
          boundingBox: [[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]]
        })
      },
      async getFeaturesInBounds () {
        let numberOfFeatures = 0
        if (this.vectorConfiguration.boundingBox) {
          for (let i = 0; i < this.vectorConfiguration.vectorLayers.length; i++) {
            let vectorLayer = this.geopackage.vectorLayers[this.vectorConfiguration.vectorLayers[i]]
            if (vectorLayer.geopackageFilePath) {
              numberOfFeatures += await GeoPackageUtilities.getFeatureCountInBoundingBox(vectorLayer.geopackageFilePath, vectorLayer.sourceLayerName, this.vectorConfiguration.boundingBox)
            }
          }
        }
        return numberOfFeatures
      }
    },
    watch: {
      vectorConfiguration: {
        async handler (config, oldValue) {
          this.featuresInBounds = await this.getFeaturesInBounds()
        },
        deep: true
      }
    }
  }
</script>

<style scoped>
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
  .flex-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
  }
</style>
