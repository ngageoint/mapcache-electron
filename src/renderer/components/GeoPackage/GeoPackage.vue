<template>
  <div v-if="selectedLayer !== null && selectedLayer !== undefined">
    <feature-layer
      v-if="geopackage.tables.features[selectedLayer]"
      :key="geopackage.id + '_' + selectedLayer"
      :table-name="selectedLayer"
      :geopackage="geopackage"
      :projectId="projectId"
      :back="deselectLayer"/>
    <tile-layer
      v-else
      :key="geopackage.id + '_' + selectedLayer"
      :table-name="selectedLayer"
      :geopackage="geopackage"
      :projectId="projectId"
      :back="deselectLayer"/>
  </div>
  <div v-else style="background-color: white">
    <v-toolbar
      color="#3b779a"
      dark
      flat
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>{{geopackage.name}}</v-toolbar-title>
    </v-toolbar>
    <v-dialog
      v-model="detailDialog"
      max-width="500"
      scrollable>
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">{{geopackage.name}}</v-card-title>
        <v-divider/>
        <v-card-text style="max-width: 500px; overflow-x: hidden;">
          <geo-package-details :geopackage="geopackage"/>
        </v-card-text>
        <v-divider/>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="#3b779a"
            text
            @click="detailDialog = false">
            close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="renameDialog"
      max-width="500">
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-pencil-outline</v-icon>Rename {{geopackage.name}}
          </v-row>
        </v-card-title>
        <v-card-text>
          <v-form v-model="renameValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                    v-model="renamedGeoPackage"
                    :rules="renamedGeoPackageRules"
                    label="Name"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="#3b779a"
            text
            @click="renameDialog = false">
            cancel
          </v-btn>
          <v-btn
            v-if="renameValid"
            color="#3b779a"
            text
            @click="rename">
            rename
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="copyDialog"
      max-width="500">
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-content-copy</v-icon>Copy {{geopackage.name}}
          </v-row>
        </v-card-title>
        <v-card-text>
          <v-form v-model="copyValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                    v-model="copiedGeoPackage"
                    :rules="copiedGeoPackageRules"
                    label="Name"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="#3b779a"
            text
            @click="copyDialog = false">
            cancel
          </v-btn>
          <v-btn
            v-if="copyValid"
            color="#3b779a"
            text
            @click="copy">
            copy
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="removeDialog"
      max-width="500">
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-col>
              <v-icon>mdi-trash-can-outline</v-icon>Remove {{geopackage.name}}
            </v-col>
          </v-row>
        </v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="#3b779a"
            text
            @click="removeDialog = false">
            cancel
          </v-btn>
          <v-btn
            color="#ff4444"
            text
            @click="remove">
            remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-container fluid class="text-left pb-0 mb-0">
      <v-row no-gutters>
        <v-col>
          <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{size}}
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{"Feature Tables: " + tables.features.length}}
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{"Tile Tables: " + tables.tiles.length}}
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pt-2" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="detailDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-information-outline</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Details
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="renameDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-pencil-outline</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Rename
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="copyDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-content-copy</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Copy
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="removeDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-trash-can-outline</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Remove
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
      </v-row>
    </v-container>
    <v-container class="ma-0 pa-0">
      <v-row v-if="hasLayers" no-gutters align="center" justify="start" class="ma-2">
        <v-col>
          <p class="header" :style="{fontSize: '16px', fontWeight: '700', marginBottom: '0px'}">
            {{"Layers"}}
          </p>
        </v-col>
        <!--        <v-col offset="4" cols="4" justify="center">-->
        <!--          <v-switch-->
        <!--            class="v-label detail"-->
        <!--            hide-details-->
        <!--            color="#3b779a"-->
        <!--            v-model="layersVisible"-->
        <!--            label="Enable all"-->
        <!--            dense-->
        <!--          ></v-switch>-->
        <!--        </v-col>-->
      </v-row>
      <geo-package-layer-list :project-id="projectId" :geopackage="geopackage" :layer-selected="layerSelected"></geo-package-layer-list>
    </v-container>
    <v-btn
      class="fab-position"
      dark
      fab
      color="#73c1c5"
      title="Add layer">
      <v-icon>mdi-layers-plus</v-icon>
    </v-btn>
  </div>
