<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
      <v-toolbar-title :title="tableName">{{ tableName }}</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-dialog
          v-model="renameDialog"
          max-width="400"
          persistent
          @keydown.esc="closeRenameDialog">
        <v-card v-if="renameDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2" icon="mdi-pencil"/>
            Rename tile layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent="() => {}" ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                        variant="underlined"
                        autofocus
                        v-model="renamedTable"
                        :rules="renamedTableRules"
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
          @keydown.esc="closeCopyDialog">
        <v-card v-if="copyDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2" icon="mdi-content-copy"/>
            Copy tile layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent="() => {}" ref="copyForm" v-model="copyValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                        variant="underlined"
                        autofocus
                        v-model="copiedTable"
                        :rules="copiedTableRules"
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
                :disabled="copying"
                variant="text"
                @click="copyDialog = false">
              Cancel
            </v-btn>
            <v-btn
                :loading="copying"
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
          v-model="deleteDialog"
          max-width="400"
          persistent
          @keydown.esc="closeDeleteDialog">
        <v-card v-if="deleteDialog">
          <v-card-title>
            <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
            Delete tile layer
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete the <b>{{ tableName }}</b> tile layer from the <b>{{ geopackage.name }}</b>
            GeoPackage? This action can't be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
                :disabled="deleting"
                variant="text"
                @click="deleteDialog = false">
              Cancel
            </v-btn>
            <v-btn
                :loading="deleting"
                color="warning"
                variant="text"
                @click="deleteTable">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters class="pl-3 pt-3 pr-3 background">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn variant="text" icon @click="zoomToLayer" color="whitesmoke">
              <v-img v-if="dark" src="/images/white_layers.png" alt="Feature layer" width="20px" height="20px"/>
              <v-img v-else src="/images/colored_layers.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
            <span class="ml-2" style="vertical-align: middle;">Tile layer</span>
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1"
                    @click.stop="showRenameDialog">
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
                    @click.stop="showCopyDialog">
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
                    @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small icon="mdi-trash-can"/>
                </v-row>
                <v-row no-gutters align-content="center" justify="center">
                  Delete
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-hover>
      </v-row>
      <v-row no-gutters class="pl-6 pr-6 pt-3 detail-bg">
        <v-col>
          <v-row class="pb-2" no-gutters justify="space-between">
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                GeoPackage
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ geopackage.name }}
              </p>
            </v-col>
            <v-spacer/>
            <v-col cols="4" style="margin-right: -23px;">
              <v-switch color="primary" :style="{marginTop: '-16px'}" density="compact" v-model="visible" hide-details>
                <template v-slot:prepend>
                  <span class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginTop: '2px !important'}">Enable</span>
                </template>
              </v-switch>
            </v-col>

          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Tiles
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ tileCount }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Zoom levels
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ minZoom + ' - ' + maxZoom }}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Description
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{ description }}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import isNil from 'lodash/isNil'
import { zoomToGeoPackageTable } from '../../lib/leaflet/map/ZoomUtilities'
import EventBus from '../../lib/vue/EventBus'
import {
  copyGeoPackageTable, deleteGeoPackageTable,
  renameGeoPackageTable,
  setGeoPackageTileTableVisible
} from '../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    project: Object,
    dark: {
      type: Boolean,
      default: false
    },
    geopackage: Object,
    tableName: String,
    back: Function,
    renamed: Function
  },
  data () {
    return {
      deleteDialog: false,
      renameValid: false,
      renameDialog: false,
      renaming: false,
      deleting: false,
      copying: false,
      renamedTable: this.tableName,
      renamedTableRules: [
        v => !!v || 'Layer name is required',
        v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name already exists'
      ],
      copyDialog: false,
      copyValid: false,
      copiedTable: this.tableName + '_copy',
      copiedTableRules: [
        v => !!v || 'Layer name is required',
        v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name already exists'
      ]
    }
  },
  computed: {
    visible: {
      get () {
        return !isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].visible : false
      },
      set (value) {
        setGeoPackageTileTableVisible(this.project.id, this.geopackage.id, this.tableName, value)
      }
    },
    tileCount () {
      return !isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].tileCount : 0
    },
    minZoom () {
      return !isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].minZoom : 0
    },
    maxZoom () {
      return !isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].maxZoom : 0
    },
    description () {
      return !isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].description : ''
    }
  },
  methods: {
    closeRenameDialog () {
      if (!this.renaming) {
        this.renameDialog = false
      }
    },
    closeDeleteDialog () {
      if (!this.deleting) {
        this.deleteDialog = false
      }
    },
    closeCopyDialog () {
      if (!this.copying) {
        this.copyDialog = false
      }
    },
    rename () {
      this.renamed(this.renamedTable)
      this.copiedTable = this.renamedTable + '_copy'
      this.renaming = true
      renameGeoPackageTable(this.project.id, this.geopackage.id, this.geopackage.path, this.tableName, this.renamedTable, 'tile').then(() => {
        this.renaming = false
        this.$nextTick(() => {
          this.renameDialog = false
        })
      })
    },
    copy () {
      this.copying = true
      copyGeoPackageTable(this.project.id, this.geopackage.id, this.geopackage.path, this.tableName, this.copiedTable, 'tile').then(() => {
        this.$nextTick(() => {
          EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Tile layer copied', 'primary')
        })
      }).finally(() => {
        this.copying = false
        this.copyDialog = false
      })
    },
    deleteTable () {
      this.deleting = true
      deleteGeoPackageTable(this.project.id, this.geopackage.id, this.geopackage.path, this.tableName, 'tile').then(() => {
        this.deleting = false
        this.$nextTick(() => {
          this.deleteDialog = false
        })
      })
    },
    showRenameDialog () {
      this.renameValid = false
      this.renameDialog = true
      this.$nextTick(() => {
        this.$refs.renameForm.validate()
      })
    },
    showCopyDialog () {
      this.copyValid = false
      this.copyDialog = true
      this.$nextTick(() => {
        this.$refs.copyForm.validate()
      })
    },
    zoomToLayer () {
      zoomToGeoPackageTable(this.geopackage, this.tableName)
    }
  }
}
</script>

<style scoped>

</style>
