<template>
  <v-container class="detail--text ma-0 pa-0 mt-2 allowselect">
    <v-row no-gutters class="mb-2">
      <v-col cols="12">
        <p class="ma-0 pa-0">Size: {{ details.size }}</p>
      </v-col>
    </v-row>
    <v-row no-gutters class="mb-2">
      <v-col cols="12">
        <p class="ma-0 pa-0">Path: {{ path }}</p>
      </v-col>
    </v-row>
    <v-row no-gutters>
      <v-col cols="12">
        <p class="ma-0 pa-0">Feature tables: {{ details.featureTableCount }}</p>
      </v-col>
    </v-row>
    <v-row class="mb-2" no-gutters>
      <v-col cols="12">
        <p class="ma-0 pa-0">Tile tables: {{ details.tileTableCount }}</p>
      </v-col>
    </v-row>
    <v-row class="mb-2" no-gutters>
      <v-col cols="12">
        <p class="ma-0 pa-0">Unsupported tables: {{ geopackage.tables.unsupported.length }}</p>
      </v-col>
    </v-row>
    <v-row class="mb-2" no-gutters>
      <v-col cols="12">
        <p class="ma-0 pa-0">Spatial reference systems: {{ details.srsCount }}</p>
      </v-col>
    </v-row>
    <v-row class="mb-2" v-for="srs in details.spatialReferenceSystems" :key="srs.id" no-gutters>
      <v-col cols="12">
        <v-row no-gutters>
          <v-col cols="12">
            <p class="ma-0 pa-0">SRS name: {{ srs.srs_name }}</p>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <p class="ma-0 pa-0">SRS ID: {{ srs.srs_id }}</p>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <p class="ma-0 pa-0">Organization: {{ srs.organization }}</p>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <p class="ma-0 pa-0">Coordsys ID: {{ srs.organization_coordsys_id }}</p>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <p class="ma-0 pa-0">Definition: {{ srs.definition }}</p>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <p class="ma-0 pa-0">Description: {{ srs.description }}</p>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    geopackage: Object
  },
  computed: {
    path () {
      return this.geopackage.path
    }
  },
  data () {
    return {
      details: { featureTableCount: 0, tileTableCount: 0, srsCount: 0 }
    }
  },
  methods: {
    updateDetails () {
      window.mapcache.getDetails(this.geopackage.path).then(result => {
        this.details = result || { featureTableCount: 0, tileTableCount: 0, srsCount: 0 }
      })
    }
  },
  watch: {
    geopackages: {
      handler () {
       this.updateDetails()
      },
      deep: true
    }
  },
  created () {
    this.updateDetails()
  }
}
</script>
