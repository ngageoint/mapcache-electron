<template>
  <v-card style="max-height: 400px;">
    <v-card-title>{{assignment.name + ' Style Assignment'}}</v-card-title>
    <v-card-subtitle class="mt-1">Select a style to assign. Deselect to remove assignment.</v-card-subtitle>
    <v-card-text>
      <v-list>
        <v-list-item-group v-model="model" color="primary">
          <v-list-item
            v-for="style in styles"
            :key="'style_' + style.id"
            link
          >
            <template v-slot:default="{ active }">
              <v-list-item-content>
                <v-row no-gutters justify="space-between" align="center">
                  <v-col cols="8">
                    <v-radio-group hide-details dense class="ml-2" :value="active ? style.id : null">
                      <v-radio class="ma-0 pa-0" dense :label="style.name" :value="style.id"></v-radio>
                    </v-radio-group>
                  </v-col>
                  <v-row no-gutters justify="end" align="center">
                    <geometry-style-svg :geometry-type="assignment.geometryType" :color="style.color" :fill-color="style.fillColor" :fill-opacity="style.fillOpacity"/>
                  </v-row>
                </v-row>
              </v-list-item-content>
            </template>
          </v-list-item>
          <div v-if="assignment.geometryType === 1 || assignment.geometryType === 4">
            <v-list-item
              v-for="icon in icons"
              :key="'icon' + icon.id"
              link
            >
              <template v-slot:default="{ active }">
                <v-list-item-content>
                  <v-row no-gutters class="justify-space-between" align="center">
                    <v-col cols="8">
                      <v-radio-group hide-details dense class="ml-2" :value="active ? icon.id : null">
                        <v-radio class="ma-0 pa-0" dense :label="icon.name" :value="icon.id"></v-radio>
                      </v-radio-group>
                    </v-col>
                    <v-row no-gutters justify="end" align="center">
                      <img class="icon-box" :src="icon.url"/>
                    </v-row>
                  </v-row>
                </v-list-item-content>
              </template>
            </v-list-item>
          </div>
        </v-list-item-group>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        Close
      </v-btn>
      <v-btn
        color="primary"
        text
        @click="save">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import ProjectActions from '../../lib/vuex/ProjectActions'
  import GeometryStyleSvg from '../Common/GeometryStyleSvg'

  export default {
    components: {GeometryStyleSvg},
    props: {
      id: String,
      tableName: String,
      projectId: String,
      styles: Array,
      icons: Array,
      assignment: Object,
      isGeoPackage: {
        type: Boolean,
        default: true
      },
      isBaseMap: {
        type: Boolean,
        default: false
      },
      close: Function
    },
    data () {
      return {
        model: this.assignment.style ? this.styles.findIndex(style => style.id === this.assignment.style.id) : (this.assignment.icon ? this.icons.findIndex(icon => icon.id === this.assignment.icon.id) + this.styles.length : null)
      }
    },
    methods: {
      save () {
        if (this.model !== null && this.model !== undefined && this.model >= 0) {
          const items = this.styles.concat(this.icons)
          const selection = items[this.model]
          if (selection.styleRow) {
            ProjectActions.setTableStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, styleId: selection.styleRow.id, isGeoPackage: this.isGeoPackage, isBaseMap: this.isBaseMap})
            ProjectActions.setTableIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, iconId: -1, isGeoPackage: this.isGeoPackage, isBaseMap: this.isBaseMap})
          } else if (selection.iconRow) {
            ProjectActions.setTableIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, iconId: selection.iconRow.id, isGeoPackage: this.isGeoPackage, isBaseMap: this.isBaseMap})
            ProjectActions.setTableStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, styleId: -1, isGeoPackage: this.isGeoPackage, isBaseMap: this.isBaseMap})
          }
        } else {
          ProjectActions.setTableStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, styleId: -1, isGeoPackage: this.isGeoPackage, isBaseMap: this.isBaseMap})
          ProjectActions.setTableIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, iconId: -1, isGeoPackage: this.isGeoPackage, isBaseMap: this.isBaseMap})
        }
        this.close()
      }
    }
  }
</script>

<style scoped>
  .icon-box {
    border: 1px solid #ffffff00;
    border-radius: 4px;
    width: 25px;
    height: 25px;
    object-fit: contain;
  }
</style>
