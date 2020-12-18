<template>
  <v-sheet>
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back">
        <v-icon large>mdi-chevron-left</v-icon>
      </v-btn>
      <v-toolbar-title :title="tableName + ' Style Editor'"><b>{{tableName}}</b> Style Editor</v-toolbar-title>
    </v-toolbar>
    <v-dialog
      v-model="removeDialog"
      max-width="400"
      persistent>
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Remove styling
        </v-card-title>
        <v-card-text>
          When removing a feature layer's styling. If no other feature layer has styling enabled, any existing styles or
          icons will be deleted. Are you sure you want to remove styling for <b>{{tableName}}</b>?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="removeDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="removeStyleExtensionAndTableStyles">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-sheet v-if="!loading && hasStyleExtension">
      <v-dialog v-model="assignStyleDialog" max-width="420" persistent scrollable>
        <edit-table-style-assignment
          v-if="styleAssignment"
          :assignment="styleAssignment"
          :table-name="tableName"
          :project-id="projectId"
          :styles="styleItems"
          :icons="iconItems"
          :id="id"
          :is-geo-package="isGeoPackage"
          :close="closeStyleAssignment"/>
      </v-dialog>
      <v-dialog v-model="editStyleDialog" max-width="400" persistent scrollable>
        <create-edit-style
          v-if="editStyle"
          :key="'icon' + editStyle.id"
          :style-row="editStyle"
          :table-name="tableName"
          :project-id="projectId"
          :id="id"
          :is-geo-package="isGeoPackage"
          :close="closeStyleEditor"/>
      </v-dialog>
      <v-dialog v-model="editIconDialog" max-width="400" persistent>
        <create-edit-icon
          v-if="editIcon"
          :key="'icon' + editIcon.id"
          :icon-row="editIcon"
          :table-name="tableName"
          :project-id="projectId"
          :id="id"
          :is-geo-package="isGeoPackage"
          :close="closeIconEditor"/>
      </v-dialog>
      <v-list class="pt-0">
        <v-list-group
          v-model="styleListItems.active"
          :prepend-icon="styleListItems.action"
          no-action
        >
          <template v-slot:activator>
            <v-list-item-content>
              <v-row no-gutters justify="start" align="center">
                <span v-text="styleListItems.title"></span>
              </v-row>
            </v-list-item-content>
          </template>
          <v-list-item
            v-for="style in styleListItems.items"
            :key="style.id"
            link
            @click="() => showStyleEditor({
              id: style.styleRow.id,
              name: style.styleRow.getName(),
              description: style.styleRow.getDescription(),
              color: style.styleRow.getHexColor(),
              opacity: style.styleRow.getOpacity(),
              fillColor: style.styleRow.getFillHexColor(),
              fillOpacity: style.styleRow.getFillOpacity(),
              width: style.styleRow.getWidth(),
            })"
          >
            <v-list-item-content>
              <v-row no-gutters justify="space-between" align="center">
                <v-col cols="8">
                  <v-list-item-title v-text="style.name"></v-list-item-title>
                </v-col>
                <v-col>
                  <v-row no-gutters justify="end" align="center" class="mr-5">
                    <svg height="25" width="25">
                      <circle cx="12.5" cy="12.5" r="5" :stroke="style.color" :fill="style.color"
                              :stroke-width="(Math.min(style.width, 5) + 'px')"></circle>
                    </svg>
                    <svg height="25" width="25">
                      <polyline points="5,20 20,15, 5,10, 20,5" :stroke="style.color"
                                :stroke-width="(Math.min(style.width, 5) + 'px')" fill="none"></polyline>
                    </svg>
                    <svg height="25" width="25">
                      <polygon points="5,10 20,5 20,20 5,20" :stroke="style.color" :fill="style.fillColor"
                               :stroke-width="(Math.min(style.width, 5) + 'px')"></polygon>
                    </svg>
                  </v-row>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item key="add-style-item">
            <v-row no-gutters justify="space-between" align="center">
              <span>{{styleListItems.hint ? 'No styles found' : ''}}</span>
              <v-btn
                @click.stop.prevent="addStyle"
                color="primary">
                <v-icon small class="mr-1">mdi-plus</v-icon> Add Style
              </v-btn>
            </v-row>
          </v-list-item>
        </v-list-group>
        <v-list-group
          v-model="iconListItems.active"
          :prepend-icon="iconListItems.action"
          no-action
        >
          <template v-slot:activator>
            <v-list-item-content>
              <v-row no-gutters justify="space-between" align="center">
                <span v-text="iconListItems.title"></span>
              </v-row>
            </v-list-item-content>
          </template>
          <v-list-item
            v-for="icon in iconListItems.items"
            :key="icon.id"
            link
            @click="() => showIconEditor(icon.iconRow)"
          >
            <v-list-item-content>
              <v-row no-gutters justify="space-between" align="center">
                <v-col cols="8">
                  <v-list-item-title v-text="icon.name"></v-list-item-title>
                </v-col>
                <v-col>
                  <v-row no-gutters justify="end" class="mr-5">
                    <img class="icon-box" :src="icon.url"/>
                  </v-row>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item key="add-icon-item">
            <v-row no-gutters justify="space-between" align="center">
              <span>{{iconListItems.hint ? 'No icons found' : ''}}</span>
              <v-btn
                @click.stop.prevent="addIcon"
                color="primary">
                <v-icon small class="mr-1">mdi-plus</v-icon> Add Icon
              </v-btn>
            </v-row>
          </v-list-item>
        </v-list-group>
        <v-list-group
          v-model="assignmentListItems.active"
          :prepend-icon="assignmentListItems.action"
          no-action
        >
          <template v-slot:activator>
            <v-list-item-content>
              <v-list-item-title v-text="assignmentListItems.title"></v-list-item-title>
            </v-list-item-content>
          </template>
          <v-list-item
            v-for="assignment in assignmentListItems.items"
            :key="'assignment' + assignment.id"
            link
            @click="() => showStyleAssignment(assignment)">
            <v-list-item-content>
              <v-row no-gutters justify="space-between" align="center">
                <v-col cols="8">
                  <v-row no-gutters>
                    <v-list-item-title v-text="assignment.name"></v-list-item-title>
                  </v-row>
                  <v-row no-gutters>
                    <v-list-item-subtitle v-if="assignment.icon" v-text="assignment.icon.name"></v-list-item-subtitle>
                    <v-list-item-subtitle v-else-if="assignment.style">{{assignment.style.getName()}}</v-list-item-subtitle>
                    <v-list-item-subtitle v-else>Unassigned</v-list-item-subtitle>
                  </v-row>
                </v-col>
                <v-col cols="4" v-if="assignment.icon">
                  <v-row no-gutters justify="end" class="mr-5">
                    <img class="icon-box" style="width: 25px; height: 25px;" :src="assignment.iconUrl"/>
                  </v-row>
                </v-col>
                <v-col cols="4" v-if="assignment.style">
                  <v-row no-gutters justify="end" class="mr-5">
                    <svg height="25" width="25" v-if="assignment.geometryType === 1 || assignment.geometryType === 4 || assignment.geometryType === 7">
                      <circle cx="12.5" cy="12.5" r="5" :stroke="assignment.style.getHexColor()"
                              :fill="assignment.style.getHexColor()"
                              :stroke-width="(Math.min(assignment.style.getWidth(), 5) + 'px')"></circle>
                    </svg>
                    <svg height="25" width="25" v-if="assignment.geometryType === 2 ||assignment.geometryType === 5 ||  assignment.geometryType === 7">
                      <polyline points="5,20 20,15, 5,10, 20,5" :stroke="assignment.style.getHexColor()"
                                :stroke-width="(Math.min(assignment.style.getWidth(), 5) + 'px')"
                                fill="none"></polyline>
                    </svg>
                    <svg height="25" width="25" v-if="assignment.geometryType === 3 || assignment.geometryType === 6 || assignment.geometryType === 7">
                      <polygon points="5,10 20,5 20,20 5,20" :stroke="assignment.style.getHexColor()"
                               :fill="assignment.style.getFillHexColor()"
                               :stroke-width="(Math.min(assignment.style.getWidth(), 5) + 'px')"></polygon>
                    </svg>
                  </v-row>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <v-list-item v-if="assignmentListItems.hint" key="style-hint">
            <v-list-item-title>No styles or icons to assign</v-list-item-title>
          </v-list-item>
        </v-list-group>
      </v-list>
    </v-sheet>
    <v-card>
      <v-card-actions>
        <v-spacer/>
        <v-btn v-if="!loading && !hasStyleExtension" text dark color="#73c1c5"
               @click.stop="addStyleExtensionAndDefaultStyles()">
          <v-icon>mdi-palette</v-icon>
          Enable styling
        </v-btn>
        <v-btn v-if="!loading && hasStyleExtension" text dark color="#ff4444" @click.stop="removeDialog = true">
          <v-icon>mdi-trash-can</v-icon>
          Remove styling
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-sheet>
</template>

