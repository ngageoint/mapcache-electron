<template>
  <expandable-card class="mb-2" :initially-expanded="geopackage.expanded" :on-expand-collapse="expandGeoPackage">
    <div slot="card-header">
      <v-container fluid class="pa-0 ma-0 text-left">
        <v-row no-gutters>
          <v-col>
            <p class="header" :style="{fontSize: '22px', fontWeight: '700', marginBottom: '0px'}">
              {{name}}
            </p>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <div slot="card-expanded-body">
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
        max-width="300">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters>
              <v-col cols="2">
                <v-icon>mdi-pencil-outline</v-icon>
              </v-col>
              <v-col>
                Rename {{geopackage.name}}
              </v-col>
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
        max-width="300">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters>
              <v-col cols="2">
                <v-icon>mdi-content-copy</v-icon>
              </v-col>
              <v-col>
                Copy {{geopackage.name}}
              </v-col>
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
        max-width="300">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters>
              <v-col cols="2">
                <v-icon>mdi-trash-can-outline</v-icon>
              </v-col>
              <v-col>
                Remove {{geopackage.name}}
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
              color="#3b779a"
              text
              @click="remove">
              remove
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-container fluid class="pa-0 ma-0 pl-1 text-left">
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
        <v-row no-gutters align="center" justify="center" class="mt-2 mb-2">
          <v-col cols="4">
            <p class="header" :style="{fontSize: '16px', fontWeight: '700', marginBottom: '0px'}">
              {{"Layers"}}
            </p>
          </v-col>
          <v-col offset="4" cols="4" justify="center">
            <v-switch
              class="v-label detail"
              hide-details
              color="#3b779a"
              v-model="layersVisible"
              label="Enable all"
              dense
            ></v-switch>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <feature-table-card
              v-for="featureTable in tables.features"
              :key="geopackage.id + '_' + featureTable"
              :table-name="featureTable"
              :geopackage="geopackage"
              :projectId="projectId"/>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <tile-table-card
              v-for="tileTable in tables.tiles"
              :key="geopackage.id + '_' + tileTable"
              :table-name="tileTable"
              :geopackage="geopackage"
              :projectId="projectId"/>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </expandable-card>
</template>

<script>
  import { mapActions, mapState } from 'vuex'
  import _ from 'lodash'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import TileTableCard from './TileTableCard'
  import FeatureTableCard from './FeatureTableCard'
  import GeoPackageUtilities from './../../../lib/GeoPackageUtilities'
  import GeoPackageDetails from './GeoPackageDetails'

  export default {
    props: {
      geopackage: Object,
      projectId: String
    },
    components: {
      GeoPackageDetails,
      TileTableCard,
      ViewEditText,
      ExpandableCard,
      FeatureTableCard
    },
    data () {
      return {
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
          return this.geopackage.layersVisible || false
        },
        set (value) {
          this.setGeoPackageLayersVisible({projectId: this.projectId, geopackageId: this.geopackage.id, visible: value})
        }
      },
      size () {
        return GeoPackageUtilities.getGeoPackageFileSize(this.geopackage.path)
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
        default: {features: [], tiles: [], attributes: []}
      }
    },
    methods: {
      ...mapActions({
        removeGeoPackage: 'Projects/removeGeoPackage',
        expandCollapseGeoPackage: 'Projects/expandCollapseGeoPackage',
        setGeoPackageLayersVisible: 'Projects/setGeoPackageLayersVisible',
        renameGeoPackage: 'Projects/renameGeoPackage',
        copyGeoPackage: 'Projects/copyGeoPackage'
      }),
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      expandGeoPackage () {
        this.expandCollapseGeoPackage({projectId: this.projectId, geopackageId: this.geopackage.id})
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
      }
    }
  }
</script>

<style scoped>
</style>
