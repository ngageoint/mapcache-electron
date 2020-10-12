<template>
  <v-sheet v-if="selectedLayer !== null && selectedLayer !== undefined">
    <feature-layer
      v-if="geopackage.tables.features[selectedLayer]"
      :key="geopackage.id + '_' + selectedLayer"
      :table-name="selectedLayer"
      :geopackage="geopackage"
      :projectId="project.id"
      :back="deselectLayer"
      :renamed="selectedLayerRenamed"/>
    <tile-layer
      v-else
      :key="geopackage.id + '_' + selectedLayer"
      :table-name="selectedLayer"
      :geopackage="geopackage"
      :projectId="project.id"
      :back="deselectLayer"
      :renamed="selectedLayerRenamed"/>
  </v-sheet>
  <v-sheet v-else-if="addFeatureLayerDialog">
    <add-feature-layer :project="project" :geopackage="geopackage" :back="hideAddFeatureDialog"></add-feature-layer>
  </v-sheet>
  <v-sheet v-else-if="addTileLayerDialog">
    <add-tile-layer :project="project" :geopackage="geopackage" :back="hideAddTileDialog"></add-tile-layer>
  </v-sheet>
  <v-sheet v-else>
    <v-toolbar
      color="primary"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>{{geopackage.name}}</v-toolbar-title>
    </v-toolbar>
    <v-dialog
      v-model="detailDialog"
      max-width="500"
      scrollable
      persistent>
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
            text
            @click="detailDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="renameDialog"
      max-width="500"
      persistent>
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-pencil-outline</v-icon>Rename {{geopackage.name}}
          </v-row>
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="renameValid">
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
            text
            @click="renameDialog = false">
            Cancel
          </v-btn>
          <v-btn
            v-if="renameValid"
            color="primary"
            text
            @click="rename">
            Rename
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="copyDialog"
      max-width="500"
      persistent>
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-content-copy</v-icon>Copy {{geopackage.name}}
          </v-row>
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="copyValid">
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
            text
            @click="copyDialog = false">
            Cancel
          </v-btn>
          <v-btn
            v-if="copyValid"
            color="primary"
            text
            @click="copy">
            Copy
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="removeDialog"
      max-width="500"
      persistent>
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
            text
            @click="removeDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="remove">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="addLayerDialog" max-width="350" persistent>
      <v-card class="text-center">
        <v-card-title class="headline">
          <v-container class="pa-0 ma-0">
            <v-row no-gutters>
              <v-col class="align-center">
                Add GeoPackage Layer
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-divider class="mt-2 mb-2"/>
            </v-row>
          </v-container>
        </v-card-title>
        <v-card-text>
          <v-hover :disabled="projectFeatureLayerCount === 0">
            <template v-slot="{ hover }">
              <v-card :disabled="projectFeatureLayerCount === 0" class="text-left mb-4 clickable" :elevation="hover ? 4 : 1" @click.stop="addFeatureLayer">
                <v-card-text>
                  <v-container style="padding: 4px">
                    <v-row>
                      <v-col cols="2">
                        <img :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
                      </v-col>
                      <v-col cols="8">
                        Add Feature Layer
                      </v-col>
                    </v-row>
                  </v-container>
                </v-card-text>
              </v-card>
            </template>
          </v-hover>
          <v-hover :disabled="projectFeatureLayerCount + projectTileLayerCount === 0">
            <template v-slot="{ hover }">
              <v-card :disabled="projectFeatureLayerCount + projectTileLayerCount === 0" class="text-left mt-4 clickable" :elevation="hover ? 4 : 1" @click.stop="addTileLayer">
                <v-card-text>
                  <v-container style="padding: 4px">
                    <v-row>
                      <v-col cols="2">
                        <img :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Tile Layer" width="24px" height="20px">
                      </v-col>
                      <v-col cols="8">
                        Add Tile Layer
                      </v-col>
                    </v-row>
                  </v-container>
                </v-card-text>
              </v-card>
            </template>
          </v-hover>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="addLayerDialog = false">
            Cancel
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
            {{"Feature Tables: " + Object.keys(geopackage.tables.features).length}}
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{"Tile Tables: " + Object.keys(geopackage.tables.tiles).length}}
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="openFolder">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>mdi-folder</v-icon>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Show
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
      </v-row>
      <geo-package-layer-list :project-id="project.id" :geopackage="geopackage" :layer-selected="layerSelected"></geo-package-layer-list>
    </v-container>
    <v-btn
      class="fab-position"
      fab
      :disabled="projectTileLayerCount === 0 && projectFeatureLayerCount === 0"
      color="accent"
      title="Add layer"
      @click.stop="addLayerDialog = true">
      <v-icon>mdi-layers-plus</v-icon>
    </v-btn>
  </v-sheet>
