<template>
  <v-list class="pa-0" style="margin-bottom: 80px;">
    <template v-for="item in items">
      <v-list-item
        :key="item.id"
        @click="item.click"
      >
      <v-list-item-icon class="mt-auto mb-auto">
        <v-btn
          icon
          color="primary"
          @click="item.zoomTo"
        >
          <img v-if="item.isTile" src="../../assets/colored_layers.png" alt="Tile Layer" width="24px" height="24px"/>
          <img v-else src="../../assets/polygon.png" alt="Feature Layer" width="24px" height="24px"/>
        </v-btn>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title :title="item.name" class="header" :style="{fontSize: '18px', fontWeight: '500', marginBottom: '0px'}" v-html="item.name"></v-list-item-title>
      </v-list-item-content>
      <v-switch
        hide-details
        color="primary"
        @click="item.setVisible"
        :input-value="item.visible"
        dense>
      </v-switch>
      </v-list-item>
      <v-divider
        :key="item.id + '_divider'"
      ></v-divider>
    </template>
  </v-list>
</template>

<script>
  import { mapActions } from 'vuex'
  import GeoPackageUtilities from '../../../lib/GeoPackageUtilities'
  export default {
    props: {
      geopackage: Object,
      projectId: String,
      layerSelected: Function
    },
    methods: {
      ...mapActions({
        setGeoPackageFeatureTableVisible: 'Projects/setGeoPackageFeatureTableVisible',
        setGeoPackageTileTableVisible: 'Projects/setGeoPackageTileTableVisible',
        zoomToExtent: 'Projects/zoomToExtent'
      })
    },
    computed: {
      items () {
        const _this = this
        const items = []
        Object.keys(this.geopackage.tables.features).forEach(key => {
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
              _this.setGeoPackageFeatureTableVisible({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: key, visible: !featureLayer.visible})
              e.stopPropagation()
            },
            zoomTo: function (e) {
              GeoPackageUtilities.getBoundingBoxForTable(_this.geopackage.path, key).then(extent => {
                _this.zoomToExtent({projectId: _this.projectId, extent})
              })
              e.stopPropagation()
            },
            visible: featureLayer.visible
          })
        })
        Object.keys(this.geopackage.tables.tiles).forEach(key => {
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
              _this.setGeoPackageTileTableVisible({projectId: _this.projectId, geopackageId: _this.geopackage.id, tableName: key, visible: !tileLayer.visible})
              e.stopPropagation()
            },
            zoomTo: function (e) {
              GeoPackageUtilities.getBoundingBoxForTable(_this.geopackage.path, key).then(extent => {
                _this.zoomToExtent({projectId: _this.projectId, extent})
              })
              e.stopPropagation()
            },
            visible: tileLayer.visible
          })
        })
        return items
      }
    }
  }
</script>

<style scoped>

</style>
