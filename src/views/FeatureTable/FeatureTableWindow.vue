<template>
  <feature-tables id="feature-table-view" show-items-per-page :project="project" :projectId="project.id" :geopackages="project.geopackages" :sources="project.sources" :table="table" :zoomToFeature="zoomToFeature" :close="closeFeatureTable" :pop-in="popIn" :highlight-feature="highlightFeature" :show-feature="showFeature"></feature-tables>
</template>

<script>
import FeatureTables from './FeatureTables'
import {mapState} from 'vuex'
import isNil from 'lodash/isNil'
import {FEATURE_TABLE_WINDOW_EVENTS} from './FeatureTableEvents'
import {FEATURE_TABLE_ACTIONS} from './FeatureTableActions'

export default {
  name: 'FeatureTableWindow',
  components: {FeatureTables},
  computed: {
    ...mapState({
      project(state) {
        return state.Projects[this.$route.params.id]
      },
      darkTheme (state) {
        let isDark = false
        const projectId = this.$route.params.id
        let project = state.UIState[projectId]
        if (!isNil(project)) {
          isDark = project.dark
        }
        this.$nextTick(() => {
          this.$vuetify.theme.dark = isDark
        })
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
              featureCount: geopackage.tables.features[tableName].featureCount,
              getPage: (page, pageSize, path, tableName, sortBy, desc) => window.mapcache.getFeatureTablePage(path, tableName, page, pageSize, sortBy, desc)
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
              visible: sourceLayerConfig.visible,
              getPage: (page, pageSize, path, tableName, sortBy, desc) => window.mapcache.getFeatureTablePage(path, tableName, page, pageSize, sortBy, desc)
            }
          }
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.error(e)
          // eslint-disable-next-line no-console
          console.error('Failed to retrieve features.')
        }
      }
    },
    popIn () {
      window.mapcache.hideFeatureTableWindow(true)
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
    highlightFeature (path, table, feature) {
      window.mapcache.sendFeatureTableAction({
        action: FEATURE_TABLE_ACTIONS.HIGHLIGHT_FEATURE,
        path,
        table,
        feature
      })
    }
  },
  watch: {
    darkTheme: {
      handler(newValue) {
        this.$nextTick(() => {
          this.$vuetify.theme.dark = newValue
        })
      }
    },
  },
  mounted () {
    window.mapcache.registerFeatureTableEventListener((e, {event, args}) => {
      if (event === FEATURE_TABLE_WINDOW_EVENTS.DISPLAY_ALL_TABLE_FEATURES) {
        this.displayFeaturesForTable(args.id, args.tableName, args.isGeoPackage)
      }
    })
  },
  beforeDestroy() {
    window.mapcache.hideFeatureTableWindow(false)
  }
}
</script>

<style scoped>
#feature-table-view {
  font-family: Roboto, sans-serif;
  color: rgba(255, 255, 255, .87);
}
</style>
