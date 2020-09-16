<template>
  <expandable-card class="mb-2" :initially-expanded="layer.expanded" :on-expand-collapse="expandCollapseProjectLayer">
    <div slot="card-header">
      <v-container fluid class="pa-0 ma-0 text-left">
        <v-row no-gutters>
          <v-col>
            <p class="header" :style="{fontSize: '22px', fontWeight: '700', marginBottom: '0px'}">
              {{initialDisplayName}}
            </p>
          </v-col>
        </v-row>
      </v-container>
    </div>
<!--    <div slot="card-header">-->
<!--      <v-container fluid class="pa-0 ma-0">-->
<!--        <v-row class="align-center" no-gutters>-->
<!--          <v-col :cols="layer.pane === 'vector' ? 9 : 11">-->
<!--            <view-edit-text :value="initialDisplayName" font-size="1.25em" font-weight="700" label="Layer Name" :on-save="saveLayerName"/>-->
<!--          </v-col>-->
<!--          <v-col :cols="layer.pane === 'vector' ? 3 : 1">-->
<!--            <v-row class="align-center justify-end mr-1" no-gutters>-->
<!--              <v-btn v-if="layer.pane === 'vector'" icon color="black" @click.stop="downloadGeoPackage">-->
<!--                <v-icon>mdi-download</v-icon>-->
<!--              </v-btn>-->
<!--              <div class="contrast-svg-always" @click.stop="toggleProjectLayer({projectId: projectId, layerId: layer.id})">-->
<!--                <font-awesome-icon v-show="layer.shown" icon="check-square" size="lg"/>-->
<!--                <font-awesome-icon v-show="!layer.shown" :icon="['far', 'square']" size="lg"/>-->
<!--              </div>-->
<!--            </v-row>-->
<!--          </v-col>-->
<!--        </v-row>-->
<!--      </v-container>-->
<!--    </div>-->
    <div slot="card-expanded-body">
      <v-dialog
        v-model="renameDialog"
        max-width="500">
        <v-card>
          <v-card-title style="color: grey; font-weight: 600;">
            <v-row no-gutters justify="start" align="center">
              <v-icon>mdi-pencil-outline</v-icon>Rename {{initialDisplayName}}
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
              @click="saveLayerName">
              rename
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="removeDialog"
        max-width="500">
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
              @click="removeDialog = false">
              cancel
            </v-btn>
            <v-btn
              color="#ff4444"
              text
              @click="removeProjectLayer({projectId: projectId, layerId: layer.id})">
              remove
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <div class="layer-body">
        <v-container fluid class="pa-0 ma-0 pl-1 text-left">
          <v-row no-gutters>
            <v-col>
              <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
                <img v-if="layer.pane === 'vector'" :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Data Source" width="20px" height="20px">
                <img v-if="layer.pane === 'tile'" :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Tile Data Source" width="20px" height="20px">
                <span>{{layer.pane === 'vector' ? 'Feature' : 'Tile'}} Data Source</span>
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
                <v-card class="ma-0 pa-0 ml-1 mr-1 clickable card-button" :elevation="hover ? 4 : 1">
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
<!--          <v-row no-gutters class="detail-bg detail-section-margins-and-padding">-->
<!--            <v-col>-->
<!--              <v-row no-gutters>-->
<!--                <v-col>-->
<!--                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">-->
<!--                    Features-->
<!--                  </p>-->
<!--                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">-->
<!--                    {{featureCount}}-->
<!--                  </p>-->
<!--                </v-col>-->
<!--              </v-row>-->
<!--              <v-row no-gutters>-->
<!--                <v-col>-->
<!--                  <p class="detail" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">-->
<!--                    Description-->
<!--                  </p>-->
<!--                  <p :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">-->
<!--                    {{description}}-->
<!--                  </p>-->
<!--                </v-col>-->
<!--              </v-row>-->
<!--            </v-col>-->
<!--          </v-row>-->
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
  </expandable-card>
</template>

