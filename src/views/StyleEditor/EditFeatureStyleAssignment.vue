<template>
  <v-card v-if="assignment && assignment.hasStyleExtension && (assignment.styles.length + assignment.icons.length > 0)" style="max-height: 400px;">
    <v-card-title>Feature Style Assignment</v-card-title>
    <v-card-subtitle class="mt-1">Select a style to assign. Deselect to remove assignment.</v-card-subtitle>
    <v-card-text>
      <v-list>
        <v-list-item-group v-model="model" color="primary">
          <v-list-item
            v-for="style in assignment.styles"
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
              v-for="icon in assignment.icons"
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
  <v-card v-else style="max-height: 400px;">
    <v-card-title>Feature Style Assignment Unavailable</v-card-title>
    <v-card-text>
      Ensure feature styling has been enabled for your feature layer and you have created styles and icons.
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        Close
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import ActionUtilities from '../../lib/ActionUtilities'
  import GeometryStyleSvg from '../Common/GeometryStyleSvg'

  export default {
    components: {GeometryStyleSvg},
    props: {
      id: String,
      tableName: String,
      projectId: String,
      assignment: Object,
      isGeoPackage: {
        type: Boolean,
        default: true
      },
      close: Function
    },
    data () {
      return {
        model: this.assignment.style ? this.assignment.styles.findIndex(style => style.id === this.assignment.style.id) : (this.assignment.icon ? this.assignment.icons.findIndex(icon => icon.id === this.assignment.icon.id) + this.assignment.styles.length : null)
      }
    },
    methods: {
      save () {
        if (this.model !== null && this.model !== undefined && this.model >= 0) {
          const items = this.assignment.styles.concat(this.assignment.icons)
          const selection = items[this.model]
          if (selection.styleRow) {
            ActionUtilities.setFeatureStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, featureId: this.assignment.featureId, styleId: selection.styleRow.id, isGeoPackage: this.isGeoPackage})
            ActionUtilities.setFeatureIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, featureId: this.assignment.featureId, iconId: -1, isGeoPackage: this.isGeoPackage})
          } else if (selection.iconRow) {
            ActionUtilities.setFeatureIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, featureId: this.assignment.featureId, iconId: selection.iconRow.id, isGeoPackage: this.isGeoPackage})
            ActionUtilities.setFeatureStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, featureId: this.assignment.featureId, styleId: -1, isGeoPackage: this.isGeoPackage})
          }
        } else {
          ActionUtilities.setFeatureStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, featureId: this.assignment.featureId, styleId: -1, isGeoPackage: this.isGeoPackage})
          ActionUtilities.setFeatureIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, featureId: this.assignment.featureId, iconId: -1, isGeoPackage: this.isGeoPackage})
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
