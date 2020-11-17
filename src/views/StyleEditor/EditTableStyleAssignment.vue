<template>
  <v-card style="max-height: 400px;">
    <v-card-title>{{assignment.name + ' Style Assignment'}}</v-card-title>
    <v-card-subtitle>Select a style to assign. Deselect to remove assignment.</v-card-subtitle>
    <v-card-text>
      <v-list>
        <v-list-item-group v-model="model" color="primary">
          <v-list-item
            v-for="style in styles"
            :key="'style_' + style.id"
            link
          >
            <v-list-item-content>
              <v-row no-gutters justify="space-between" align="center">
                <v-col cols="8">
                  <v-list-item-title v-text="style.name"></v-list-item-title>
                </v-col>
                <v-col cols="2">
                  <v-row no-gutters justify="center" align="center">
                    <svg height="25" width="25" v-if="assignment.geometryType === 1">
                      <circle cx="12.5" cy="12.5" r="5" :stroke="style.color" :fill="style.color" :stroke-width="(Math.min(style.width, 5) + 'px')"></circle>
                    </svg>
                    <svg height="25" width="25" v-if="assignment.geometryType === 2">
                      <polyline points="5,20 20,15, 5,10, 20,5" :stroke="style.color" :stroke-width="(Math.min(style.width, 5) + 'px')" fill="none"></polyline>
                    </svg>
                    <svg height="25" width="25" v-if="assignment.geometryType === 3">
                      <polygon points="5,10 20,5 20,20 5,20" :stroke="style.color" :fill="style.fillColor" :stroke-width="(Math.min(style.width, 5) + 'px')"></polygon>
                    </svg>
                  </v-row>
                </v-col>
              </v-row>
            </v-list-item-content>
          </v-list-item>
          <div v-if="assignment.geometryType === 1">
            <v-list-item
              v-for="icon in icons"
              :key="'icon' + icon.id"
              link
            >
              <v-list-item-content>
                <v-row no-gutters class="justify-space-between" align="center">
                  <v-col cols="8" class="align-center">
                    <v-list-item-title v-text="icon.name"></v-list-item-title>
                  </v-col>
                  <v-col cols="2">
                    <v-row no-gutters justify="center" align="center">
                      <img class="icon-box" :src="icon.url"/>
                    </v-row>
                  </v-col>
                </v-row>
              </v-list-item-content>
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
  import ActionUtilities from '../../lib/ActionUtilities'

  export default {
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
            ActionUtilities.setTableStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, styleId: selection.styleRow.id, isGeoPackage: this.isGeoPackage})
            ActionUtilities.setTableIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, iconId: -1, isGeoPackage: this.isGeoPackage})
          } else if (selection.iconRow) {
            ActionUtilities.setTableIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, iconId: selection.iconRow.id, isGeoPackage: this.isGeoPackage})
            ActionUtilities.setTableStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, styleId: -1, isGeoPackage: this.isGeoPackage})
          }
        } else {
          ActionUtilities.setTableStyle({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, styleId: -1, isGeoPackage: this.isGeoPackage})
          ActionUtilities.setTableIcon({projectId: this.projectId, id: this.id, tableName: this.tableName, geometryType: this.assignment.geometryType, iconId: -1, isGeoPackage: this.isGeoPackage})
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
    width: 2rem;
    height: 2rem;
    object-fit: contain;
  }
</style>