<script>
  import fs from 'fs'
  import jetpack from 'fs-jetpack'
  import BoundsUi from './BoundsUi'
  import GeotiffOptions from './GeotiffOptions'
  import { mapActions, mapState } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'
  import _ from 'lodash'

  let expanded = false

  function parseHexColor (hexcolor) {
    var r = parseInt(hexcolor.substr(1, 2), 16)
    var g = parseInt(hexcolor.substr(3, 2), 16)
    var b = parseInt(hexcolor.substr(5, 2), 16)
    return {r, g, b}
  }

  function getContrastYIQ (hexcolor) {
    let {r, g, b} = parseHexColor(hexcolor)
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return (yiq >= 128) ? '#222' : '#eee'
  }

  function setColorAlpha (hexcolor, alpha) {
    let {r, g, b} = parseHexColor(hexcolor)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  export default {
    props: {
      layer: Object,
      zIndex: Number,
      projectId: String
    },
    components: {
      BoundsUi,
      GeotiffOptions,
      ViewEditText,
      ExpandableCard
    },
    data () {
      return {
        expanded,
        renameDialog: false,
        renameValid: false,
        removeDialog: false,
        renamedGeoPackage: this.geopackage.name,
        renamedGeoPackageRules: [
          v => !!v || 'Name is required'
        ]
      }
    },
    computed: {
      ...mapState({
        uiState (state) {
          return state.UIState[this.projectId]
        },
        initialDisplayName () {
          return _.isNil(this.layer.displayName) ? this.layer.name : this.layer.displayName
        }
      }),
      cssProps () {
        return {
          '--fill-color': this.layer.style && this.layer.style.fillColor ? setColorAlpha(this.layer.style.fillColor, 0.95) : 'rgba(254, 254, 254, .95)',
          '--contrast-text-color': getContrastYIQ(this.layer.style && this.layer.style.fillColor ? this.layer.style.fillColor : '#FEFEFE')
        }
      },
      overviewBackgroundStyle () {
        if (this.layer.overviewTile && jetpack.exists(this.layer.overviewTile)) {
          let tile = fs.readFileSync(this.layer.overviewTile).toString('base64')
          return {
            'background-image': 'url(data:image/png;base64,' + tile + ')'
          }
        }
      },
      bounds () {
        if (this.layer.extent) {
          return [[this.layer.extent[1], this.layer.extent[0]], [this.layer.extent[3], this.layer.extent[2]]]
        }
      }
    },
    methods: {
      ...mapActions({
        setLayerDisplayName: 'Projects/setLayerDisplayName',
        removeProjectLayer: 'Projects/removeProjectLayer',
        toggleProjectLayer: 'Projects/toggleProjectLayer',
        expandProjectLayer: 'Projects/expandProjectLayer',
        setProjectExtents: 'UIState/setProjectExtents'
      }),
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      },
      openDetail () {
        this.expanded = !this.expanded
      },
      expandCollapseProjectLayer () {
        this.expandProjectLayer({projectId: this.projectId, layerId: this.layer.id})
      },
      saveLayerName (val) {
        this.setLayerDisplayName({projectId: this.projectId, layerId: this.layer.id, displayName: val})
      },
      downloadGeoPackage () {
        try {
          this.$electron.ipcRenderer.send('quick_download_geopackage', { url: this.layer.geopackageFilePath })
        } catch (error) {
          console.error(error)
        }
      }
    }
  }
</script>

<style scoped>
@import '../../../../node_modules/verte/dist/verte.css';
.layer-summary {
  position: relative;
  display: flex;
  flex-direction: row;
}
.left-side-summary {
  width: 80px;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}
.flex-the-rest {
  flex: 1;
}
.flex-container-row {
  display: flex;
  flex-direction: row;
}
.flex-container-column {
  display: flex;
  flex-direction: column;
}
.align-center {
  align-items: center;
}
.direction-reverse {
  flex-direction: row-reverse;
}
.path-container {
  width: 10px;
}
.lower-stats {
  padding-top: 12px;
  padding-bottom: 11px;
  padding-left: 10px;
  padding-right: 20px;
}

.layer-type-options {
  color: #656565;
  padding-left: 10px;
  padding-right: 10px;
}
.layer-file-path {
  color: #555A5F;
  font-size: 13px;
  margin-left: 20px;
  margin-top: 5px;
  word-wrap: break-word;
}

.layer-action-buttons {
  padding-bottom: 11px;
}

.layer {
  z-index: 1;
  position: relative;
  /* height: 160px; */
  margin-bottom: 15px;
}
.layer.themed .layer__face__colored-side {
  background: var(--fill-color);
}
.layer.themed .layer__face__path {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.layer.themed .layer__header {
  color: var(--contrast-text-color);
  background: var(--fill-color);
}
.layer.themed .layer__path-big {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.layer__text p {
  width: 200%;
}
.layer-type-icon {
  margin-top: 10px;
}
.contrast-svg-always {
  transition: color 0.3s;
  color: var(--contrast-text-color);
}
.contrast-svg {
  transition: color 0.3s;
  color: black;
}
.layer__face__path {
  position: absolute;
  left: 80px;
  top: 25px;
  width: 2px;
  height: 78px;
}
.layer__face__path:before, .layer__face__path:after {
  content: "";
  position: absolute;
  left: -3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  border: 2px solid;
  border-color: inherit;
}
.layer__face__path:before {
  top: -11px;
}
.layer__face__path:after {
  bottom: -9px;
}
.layer__face__from-to {
  color: #555A5F;
  font-size: 13px;
}
.layer__face__deliv-date p {
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
}
.layer__face__stats {
  color: #777;
  text-transform: uppercase;
  font-size: 12px;
  margin-right: 15px;
}
.layer__face__stats p {
  font-size: 15px;
  color: #777;
  font-weight: bold;
}
.layer-thumb {
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
}
.layer.req-active1 .layer__stats {
  opacity: 0;
}
.layer.req-active2 .layer__stats {
  display: none;
}
.danger-button {
  padding: 8px;
  min-height: 3rem;
  width: 100%;
  background-color: #d50000;
  text-transform: uppercase;
  font-size: 16px;
  color: #FFF;
  outline: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0;
  -webkit-transition: letter-spacing 0.3s;
  transition: letter-spacing 0.3s;
}
.danger-button:hover {
  background-color: #9b0000;
  letter-spacing: 5px;
}
.title-card {
  color: #000;
  font-size: 20px
}
.action-svg {
  cursor: pointer;
}
.layer-body {
  background-color: rgba(254, 254, 254, .95);
}
</style>
