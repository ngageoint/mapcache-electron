<template>
  <feature-tables id="feature-table-view" show-items-per-page :project="project" :projectId="project.id" :geopackages="project.geopackages" :sources="project.sources" :tableFeatures="tableFeatures" :zoomToFeature="zoomToFeature" :close="closeFeatureTable" :pop-in="popIn"></feature-tables>
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
      tableFeatures: {
        geopackageTables: [],
        sourceTables: []
      },
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
            this.tableFeatures = {
              geopackageTables: [{
                id: geopackage.id + '_' + tableName,
                tabName: geopackage.name + ': ' + tableName,
                geopackageId: geopackage.id,
                tableName: tableName,
                filePath: geopackage.path,
                columns: await window.mapcache.getFeatureColumns(geopackage.path, tableName),
                featureCount: geopackage.tables.features[tableName].featureCount,
                getPage: (page, pageSize, path, tableName, sortBy, desc) => window.mapcache.getFeatureTablePage(path, tableName, page, pageSize, sortBy, desc)
              }],
              sourceTables: []
            }
          } else {
            const sourceLayerConfig = this.project.sources[id]
            this.tableFeatures = {
              geopackageTables: [],
              sourceTables: [{
                id: sourceLayerConfig.id,
                tabName: sourceLayerConfig.displayName ? sourceLayerConfig.displayName : sourceLayerConfig.name,
                sourceId: sourceLayerConfig.id,
                columns: await window.mapcache.getFeatureColumns(sourceLayerConfig.geopackageFilePath, sourceLayerConfig.sourceLayerName),
                filePath: sourceLayerConfig.geopackageFilePath,
                tableName: sourceLayerConfig.sourceLayerName,
                featureCount: sourceLayerConfig.count,
                getPage: (page, pageSize, path, tableName, sortBy, desc) => window.mapcache.getFeatureTablePage(path, tableName, page, pageSize, sortBy, desc)
              }]
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
    async queryForFeatures (lat, lng, zoom) {
      const latlng = {
        lat: lat,
        lng: lng
      }
      const tableFeatures = {
        geopackageTables: [],
        sourceTables: []
      }
      const geopackageValues = Object.values(this.project.geopackages)
      for (let i = 0; i < geopackageValues.length; i++) {
        const geopackage = geopackageValues[i]
        const tables = Object.keys(geopackage.tables.features).filter(tableName => geopackage.tables.features[tableName].visible)
        if (tables.length > 0) {
          const geopackageTables = await window.mapcache.getFeaturesForTablesAtLatLngZoom(geopackage.name, geopackage.id, geopackage.path, tables, latlng, zoom)
          geopackageTables.forEach(table => {
            table.getPage = (page, pageSize, path, tableName, sortBy, desc) => {
              return window.mapcache.getFeatureTablePageAtLatLngZoom(path, tableName, page, pageSize, table.latlng, table.zoom, sortBy, desc)
            }
          })
          tableFeatures.geopackageTables = tableFeatures.geopackageTables.concat(geopackageTables)
        }
      }
      for (let sourceId in this.project.sources) {
        const sourceLayer = this.project.sources[sourceId]
        if (sourceLayer.visible) {
          if (!isNil(sourceLayer.geopackageFilePath)) {
            const sourceTables = await window.mapcache.getFeaturesForTablesAtLatLngZoom(sourceLayer.displayName ? sourceLayer.displayName : sourceLayer.name, sourceLayer.id, sourceLayer.geopackageFilePath, [sourceLayer.sourceLayerName], latlng, zoom, false)
            sourceTables.forEach(table => {
              table.getPage = (page, pageSize, path, tableName, sortBy, desc) => window.mapcache.getFeatureTablePageAtLatLngZoom(path, tableName, page, pageSize, table.latlng, table.zoom, sortBy, desc)
            })
            tableFeatures.sourceTables = tableFeatures.sourceTables.concat(sourceTables)
          }
        }
      }
      if (tableFeatures.geopackageTables.length > 0 || tableFeatures.sourceTables.length > 0) {
        this.lastShowFeatureTableEvent = null
        this.tableFeaturesLatLng = latlng
        this.tableFeatures = tableFeatures
      }
      this.tableFeatures = tableFeatures
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
      } else if (event === FEATURE_TABLE_WINDOW_EVENTS.LAT_LON_FEATURE_QUERY) {
        this.queryForFeatures(args.lat, args.lng, args.zoom)
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
