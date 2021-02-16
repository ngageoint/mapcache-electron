<template>
  <v-sheet>
    <v-list class="pa-0" v-if="items">
      <template v-for="item in items">
        <v-list-item
          :key="item.id + 'list-item'"
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
          <v-list-item-icon class="mt-auto mb-auto" v-if="item.error">
            <data-source-troubleshooting :project-id="projectId" :source="sources[item.id]"></data-source-troubleshooting>
          </v-list-item-icon>
          <v-list-item-action>
            <source-visibility-switch :input-value="item.visible" :project-id="projectId" :source="sources[item.id]"></source-visibility-switch>
          </v-list-item-action>
        </v-list-item>
        <v-divider :key="item.id + 'divider'"></v-divider>
      </template>
    </v-list>
  </v-sheet>
</template>

<script>
  import _ from 'lodash'
  import ActionUtilities from '../../lib/ActionUtilities'
  import SourceVisibilitySwitch from './SourceVisibilitySwitch'
  import DataSourceTroubleshooting from './DataSourceTroubleshooting'

  export default {
    components: {
      DataSourceTroubleshooting,
      SourceVisibilitySwitch
    },
    props: {
      sources: Object,
      projectId: String,
      sourceSelected: Function
    },
    computed: {
      items () {
        const _this = this
        const items = []
        Object.keys(this.sources).forEach(key => {
          const source = this.sources[key]
          const sourceId = key
          const projectId = _this.projectId
          const zoomTo = (e) => {
            ActionUtilities.zoomToExtent({projectId, extent: source.extent})
            e.stopPropagation()
          }
          items.push({
            id: key,
            error: source.error,
            visible: source.visible,
            name: _.isNil(source.displayName) ? source.name : source.displayName,
            path: source.filePath,
            isTile: source.pane === 'tile',
            click: function () {
              _this.sourceSelected(sourceId)
            },
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
