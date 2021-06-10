<template>
  <v-sheet class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title :title="column.name">{{column.name}}</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content detail-bg">
      <v-dialog
        v-model="renameDialog"
        max-width="400"
        persistent
        @keydown.esc="renameDialog = false">
        <v-card v-if="renameDialog">
          <v-card-title>
            <v-icon color="primary" class="pr-2">{{mdiPencil}}</v-icon>
            Rename field
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                      autofocus
                      v-model="renamedColumn"
                      :rules="renamedColumnRules"
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
        v-model="deleteDialog"
        max-width="400"
        persistent
        @keydown.esc="deleteDialog = false">
        <v-card v-if="deleteDialog">
          <v-card-title>
            <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
            Delete field
          </v-card-title>
          <v-card-text>
            Deleting the <b>{{column.name}}</b> field will also delete the value tied to this field, for each feature. Are you sure you want to delete the <b>{{column.name}}</b> field from the <b>{{tableName}}</b> feature layer? This action can't be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              text
              @click="deleteDialog = false">
              Cancel
            </v-btn>
            <v-btn
              color="warning"
              text
              @click="deleteField">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters class="pl-3 pt-3 pr-3 background" justify="start" align="center">
        <v-col>
          <p class="text-subtitle-1">
            <v-icon color="primary" class="mr-1" :style="{width: '36px', height: '36px'}">{{column.icon}}</v-icon>
            <span style="vertical-align: middle;">Feature Layer Field</span>
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
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
          <v-row no-gutters justify="space-between">
            <v-col style="margin-top: 8px;">
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                GeoPackage
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{geopackage.name}}
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters justify="space-between">
            <v-col style="margin-top: 8px;">
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Feature Layer
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{tableName}}
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters justify="space-between">
            <v-col style="margin-top: 8px;">
              <p class="detail--text" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Field Type
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                {{column.type}}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
  </v-sheet>
</template>

<script>
import {mdiChevronLeft, mdiPencil, mdiTrashCan} from '@mdi/js'

export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String,
      column: Object,
      columnNames: Array,
      back: Function,
      renamed: Function
    },
    data () {
      return {
        mdiChevronLeft: mdiChevronLeft,
        mdiPencil: mdiPencil,
        mdiTrashCan: mdiTrashCan,
        deleteDialog: false,
        renameValid: false,
        renameDialog: false,
        renamedColumn: this.column.name,
        renamedColumnRules: [
          v => !!v || 'Field name is required',
          v => this.columnNames.map(name => name.toLowerCase()).indexOf(v.toLowerCase()) === -1 || 'Field name must be unique'
        ]
      }
    },
    methods: {
      rename () {
        this.renameDialog = false
        window.mapcache.renameGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, oldColumnName: this.column.name, newColumnName: this.renamedColumn})
        this.renamed(this.renamedColumn)
      },
      deleteField () {
        this.deleteDialog = false
        window.mapcache.deleteGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, columnName: this.column.name})
        this.back()
      },
      showRenameDialog () {
        this.renameValid = false
        this.renameDialog = true
        this.$nextTick(() => {
          this.$refs.renameForm.validate()
        })
      }
    }
  }
</script>

<style scoped>

</style>
