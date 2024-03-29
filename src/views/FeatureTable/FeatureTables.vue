<template>
  <v-sheet v-if="table">
    <v-toolbar
        flat
        color="main"
        dark
        dense
    >
      <v-toolbar-title>{{ table.tabName }}</v-toolbar-title>
      <v-row no-gutters justify="end">
        <v-tooltip v-if="popOut != null" left :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" small @click.stop.prevent="popOut" icon>
              <v-icon>{{ mdiOpenInNew }}</v-icon>
            </v-btn>
          </template>
          <span>Pop out</span>
        </v-tooltip>
        <v-tooltip v-if="popIn != null" left :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" small @click.stop.prevent="popIn" icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" xml:space="preserve">
                <g transform="matrix(1 0 0 1 9 9)" id="vQhd5OkwAibA90dsjT7gK">
                  <path
                      style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: currentColor; fill-rule: nonzero; opacity: 1;"
                      vector-effect="non-scaling-stroke" transform=" translate(-9, -9)"
                      d="M 18 16 C 18 17.10457 17.10457 18 16 18 L 2 18 C 0.89543 18 0 17.10457 0 16 L 0 2 C 0 0.8999999999999999 0.89 0 2 0 L 12.40548 0 L 12.40548 2 L 2 2 L 2 16 L 16 16 L 16 5.385350000000001 L 18 5.385350000000001 z M 4.23 13.77 L 4.23 6.77 L 6.23 6.77 L 6.23 10.36 L 16.060000000000002 0.5299999999999994 L 17.470000000000002 1.9399999999999993 L 7.640000000000002 11.77 L 11.230000000000002 11.77 L 11.230000000000002 13.77 z"
                      stroke-linecap="round"/>
                </g>
              </svg>
            </v-btn>
          </template>
          <span>Pop in</span>
        </v-tooltip>
        <v-btn small @click.stop.prevent="close" icon>
          <v-icon>{{ mdiClose }}</v-icon>
        </v-btn>
      </v-row>
    </v-toolbar>
    <feature-table v-if="table && table.isGeoPackage && geopackages[table.geopackageId] != null"
                   :show-items-per-page="showItemsPerPage" :geopackage="geopackages[table.geopackageId]"
                   :is-geo-package="true" :project-id="projectId" :id="table.geopackageId" :name="table.tableName"
                   :file-path="geopackages[table.geopackageId].path" :table="table" :close="close"
                   :zoom-to-feature="zoomToFeature" :highlight-feature="highlightFeature"
                   :show-feature="showFeature"></feature-table>
    <feature-table v-else-if="table && !table.isGeoPackage && sources[table.sourceId] != null"
                   :show-items-per-page="showItemsPerPage" :source="sources[table.sourceId]" :is-geo-package="false"
                   :project-id="projectId" :id="table.sourceId"
                   :name="sources[table.sourceId].displayName ? sources[table.sourceId].displayName : sources[table.sourceId].name"
                   :file-path="sources[table.sourceId].geopackageFilePath" :table="table" :close="close"
                   :zoom-to-feature="zoomToFeature" :highlight-feature="highlightFeature"
                   :show-feature="showFeature"></feature-table>
  </v-sheet>
</template>

<script>
import FeatureTable from './FeatureTable'
import { mdiClose, mdiOpenInNew } from '@mdi/js'

export default {
  components: {
    FeatureTable
  },
  props: {
    project: Object,
    projectId: String,
    geopackages: Object,
    sources: Object,
    table: Object,
    zoomToFeature: Function,
    showFeature: Function,
    highlightFeature: Function,
    close: Function,
    popOut: Function,
    popIn: Function,
    showItemsPerPage: Boolean
  },
  data () {
    return {
      mdiClose: mdiClose,
      mdiOpenInNew: mdiOpenInNew,
      tab: null
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
