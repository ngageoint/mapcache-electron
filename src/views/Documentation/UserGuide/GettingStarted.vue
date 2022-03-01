
<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <v-container>
      <v-row no-gutters>
        <p class="detail--text">
          Welcome to MapCache — a geospatial application for creating and aggregating map content. Harnessing the power of <span class="fake-link" style="color: #326482" @click="() => open(geoPackageLink)">GeoPackage</span>, MapCache provides users with a rich set of a capabilities for map making.
        </p>
      </v-row>
      <v-row no-gutters>
        <h3>Landing page</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">The landing page allows the creation a new project and access to recent projects. A project is a geospatial workspace. It provides a container for managing resources and creating map products.</p>
      </v-row>
      <v-row no-gutters>
        <p>
          <v-img src="/images/documentation/landing_page.jpg" width="610"></v-img>
        </p>
      </v-row>
      <v-row no-gutters class="mt-8">
        <h3>Project</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">The project is where you will spend the majority of your time in MapCache. This section is broken down into two parts. The sidebar and the map.</p>
      </v-row>
      <v-row no-gutters>
        <p>
          <v-img src="/images/documentation/project.jpg" width="610"></v-img>
        </p>
      </v-row>
      <v-row no-gutters class="mt-8">
        <h3>Sidebar</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">The sidebar provides easy access to data and settings. See below for an explanation of each section.</p>
      </v-row>
      <v-row no-gutters>
        <p>
          <v-img src="/images/documentation/sidebar_info.jpg" width="610"></v-img>
        </p>
      </v-row>
      <v-row no-gutters>
        <v-tabs
            v-model="sidebar_tab"
            centered
        >
          <v-tabs-slider color="#45ced7"></v-tabs-slider>

          <v-tab
              v-for="item in sidebar_items"
              :key="item"
          >
            {{ item }}
          </v-tab>
        </v-tabs>
        <v-tabs-items v-model="sidebar_tab" style="width: 640px; height: 150px;">
          <v-tab-item
              v-for="item in sidebar_items"
              :key="item"
          >
            <p class="detail--text mt-4">{{sidebar_item_text[sidebar_tab]}}</p>
          </v-tab-item>
        </v-tabs-items>
      </v-row>
      <v-row no-gutters>
        <h3>Map</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">MapCache provides a rich map experience for users. Explore the world using OpenStreetMap base maps, or BYOB (bring your own basemap). View your imagery and feature layers and arrange them as needed. Add content using the drawing tools. The map section provides the insight and visualization needed for building map products.</p>
      </v-row>
      <v-row no-gutters>
        <p>
          <v-img src="/images/documentation/map_section.jpg" width="610" height="350" style="object-fit: scale-down"></v-img>
        </p>
      </v-row>
      <v-row no-gutters>
        <v-tabs
            v-model="map_tab"
            centered
        >
          <v-tabs-slider color="#45ced7"></v-tabs-slider>

          <v-tab
              v-for="item in map_items"
              :key="item"
          >
            {{ item }}
          </v-tab>
        </v-tabs>
        <v-tabs-items v-model="map_tab" style="width: 640px; height: 150px;">
          <v-tab-item
              v-for="item in map_items"
              :key="item"
          >
            <p class="detail--text mt-4">{{map_item_text[map_tab]}}</p>
          </v-tab-item>
        </v-tabs-items>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import {environment} from '../../../lib/env/env'

export default {
  methods: {
    open (link) {
      window.mapcache.openExternal(link)
    }
  },
  data () {
    return {
      geoPackageLink: environment.geopackageUrl,
      sidebar_tab: null,
      sidebar_items: [
        'GeoPackages', 'Data sources', 'Settings'
      ],
      sidebar_item_text: [
        'At the core of MapCache is GeoPackage. GeoPackage is a geospatial format that allows you to bring your maps with you, wherever you are, with or without internet access. Here, you will use your data sources, drawings, and even other GeoPackages to create the map you need to get the job done.',
        'MapCache has support for several geospatial formats. Bring your shapefiles, kml, and GeoJSON. Have an XYZ or WMS tile server? You can use that too. This section is all about importing the data you\'ll use to create your maps.',
        'Your project, your rules. Visit the settings to enable dark mode, edit your base maps, and much more.'
      ],
      map_tab: null,
      map_items: [
        'Search', 'Base maps', 'Grids', 'Layers', 'Drawing tools'
      ],
      map_item_text: [
        `Utilizing OpenStreetMap's Nominatim service, search the world for anything and everything. Need to limit your search to a particular area? Just enable the map filter and click search.`,
        'OpenStreetMap base maps provide the information required to navigate the world. Need shaded relief information? Switch over to the Humanitarian base map. Need something custom to do your work? Feel free to create additional base maps from your data sources in the Settings section.',
        'MapCache supports XYZ (EPSG:3857), MGRS, and GARS grid overlays. While enabled, the coordinates are adjusted to keep your experience consistent.',
        `When you have several layers enabled on the map, things can get confusing. MapCache provides the ability to rearrange layers, so none of your information is lost.`,
        `Utilize the drawing tools to create exactly what you need. Need to make changes? MapCache provides editing capabilities as well.`
      ],
    }
  }
}
</script>

<style scoped>
</style>
