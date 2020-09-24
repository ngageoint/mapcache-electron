<template>
  <div style="background-color: white">
    <v-toolbar
      color="#3b779a"
      dark
      flat
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>{{tableName}}</v-toolbar-title>
    </v-toolbar>
    <v-container fluid>
      <v-dialog
        v-model="renameDialog"
        max-width="500">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              <v-icon>mdi-pencil-outline</v-icon>Rename {{tableName}}
            </v-row>
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
              <v-icon>mdi-content-copy</v-icon>Copy {{tableName}}
            </v-row>
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="copyForm" v-model="copyValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
        v-model="deleteDialog"
        max-width="500">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              <v-icon>mdi-trash-can-outline</v-icon>Delete {{tableName}}
            </v-row>
          </v-card-title>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="#3b779a"
              text
              @click="deleteDialog = false">
              cancel
            </v-btn>
            <v-btn
              color="#ff4444"
              text
              @click="deleteTable">
              remove
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters class="mb-2">
        <v-col>
          <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            <img :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Tile Layer" width="24px" height="20px">
            <span>Tile Layer</span>
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters class="pt-2" justify="center" align-content="center">
        <v-hover>
          <template v-slot="{ hover }">
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showRenameDialog">
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="showCopyDialog">
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
            <v-card class="ma-0 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
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
      <v-row no-gutters class="detail-bg detail-section-margins-and-padding">
        <v-col>
          <v-row no-gutters justify="space-between">
            <v-col style="margin-top: 8px;">
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Tiles
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                {{tileCount}}
              </p>
            </v-col>
            <v-col>
              <v-row no-gutters justify="end" align="center">
                <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                  Enable
                </p>
                <v-switch class="ml-2" :style="{marginTop: '-4px'}" dense v-model="visible" hide-details></v-switch>
                <v-btn text icon title="Zoom To" @click.stop="zoomToLayer"><v-icon>mdi-magnify</v-icon></v-btn>
              </v-row>
            </v-col>
          </v-row>
          <v-row no-gutters>
            <v-col>
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Zoom Levels
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                {{minZoom + ' - ' + maxZoom}}
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters>
            <v-col>
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Description
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                {{description}}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
    <v-snackbar
      v-model="copySnackBar"
    >
      Layer copied.
      <template v-slot:action="{ attrs }">
        <v-btn
          color="#3b779a"
          text
          v-bind="attrs"
          @click="copySnackBar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
  import Vue from 'vue'
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import ViewEditText from '../Common/ViewEditText'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String,
      back: Function,
      renamed: Function
    },
    components: {
      ViewEditText
    },
    data () {
      return {
        deleteDialog: false,
        copySnackBar: false,
        renameValid: false,
        renameDialog: false,
        renamedTable: this.tableName,
        renamedTableRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ],
        copyDialog: false,
        copyValid: false,
        copiedTable: this.tableName + '_copy',
        copiedTableRules: [
          v => !!v || 'Layer name is required',
          v => Object.keys(this.geopackage.tables.features).concat(Object.keys(this.geopackage.tables.tiles)).indexOf(v) === -1 || 'Layer name must be unique'
        ]
      }
    },
    computed: {
      visible: {
        get () {
          return !_.isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].visible : false
        },
        set (value) {
          this.setGeoPackageTileTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
        }
      },
      tileCount () {
        return !_.isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].tileCount : 0
      },
      minZoom () {
        return !_.isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].minZoom : 0
      },
      maxZoom () {
        return !_.isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].maxZoom : 0
      },
      description () {
        return !_.isNil(this.geopackage.tables.tiles[this.tableName]) ? this.geopackage.tables.tiles[this.tableName].description : ''
      }
    },
    methods: {
      ...mapActions({
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        setGeoPackageTileTableVisible: 'Projects/setGeoPackageTileTableVisible',
        renameGeoPackageTileTable: 'Projects/renameGeoPackageTileTable',
        copyGeoPackageTileTable: 'Projects/copyGeoPackageTileTable',
        deleteGeoPackageTileTable: 'Projects/deleteGeoPackageTileTable',
        zoomToExtent: 'Projects/zoomToExtent'
      }),
      rename () {
        this.renameDialog = false
        this.copiedTable = this.renamedTable + '_copy'
        this.renameGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, oldTableName: this.tableName, newTableName: this.renamedTable})
        this.renamed(this.renamedTable)
      },
      copy () {
        this.copyDialog = false
        this.copyGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, copyTableName: this.copiedTable})
        this.copySnackBar = true
      },
      deleteTable () {
        this.deleteDialog = false
        this.deleteGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      showRenameDialog () {
        this.renameValid = false
        this.renameDialog = true
        Vue.nextTick(() => {
          this.$refs.renameForm.validate()
        })
      },
      showCopyDialog () {
        this.copyValid = false
        this.copyDialog = true
        Vue.nextTick(() => {
          this.$refs.copyForm.validate()
        })
      },
      async zoomToLayer () {
        const extent = await GeoPackageUtilities.getBoundingBoxForTable(this.geopackage.path, this.tableName)
        this.zoomToExtent({projectId: this.projectId, extent})
      }
    }
  }
</script>

<style scoped>

</style>
