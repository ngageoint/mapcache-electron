<template>
  <v-list three-line class="pa-0" style="margin-bottom: 80px;">
    <template v-for="item in items">
      <v-list-item
        :key="item.id"
        @click="item.click"
      >
        <v-list-item-content>
          <v-list-item-title class="header" :style="{fontSize: '22px', fontWeight: '700', marginBottom: '0px'}" v-html="item.name"></v-list-item-title>
          <v-list-item-subtitle v-html="item.featureLayersText"></v-list-item-subtitle>
          <v-list-item-subtitle v-html="item.tileLayersText"></v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-icon style="margin-top: 32px;">
          <v-icon>mdi-chevron-right</v-icon>
        </v-list-item-icon>
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
      geopackages: Object,
      projectId: String,
      geopackageSelected: Function
    },
    computed: {
      items () {
        const _this = this
        const items = []
        Object.keys(this.geopackages).forEach(key => {
          const geopackage = this.geopackages[key]
          items.push({
            id: geopackage.id,
            name: geopackage.name,
            featureLayersText: 'Feature Layers: ' + Object.keys(geopackage.tables.features).length,
            tileLayersText: 'Tile Layers: ' + Object.keys(geopackage.tables.tiles).length,
            click: function () {
              _this.geopackageSelected(geopackage.id)
            }
          })
        })
        return items
      }
    }
  }
</script>

<style scoped>

</style>
