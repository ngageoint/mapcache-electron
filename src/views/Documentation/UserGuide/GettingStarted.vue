
<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <v-container>
      <v-row no-gutters>
        <p class="detail--text">
          Welcome to MapCache — a geospatial application for creating maps for wherever you are. Harnessing the power of GeoPackage, MapCache provides users with a rich set of a capabilities for map making.
        </p>
      </v-row>
      <v-row no-gutters>
        <h3>Landing page</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">The landing page allows you to create a new project or access your recent projects. A project is your geospatial workspace. It provides you a container for managing your resources and creating your map product.</p>
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
        <p class="detail--text">The sidebar provides you with easy access to your data and settings. See below for an explanation of each section.</p>
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
            <p class="detail--text mt-4">{{'&emsp;&emsp;'}}{{sidebar_item_text[sidebar_tab]}}</p>
          </v-tab-item>
        </v-tabs-items>
      </v-row>
      <v-row no-gutters class="mt-8">
        <h3>Map</h3>
      </v-row>
      <v-row no-gutters class="mt-2 mb-2">
        <v-divider/>
      </v-row>
      <v-row no-gutters>
        <p class="detail--text">MapCache provides a rich map experience for users. Explore the world using OpenStreetMap base maps, or BYOB (bring your own basemap). View your imagery and feature layers and arrange them as needed. Add content using the drawing tools. The MapCache map provides you with the insight you need to create the map product you want.</p>
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
            <p class="detail--text mt-4">{{'&emsp;&emsp;'}}{{map_item_text[map_tab]}}</p>
          </v-tab-item>
        </v-tabs-items>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>

export default {
  data () {
    return {
      sidebar_tab: null,
      sidebar_items: [
        'GeoPackages', 'Data sources', 'Settings'
      ],
      sidebar_item_text: [
        'At the core of MapCache is GeoPackage. GeoPackage is a geospatial format that allows you to bring your maps with you, wherever you are, with or without internet access. Here, you will use your data sources, drawings, and even other GeoPackages to create the map you need to get the job done.',
        'MapCache has support for several geospatial formats. Bring your shapefiles, kml, and GeoJSON. Have an xyz or wms tile server? You can use that too. This section is all about importing the data you\'ll use to create your maps.',
        'Your project, your rules. Visit the settings to enable dark mode, edit your base maps, and much more.'
      ],
      map_tab: null,
      map_items: [
        'Search', 'Base maps', 'Grids', 'Layers', 'Drawing tools'
      ],
      map_item_text: [
        `Utilizing OpenStreetMap's nominatim service, search the world for anything and everything. Need to limit your search to a particular area? Just enable the map filter and click search.`,
        'OpenStreetMap base maps provide you with the information required to navigate the world. Need shaded relief information? Switch over to the Humanitarian base map. Need something custom to do your work? Feel free to create additional base maps from your data sources in the Settings section.',
        'MapCache supports XYZ (3857), MGRS, and GARS grid overlays. While enabled, we adjust your coordinates to keep your experience consistent.',
        `We get it, sometimes one layer isn't enough. When you have several layers enabled on the map, things can get confusing. MapCache provides you the ability to rearrange your layers, so none of your information is lost.`,
        `Sometimes the data you have isn't enough and you need to get a bit more hands on. Utilize the drawing tools to create exactly what you need. Not happy with how your feature turned out? MapCache allows you to edit your feature as many times as you need until you get it right.`
      ],
    }
  }
}
</script>

<style scoped>
</style>
