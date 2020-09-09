<template>
  <expandable-card class="mb-2" :initially-expanded="geopackage.tables.features[tableName].expanded" :on-expand-collapse="expandFeatureTableCard">
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
          v-model="styleDialog"
          max-width="450">
          <v-card>
            <v-card-title style="font-size: 18px !important; color: black; font-weight: 500;">
              <v-row no-gutters>
                <v-col>
                  "{{tableName}}" Style Editor
                </v-col>
              </v-row>
            </v-card-title>
            <v-card-text>
              <style-editor :tableName="tableName" :filePath="geopackage.path" :projectId="projectId" :geopackage="geopackage" :style-key="geopackage.styleKey"/>
            </v-card-text>
            <v-card-actions>
              <v-spacer/>
              <v-btn v-if="!loading && !hasStyleExtension" text dark color="#73c1c5" @click.stop="addStyleExtensionAndDefaultStyles()">
                <v-icon>mdi-palette</v-icon> Enable Styling
              </v-btn>
              <v-btn v-if="!loading && hasStyleExtension" text dark color="#ff4444" @click.stop="removeStyleExtensionAndTableStyles()">
                <v-icon>mdi-trash-can</v-icon> Remove Styling
              </v-btn>
              <v-btn
                color="#3b779a"
                text
                @click="closeStyleEditor">
                close
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
                <img :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px">
                <span>Feature Layer</span>
              </p>
            </v-col>
          </v-row>
          <v-row no-gutters class="pt-2" style="margin-left: -12px" justify="center" align-content="center">
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
                <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="styleDialog = true">
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
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import StyleEditor from './StyleEditor'
  import { GeoPackageAPI } from '@ngageoint/geopackage'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String,
      styleKey: Number
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
        loading: true,
        hasStyleExtension: false,
        deleteDialog: false,
        styleDialog: false,
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
          return this.geopackage.tables.features[this.tableName].tableVisible || false
        },
        set (value) {
          this.setGeoPackageFeatureTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
        }
      },
      featureCount () {
        return this.geopackage.tables.features[this.tableName].featureCount
      },
      description () {
        return this.geopackage.tables.features[this.tableName].description
      }
    },
    methods: {
      ...mapActions({
        addStyleExtensionAndDefaultStylesForTable: 'Projects/addStyleExtensionAndDefaultStylesForTable',
        removeStyleExtensionForTable: 'Projects/removeStyleExtensionForTable',
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        expandCollapseFeatureTableCard: 'Projects/expandCollapseFeatureTableCard',
        setGeoPackageFeatureTableVisible: 'Projects/setGeoPackageFeatureTableVisible',
        renameGeoPackageFeatureTable: 'Projects/renameGeoPackageFeatureTable',
        copyGeoPackageFeatureTable: 'Projects/copyGeoPackageFeatureTable',
        deleteGeoPackageFeatureTable: 'Projects/deleteGeoPackageFeatureTable'
      }),
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
      closeStyleEditor () {
        this.styleDialog = false
      },
      deleteTable () {
        this.deleteDialog = false
        this.deleteGeoPackageFeatureTable({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName})
      },
      addStyleExtensionAndDefaultStyles () {
        this.addStyleExtensionAndDefaultStylesForTable({
          projectId: this.projectId,
          geopackageId: this.geopackage.id,
          tableName: this.tableName
        })
      },
      removeStyleExtensionAndTableStyles () {
        this.removeStyleExtensionForTable({
          projectId: this.projectId,
          geopackageId: this.geopackage.id,
          tableName: this.tableName
        })
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
