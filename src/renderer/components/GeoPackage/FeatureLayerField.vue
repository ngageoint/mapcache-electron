<template>
  <v-sheet>
    <v-toolbar
      color="primary"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title :title="column.name">{{column.name}}</v-toolbar-title>
    </v-toolbar>
    <v-container fluid>
      <v-dialog
        v-model="renameDialog"
        max-width="500"
        persistent>
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              <v-icon>mdi-pencil-outline</v-icon>Rename {{column.name}}
            </v-row>
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent ref="renameForm" v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
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
        max-width="500"
        persistent>
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              <v-icon>mdi-trash-can-outline</v-icon>Remove {{column.name}}
            </v-row>
          </v-card-title>
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
              Remove
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row no-gutters justify="center" class="mb-2">
        <v-col>
          <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
            <span>Feature Layer Field</span>
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
            <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
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
                GeoPackage
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                {{geopackage.name}}
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters justify="space-between">
            <v-col style="margin-top: 8px;">
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Feature Layer
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                {{tableName}}
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters justify="space-between">
            <v-col style="margin-top: 8px;">
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                Field Type
              </p>
              <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                {{column.type}}
              </p>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script>
  import Vue from 'vue'
  import { mapActions } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'

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
    components: {
      ViewEditText
    },
    data () {
      return {
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
      ...mapActions({
        renameGeoPackageFeatureTableColumn: 'Projects/renameGeoPackageFeatureTableColumn',
        deleteGeoPackageFeatureTableColumn: 'Projects/deleteGeoPackageFeatureTableColumn'
      }),
      rename () {
        this.renameDialog = false
        this.renameGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, oldColumnName: this.column.name, newColumnName: this.renamedColumn})
        this.renamed(this.renamedColumn)
      },
      deleteField () {
        this.deleteDialog = false
        this.deleteGeoPackageFeatureTableColumn({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, columnName: this.column.name})
        this.back()
      },
      showRenameDialog () {
        this.renameValid = false
        this.renameDialog = true
        Vue.nextTick(() => {
          this.$refs.renameForm.validate()
        })
      }
    }
  }
</script>

<style scoped>

</style>