</template>

<script>
  import Vue from 'vue'
  import { mapActions, mapState } from 'vuex'
  import _ from 'lodash'
  import ViewEditText from '../Common/ViewEditText'
  import TileLayer from './TileLayer'
  import FeatureLayer from './FeatureLayer'
  import GeoPackageUtilities from './../../../lib/GeoPackageUtilities'
  import GeoPackageDetails from './GeoPackageDetails'
  import GeoPackageLayerList from './GeoPackageLayerList'

  export default {
    props: {
      geopackage: Object,
      projectId: String,
      back: Function
    },
    components: {
      GeoPackageLayerList,
      GeoPackageDetails,
      ViewEditText,
      FeatureLayer,
      TileLayer
    },
    data () {
      return {
        selectedLayer: null,
        detailDialog: false,
        renameDialog: false,
        renameValid: false,
        removeDialog: false,
        renamedGeoPackage: this.geopackage.name,
        renamedGeoPackageRules: [
          v => !!v || 'Name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name'
        ],
        copyDialog: false,
        copyValid: false,
        copiedGeoPackage: this.geopackage.name + '_copy',
        copiedGeoPackageRules: [
          v => !!v || 'Name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name'
        ]
      }
    },
    computed: {
      ...mapState({
        name () {
          return this.geopackage.name
        }
      }),
      layersVisible: {
        get () {
          const allTableKeys = Object.values(this.geopackage.tables.features).concat(Object.values(this.geopackage.tables.tiles))
          return (allTableKeys.filter(table => !table.visible).length === 0 && allTableKeys.length > 0) || false
        },
        set (value) {
          this.setGeoPackageLayersVisible({projectId: this.projectId, geopackageId: this.geopackage.id, visible: value})
        }
      },
      size () {
        return GeoPackageUtilities.getGeoPackageFileSize(this.geopackage.path)
      },
      hasLayers () {
        return Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).length > 0
      }
    },
    asyncComputed: {
      tables: {
        get () {
          return GeoPackageUtilities.getTables(this.geopackage.path).then(result => {
            if (_.isNil(result)) {
              return []
            }
            return result
          })
        },
        default: {features: [], tiles: []}
      }
    },
    methods: {
      ...mapActions({
        removeGeoPackage: 'Projects/removeGeoPackage',
        setGeoPackageLayersVisible: 'Projects/setGeoPackageLayersVisible',
        renameGeoPackage: 'Projects/renameGeoPackage',
        copyGeoPackage: 'Projects/copyGeoPackage'
      }),
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      rename () {
        this.renameDialog = false
        this.copiedGeoPackage = this.renamedGeoPackage + '_copy'
        this.renameGeoPackage({projectId: this.projectId, geopackageId: this.geopackage.id, name: this.renamedGeoPackage})
      },
      copy () {
        this.copyDialog = false
        this.copyGeoPackage({projectId: this.projectId, geopackageId: this.geopackage.id, name: this.copiedGeoPackage})
      },
      remove () {
        this.removeDialog = false
        this.removeGeoPackage({projectId: this.projectId, geopackageId: this.geopackage.id})
        this.back()
      },
      layerSelected (layer) {
        this.selectedLayer = layer
      },
      selectedLayerRenamed (layer) {
        this.selectedLayer = layer
      },
      deselectLayer () {
        this.selectedLayer = null
      }
    },
    watch: {
      geopackage: {
        handler (newGeoPackage, oldGeoPackage) {
          if (!_.isNil(this.selectedLayer) && (_.isNil(newGeoPackage.tables.features[this.selectedLayer]) && _.isNil(newGeoPackage.tables.tiles[this.selectedLayer]))) {
            Vue.nextTick(() => {
              this.deselectLayer()
            })
          }
        },
        deep: true
      }
    }
  }
</script>

<style scoped>
  .fab-position {
    position: absolute;
    left: 384px;
    bottom: 16px;
  }
</style>
