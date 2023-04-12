<template>
  <v-list class="pa-0">
    <template v-for="item in items" :key="item.id">
      <v-list-item
          @click="item.click"
      >
        <v-list-item-icon class="mt-auto mb-auto">
          <v-btn
              icon
              color="whitesmoke"
              @click="item.zoomTo"
          >
            <img v-if="item.isTile && $vuetify.theme.dark" src="/images/white_layers.png" alt="Tile layer" width="20px"
                 height="20px"/>
            <img v-else-if="$vuetify.theme.dark" src="/images/white_polygon.png" alt="Feature layer" width="20px"
                 height="20px"/>
            <img v-else-if="item.isTile" src="/images/colored_layers.png" alt="Tile layer" width="20px" height="20px"/>
            <img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
          </v-btn>
        </v-list-item-icon>
        <div>
          <v-list-item-title :title="item.name" :style="{marginBottom: '0px'}" v-text="item.name"></v-list-item-title>
        </div>
        <v-list-item-action>
          <v-switch
              hide-details
              color="primary"
              @click="item.setVisible"
              :input-value="item.visible"
              dense>
          </v-switch>
        </v-list-item-action>
      </v-list-item>
      <v-divider/>
    </template>
  </v-list>
</template>

<script>
import { zoomToGeoPackageTable } from '../../lib/leaflet/map/ZoomUtilities'
import { setGeoPackageFeatureTableVisible, setGeoPackageTileTableVisible } from '../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    geopackage: Object,
    projectId: String,
    layerSelected: Function
  },
  computed: {
    items () {
      const _this = this
      const items = []
      Object.keys(this.geopackage.tables.tiles).sort().forEach(key => {
        const tileLayer = this.geopackage.tables.tiles[key]
        items.push({
          id: key + '_' + this.geopackage.id,
          isTile: true,
          isFeature: false,
          name: key,
          click: function () {
            _this.layerSelected(key)
          },
          setVisible: function (e) {
            setGeoPackageTileTableVisible(_this.projectId, _this.geopackage.id, key, !tileLayer.visible)
            e.stopPropagation()
          },
          zoomTo: function (e) {
            zoomToGeoPackageTable(_this.geopackage, key)
            e.stopPropagation()
          },
          visible: tileLayer.visible
        })
      })
      Object.keys(this.geopackage.tables.features).sort().forEach(key => {
        const featureLayer = this.geopackage.tables.features[key]
        items.push({
          id: key + '_' + this.geopackage.id,
          isTile: false,
          isFeature: true,
          name: key,
          click: function () {
            _this.layerSelected(key)
          },
          setVisible: function (e) {
            setGeoPackageFeatureTableVisible(_this.projectId, _this.geopackage.id, key, !featureLayer.visible)
            e.stopPropagation()
          },
          zoomTo: function (e) {
            zoomToGeoPackageTable(_this.geopackage, key)
            e.stopPropagation()
          },
          visible: featureLayer.visible
        })
      })
      return items
    }
  }
}
</script>

<style scoped>

</style>
