
<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <v-container>
      <v-row no-gutters>
        <p class="detail--text">
          Welcome to MapCache — a geospatial application for creating and aggregating map content. Harnessing the power of <span class="fake-link" style="color: #326482" @click="() => open(geoPackageLink)">GeoPackage</span>, MapCache provides users with a rich set of capabilities for map making.
        </p>
      </v-row>
      <v-row no-gutters>
        <h3>Landing page</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">The landing page allows the creation of a new project and access to recent projects. A project is a geospatial workspace. It provides a container for managing resources and creating map products.</p>
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
        <p class="detail--text">MapCache provides a rich map experience for users. The map section provides the insight and visualization needed for building map products. Explore the world using OpenStreetMap base maps, or BYOB (bring your own base map). View your imagery and feature layers and arrange them as needed. Add content using the drawing tools.</p>
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
            <p class="detail--text mt-4" v-html="map_item_text[map_tab]"></p>
          </v-tab-item>
        </v-tabs-items>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import {environment} from '../../../lib/env/env'
import {mdiMagnify} from '@mdi/js'

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
        'MapCache supports several geospatial formats. Bring your shapefile, KML, and GeoJSON. Have an XYZ or WMS tile server? You can use that too. This section is all about importing the data used to create maps.',
        'Your project, your rules. Visit the settings to enable dark mode, edit your base maps, and much more.'
      ],
      map_tab: null,
      map_items: [
        'Search', 'Base maps', 'Grids', 'Layers', 'Drawing tools'
      ],
      map_item_text: [
        `Utilizing OpenStreetMap's Nominatim service, search the world for anything and everything. Need to limit your search to a particular area? Just enable the&nbsp;<strong>Map filter</strong>&nbsp;<svg style="margin-bottom: -6px;" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="24" height="24"><defs><path d="M20.58 3.01L20.61 3.01L20.65 3.02L20.69 3.04L20.72 3.05L20.75 3.07L20.78 3.09L20.81 3.11L20.84 3.13L20.87 3.16L20.89 3.19L20.91 3.22L20.93 3.25L20.95 3.28L20.96 3.31L20.98 3.35L20.99 3.39L20.99 3.42L21 3.46L21 3.5L21 13.34L20.91 13.31L20.82 13.28L20.73 13.25L20.64 13.23L20.54 13.2L20.45 13.18L20.36 13.15L20.26 13.13L20.17 13.11L20.07 13.1L19.98 13.08L19.88 13.06L19.79 13.05L19.69 13.04L19.59 13.03L19.49 13.02L19.4 13.01L19.3 13.01L19.2 13L19.1 13L19 13L19 5.7L16 6.86L16 13.8L15.89 13.87L15.77 13.94L15.66 14.01L15.55 14.09L15.45 14.16L15.34 14.24L15.24 14.33L15.13 14.41L15.03 14.49L14.94 14.58L14.84 14.67L14.75 14.76L14.65 14.86L14.56 14.95L14.48 15.05L14.39 15.15L14.31 15.25L14.23 15.36L14.15 15.46L14.07 15.57L14 15.68L14 6.87L10 5.47L10 17.13L13.05 18.2L13 19L13 19.07L13 19.13L13 19.2L13.01 19.26L13.01 19.33L13.01 19.39L13.02 19.46L13.02 19.52L13.03 19.59L13.03 19.65L13.04 19.72L13.05 19.78L13.06 19.85L13.07 19.91L13.08 19.97L13.09 20.04L13.1 20.1L13.11 20.16L13.12 20.23L13.14 20.29L13.15 20.35L9 18.9L3.66 20.97L3.5 21L3.46 21L3.42 20.99L3.39 20.99L3.35 20.98L3.31 20.96L3.28 20.95L3.25 20.93L3.22 20.91L3.19 20.89L3.16 20.87L3.13 20.84L3.11 20.81L3.09 20.78L3.07 20.75L3.05 20.72L3.04 20.69L3.02 20.65L3.01 20.61L3.01 20.58L3 20.54L3 20.5L3 5.38L3 5.35L3 5.32L3.01 5.28L3.02 5.25L3.02 5.23L3.03 5.2L3.05 5.17L3.06 5.14L3.08 5.12L3.09 5.09L3.11 5.07L3.13 5.05L3.15 5.02L3.17 5L3.2 4.99L3.22 4.97L3.25 4.95L3.27 4.94L3.3 4.92L3.33 4.91L3.36 4.9L9 3L15 5.1L20.34 3.03L20.5 3L20.54 3L20.58 3.01ZM5 18.31L8 17.15L8 5.45L5 6.46L5 18.31Z" id="bdkHyyff6"></path><path d="M19.69 23.08C19.7 23.18 19.67 23.29 19.59 23.36C19.46 23.5 19.24 23.5 19.11 23.36C19.04 23.3 18.49 22.74 18.42 22.67C18.34 22.6 18.3 22.49 18.32 22.39C18.32 22.26 18.32 21.58 18.32 20.37L18.31 20.37C17.12 18.85 16.46 18.01 16.33 17.84C16.21 17.69 16.24 17.48 16.39 17.36C16.45 17.31 16.52 17.29 16.6 17.29C16.6 17.29 16.6 17.29 16.6 17.29L21.41 17.29C21.41 17.29 21.41 17.29 21.41 17.29C21.48 17.29 21.55 17.31 21.62 17.36C21.77 17.48 21.79 17.69 21.68 17.84C21.55 18.01 20.89 18.85 19.7 20.37L19.69 20.37C19.69 22 19.69 22.9 19.69 23.08Z" id="eNDz4XNj9"></path></defs><g><g><g><use xlink:href="#bdkHyyff6" opacity="1" fill="#000000" fill-opacity="1"></use><g><use xlink:href="#bdkHyyff6" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g><g><use xlink:href="#eNDz4XNj9" opacity="1" fill="#000000" fill-opacity="1"></use><g><use xlink:href="#eNDz4XNj9" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g></g></g></svg>&nbsp;and click the&nbsp;<strong>Search</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiMagnify}"></path></svg>button.`,
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
