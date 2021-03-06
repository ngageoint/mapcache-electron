<template>
  <v-sheet v-if="tableFeatures">
    <v-toolbar
      flat
      color="main"
      dark
      dense
    >
      <v-toolbar-title>{{geopackageTables.length + sourceTables.length > 1 ? 'Feature Tables' : 'Feature Table' }}</v-toolbar-title>
      <v-row class="mb-1" no-gutters justify="end">
        <v-btn small @click.stop.prevent="close" icon><v-icon>{{mdiClose}}</v-icon></v-btn>
      </v-row>
    </v-toolbar>
    <v-tabs
      v-model="tab"
      grow
      color="primary"
    >
      <v-tab
        v-for="table in geopackageTables"
        :key="table.id"
      >
        {{ table.tabName }}
      </v-tab>
      <v-tab
        v-for="table in sourceTables"
        :key="table.id"
      >
        {{ table.tabName }}
      </v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab">
      <v-tab-item
        v-for="table in geopackageTables"
        :key="table.id"
      >
        <geo-package-feature-table :project-id="projectId" :geopackage="geopackages[table.geopackageId]" :table="table" :close="() => removeGeoPackageTab(table.id)" :zoom-to-feature="zoomToFeature"></geo-package-feature-table>
      </v-tab-item>
      <v-tab-item
        v-for="table in sourceTables"
        :key="table.id"
      >
        <data-source-feature-table :project-id="projectId" :source="sources[table.sourceId]" :table="table" :close="() => removeSourceTab(table.id)" :zoom-to-feature="zoomToFeature"></data-source-feature-table>
      </v-tab-item>
    </v-tabs-items>
  </v-sheet>
</template>

<script>
import GeoPackageFeatureTable from '../GeoPackage/GeoPackageFeatureTable'
import DataSourceFeatureTable from '../DataSources/DataSourceFeatureTable'
import {mdiClose} from '@mdi/js'

export default {
    components: {
      GeoPackageFeatureTable,
      DataSourceFeatureTable
    },
    props: {
      projectId: String,
      geopackages: Object,
      sources: Object,
      tableFeatures: Object,
      zoomToFeature: Function,
      close: Function
    },
    data () {
      return {
        mdiClose: mdiClose,
        tab: null
      }
    },
    computed: {
      geopackageTables: {
        get () {
          return this.tableFeatures.geopackageTables.slice()
        },
        set (val) {
          if (val.length === 0 && this.sourceTables.length === 0) {
            this.close()
          }
        }
      },
      sourceTables: {
        get () {
          return this.tableFeatures.sourceTables.slice()
        },
        set (val) {
          if (val.length === 0 && this.geopackageTables.length === 0) {
            this.close()
          }
        }
      }
    },
    methods: {
      removeGeoPackageTab (id) {
        this.geopackageTables = this.geopackageTables.filter(table => table.id !== id)
      },
      removeSourceTab (id) {
        this.sourceTables = this.sourceTables.filter(table => table.id !== id)
      }
    }
  }
</script>

<style scoped>
  .v-tab {
    text-transform: none !important;
    font-weight: 700 !important;
  }
</style>
