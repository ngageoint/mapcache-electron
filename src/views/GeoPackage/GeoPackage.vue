<template>
  <feature-layer
    v-if="selectedLayer !== null && selectedLayer !== undefined && geopackage.tables.features[selectedLayer]"
    :key="geopackage.id + '_' + selectedLayer"
    :table-name="selectedLayer"
    :geopackage="geopackage"
    :projectId="project.id"
    :project="project"
    :back="deselectLayer"
    :renamed="selectedLayerRenamed"/>
  <tile-layer
    v-else-if="selectedLayer !== null && selectedLayer !== undefined"
    :key="geopackage.id + '_' + selectedLayer"
    :table-name="selectedLayer"
    :geopackage="geopackage"
    :projectId="project.id"
    :back="deselectLayer"
    :renamed="selectedLayerRenamed"/>
  <add-feature-layer v-else-if="addFeatureLayerDialog" :project="project" :geopackage="geopackage" :back="hideAddFeatureDialog"></add-feature-layer>
  <add-tile-layer v-else-if="addTileLayerDialog" :project="project" :geopackage="geopackage" :back="hideAddTileDialog"></add-tile-layer>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      color="main"
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
      persistent
      @keydown.esc="detailDialog = false">
      <v-card v-if="detailDialog">
        <v-card-title>{{geopackage.name}}</v-card-title>
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
      max-width="400"
      persistent
      @keydown.esc="renameDialog = false">
      <v-card v-if="renameDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2">mdi-pencil</v-icon>
          Rename GeoPackage
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="renameValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                    autofocus
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
      max-width="400"
      persistent
      @keydown.esc="copyDialog = false">
      <v-card v-if="copyDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2">mdi-content-copy</v-icon>
          Copy GeoPackage
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent v-model="copyValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                    autofocus
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
      max-width="400"
      persistent
      @keydown.esc="removeDialog = false">
      <v-card v-if="removeDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Remove GeoPackage
        </v-card-title>
        <v-card-text>
          Removing the <b>{{geopackage.name}}</b> GeoPackage will remove it from the application but the GeoPackage will remain on your file system. Are you sure you want to remove the <b>{{geopackage.name}}</b> GeoPackage?
        </v-card-text>
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
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <v-alert
        class="alert-position"
        v-model="showCopiedAlert"
        dismissible
        type="success"
      >GeoPackage copied.</v-alert>
      <v-row class="pl-3 pt-3 pr-3 background" no-gutters>
        <v-col>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{size}}
          </p>
        </v-col>
      </v-row>
      <v-row class="pl-3 pr-3 background" no-gutters>
        <v-col>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{"Feature layers: " + Object.keys(geopackage.tables.features).length}}
          </p>
        </v-col>
      </v-row>
      <v-row class="pl-3 pr-3 background" no-gutters>
        <v-col>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500'}">
            {{"Tile layers: " + Object.keys(geopackage.tables.tiles).length}}
          </p>
        </v-col>
      </v-row>
      <v-sheet class="background pb-4">
        <v-row no-gutters justify="center" align-content="center">
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
                    <v-icon small>mdi-pencil</v-icon>
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
                    <v-icon small>mdi-trash-can</v-icon>
                  </v-row>
                  <v-row no-gutters align-content="center" justify="center">
                    Remove
                  </v-row>
                </v-card-text>
              </v-card>
            </template>
          </v-hover>
        </v-row>
      </v-sheet>
      <v-sheet class="background">
        <v-row v-if="hasLayers" no-gutters align="center" justify="start" class="pa-2">
          <v-col>
            <p class="text-h6 ml-2 mb-0">
              Layers
            </p>
          </v-col>
        </v-row>
        <geo-package-layer-list :project-id="project.id" :geopackage="geopackage" :layer-selected="layerSelected"></geo-package-layer-list>
      </v-sheet>
    </v-sheet>
    <v-speed-dial
      class="fab-position"
      v-model="fab"
      transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-tooltip right :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <span v-bind="attrs" v-on="on">
              <v-btn
                fab
                :disabled="projectTileLayerCount === 0 && projectFeatureLayerCount === 0"
                color="primary">
                <v-icon>mdi-layers-plus</v-icon>
              </v-btn>
            </span>
          </template>
          <span>{{projectTileLayerCount === 0 && projectFeatureLayerCount === 0 ? 'No data sources or GeoPackage layers found' : 'Add layer'}}</span>
        </v-tooltip>
      </template>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <span v-bind="attrs" v-on="on">
            <v-btn
              fab
              small
              color="accent"
              @click="addFeatureLayer"
              :disabled="projectFeatureLayerCount === 0">
              <img :style="{verticalAlign: 'middle'}" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px">
            </v-btn>
          </span>
        </template>
        <span>Add feature layer</span>
      </v-tooltip>
      <v-tooltip right :disabled="!project.showToolTips">
        <template v-slot:activator="{ on, attrs }">
          <span v-bind="attrs" v-on="on">
            <v-btn
              fab
              small
              color="accent"
              @click="addTileLayer"
              :disabled="projectTileLayerCount === 0 && projectFeatureLayerCount === 0">
              <img :style="{verticalAlign: 'middle'}" src="../../assets/white_layers.png" alt="Feature Layer" width="24px" height="20px">
            </v-btn>
          </span>
        </template>
        <span>Add tile layer</span>
      </v-tooltip>
    </v-speed-dial>
  </v-sheet>
