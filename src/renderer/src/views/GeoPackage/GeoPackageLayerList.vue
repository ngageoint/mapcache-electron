<template>
  <v-list class="pa-0">
    <template v-for="item in items" :key="item.id">
      <v-list-item
          @click="item.click"
      >
        <template v-slot:prepend>
          <v-btn
              icon
              variant="text"
              color="whitesmoke"
              @click="item.zoomTo"
          >
            <template v-slot:default>
              <v-img v-if="item.isTile && dark" src="/images/white_layers.png" alt="Tile layer" width="22px" height="22px"/>
              <v-img v-else-if="dark" src="/images/white_polygon.png" alt="Feature layer" width="20px" height="20px"/>
              <v-img v-else-if="item.isTile" src="/images/colored_layers.png" alt="Tile layer" width="22px" height="22px"/>
              <v-img v-else src="/images/polygon.png" alt="Feature layer" width="20px" height="20px"/>
            </template>
          </v-btn>
        </template>
        <v-list-item-title class="ml-4" :title="item.name" :style="{marginBottom: '0px'}" v-text="item.name"></v-list-item-title>
        <template v-slot:append>
          <v-switch
              color="primary"
              hide-details
              @click.stop.prevent="item.setVisible"
              :model-value="item.visible"
              density="compact">
          </v-switch>
        </template>
      </v-list-item>
      <v-divider/>
    </template>
  </v-list>
</template>

<script>
import { zoomToGeoPackageTable } from '../../../../lib/leaflet/map/ZoomUtilities'
import { setGeoPackageFeatureTableVisible, setGeoPackageTileTableVisible } from '../../../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    geopackage: Object,
    project: Object,
    dark: {
      type: Boolean,
      default: false
    },
    layerSelected: Function
  },
  computed: {
    items () {
      const items = []
      Object.keys(this.geopackage.tables.tiles).sort().forEach(key => {
        const tileLayer = this.geopackage.tables.tiles[key]
        items.push({
          id: key + '_' + this.geopackage.id,
          isTile: true,
          isFeature: false,
          name: key,
          click: () => {
            this.layerSelected(key)
          },
          setVisible: (e) => {
            setGeoPackageTileTableVisible(this.project.id, this.geopackage.id, key, !tileLayer.visible)
            e.stopPropagation()
          },
          zoomTo: (e) => {
            zoomToGeoPackageTable(this.geopackage, key)
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
          click: () => {
            this.layerSelected(key)
          },
          setVisible: (e) => {
            setGeoPackageFeatureTableVisible(this.project.id, this.geopackage.id, key, !featureLayer.visible)
            e.stopPropagation()
          },
          zoomTo: (e) => {
            zoomToGeoPackageTable(this.geopackage, key)
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
