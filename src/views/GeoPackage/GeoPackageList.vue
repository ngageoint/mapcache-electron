<template>
  <v-sheet>
    <v-dialog v-model="showDialog" max-width="500" persistent @keydown.esc="clearDialog">
      <v-card v-if="showDialog">
        <v-card-title>
          {{ dialogText }}
        </v-card-title>
        <v-card-text>
          {{ dialogSubText }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click.stop="clearDialog">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click.stop="executeDialogAction">
            {{ dialogActionText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-list lines="three" class="pa-0" v-if="items">
      <template v-for="item in items" :key="item.id + 'list-item'">
        <v-list-item @click="() => item.click(item)">
          <div>
            <v-list-item-title class="text-h6" :style="{marginBottom: '0px'}" v-text="item.name"></v-list-item-title>
            <v-list-item-subtitle v-text="item.featureLayersText"></v-list-item-subtitle>
            <v-list-item-subtitle v-text="item.tileLayersText"></v-list-item-subtitle>
          </div>
          <template v-slot:append class="mt-auto mb-auto">
            <v-btn variant="text" v-if="item.health.missing" color="#d9534f" @click.stop="item.showMissingFileDialog" title="Missing GeoPackage" icon="mdi-alert-circle"/>
            <v-btn variant="text" v-else-if="item.health.invalid" color="#d9534f" @click.stop="item.showInvalidFileDialog" title="Invalid GeoPackage" icon="mdi-alert-circle"/>
            <v-btn variant="text" v-else-if="!item.health.synchronized" color="#d9534f" @click.stop="item.showSynchronizedFileDialog" title="Synchronize GeoPackage" icon="mdi-alert-circle"/>
            <v-icon icon="mdi-chevron-right"/>
          </template>
        </v-list-item>
        <v-divider/>
      </template>
    </v-list>
  </v-sheet>
</template>

<script>
import EventBus from '../../lib/vue/EventBus'
import { removeGeoPackage, synchronizeGeoPackage } from '../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    geopackages: Object,
    projectId: String,
    geopackageSelected: Function
  },
  methods: {
    clearDialog: function () {
      this.showDialog = false
      this.dialogText = ''
      this.dialogSubText = ''
      this.dialogGeoPackageId = ''
      this.dialogActionText = ''
      this.dialogAction = () => {
      }
    },
    executeDialogAction: function () {
      this.dialogAction()
      this.clearDialog()
    },
    async getItems () {
      const _this = this
      const items = []
      const keys = Object.keys(this.geopackages)
      for (let i = 0; i < keys.length; i++) {
        try {
          const geopackage = this.geopackages[keys[i]]
          items.push({
            id: geopackage.id,
            name: geopackage.name,
            featureLayersText: 'Feature layers: ' + Object.keys(geopackage.tables.features).length,
            tileLayersText: 'Tile layers: ' + Object.keys(geopackage.tables.tiles).length,
            health: await window.mapcache.checkGeoPackageHealth(geopackage.path, geopackage.modifiedDate),
            click: async function (item) {
              item.health = await window.mapcache.checkGeoPackageHealth(geopackage.path, geopackage.modifiedDate)
              if (!item.health.missing && !item.health.invalid && item.health.synchronized) {
                _this.geopackageSelected(geopackage.id)
              } else {
                if (item.health.missing) {
                  EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage file not found')
                } else if (item.health.invalid) {
                  EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage is not vald')
                } else if (!item.health.synchronized) {
                  EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage not synchronized')
                }
              }
            },
            showMissingFileDialog: function () {
              _this.dialogGeoPackageId = geopackage.id
              _this.dialogText = geopackage.name + ' GeoPackage not found'
              _this.dialogSubText = 'File not found at ' + geopackage.path + '. Would you like to remove this GeoPackage?'
              _this.dialogActionText = 'Remove'
              _this.showDialog = true
              _this.dialogAction = () => removeGeoPackage(_this.projectId, geopackage.id)
            },
            showInvalidFileDialog: function () {
              _this.dialogGeoPackageId = geopackage.id
              _this.dialogText = geopackage.name + ' GeoPackage is not valid'
              _this.dialogSubText = 'Would you like to remove this GeoPackage?'
              _this.dialogActionText = 'Remove'
              _this.showDialog = true
              _this.dialogAction = () => removeGeoPackage(_this.projectId, geopackage.id)
            },
            showSynchronizedFileDialog: function () {
              _this.dialogGeoPackageId = geopackage.id
              _this.dialogText = geopackage.name + ' GeoPackage not synchronized'
              _this.dialogSubText = geopackage.name + ' GeoPackage has been modified outside of the application. Would you like to synchronize this GeoPackage?'
              _this.dialogActionText = 'Synchronize'
              _this.dialogAction = () => synchronizeGeoPackage(_this.projectId, geopackage.id)
              _this.showDialog = true
            }
          })
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to generate GeoPackage list items.')
        }
      }
      return items
    }
  },
  data () {
    return {
      showDialog: false,
      dialogText: '',
      dialogSubText: '',
      dialogGeoPackageId: '',
      dialogActionText: '',
      dialogAction: () => {},
      items: []
    }
  },
  watch: {
    geopackages: {
      async handler () {
        this.items = await this.getItems()
      },
      deep: true
    }
  },
  created () {
    this.getItems().then(items => {
      this.items = items
    })
  },
}
</script>

<style scoped>

</style>
