<template>
  <v-sheet>
    <v-dialog
        v-model="removeDialog"
        max-width="400"
        persistent
        @keydown.esc="removeDialog = false">
      <v-card v-if="removeDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
          Remove styling
        </v-card-title>
        <v-card-text>
          When removing a feature layer's styling. If no other feature layer has styling enabled, any existing styles or
          icons will be deleted. Are you sure you want to remove styling for <b>{{ tableName }}</b>?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="removeDialog = false">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="removeStyleExtensionAndTableStyles">
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-sheet v-if="!loading && hasStyleExtension">
      <v-dialog v-model="assignStyleDialog" max-width="420" persistent scrollable @keydown.esc="closeStyleAssignment">
        <edit-table-style-assignment
            v-if="styleAssignment"
            :assignment="styleAssignment"
            :table-name="tableName"
            :project-id="projectId"
            :styles="styleItems"
            :icons="iconItems"
            :id="id"
            :is-geo-package="isGeoPackage"
            :is-base-map="isBaseMap"
            :close="closeStyleAssignment"/>
      </v-dialog>
      <v-dialog v-model="editStyleDialog" max-width="400" persistent scrollable @keydown.esc="closeStyleEditor">
        <create-edit-style
            v-if="editStyle"
            :key="'icon' + editStyle.id"
            :style-row="editStyle"
            :table-name="tableName"
            :project-id="projectId"
            :id="id"
            :is-geo-package="isGeoPackage"
            :is-base-map="isBaseMap"
            :close="closeStyleEditor"/>
      </v-dialog>
      <v-dialog v-model="editIconDialog" max-width="400" persistent @keydown.esc="closeIconEditor">
        <create-edit-icon
            v-if="editIcon"
            :key="'icon' + editIcon.id"
            :icon-row="editIcon"
            :table-name="tableName"
            :project-id="projectId"
            :id="id"
            :is-geo-package="isGeoPackage"
            :is-base-map="isBaseMap"
            :close="closeIconEditor"/>
      </v-dialog>
      <v-list class="pt-0">
        <v-list-group
            v-model="styleListItems.active"
            :prepend-icon="styleListItems.action"
            no-action
        >
          <template v-slot:activator>
            <div>
              <v-row no-gutters justify="start" align="center">
                <span v-text="styleListItems.title"></span>
              </v-row>
            </div>
          </template>
          <v-virtual-scroll
              :bench="10"
              :items="styleListItems.items"
              :height="Math.min(288, styleListItems.items.length * 48)"
              item-height="48">
            <template v-slot:default="{ item }">
              <v-list-item style="padding-left: 72px !important;" :key="item.id" @click="() => showStyleEditor(item)">
                <div>
                  <v-row no-gutters justify="space-between" align="center">
                    <v-col cols="8">
                      <v-list-item-title v-text="item.name"></v-list-item-title>
                    </v-col>
                    <v-col>
                      <v-row no-gutters justify="end" align="center" class="mr-5">
                        <geometry-style-svg :geometry-type="1" :color="item.color" :fill-color="item.fillColor" :fill-opacity="item.fillOpacity"/>
                        <geometry-style-svg :geometry-type="2" :color="item.color" :fill-color="item.fillColor" :fill-opacity="item.fillOpacity"/>
                        <geometry-style-svg :geometry-type="3" :color="item.color" :fill-color="item.fillColor" :fill-opacity="item.fillOpacity"/>
                      </v-row>
                    </v-col>
                  </v-row>
                </div>
              </v-list-item>
            </template>
          </v-virtual-scroll>
          <v-list-item key="add-style-item">
            <v-row no-gutters justify="space-between" align="center">
              <span>{{ styleListItems.hint ? 'No styles found' : '' }}</span>
              <v-btn
                  @click.stop.prevent="addStyle"
                  color="primary"
                  prepend-icon="mdi-plus">
                Add style
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
            <div>
              <v-row no-gutters justify="space-between" align="center">
                <span v-text="iconListItems.title"></span>
              </v-row>
            </div>
          </template>
          <v-virtual-scroll
              :bench="10"
              :items="iconListItems.items"
              :height="Math.min(288, iconListItems.items.length * 48)"
              item-height="48">
            <template v-slot:default="{ item }">
              <v-list-item style="padding-left: 72px !important;" :key="item.id" @click="() => showIconEditor(item)">
                <div>
                  <v-row no-gutters justify="space-between" align="center">
                    <v-col cols="8">
                      <v-list-item-title v-text="item.name"></v-list-item-title>
                    </v-col>
                    <v-col>
                      <v-row no-gutters justify="end" class="mr-5">
                        <v-img class="icon-box" :src="item.url"/>
                      </v-row>
                    </v-col>
                  </v-row>
                </div>
              </v-list-item>
            </template>
          </v-virtual-scroll>
          <v-list-item key="add-icon-item">
            <v-row no-gutters justify="space-between" align="center">
              <span>{{ iconListItems.hint ? 'No icons found' : '' }}</span>
              <v-btn
                  @click.stop.prevent="addIcon"
                  color="primary"
                  prepend-icon="mdi-plus">
                Add icon
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
            <div>
              <v-list-item-title v-text="assignmentListItems.title"></v-list-item-title>
            </div>
          </template>
          <v-list-item
              v-for="assignment in assignmentListItems.items"
              :key="'assignment' + assignment.id"
              link
              :disabled="assignment.disabled"
              @click="() => showStyleAssignment(assignment)">
            <div>
              <v-row no-gutters justify="space-between" align="center">
                <v-col cols="8">
                  <v-row no-gutters>
                    <v-list-item-title v-text="assignment.name"></v-list-item-title>
                  </v-row>
                  <v-row no-gutters>
                    <v-list-item-subtitle v-if="assignment.icon" v-text="assignment.icon.name"></v-list-item-subtitle>
                    <v-list-item-subtitle v-else-if="assignment.style">{{ assignment.style.name }}
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-else>Unassigned</v-list-item-subtitle>
                  </v-row>
                </v-col>
                <v-col cols="4" v-if="assignment.icon">
                  <v-row no-gutters justify="end" class="mr-5">
                    <v-img class="icon-box" style="width: 25px; height: 25px;" :src="assignment.icon.url"/>
                  </v-row>
                </v-col>
                <v-col cols="4" v-if="assignment.style">
                  <v-row no-gutters justify="end" class="mr-5">
                    <geometry-style-svg :geometry-type="assignment.geometryType"
                                        :color="assignment.style.color"
                                        :fill-color="assignment.style.fillColor"
                                        :fill-opacity="assignment.style.fillOpacity"/>
                  </v-row>
                </v-col>
              </v-row>
            </div>
          </v-list-item>
          <v-list-item v-if="assignmentListItems.hint" key="style-hint">
            <v-list-item-title>No styles or icons to assign</v-list-item-title>
          </v-list-item>
        </v-list-group>
      </v-list>
    </v-sheet>
    <v-card flat>
      <v-divider v-if="!loading && hasStyleExtension"></v-divider>
      <v-card-actions>
        <v-spacer/>
        <v-btn v-if="!loading && !hasStyleExtension" variant="text" color="#73c1c5"
               @click.stop="addStyleExtensionAndDefaultStyles()" prepend-icon="mdi-palette">
          Enable styling
        </v-btn>
        <v-btn prepend-icon="mdi-trash-can" v-if="!loading && hasStyleExtension" variant="text" color="#ff4444" @click.stop="removeDialog = true">
          Remove styling
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-sheet>
</template>