</template>

<script>
  import { shell } from 'electron'
  import Vue from 'vue'
  import { mapActions, mapState } from 'vuex'
  import _ from 'lodash'
  import ViewEditText from '../Common/ViewEditText'
  import TileLayer from './TileLayer'
  import FeatureLayer from './FeatureLayer'
  import GeoPackageUtilities from './../../../lib/GeoPackageUtilities'
  import GeoPackageDetails from './GeoPackageDetails'
  import GeoPackageLayerList from './GeoPackageLayerList'
  import AddFeatureLayer from './AddFeatureLayer'
  import AddTileLayer from './AddTileLayer'

  export default {
    props: {
      geopackage: Object,
      project: Object,
      back: Function
    },
    components: {
      AddFeatureLayer,
      AddTileLayer,
      GeoPackageLayerList,
      GeoPackageDetails,
      ViewEditText,
      FeatureLayer,
      TileLayer
    },
    data () {
      return {
        addFeatureLayerDialog: false,
        addTileLayerDialog: false,
        addLayerDialog: false,
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
          const allTableKeys = _.values(this.geopackage.tables.features).concat(_.values(this.geopackage.tables.tiles))
          return (allTableKeys.filter(table => !table.visible).length === 0 && allTableKeys.length > 0) || false
        },
        set (value) {
          this.setGeoPackageLayersVisible({projectId: this.project.id, geopackageId: this.geopackage.id, visible: value})
        }
      },
      size () {
        return GeoPackageUtilities.getGeoPackageFileSize(this.geopackage.path)
      },
      hasLayers () {
        return _.keys(this.geopackage.tables.features).concat(_.keys(this.geopackage.tables.tiles)).length > 0
      },
      projectFeatureLayerCount () {
        return _.keys(this.project.geopackages).reduce((accumulator, geopackage) => accumulator + _.keys(this.project.geopackages[geopackage].tables.features).length, 0) +
          _.values(this.project.sources).filter(source => source.pane === 'vector').length
      },
      projectTileLayerCount () {
        return _.keys(this.project.geopackages).reduce((accumulator, geopackage) => accumulator + _.keys(this.project.geopackages[geopackage].tables.tiles).length, 0) +
          _.values(this.project.sources).filter(source => source.pane === 'tile').length
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
        this.renameGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id, name: this.renamedGeoPackage})
      },
      copy () {
        this.copyDialog = false
        this.copyGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id, name: this.copiedGeoPackage})
      },
      remove () {
        this.removeDialog = false
        this.removeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
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
      },
      addFeatureLayer () {
        this.addLayerDialog = false
        this.addFeatureLayerDialog = true
      },
      addTileLayer () {
        this.addLayerDialog = false
        this.addTileLayerDialog = true
      },
      hideAddFeatureDialog () {
        this.addFeatureLayerDialog = false
      },
      hideAddTileDialog () {
        this.addTileLayerDialog = false
      },
      openFolder () {
        shell.showItemInFolder(this.geopackage.path)
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
</style>
