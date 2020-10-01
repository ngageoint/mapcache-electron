<template>
  <v-list class="pa-0">
    <template v-for="item in items">
      <v-list-item
        :key="item.id"
        @click="item.click"
      >
        <v-list-item-icon v-if="item.isTile">
          <img :style="{verticalAlign: 'middle'}" src="../../assets/colored_layers.png" alt="Tile Layer" width="24px" height="24px">
        </v-list-item-icon>
        <v-list-item-icon v-else>
          <img :style="{verticalAlign: 'middle'}" src="../../assets/polygon.png" alt="Feature Layer" width="24px" height="24px">
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title class="header" :style="{fontSize: '18px', fontWeight: '500', marginBottom: '0px'}" v-html="item.name"></v-list-item-title>
        </v-list-item-content>
        <v-switch
          hide-details
          color="#3b779a"
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
  import _ from 'lodash'

  export default {
    props: {
      sources: Object,
      projectId: String,
      sourceSelected: Function
    },
    methods: {
      ...mapActions({
        setDataSourceVisible: 'Projects/setDataSourceVisible'
      })
    },
    computed: {
      items () {
        const _this = this
        const items = []
        Object.keys(this.sources).forEach(key => {
          const source = this.sources[key]
          const sourceId = key
          const projectId = _this.projectId
          const setVisible = (e) => {
            _this.setDataSourceVisible({projectId, sourceId, visible: !source.visible})
            e.stopPropagation()
          }
          items.push({
            id: key,
            name: _.isNil(source.displayName) ? source.name : source.displayName,
            path: source.filePath,
            isTile: source.pane === 'tile',
            visible: source.visible,
            click: function () {
              _this.sourceSelected(sourceId)
            },
            setVisible
          })
        })
        return items
      }
    }
  }
</script>

<style scoped>

</style>