<script>
import CreateEditStyle from './CreateEditStyle.vue'
import CreateEditIcon from './CreateEditIcon.vue'
import EditTableStyleAssignment from './EditTableStyleAssignment.vue'
import GeometryStyleSvg from '../Common/GeometryStyleSvg.vue'
import { getNewStyle } from '../../lib/util/style/CommonStyleUtilities'
import { addStyleExtensionForTable, removeStyleExtensionForTable } from '../../lib/vue/vuex/ProjectActions'

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
    },
    isBaseMap: {
      type: Boolean,
      default: false
    }
  },
  data () {
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
        title: 'Default assignment',
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
    GeometryStyleSvg,
    CreateEditIcon,
    CreateEditStyle,
    EditTableStyleAssignment
  },
  created () {
    let _this = this
    _this.loading = true
    this.getStyle().then(function () {
      _this.loading = false
      _this.updatingStyle = false
      // eslint-disable-next-line no-unused-vars
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('Failed to retrieve style from GeoPackage.')
      _this.updatingStyle = false
      _this.loading = false
    })
  },
  methods: {
    addStyle () {
      this.showStyleEditor(getNewStyle())
    },
    addIcon () {
      const icon = window.mapcache.getDefaultIcon()
      icon.data = Buffer.from(icon.data)
      this.showIconEditor(icon)
    },
    showStyleEditor (style) {
      this.editStyle = Object.assign({}, style)
      this.editStyleDialog = true
    },
    closeStyleEditor () {
      this.editStyleDialog = false
      this.editStyle = null
    },
    showIconEditor (icon) {
      this.editIcon = icon
      this.editIconDialog = true
    },
    closeIconEditor () {
      this.editIconDialog = false
      this.editIcon = null
    },
    showStyleAssignment (assignment) {
      this.styleAssignment = assignment
      this.assignStyleDialog = true
    },
    closeStyleAssignment () {
      this.assignStyleDialog = false
      this.styleAssignment = null
    },
    async getStyle () {
      const result = await window.mapcache.getGeoPackageFeatureTableStyleData(this.path, this.tableName)
      this.styleListItems.items = []
      this.iconListItems.items = []
      this.assignmentListItems.items = []
      this.hasStyleExtension = result.hasStyleExtension
      if (this.hasStyleExtension) {
        const styleRows = result.styleRows
        const iconRows = result.iconRows
        this.styleItems = styleRows
        this.styleListItems.items = this.styleItems.slice()
        this.styleListItems.hint = this.styleListItems.items.length === 0
        this.iconItems = iconRows.map(icon => {
          icon.data = Buffer.from(icon.data)
          return icon
        })
        this.iconListItems.items = this.iconItems.slice()
        this.iconListItems.hint = this.iconListItems.items.length === 0
        const hasStyles = this.styleItems.length > 0
        if (this.styleItems.length + this.iconItems.length > 0) {
          const pointAssignment = result.pointAssignment
          const lineAssignment = result.lineAssignment
          const polygonAssignment = result.polygonAssignment
          const multipointAssignment = result.multipointAssignment
          const multilineAssignment = result.multilineAssignment
          const multipolygonAssignment = result.multipolygonAssignment
          const geometryCollectionAssignment = result.geometryCollectionAssignment
          this.assignmentListItems.items = [
            {
              id: 'assignment_point',
              name: 'Point',
              geometryType: window.mapcache.GeometryType.POINT,
              style: pointAssignment.style,
              icon: pointAssignment.icon
            },
            {
              id: 'assignment_line',
              name: 'Line',
              geometryType: window.mapcache.GeometryType.LINESTRING,
              style: lineAssignment.style,
              disabled: !hasStyles
            },
            {
              id: 'assignment_polygon',
              name: 'Polygon',
              geometryType: window.mapcache.GeometryType.POLYGON,
              style: polygonAssignment.style,
              disabled: !hasStyles
            },
            {
              id: 'assignment_multipoint',
              name: 'Multi point',
              geometryType: window.mapcache.GeometryType.MULTIPOINT,
              style: multipointAssignment.style,
              icon: multipointAssignment.icon
            },
            {
              id: 'assignment_multiline',
              name: 'Multi line',
              geometryType: window.mapcache.GeometryType.MULTILINESTRING,
              style: multilineAssignment.style,
              disabled: !hasStyles
            },
            {
              id: 'assignment_multipolygon',
              name: 'Multi polygon',
              geometryType: window.mapcache.GeometryType.MULTIPOLYGON,
              style: multipolygonAssignment.style,
              disabled: !hasStyles
            },
            {
              id: 'assignment_geometrycollection',
              name: 'Geometry collection',
              geometryType: window.mapcache.GeometryType.GEOMETRYCOLLECTION,
              style: geometryCollectionAssignment.style,
              disabled: !hasStyles
            }
          ]
          this.assignmentListItems.hint = false
        } else {
          this.assignmentListItems.hint = true
        }
      }
    },
    addStyleExtensionAndDefaultStyles () {
      addStyleExtensionForTable(this.projectId, this.id, this.tableName, this.isGeoPackage, this.isBaseMap)
    },
    removeStyleExtensionAndTableStyles () {
      this.removeDialog = false
      removeStyleExtensionForTable(this.projectId, this.id, this.tableName, this.isGeoPackage, this.isBaseMap)
    }
  },
  watch: {
    styleKey: {
      async handler (styleKey, oldValue) {
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
</style>
