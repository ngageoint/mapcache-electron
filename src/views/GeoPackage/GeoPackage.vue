<template>
  <feature-layer v-if="selectedLayer !== null && selectedLayer !== undefined && geopackage.tables.features[selectedLayer]" :key="geopackage.id + '_' + selectedLayer" :table-name="selectedLayer" :geopackage="geopackage" :project="project" :back="deselectLayer" :renamed="selectedLayerRenamed" :display-feature="displayFeature" :dark="dark"/>
  <tile-layer v-else-if="selectedLayer !== null && selectedLayer !== undefined && geopackage.tables.tiles[selectedLayer]" :key="geopackage.id + '_' + selectedLayer" :table-name="selectedLayer" :geopackage="geopackage" :project="project" :back="deselectLayer" :renamed="selectedLayerRenamed" :dark="dark"/>
  <add-feature-layer v-else-if="addFeatureLayerDialog" :project="project" :geopackage="geopackage" :back="hideAddFeatureDialog" :allow-notifications="allowNotifications" :dark="dark"></add-feature-layer>
  <add-tile-layer v-else-if="addTileLayerDialog" :project="project" :geopackage="geopackage" :back="hideAddTileDialog" :allow-notifications="allowNotifications" :dark="dark"/>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
      <v-toolbar-title>{{ geopackage.name }}</v-toolbar-title>
    </v-toolbar>
    <v-dialog
        v-model="detailDialog"
        max-width="500"
        scrollable
        persistent
        @keydown.esc="detailDialog = false">
      <v-card v-if="detailDialog">
        <v-card-title>{{ geopackage.name }}</v-card-title>
        <v-divider/>
        <v-card-text style="max-width: 500px; overflow-x: hidden;">
          <geo-package-details :geopackage="geopackage"/>
        </v-card-text>
        <v-divider/>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
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
        @keydown.esc="exitRenamingDialog">
      <v-card v-if="renameDialog">
        <v-card-title>
          <v-icon color="primary" class="pr-2" icon="mdi-pencil"/>
          Rename GeoPackage
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent="() => {}" v-model="renameValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                      variant="underlined"
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
              :disabled="renaming"
              variant="text"
              @click="renameDialog = false">
            Cancel
          </v-btn>
          <v-btn
              :loading="renaming"
              :disabled="!renameValid"
              color="primary"
              variant="text"
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
          <v-icon color="primary" class="pr-2" icon="mdi-content-copy"/>
          Copy GeoPackage
        </v-card-title>
        <v-card-text>
          <v-form v-on:submit.prevent="() => {}" v-model="copyValid">
            <v-container class="ma-0 pa-0">
              <v-row no-gutters>
                <v-col cols="12">
                  <v-text-field
                      variant="underlined"
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
              variant="text"
              @click="copyDialog = false">
            Cancel
          </v-btn>
          <v-btn
              :disabled="!copyValid"
              color="primary"
              variant="text"
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
          <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
          Remove GeoPackage
        </v-card-title>
        <v-card-text>
          Removing the <b>{{ geopackage.name }}</b> GeoPackage will remove it from the application but the GeoPackage
          will remain on your file system. Are you sure you want to remove the <b>{{ geopackage.name }}</b> GeoPackage?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="removeDialog = false">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="remove">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-sheet class="mapcache-sheet-content mapcache-fab-spacer detail-bg">
      <v-row class="pl-3 pt-3 pr-3 background" no-gutters>
        <v-col>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{ size }}
          </p>
        </v-col>
      </v-row>
      <v-row class="pl-3 pr-3 background" no-gutters>
        <v-col>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            {{ "Feature layers: " + Object.keys(geopackage.tables.features).length }}
          </p>
        </v-col>
      </v-row>
      <v-row class="pl-3 pr-3 background" no-gutters>
        <v-col>
          <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500'}">
            {{ "Tile layers: " + Object.keys(geopackage.tables.tiles).length }}
          </p>
        </v-col>
      </v-row>
      <v-sheet class="background pb-4">
        <v-row no-gutters justify="center" align-content="center">
          <v-hover>
            <template v-slot="{ hover }">
              <v-card class="ma-0 pa-0 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                      @click.stop="detailDialog = true">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small icon="mdi-information-outline"/>
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
              <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                      @click.stop="openFolder">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small icon="mdi-folder"/>
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
              <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                      @click.stop="renameDialog = true">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small icon="mdi-pencil"/>
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
              <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                      @click.stop="copyDialog = true">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small icon="mdi-content-copy"/>
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
              <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1"
                      @click.stop="removeDialog = true">
                <v-card-text class="pa-2">
                  <v-row no-gutters align-content="center" justify="center">
                    <v-icon small icon="mdi-trash-can"/>
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
        <geo-package-layer-list :project="project" :geopackage="geopackage" :layer-selected="layerSelected" :dark="dark"/>
      </v-sheet>
    </v-sheet>
    <speed-dial
        v-on:deactivated="fab = false"
        class="fab-position"
        :activated="fab"
        transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-tooltip location="end" :disabled="!project.showToolTips" text="Add layer">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              size="56px"
              elevation="4"
              color="primary"
              icon="mdi-layers-plus"
              :active="fab"
              @click="fab = !fab"/>
          </template>
        </v-tooltip>
      </template>
      <template v-slot:options>
        <v-col class="ma-0 pa-0" cols="12">
          <v-tooltip location="end" :disabled="!project.showToolTips" text="Add tile layer">
            <template v-slot:activator="{ props }">
              <v-btn
                  v-bind="props"
                  icon
                  color="accent"
                  size="40px"
                  style="margin-top: 6px; margin-bottom: 6px;"
                  elevation="4"
                  @click="addTileLayer"
                  :disabled="projectTileLayerCount === 0 && projectFeatureLayerCount === 0">
                <v-img :style="{verticalAlign: 'middle'}" src="/images/white_layers.png" alt="Tile layer" width="24px" height="20px"/>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>
        <v-col class="ma-0 pa-0" cols="12">
          <v-tooltip location="end" :disabled="!project.showToolTips" text="Add feature layer">
            <template v-slot:activator="{ props }">
              <v-btn
                  v-bind="props"
                  icon
                  color="accent"
                  size="40px"
                  style="margin-top: 6px; margin-bottom: 6px;"
                  elevation="4"
                  @click="addFeatureLayer">
                <v-img :style="{verticalAlign: 'middle'}" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>
      </template>
    </speed-dial>
  </v-sheet>
