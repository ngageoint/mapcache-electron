<template>
  <v-list class="pa-0">
    <template v-for="item in items">
      <v-list-item
        :key="item.id"
        @click="item.click"
      >
        <v-list-item-icon class="mt-auto mb-auto">
          <v-btn
            icon
            color="whitesmoke"
            @click="item.zoomTo"
          >
            <img v-if="item.isTile && $vuetify.theme.dark" src="../../assets/white_layers.png" alt="Tile Layer" width="20px" height="20px"/>
            <img v-else-if="$vuetify.theme.dark" src="../../assets/white_polygon.png" alt="Feature Layer" width="20px" height="20px"/>
            <img v-else-if="item.isTile" src="../../assets/colored_layers.png" alt="Tile Layer" width="20px" height="20px"/>
            <img v-else src="../../assets/polygon.png" alt="Feature Layer" width="20px" height="20px"/>
          </v-btn>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title :title="item.name" :style="{marginBottom: '0px'}" v-html="item.name"></v-list-item-title>
        </v-list-item-content>
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
      <v-divider
        :key="item.id + '_divider'"
      ></v-divider>
    </template>
  </v-list>
</template>

<script>
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
              window.mapcache.setGeoPackageTileTableVisible({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: key, visible: !tileLayer.visible})
              e.stopPropagation()
            },
            zoomTo: function (e) {
              window.mapcache.getBoundingBoxForTable(_this.geopackage.path, key).then(extent => {
                window.mapcache.zoomToExtent({projectId: _this.projectId, extent})
              })
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
              window.mapcache.setGeoPackageFeatureTableVisible({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: key, visible: !featureLayer.visible})
              e.stopPropagation()
            },
            zoomTo: function (e) {
              window.mapcache.getBoundingBoxForTable(_this.geopackage.path, key).then(extent => {
                window.mapcache.zoomToExtent({projectId: _this.projectId, extent})
              })
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
