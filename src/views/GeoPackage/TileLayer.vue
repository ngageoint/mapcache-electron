<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title :title="tableName">{{tableName}}</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-alert
        class="alert-position"
        v-model="showCopiedAlert"
        dismissible
        type="success"
      >Layer copied.</v-alert>
      <v-dialog
        v-model="renameDialog"
        max-width="400"
        persistent
        @keydown.esc="renameDialog = false">
        <v-card v-if="renameDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2">{{mdiPencil}}</v-icon>
            Rename tile layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
            <v-icon color="primary" class="pr-2">{{mdiContentCopy}}</v-icon>
            Copy tile layer
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="copyForm" v-model="copyValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
        v-model="deleteDialog"
        max-width="400"
        persistent
        @keydown.esc="deleteDialog = false">
        <v-card v-if="deleteDialog">
          <v-card-title>
            <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
            Delete tile layer
          </v-card-title>
          <v-card-text>
            Are you sure you want to delete the <b>{{tableName}}</b> tile layer from the <b>{{geopackage.name}}</b> GeoPackage? This action can't be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="deleteDialog = false">
              Cancel
            </v-btn>
            <v-btn
              color="warning"
              text
              @click="deleteTable">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters class="pl-3 pt-3 pr-3 background">
        <v-col>
          <p class="text-subtitle-1">
            <v-btn icon @click="zoomToLayer" color="whitesmoke">
              <img v-if="$vuetify.theme.dark" src="/images/white_layers.png" alt="Feature layer" width="20px" height="20px"/>
              <img v-else src="/images/colored_layers.png" alt="Feature layer" width="20px" height="20px"/>
            </v-btn>
            <span style="vertical-align: middle;">Tile layer</span>
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-3 pb-3 pr-3 background" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showRenameDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiPencil}}</v-icon>
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showCopyDialog">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiContentCopy}}</v-icon>
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
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
              <v-card-text class="pa-2">
                <v-row no-gutters align-content="center" justify="center">
                  <v-icon small>{{mdiTrashCan}}</v-icon>
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
                {{geopackage.name}}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end">
                <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Enable
                </p>
                <v-switch color="primary" class="ml-2" :style="{marginTop: '-4px'}" dense v-model="visible" hide-details></v-switch>
              </v-row>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Tiles
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{tileCount}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Zoom levels
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{minZoom + ' - ' + maxZoom}}
              </p>
            </v-col>
          </v-row>
          <v-row class="pb-2" no-gutters>
            <v-col>
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Description
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{description}}
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
import {mdiChevronLeft, mdiContentCopy, mdiPalette, mdiPencil, mdiTrashCan} from '@mdi/js'
import {zoomToGeoPackageTable} from '../../lib/leaflet/map/ZoomUtilities'

export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String,
      back: Function,
      renamed: Function
    },
    data () {
      return {
        mdiChevronLeft: mdiChevronLeft,
        mdiPencil: mdiPencil,
        mdiContentCopy: mdiContentCopy,
        mdiTrashCan: mdiTrashCan,
        mdiPalette: mdiPalette,
        deleteDialog: false,
        showCopiedAlert: false,
        renameValid: false,
        renameDialog: false,
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
          window.mapcache.setGeoPackageTileTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
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
      rename () {
        this.renamed(this.renamedTable)
        this.copiedTable = this.renamedTable + '_copy'
        window.mapcache.renameGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, oldTableName: this.tableName, newTableName: this.renamedTable})
        this.$nextTick(() => {
          this.renameDialog = false
        })
      },
      copy () {
        this.copyDialog = false
        window.mapcache.copyGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, copyTableName: this.copiedTable})
        this.showCopiedAlert = true
      },
      deleteTable () {
        this.deleteDialog = false
        window.mapcache.deleteGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
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
