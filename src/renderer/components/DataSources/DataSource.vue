<template>
  <div style="background-color: white;">
    <div v-if="styleEditorVisible">
      <div v-if="source.pane === 'vector'">
        <style-editor
          :tableName="source.sourceLayerName"
          :projectId="projectId"
          :id="source.id"
          :path="source.geopackageFilePath"
          :style-key="source.styleKey"
          :back="hideStyleEditor"
          :style-assignment="source.styleAssignment"
          :table-style-assignment="source.tableStyleAssignment"
          :icon-assignment="source.iconAssignment"
          :table-icon-assignment="source.tableIconAssignment"
          :is-geo-package="false"/>
      </div>
      <div v-if="source.layerType === 'GeoTIFF'">
        <geotiff-options :source="source" :projectId="projectId" :back="hideStyleEditor"></geotiff-options>
      </div>
    </div>
    <div v-else>
      <v-toolbar
        color="#3b779a"
        dark
        flat
        class="sticky-toolbar"
      >
        <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
        <v-toolbar-title>{{initialDisplayName}}</v-toolbar-title>
      </v-toolbar>
      <v-dialog
        v-model="renameDialog"
        max-width="500"
        persistent>
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              <v-icon>mdi-pencil-outline</v-icon>Rename {{initialDisplayName}}
            </v-row>
          </v-card-title>
          <v-card-text>
            <v-form v-on:submit.prevent v-model="renameValid">
              <v-container class="ma-0 pa-0">
                <v-row no-gutters>
                  <v-col cols="12">
                    <v-text-field
                      v-model="renamedSource"
                      :rules="renamedSourceRules"
                      label="Data source name"
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
              @click="saveLayerName">
              rename
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
              <v-col>
                <v-icon>mdi-trash-can-outline</v-icon>Remove {{initialDisplayName}}
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
              color="#ff4444"
              text
              @click="removeDataSource({projectId: projectId, sourceId: source.id})">
              remove
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <div class="layer-body">
        <v-container fluid class="text-left">
          <v-row no-gutters>
            <v-col>
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                <img v-if="source.pane === 'vector'" :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Data Source" width="20px" height="20px">
                <img v-if="source.pane === 'tile'" :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Tile Data Source" width="20px" height="20px">
                <span>{{source.pane === 'vector' ? 'Feature' : 'Tile'}} Data Source</span>
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
                <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1" @click.stop="styleEditorVisible = true">
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
              <v-row no-gutters justify="space-between">
                <v-col style="margin-top: 8px;">
                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    Data Source Type
                  </p>
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                    {{source.pane === 'vector' ? source.sourceType : source.layerType}}
                  </p>
                </v-col>
                <v-col>
                  <v-row no-gutters justify="end" align="center">
                    <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                      Enable
                    </p>
                    <v-switch class="ml-2" :style="{marginTop: '-4px'}" dense v-model="visible" hide-details></v-switch>
                    <v-btn text icon title="Zoom To" @click.stop="zoomToSource"><v-icon>mdi-magnify</v-icon></v-btn>
                  </v-row>
                </v-col>
              </v-row>
              <v-row no-gutters v-if="source.pane === 'vector'">
                <v-col>
                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                    Features
                  </p>
                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px', color: 'black'}">
                    {{source.count}}
                  </p>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>
        <!--        <expandable-card class="mb-2">-->
        <!--          <div slot="card-header">-->
        <!--            <div class="title-card">-->
        <!--              Style Options-->
        <!--            </div>-->
        <!--          </div>-->
        <!--          <div slot="card-expanded-body">-->
        <!--            <geotiff-options v-if="layer.layerType === 'GeoTIFF'" :layer="layer" :projectId="projectId"></geotiff-options>-->
        <!--          </div>-->
        <!--        </expandable-card>-->
      </div>
    </div>

  </div>
</template>

<script>
  import { mapActions, mapState } from 'vuex'
  import _ from 'lodash'
  import BoundsUi from './BoundsUi'
  import GeotiffOptions from './GeotiffOptions'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import StyleEditor from '../GeoPackage/StyleEditor'

  export default {
    props: {
      source: {
        type: Object,
        default: {
          name: ''
        }
      },
      zIndex: Number,
      projectId: String,
      back: Function
    },
    components: {
      BoundsUi,
      GeotiffOptions,
      ViewEditText,
      ExpandableCard,
      StyleEditor
    },
    computed: {
      ...mapState({
        initialDisplayName () {
          return _.isNil(this.source.displayName) ? this.source.name : this.source.displayName
        }
      }),
      visible: {
        get () {
          return this.source ? this.source.visible : false
        },
        set () {
          this.setDataSourceVisible({projectId: this.projectId, sourceId: this.source.id, visible: !this.source.visible})
        }
      }
    },
    data () {
      return {
        styleEditorVisible: false,
        renameDialog: false,
        renameValid: false,
        deleteDialog: false,
        renamedSource: _.isNil(this.source.displayName) ? this.source.name : this.source.displayName,
        renamedSourceRules: [
          v => !!v || 'Name is required'
        ]
      }
    },
    methods: {
      ...mapActions({
        setDataSourceDisplayName: 'Projects/setDataSourceDisplayName',
        removeDataSource: 'Projects/removeDataSource',
        setDataSourceVisible: 'Projects/setDataSourceVisible',
        zoomToExtent: 'Projects/zoomToExtent'
      }),
      saveLayerName () {
        this.renameDialog = false
        this.setDataSourceDisplayName({projectId: this.projectId, sourceId: this.source.id, displayName: this.renamedSource})
      },
      downloadGeoPackage () {
        try {
          this.$electron.ipcRenderer.send('quick_download_geopackage', { url: this.source.geopackageFilePath })
        } catch (error) {
          console.error(error)
        }
      },
      hideStyleEditor () {
        this.styleEditorVisible = false
      },
      zoomToSource () {
        this.zoomToExtent({projectId: this.projectId, extent: this.source.extent})
      }
    }
  }
</script>

<style scoped>
</style>