</template>

<script>
import { mapState } from 'vuex'
import values from 'lodash/values'
import keys from 'lodash/keys'
import isNil from 'lodash/isNil'
import TileLayer from './TileLayer.vue'
import FeatureLayer from './FeatureLayer.vue'
import GeoPackageDetails from './GeoPackageDetails.vue'
import GeoPackageLayerList from './GeoPackageLayerList.vue'
import AddFeatureLayer from './AddFeatureLayer.vue'
import AddTileLayer from './AddTileLayer.vue'
import EventBus from '../../lib/vue/EventBus'
import { addGeoPackage } from '../../lib/vue/vuex/CommonActions'
import {
  removeGeoPackage,
  renameGeoPackage,
  setActiveGeoPackageFeatureLayer,
  setGeoPackageLayersVisible
} from '../../lib/vue/vuex/ProjectActions'
import SpeedDial from '../Common/SpeedDial.vue'

export default {
  props: {
    geopackage: Object,
    project: Object,
    dark: {
      type: Boolean,
      default: false
    },
    allowNotifications: Boolean,
    back: Function,
    displayFeature: Object
  },
  components: {
    AddFeatureLayer,
    AddTileLayer,
    GeoPackageLayerList,
    GeoPackageDetails,
    FeatureLayer,
    TileLayer,
    SpeedDial
  },
  data () {
    return {
      fab: false,
      addFeatureLayerDialog: false,
      addTileLayerDialog: false,
      selectedLayer: null,
      selectedLayerNewName: null,
      detailDialog: false,
      renameDialog: false,
      renameValid: false,
      removeDialog: false,
      renamedGeoPackage: this.geopackage.name,
      renamedGeoPackageRules: [
        v => !!v || 'Name is required',
        v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name',
        v => !window.mapcache.fileExists(window.mapcache.pathJoin(window.mapcache.getDirectoryName(this.geopackage.path), v + '.gpkg')) || 'Name already exists'
      ],
      renaming: false,
      copyDialog: false,
      copyValid: false,
      copiedGeoPackage: this.geopackage.name + '_copy',
      copiedGeoPackageRules: [
        v => !!v || 'Name is required',
        v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name',
        v => !window.mapcache.fileExists(window.mapcache.pathJoin(window.mapcache.getDirectoryName(this.geopackage.path), v + '.gpkg')) || 'Name already exists'
      ],
      tables: { features: [], tiles: [] }
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
        const allTableKeys = values(this.geopackage.tables.features).concat(values(this.geopackage.tables.tiles))
        return (allTableKeys.filter(table => !table.visible).length === 0 && allTableKeys.length > 0) || false
      },
      set (value) {
        setGeoPackageLayersVisible(this.project.id, this.geopackage.id, value)
      }
    },
    size () {
      return window.mapcache.getGeoPackageFileSize(this.geopackage.path)
    },
    hasLayers () {
      return keys(this.geopackage.tables.features).concat(keys(this.geopackage.tables.tiles)).length > 0
    },
    projectFeatureLayerCount () {
      return keys(this.project.geopackages).reduce((accumulator, geopackage) => accumulator + keys(this.project.geopackages[geopackage].tables.features).length, 0) +
          values(this.project.sources).filter(source => source.pane === 'vector').length
    },
    projectTileLayerCount () {
      return keys(this.project.geopackages).reduce((accumulator, geopackage) => accumulator + keys(this.project.geopackages[geopackage].tables.tiles).length, 0) +
          values(this.project.sources).filter(source => source.pane === 'tile').length
    }
  },
  created () {
    this.updateTables()
  },
  methods: {
    updateTables () {
      return window.mapcache.getTables(this.geopackage.path).then(result => {
        if (isNil(result)) {
          return { features: [], tiles: [] }
        }
        return result
      })
    },
    exitRenamingDialog () {
      if (!this.renaming) {
        this.renameDialog = false
      }
    },
    rename () {
      this.renaming = true
      this.copiedGeoPackage = this.renamedGeoPackage + '_copy'
      renameGeoPackage(this.project.id, this.geopackage.id, this.renamedGeoPackage).then((success) => {
        if (success) {
          this.$nextTick(() => {
            this.renameDialog = false
            this.renaming = false
          })
        } else {
          this.$nextTick(() => {
            this.renameDialog = false
            this.renaming = false
            if (e.toString().toLowerCase().indexOf('ebusy') !== -1) {
              EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Rename failed. Please ensure all layers are disabled and wait for resource to become available.', 'warning')
            } else {
              EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Failed to rename GeoPackage')
            }
          })
        }
      })
    },
    copy () {
      this.copyDialog = false
      const oldPath = this.geopackage.path
      const newPath = window.mapcache.pathJoin(window.mapcache.getDirectoryName(oldPath), this.copiedGeoPackage + '.gpkg')
      try {
        window.mapcache.copyFile(oldPath, newPath).then(() => {
          addGeoPackage(this.project.id, newPath).then(added => {
            if (!added) {
              // eslint-disable-next-line no-console
              console.error('Failed to copy GeoPackage')
              EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Failed to copy GeoPackage')
            } else {
              EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage copied', 'primary')

            }
          })
        })
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to copy GeoPackage')
      }
    },
    remove () {
      this.removeDialog = false
      removeGeoPackage(this.project.id, this.geopackage.id)
      this.back()
    },
    layerSelected (layer) {
      this.selectedLayer = layer
      if (!isNil(this.geopackage.tables.features[layer])) {
        setActiveGeoPackageFeatureLayer(this.project.id, this.geopackage.id, layer)
      }
    },
    selectedLayerRenamed (layer) {
      if (!isNil(this.geopackage.tables.features[this.selectedLayer])) {
        setActiveGeoPackageFeatureLayer(this.project.id, this.geopackage.id, layer)
      }
      this.selectedLayerNewName = layer
    },
    deselectLayer () {
      this.selectedLayer = null
      setActiveGeoPackageFeatureLayer(this.project.id, this.geopackage.id, null)
    },
    addFeatureLayer () {
      this.fab = false
      this.addFeatureLayerDialog = true
    },
    async addTileLayer () {
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
      window.mapcache.showItemInFolder(this.geopackage.path)
    }
  },
  mounted () {
    if (this.displayFeature != null) {
      this.layerSelected(this.displayFeature.tableName)
    }
  },
  watch: {
    geopackage: {
      handler (newGeoPackage) {
        if (!isNil(this.selectedLayer) && (isNil(newGeoPackage.tables.features[this.selectedLayer]) && isNil(newGeoPackage.tables.tiles[this.selectedLayer]))) {
          this.$nextTick(() => {
            if (!isNil(this.selectedLayerNewName) && (!isNil(newGeoPackage.tables.features[this.selectedLayerNewName]) || !isNil(newGeoPackage.tables.tiles[this.selectedLayerNewName]))) {
              this.selectedLayer = this.selectedLayerNewName
              this.selectedLayerNewName = null
            } else {
              this.deselectLayer()
            }
          })
        }
      },
      deep: true
    },
    displayFeature: {
      handler (newDisplayFeature) {
        if (newDisplayFeature != null && newDisplayFeature.isGeoPackage) {
          if (this.geopackage == null || newDisplayFeature.id === this.geopackage.id) {
            this.$nextTick(() => {
              this.layerSelected(newDisplayFeature.tableName)
              this.hideAddFeatureDialog()
              this.hideAddTileDialog()
            })
          }
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
</style>
