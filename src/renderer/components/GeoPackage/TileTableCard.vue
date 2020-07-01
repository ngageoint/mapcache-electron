<template>
  <expandable-card class="mb-2" :initially-expanded="geopackage.tables.tiles[tableName].expanded" :on-expand-collapse="expandFeatureTableCard">
    <div slot="card-header">
      <v-container fluid class="pa-0 ma-0">
        <v-row no-gutters align="center" justify="center">
          <v-col cols="8">
            <p :style="{fontSize: '1.15em', fontWeight: '700', marginBottom: '0px'}">
              {{tableName}}
            </p>
          </v-col>
          <v-col offset="2" cols="2" justify="center">
            <v-switch
              @click.stop=""
              class="v-label detail"
              color="#3b779a"
              hide-details
              v-model="visible"
              dense
            ></v-switch>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <div slot="card-expanded-body">
      <v-container fluid class="pa-0 ma-0">
        <v-row class="align-center" no-gutters>
          <v-col>
            <p :style="{fontSize: '0.75em', fontWeight: '500', marginBottom: '0px'}">
              Tile Table Information...
            </p>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </expandable-card>
</template>

<script>
  import { mapActions } from 'vuex'
  import ViewEditText from '../Common/ViewEditText'
  import ExpandableCard from '../Card/ExpandableCard'

  export default {
    props: {
      projectId: String,
      geopackage: Object,
      tableName: String
    },
    components: {
      ViewEditText,
      ExpandableCard
    },
    computed: {
      visible: {
        get () {
          return this.geopackage.tables.tiles[this.tableName].tableVisible || false
        },
        set (value) {
          this.setGeoPackageTileTableVisible({projectId: this.projectId, geopackageId: this.geopackage.id, tableName: this.tableName, visible: value})
        }
      }
    },
    methods: {
      ...mapActions({
        deleteGeoPackage: 'Projects/deleteGeoPackage',
        expandCollapseTileTableCard: 'Projects/expandCollapseTileTableCard',
        setGeoPackageTileTableVisible: 'Projects/setGeoPackageTileTableVisible'
      }),
      zoomToExtent (extent) {
        this.$emit('zoom-to', extent)
      },
      expandFeatureTableCard () {
        this.expandCollapseTileTableCard({projectId: this.projectId, geopackageId: this.geopackage.id})
      }
    }
  }
</script>

<style scoped>

</style>
