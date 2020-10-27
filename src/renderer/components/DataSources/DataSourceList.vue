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
        setDataSourceVisible: 'Projects/setDataSourceVisible',
        zoomToExtent: 'Projects/zoomToExtent'
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
          const zoomTo = (e) => {
            _this.zoomToExtent({projectId, extent: source.extent})
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
            setVisible,
            zoomTo
          })
        })
        return items
      }
    }
  }
</script>

<style scoped>
</style>
