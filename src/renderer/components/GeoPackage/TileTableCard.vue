<template>
  <expandable-card class="mb-2" :initially-expanded="geopackage.tables.tiles[tableName].expanded" :on-expand-collapse="expandFeatureTableCard">
    <div slot="card-header">
      <v-container fluid class="pa-0 ma-0">
        <v-row no-gutters align="center" justify="center">
          <v-col cols="8">
            <p :style="{fontSize: '1.15em', fontWeight: '700', marginBottom: '0px'}">
              {{tableName}}
            </p>
          </v-col>
          <v-col offset="2" cols="2" justify="center" @click.stop="">
            <v-switch
              class="v-label detail"
              color="#3b779a"
              hide-details
              v-model="visible"
              dense
            ></v-switch>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <div slot="card-expanded-body">
      <v-container fluid class="pa-0 ma-0">
        <v-dialog
          v-model="renameDialog"
          max-width="300">
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters>
                <v-col cols="2">
                  <v-icon>mdi-pencil-outline</v-icon>
                </v-col>
                <v-col>
                  Rename {{tableName}}
                </v-col>
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-form v-model="renameValid">
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
          max-width="300">
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters>
                <v-col cols="2">
                  <v-icon>mdi-content-copy</v-icon>
                </v-col>
                <v-col>
                  Copy {{tableName}}
                </v-col>
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-form v-model="copyValid">
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
          max-width="300">
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters>
                <v-col cols="2">
                  <v-icon>mdi-trash-can-outline</v-icon>
                </v-col>
                <v-col>
                  Remove {{tableName}}
                </v-col>
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
                color="#3b779a"
                text
                @click="deleteTable">
                remove
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-container fluid class="pa-0 ma-0 pl-1 text-left">
          <v-row no-gutters>
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
              <v-row no-gutters>
                <v-col>
                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    Tiles
                  </p>
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    {{tileCount}}
                  </p>
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-col>
                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    Zoom Levels
                  </p>
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    {{minZoom + ' - ' + maxZoom}}
                  </p>
                </v-col>
              </v-row>
              <v-row no-gutters>
                <v-col>
                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    Description
                  </p>
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    {{description}}
                  </p>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>
      </v-container>
    </div>
  </expandable-card>
</template>

<script>
  import { mapActions } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String
    },
    components: {
      ViewEditText,
      ExpandableCard
    },
    data () {
      return {
        deleteDialog: false,
        renameValid: false,
        renameDialog: false,
        renamedTable: this.tableName,
        renamedTableRules: [
          v => !!v || 'Name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name'
        ],
        copyDialog: false,
        copyValid: false,
        copiedTable: this.tableName + '_copy',
        copiedTableRules: [
          v => !!v || 'Name is required',
          v => /^[\w,\s-]+$/.test(v) || 'Name must be a valid file name'
        ]
      }
    },
    computed: {
      visible: {
        get () {
          return this.geopackage.tables.tiles[this.tableName].tableVisible || false
        },
        set (value) {
          this.setGeoPackageTileTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
        }
      },
      tileCount () {
        return this.geopackage.tables.tiles[this.tableName].tileCount
      },
      minZoom () {
        return this.geopackage.tables.tiles[this.tableName].minZoom
      },
      maxZoom () {
        return this.geopackage.tables.tiles[this.tableName].maxZoom
      },
      description () {
        return this.geopackage.tables.tiles[this.tableName].description
      }
    },
    methods: {
      ...mapActions({
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        expandCollapseTileTableCard: 'Projects/expandCollapseTileTableCard',
        setGeoPackageTileTableVisible: 'Projects/setGeoPackageTileTableVisible',
        renameGeoPackageTileTable: 'Projects/renameGeoPackageTileTable',
        copyGeoPackageTileTable: 'Projects/copyGeoPackageTileTable',
        deleteGeoPackageTileTable: 'Projects/deleteGeoPackageTileTable'
      }),
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      expandFeatureTableCard () {
        this.expandCollapseTileTableCard({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      rename () {
        this.renameDialog = false
        this.copiedTable = this.renamedTable + '_copy'
        this.renameGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, oldTableName: this.tableName, newTableName: this.renamedTable})
      },
      copy () {
        this.copyDialog = false
        this.copyGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, copyTableName: this.copiedTable})
      },
      deleteTable () {
        this.deleteDialog = false
        this.deleteGeoPackageTileTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      }
    }
  }
</script>

<style scoped>

</style>
