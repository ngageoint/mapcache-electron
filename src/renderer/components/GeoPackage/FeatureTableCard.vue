<template>
  <expandable-card class="mb-2" :initially-expanded="expanded" :on-expand-collapse="expandFeatureTableCard" expandedEmphasis>
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
          v-model="indexDialog"
          max-width="500"
          persistent>
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-speedometer</v-icon><span class="pl-1 pr-1">Indexing</span><b>{{tableName}}</b>
              </v-row>
            </v-card-title>
            <v-card-text>
              <v-row
                align-content="center"
                justify="center"
              >
                <v-col
                  class="subtitle-1 text-center"
                  cols="12"
                >
                  {{indexMessage}}
                </v-col>
                <v-col cols="6">
                  <v-progress-linear
                    color="#3b779a"
                    :value="indexProgressPercentage"
                    rounded
                    height="6"
                  ></v-progress-linear>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-dialog>
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
          max-width="500">
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-content-copy</v-icon>Copy {{tableName}}
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
          max-width="500">
          <v-card>
            <v-card-title style="color: grey; font-weight: 600;">
              <v-row no-gutters justify="start" align="center">
                <v-icon>mdi-trash-can-outline</v-icon>Remove {{tableName}}
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
        <v-container fluid class="pa-0 mb-2 ma-0 pl-1 text-left">
          <v-row no-gutters justify="center">
            <v-col>
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                <img :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
                <span>Feature Layer</span>
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters class="pt-2" style="margin-left: -12px" justify="center" align-content="center">
            <v-hover>
              <template v-slot="{ hover }">
                <v-card class="ma-0 mb-2 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="renameDialog = true">
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
                <v-card class="ma-0 mb-2 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="copyDialog = true">
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
                <v-card class="ma-0 mb-2 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="enableStyleDialog">
                  <v-card-text class="pa-2">
                    <v-row no-gutters align-content="center" justify="center">
                      <v-icon small>mdi-palette</v-icon>
                    </v-row>
                    <v-row no-gutters align-content="center" justify="center">
                      Style
                    </v-row>
                  </v-card-text>
                </v-card>
              </template>
            </v-hover>
            <v-hover>
              <template v-slot="{ hover }">
                <v-card class="ma-0 mb-2 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="deleteDialog = true">
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
            <v-hover v-if="!indexed" >
              <template v-slot="{ hover }">
                <v-card class="ma-0 mb-2 pa-0 ml-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="indexTable">
                  <v-card-text class="pa-2">
                    <v-row no-gutters align-content="center" justify="center">
                      <v-icon small>mdi-speedometer</v-icon>
                    </v-row>
                    <v-row no-gutters align-content="center" justify="center">
                      Index
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
                    Features
                  </p>
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    {{featureCount}}
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
  import { GeoPackageAPI } from '@ngageoint/geopackage'
  import _ from 'lodash'

  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import StyleEditor from './StyleEditor'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'

  const GPKG_INDEX_REGEX = new RegExp(/Indexing (\d*) to \d*/)

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String
    },
    components: {
      ViewEditText,
      ExpandableCard,
      StyleEditor
    },
    created () {
      let _this = this
      this.loading = true
      this.styleExtensionEnabled().then(function (hasStyleExtension) {
        _this.hasStyleExtension = hasStyleExtension
        _this.loading = false
      })
    },
    data () {
      return {
        GPKG_INDEX_REGEX,
        indexDialog: false,
        indexProgressPercentage: 0,
        indexMessage: 'Indexing Started',
        loading: true,
        hasStyleExtension: false,
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
          return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].tableVisible : false
        },
        set (value) {
          this.setGeoPackageFeatureTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
        }
      },
      indexed () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].indexed : true
      },
      featureCount () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].featureCount : 0
      },
      description () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].description : ''
      },
      expanded () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].expanded : false
      },
      styleKey () {
        return this.geopackage.tables.features[this.tableName] ? this.geopackage.tables.features[this.tableName].styleKey : 0
      }
    },
    methods: {
      ...mapActions({
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        expandCollapseFeatureTableCard: 'Projects/expandCollapseFeatureTableCard',
        setGeoPackageFeatureTableVisible: 'Projects/setGeoPackageFeatureTableVisible',
        renameGeoPackageFeatureTable: 'Projects/renameGeoPackageFeatureTable',
        copyGeoPackageFeatureTable: 'Projects/copyGeoPackageFeatureTable',
        deleteGeoPackageFeatureTable: 'Projects/deleteGeoPackageFeatureTable',
        displayStyleEditor: 'Projects/displayStyleEditor',
        updateFeatureTable: 'Projects/updateFeatureTable'
      }),
      enableStyleDialog () {
        this.displayStyleEditor({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      async styleExtensionEnabled () {
        let hasStyle = false
        let gp = await GeoPackageAPI.open(this.geopackage.path)
        try {
          hasStyle = gp.featureStyleExtension.has(this.tableName)
        } catch (error) {
          console.error(error)
        }
        try {
          gp.close()
        } catch (error) {
          console.error(error)
        }
        return hasStyle
      },
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      expandFeatureTableCard () {
        this.expandCollapseFeatureTableCard({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      rename () {
        this.renameDialog = false
        this.copiedTable = this.renamedTable + '_copy'
        this.renameGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, oldTableName: this.tableName, newTableName: this.renamedTable})
      },
      copy () {
        this.copyDialog = false
        this.copyGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, copyTableName: this.copiedTable})
      },
      deleteTable () {
        this.deleteDialog = false
        this.deleteGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      indexTable () {
        let _this = this
        this.indexDialog = true
        setTimeout(function () {
          _this.indexMessage = 'Indexing...'
          GeoPackageUtilities.indexFeatureTable(_this.geopackage.path, _this.tableName, true, function (message) {
            // 'Indexing ' + # + ' to ' + #)
            if (!_.isNil(message)) {
              try {
                _this.indexProgressPercentage = ((Number.parseInt(message.match(_this.GPKG_INDEX_REGEX)[1], 10) * 1.0) / (_this.featureCount * 1.0)) * 100.0
              } catch (e) {
                console.error(e)
              }
            }
          }).then(function (result) {
            console.log(result)
            setTimeout(function () {
              _this.indexProgressPercentage = 100.0
              _this.indexMessage = 'Indexing Completed'
              setTimeout(function () {
                _this.indexDialog = false
                _this.indexMessage = 'Indexing Started'
                _this.updateFeatureTable({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: _this.tableName})
              }, 1000)
            }, 1000)
          })
        }, 1000)
      }
    },
    watch: {
      styleKey: {
        async handler (styleKey, oldValue) {
          if (styleKey !== oldValue) {
            let _this = this
            _this.loading = true
            this.styleExtensionEnabled().then(function (hasStyleExtension) {
              _this.hasStyleExtension = hasStyleExtension
              _this.loading = false
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