</template>

<script>
  import { shell } from 'electron'
  import { mapState } from 'vuex'
  import _ from 'lodash'
  import path from 'path'
  import fs from 'fs'
  import TileLayer from './TileLayer'
  import FeatureLayer from './FeatureLayer'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import GeoPackageDetails from './GeoPackageDetails'
  import GeoPackageLayerList from './GeoPackageLayerList'
  import AddFeatureLayer from './AddFeatureLayer'
  import AddTileLayer from './AddTileLayer'
  import ActionUtilities from '../../lib/ActionUtilities'

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
      FeatureLayer,
      TileLayer
    },
    data () {
      return {
        fab: false,
        showCopiedAlert: false,
        addFeatureLayerDialog: false,
        addTileLayerDialog: false,
        selectedLayer: null,
        detailDialog: false,
        renameDialog: false,
        renameValid: false,
        removeDialog: false,
        renamedGeoPackage: this.geopackage.name,
        renamedGeoPackageRules: [
          v => !!v || 'Name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name',
          v => !fs.existsSync(path.join(path.dirname(this.geopackage.path), v + '.gpkg')) || 'Name already exists'
        ],
        copyDialog: false,
        copyValid: false,
        copiedGeoPackage: this.geopackage.name + '_copy',
        copiedGeoPackageRules: [
          v => !!v || 'Name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name',
          v => !fs.existsSync(path.join(path.dirname(this.geopackage.path), v + '.gpkg')) || 'Name already exists'
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
          ActionUtilities.setGeoPackageLayersVisible({projectId: this.project.id, geopackageId: this.geopackage.id, visible: value})
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
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      rename () {
        this.renameDialog = false
        this.copiedGeoPackage = this.renamedGeoPackage + '_copy'
        ActionUtilities.renameGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id, name: this.renamedGeoPackage})
      },
      copy () {
        this.copyDialog = false
        const oldPath = this.geopackage.path
        const newPath = path.join(path.dirname(oldPath), this.copiedGeoPackage + '.gpkg')
        try {
          fs.copyFileSync(oldPath, newPath)
          ActionUtilities.addGeoPackage({projectId: this.project.id, filePath: newPath})
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e)
        }
        this.showCopiedAlert = true
      },
      remove () {
        this.removeDialog = false
        ActionUtilities.removeGeoPackage({projectId: this.project.id, geopackageId: this.geopackage.id})
        this.back()
      },
      layerSelected (layer) {
        this.selectedLayer = layer
        if (!_.isNil(this.geopackage.tables.features[layer])) {
          ActionUtilities.setActiveGeoPackageFeatureLayer({projectId: this.project.id, geopackageId: this.geopackage.id, tableName: layer})
        }
      },
      selectedLayerRenamed (layer) {
        if (!_.isNil(this.geopackage.tables.features[this.selectedLayer])) {
          ActionUtilities.setActiveGeoPackageFeatureLayer({projectId: this.project.id, geopackageId: this.geopackage.id, tableName: layer})
        }
        this.selectedLayer = layer
      },
      deselectLayer () {
        this.selectedLayer = null
        ActionUtilities.setActiveGeoPackageFeatureLayer({projectId: this.project.id, geopackageId: this.geopackage.id, tableName: null})
      },
      addFeatureLayer () {
        this.fab = false
        this.addFeatureLayerDialog = true
      },
      addTileLayer () {
        this.fab = false
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
        handler (newGeoPackage) {
          if (!_.isNil(this.selectedLayer) && (_.isNil(newGeoPackage.tables.features[this.selectedLayer]) && _.isNil(newGeoPackage.tables.tiles[this.selectedLayer]))) {
            this.$nextTick(() => {
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