<script>
  import CreateEditStyle from './CreateEditStyle'
  import CreateEditIcon from './CreateEditIcon'
  import EditTableStyleAssignment from './EditTableStyleAssignment'
  import _ from 'lodash'
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import {GeoPackageAPI, GeometryType} from '@ngageoint/geopackage'
  import VectorStyleUtilities from '../../lib/VectorStyleUtilities'
  import ActionUtilities from '../../lib/ActionUtilities'

  export default {
    props: {
      id: String,
      path: String,
      tableName: String,
      projectId: String,
      project: Object,
      styleKey: Number,
      back: Function,
      isGeoPackage: {
        type: Boolean,
        default: true
      }
    },
    data() {
      return {
        loading: false,
        hasStyleExtension: false,
        updatingStyle: true,
        features: [],
        iconFeatures: [],
        styleListItems: {
          action: 'mdi-palette',
          items: [],
          title: 'Styles',
          active: false
        },
        iconListItems: {
          action: 'mdi-map-marker',
          items: [],
          title: 'Icons',
          active: false
        },
        assignmentListItems: {
          action: 'mdi-link-variant',
          items: [],
          title: 'Default Assignment',
          active: false
        },
        editIcon: null,
        editIconDialog: false,
        editStyle: null,
        editStyleDialog: false,
        styleAssignment: null,
        assignStyleDialog: false,
        styleItems: [],
        iconItems: [],
        removeDialog: false
      }
    },
    components: {
      CreateEditIcon,
      CreateEditStyle,
      EditTableStyleAssignment
    },
    created() {
      let _this = this
      _this.loading = true
      this.getStyle().then(function () {
        _this.loading = false
        _this.updatingStyle = false
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e)
        _this.updatingStyle = false
        _this.loading = false
      })
    },
    methods: {
      addStyle() {
        this.showStyleEditor(VectorStyleUtilities.randomStyle())
      },
      addIcon() {
        const icon = VectorStyleUtilities.getDefaultIcon()
        this.showIconEditor(icon)
      },
      determineAssignment(gp, geometryType) {
        const assignment = {
          icon: undefined,
          iconUrl: undefined,
          style: undefined
        }
        let style = GeoPackageUtilities._getTableStyle(gp, this.tableName, geometryType)
        let icon = GeoPackageUtilities._getTableIcon(gp, this.tableName, geometryType)
        if (!_.isNil(style)) {
          assignment.style = style
        }
        if (!_.isNil(icon)) {
          assignment.icon = icon
          assignment.iconUrl = 'data:' + icon.contentType + ';base64,' + icon.data.toString('base64')
        }
        return assignment
      },
      showStyleEditor(style) {
        this.editStyle = style
        this.editStyleDialog = true
      },
      closeStyleEditor() {
        this.editStyleDialog = false
        this.editStyle = null
      },
      showIconEditor(icon) {
        this.editIcon = icon
        this.editIconDialog = true
      },
      closeIconEditor() {
        this.editIconDialog = false
        this.editIcon = null
      },
      showStyleAssignment(assignment) {
        this.styleAssignment = assignment
        this.assignStyleDialog = true
      },
      closeStyleAssignment() {
        this.assignStyleDialog = false
        this.styleAssignment = null
      },
      async getStyle() {
        let gp = await GeoPackageAPI.open(this.path)
        try {
          let featureTableName = this.tableName
          this.hasStyleExtension = gp.featureStyleExtension.has(featureTableName)
          if (this.hasStyleExtension) {
            const styleRows = GeoPackageUtilities._getStyleRows(gp, featureTableName)
            const iconRows = GeoPackageUtilities._getIconRows(gp, featureTableName)
            this.styleItems = _.values(styleRows).map(style => {
              return {
                id: style.id,
                name: style.getName(),
                description: style.getDescription(),
                color: style.getHexColor(),
                opacity: style.getOpacity(),
                fillColor: style.getFillHexColor(),
                fillOpacity: style.getFillOpacity(),
                width: style.getWidth(),
                styleRow: style
              }
            })
            this.styleListItems.items = this.styleItems.slice()
            this.styleListItems.hint = this.styleListItems.items.length === 0
            this.iconItems = _.values(iconRows).map(icon => {
              return {
                id: icon.id,
                name: icon.name,
                data: icon.data,
                width: icon.width,
                height: icon.height,
                anchorU: icon.anchorU,
                anchorV: icon.anchorV,
                contentType: icon.contentType,
                url: 'data:' + icon.contentType + ';base64,' + icon.data.toString('base64'),
                iconRow: icon
              }
            })
            this.iconListItems.items = this.iconItems.slice()
            this.iconListItems.hint = this.iconListItems.items.length === 0
            if (this.styleItems.length + this.iconItems.length > 0) {
              const pointAssignment = this.determineAssignment(gp, GeometryType.POINT)
              const lineAssignment = this.determineAssignment(gp, GeometryType.LINESTRING)
              const polygonAssignment = this.determineAssignment(gp, GeometryType.POLYGON)
              const multipointAssignment = this.determineAssignment(gp, GeometryType.MULTIPOINT)
              const multilineAssignment = this.determineAssignment(gp, GeometryType.MULTILINESTRING)
              const multipolygonAssignment = this.determineAssignment(gp, GeometryType.MULTIPOLYGON)
              const geometryCollectionAssignment = this.determineAssignment(gp, GeometryType.GEOMETRYCOLLECTION)
              this.assignmentListItems.items = [
                {
                  id: 'assignment_point',
                  name: 'Point',
                  geometryType: GeometryType.POINT,
                  style: pointAssignment.style,
                  icon: pointAssignment.icon,
                  iconUrl: pointAssignment.iconUrl
                },
                {
                  id: 'assignment_line',
                  name: 'Line',
                  geometryType: GeometryType.LINESTRING,
                  style: lineAssignment.style
                },
                {
                  id: 'assignment_polygon',
                  name: 'Polygon',
                  geometryType: GeometryType.POLYGON,
                  style: polygonAssignment.style
                },
                {
                  id: 'assignment_multipoint',
                  name: 'Multi Point',
                  geometryType: GeometryType.MULTIPOINT,
                  style: multipointAssignment.style,
                  icon: multipointAssignment.icon,
                  iconUrl: multipointAssignment.iconUrl
                },
                {
                  id: 'assignment_multiline',
                  name: 'Multi Line',
                  geometryType: GeometryType.MULTILINESTRING,
                  style: multilineAssignment.style
                },
                {
                  id: 'assignment_multipolygon',
                  name: 'Multi Polygon',
                  geometryType: GeometryType.MULTIPOLYGON,
                  style: multipolygonAssignment.style
                },
                {
                  id: 'assignment_geometrycollection',
                  name: 'Geometry Collection',
                  geometryType: GeometryType.GEOMETRYCOLLECTION,
                  style: geometryCollectionAssignment.style
                }
              ]
              this.assignmentListItems.hint = false
            } else {
              this.assignmentListItems.hint = true
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error)
        }
        try {
          gp.close()
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error)
        }
      },
      addStyleExtensionAndDefaultStyles() {
        ActionUtilities.addStyleExtensionForTable({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          isGeoPackage: this.isGeoPackage
        })
      },
      removeStyleExtensionAndTableStyles() {
        this.removeDialog = false
        ActionUtilities.removeStyleExtensionForTable({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          isGeoPackage: this.isGeoPackage
        })
      }
    },
    watch: {
      styleKey: {
        async handler(styleKey, oldValue) {
          if (styleKey !== oldValue) {
            let _this = this
            this.updatingStyle = true
            this.getStyle().then(function () {
              _this.updatingStyle = false
            })
          }
        },
        deep: true
      }
    }
  }
</script>

<style scoped>
  .icon-box {
    border: 1px solid #ffffff00;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
</style>
