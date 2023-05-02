<template>
  <feature-tables v-if="project != null" id="feature-table-view" show-items-per-page :project="project"
                  :projectId="project.id" :geopackages="project.geopackages" :sources="project.sources" :table="table"
                  :zoomToFeature="zoomToFeature" :close="closeFeatureTable" :pop-in="popIn"
                  :highlight-feature="highlightFeature" :show-feature="showFeature"></feature-tables>
</template>

<script>
import FeatureTables from './FeatureTables.vue'
import { mapState } from 'vuex'
import isNil from 'lodash/isNil'
import { FEATURE_TABLE_WINDOW_EVENTS } from './FeatureTableEvents'
import { FEATURE_TABLE_ACTIONS } from './FeatureTableActions'
import { popOutFeatureTable } from '../../lib/vue/vuex/ProjectActions'
import { useTheme } from 'vuetify'

export default {
  name: 'FeatureTableWindow',
  setup () {
    const theme = useTheme()

    return {
      theme,
      setTheme: (isDark) => theme.global.name.value = isDark ? 'dark' : 'light'
    }
  },
  components: { FeatureTables },
  computed: {
    ...mapState({
      project (state) {
        return state.Projects[this.$route.params.id]
      },
      darkTheme (state) {
        let isDark = false
        const projectId = this.$route.params.id
        let project = state.UIState[projectId]
        if (!isNil(project)) {
          isDark = project.dark
        }
        this.setTheme(isDark)
        return isDark
      },
    })
  },
  data () {
    return {
      table: null,
      lastShowFeatureTableEvent: null
    }
  },
  methods: {
    closeFeatureTable () {
      window.mapcache.hideFeatureTableWindow()
      this.lastShowFeatureTableEvent = null
    },
    async displayFeaturesForTable (id, tableName, isGeoPackage) {
      if (!isNil(id) && !isNil(tableName) && ((isGeoPackage && !isNil(this.project.geopackages[id]) && !isNil(this.project.geopackages[id].tables.features[tableName])) || (!isGeoPackage && !isNil(this.project.sources[id])))) {
        try {
          this.lastShowFeatureTableEvent = {
            id,
            tableName,
            isGeoPackage
          }
          this.tableFeaturesLatLng = null
          if (isGeoPackage) {
            const geopackage = this.project.geopackages[id]
            this.table = {
              id: geopackage.id + '_' + tableName,
              isGeoPackage: true,
              visible: geopackage.tables.features[tableName].visible,
              tabName: geopackage.name + ' - ' + tableName,
              geopackageId: geopackage.id,
              tableName: tableName,
              filePath: geopackage.path,
              columns: await window.mapcache.getFeatureColumns(geopackage.path, tableName),
              featureCount: geopackage.tables.features[tableName].featureCount
            }
          } else {
            const sourceLayerConfig = this.project.sources[id]
            this.table = {
              id: sourceLayerConfig.id,
              isGeoPackage: false,
              tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
              sourceId: sourceLayerConfig.id,
              columns: await window.mapcache.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
              filePath: sourceLayerConfig.geopackageFilePath,
              tableName: sourceLayerConfig.sourceLayerName,
              featureCount: sourceLayerConfig.count,
              visible: sourceLayerConfig.visible
            }
          }
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to retrieve features.')
        }
      }
    },
    popIn () {
      popOutFeatureTable(this.project.id, false)
      window.mapcache.hideFeatureTableWindow()
    },
    zoomToFeature (path, table, featureId) {
      window.mapcache.sendFeatureTableAction({
        action: FEATURE_TABLE_ACTIONS.ZOOM_TO_FEATURE,
        path,
        table,
        featureId
      })
    },
    showFeature (id, isGeoPackage, table, featureId) {
      window.mapcache.sendFeatureTableAction({
        action: FEATURE_TABLE_ACTIONS.SHOW_FEATURE,
        id,
        isGeoPackage,
        table,
        featureId
      })
    },
    highlightFeature (id, isGeoPackage, path, table, feature) {
      window.mapcache.sendFeatureTableAction({
        action: FEATURE_TABLE_ACTIONS.HIGHLIGHT_FEATURE,
        id,
        isGeoPackage,
        path,
        table,
        feature
      })
    }
  },
  watch: {
    darkTheme: {
      handler (newValue) {
        this.$nextTick(() => {
          this.setTheme(newValue)
        })
      }
    }
  },
  mounted () {
    window.mapcache.registerFeatureTableEventListener((e, { event, args }) => {
      if (event === FEATURE_TABLE_WINDOW_EVENTS.DISPLAY_ALL_TABLE_FEATURES) {
        this.displayFeaturesForTable(args.id, args.tableName, args.isGeoPackage)
      }
    })
  },
  beforeDestroy () {
    window.mapcache.hideFeatureTableWindow()
  }
}
</script>

<style scoped>
#feature-table-view {
  font-family: Roboto, sans-serif;
  color: rgba(255, 255, 255, .87);
}
</style>
