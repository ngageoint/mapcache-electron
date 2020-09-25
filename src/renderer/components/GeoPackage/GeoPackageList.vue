<template>
  <div>
    <v-dialog v-model="showDialog" max-width="500">
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
            color="#3b779a"
            text
            @click.stop="clearDialog">
            cancel
          </v-btn>
          <v-btn
            color="red"
            text
            @click.stop="executeDialogAction">
            {{dialogActionText}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-list three-line class="pa-0" style="margin-bottom: 80px;">
      <template v-for="item in items">
        <v-list-item
          :key="item.id"
          @click="() => item.click(item)"
        >
          <v-list-item-content>
            <v-list-item-title class="header" :style="{fontSize: '22px', fontWeight: '700', marginBottom: '0px'}" v-html="item.name"></v-list-item-title>
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
          :key="item.id + '_divider'"
        ></v-divider>
      </template>
    </v-list>
    <v-snackbar
      v-model="snackBar"
    >
      {{snackBarText}}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="#d9534f"
          text
          v-bind="attrs"
          @click="snackBar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'

  export default {
    props: {
      geopackages: Object,
      projectId: String,
      geopackageSelected: Function
    },
    methods: {
      ...mapActions({
        synchronizeGeoPackage: 'Projects/synchronizeGeoPackage',
        removeGeoPackage: 'Projects/removeGeoPackage'
      }),
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
      }
    },
    data () {
      return {
        snackBar: false,
        snackBarText: '',
        showDialog: false,
        dialogText: '',
        dialogSubText: '',
        dialogGeoPackageId: '',
        dialogActionText: '',
        dialogAction: () => {}
      }
    },
    asyncComputed: {
      async items () {
        const _this = this
        const items = []
        const keys = Object.keys(this.geopackages)
        for (let i = 0; i < keys.length; i++) {
          const geopackage = this.geopackages[keys[i]]
          items.push({
            id: geopackage.id,
            name: geopackage.name,
            featureLayersText: 'Feature Layers: ' + Object.keys(geopackage.tables.features).length,
            tileLayersText: 'Tile Layers: ' + Object.keys(geopackage.tables.tiles).length,
            health: await GeoPackageUtilities.checkGeoPackageHealth(geopackage),
            click: async function (item) {
              item.health = await GeoPackageUtilities.checkGeoPackageHealth(geopackage)
              console.log(item.health)
              if (!item.health.missing && !item.health.invalid && item.health.synchronized) {
                console.log('lets do it!')
                _this.geopackageSelected(geopackage.id)
              } else {
                if (item.health.missing) {
                  _this.snackBarText = 'GeoPackage file not found'
                  _this.snackBar = true
                } else if (item.health.invalid) {
                  _this.snackBarText = 'GeoPackage is not valid'
                  _this.snackBar = true
                } else if (!item.health.synchronized) {
                  _this.snackBarText = 'GeoPackage not synchronized'
                  _this.snackBar = true
                }
              }
            },
            showMissingFileDialog: function () {
              _this.dialogGeoPackageId = geopackage.id
              _this.dialogText = geopackage.name + ' GeoPackage Missing'
              _this.dialogSubText = 'File not found at ' + geopackage.path + '. Would you like to remove this GeoPackage?'
              _this.dialogActionText = 'Remove'
              _this.showDialog = true
              _this.action = () => _this.removeGeoPackage({projectId: _this.projectId, geopackageId: geopackage.id})
            },
            showInvalidFileDialog: function () {
              _this.dialogGeoPackageId = geopackage.id
              _this.dialogText = geopackage.name + ' GeoPackage is not valid'
              _this.dialogSubText = 'Would you like to remove this GeoPackage?'
              _this.dialogActionText = 'Remove'
              _this.showDialog = true
              _this.action = () => _this.removeGeoPackage({projectId: _this.projectId, geopackageId: geopackage.id})
            },
            showSynchronizedFileDialog: function () {
              _this.dialogGeoPackageId = geopackage.id
              _this.dialogText = geopackage.name + ' GeoPackage not synchronized'
              _this.dialogSubText = geopackage.name + ' GeoPackage has been modified outside of the application. Would you like to synchronize this GeoPackage?'
              _this.dialogActionText = 'Synchronize'
              _this.showDialog = true
              _this.action = () => _this.synchronizeGeoPackage({projectId: _this.projectId, geopackageId: geopackage.id})
            }
          })
        }
        return items
      }
    }
  }
</script>

<style scoped>

</style>
