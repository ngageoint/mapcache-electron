<template>
  <v-sheet style="margin-bottom: 80px;">
    <v-dialog v-model="showDialog" max-width="500" persistent>
      <v-card>
        <v-card-title>
          {{dialogText}}
        </v-card-title>
        <v-card-text>
          {{dialogSubText}}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click.stop="clearDialog">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click.stop="executeDialogAction">
            {{dialogActionText}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-list three-line class="pa-0" v-if="items">
      <template v-for="item in items">
        <v-list-item
          :key="item.id + 'list-item'"
          @click="() => item.click(item)"
        >
          <v-list-item-content>
            <v-list-item-title class="text-h6" :style="{marginBottom: '0px'}" v-html="item.name"></v-list-item-title>
            <v-list-item-subtitle v-html="item.featureLayersText"></v-list-item-subtitle>
            <v-list-item-subtitle v-html="item.tileLayersText"></v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-icon class="mt-auto mb-auto" v-if="item.health.missing">
            <v-btn outlined icon color="#d9534f" @click.stop="item.showMissingFileDialog" title="Missing GeoPackage"><v-icon>mdi-file-remove-outline</v-icon></v-btn>
          </v-list-item-icon>
          <v-list-item-icon class="mt-auto mb-auto" v-else-if="item.health.invalid">
            <v-btn outlined icon color="#d9534f" @click.stop="item.showInvalidFileDialog" title="Invalid GeoPackage"><v-icon>mdi-file-cancel-outline</v-icon></v-btn>
          </v-list-item-icon>
          <v-list-item-icon class="mt-auto mb-auto" v-else-if="!item.health.synchronized">
            <v-btn outlined icon color="#d9534f" @click.stop="item.showSynchronizedFileDialog" title="Synchronize GeoPackage"><v-icon>mdi-file-clock-outline</v-icon></v-btn>
          </v-list-item-icon>
          <v-list-item-icon class="mt-auto mb-auto">
            <v-icon>mdi-chevron-right</v-icon>
          </v-list-item-icon>
        </v-list-item>
        <v-divider
          :key="item.id + '-divider'"
        ></v-divider>
      </template>
    </v-list>
    <v-alert
      class="alert-position"
      v-model="alert"
      dismissible
      type="error"
    >{{alertText}}.</v-alert>
  </v-sheet>
</template>

<script>
  import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
  import ActionUtilities from '../../lib/ActionUtilities'

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
        this.dialogAction = () => {}
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
              featureLayersText: 'Feature Layers: ' + Object.keys(geopackage.tables.features).length,
              tileLayersText: 'Tile Layers: ' + Object.keys(geopackage.tables.tiles).length,
              health: await GeoPackageUtilities.checkGeoPackageHealth(geopackage),
              click: async function (item) {
                item.health = await GeoPackageUtilities.checkGeoPackageHealth(geopackage)
                if (!item.health.missing && !item.health.invalid && item.health.synchronized) {
                  _this.geopackageSelected(geopackage.id)
                } else {
                  if (item.health.missing) {
                    _this.alertText = 'GeoPackage file not found'
                    _this.alert = true
                  } else if (item.health.invalid) {
                    _this.alertText = 'GeoPackage is not valid'
                    _this.alert = true
                  } else if (!item.health.synchronized) {
                    _this.alertText = 'GeoPackage not synchronized'
                    _this.alert = true
                  }
                }
              },
              showMissingFileDialog: function () {
                _this.dialogGeoPackageId = geopackage.id
                _this.dialogText = geopackage.name + ' GeoPackage Missing'
                _this.dialogSubText = 'File not found at ' + geopackage.path + '. Would you like to remove this GeoPackage?'
                _this.dialogActionText = 'Remove'
                _this.showDialog = true
                _this.dialogAction = () => ActionUtilities.removeGeoPackage({projectId: _this.projectId, geopackageId: geopackage.id})
              },
              showInvalidFileDialog: function () {
                _this.dialogGeoPackageId = geopackage.id
                _this.dialogText = geopackage.name + ' GeoPackage is not valid'
                _this.dialogSubText = 'Would you like to remove this GeoPackage?'
                _this.dialogActionText = 'Remove'
                _this.showDialog = true
                _this.dialogAction = () => ActionUtilities.removeGeoPackage({projectId: _this.projectId, geopackageId: geopackage.id})
              },
              showSynchronizedFileDialog: function () {
                _this.dialogGeoPackageId = geopackage.id
                _this.dialogText = geopackage.name + ' GeoPackage not synchronized'
                _this.dialogSubText = geopackage.name + ' GeoPackage has been modified outside of the application. Would you like to synchronize this GeoPackage?'
                _this.dialogActionText = 'Synchronize'
                _this.dialogAction = () => ActionUtilities.synchronizeGeoPackage({projectId: _this.projectId, geopackageId: geopackage.id})
                _this.showDialog = true
              }
            })
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
          }
        }
        return items
      }
    },
    data () {
      return {
        alert: false,
        alertText: '',
        showDialog: false,
        dialogText: '',
        dialogSubText: '',
        dialogGeoPackageId: '',
        dialogActionText: '',
        dialogAction: () => {}
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
    asyncComputed: {
      items: {
        get () {
          return this.getItems()
        },
        default: []
      }
    }
  }
</script>

<style scoped>

</style>
