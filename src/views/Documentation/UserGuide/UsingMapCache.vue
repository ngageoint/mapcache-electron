<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <map-cache-article v-if="selectedArticle != null" :article="selectedArticle" :back="() => selectedArticle = null"></map-cache-article>
    <v-container v-else>
      <v-row no-gutters>
        <v-col cols="12" v-for="(section, i) of sections" :key="i">
          <v-divider v-if="i > 0 && !section.no_divider" class="mb-4"/>
          <v-card class="mt-0 pt-0" flat tile>
            <v-card-title class="ml-0 pl-0 mt-0 pt-0">
              <v-icon v-if="section.icon" class="mr-4" :color="section.color">{{section.icon}}</v-icon>
              <v-img v-if="section.image" class="mr-4" :src="section.image" style="max-width: 22px; max-height: 22px;"></v-img>
              {{section.title}}
            </v-card-title>
            <v-card-text class="ml-1">
              <v-row justify="space-between">
                <v-col class="pa-2" cols="6" v-for="article of section.articles" :key="article.title" @click="() => {selectedArticle = article.article}"><li class="fake-link ma-0 pa-0 link-color fs-11" v-html="article.title"></li></v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import {
  mdiLayersOutline,
  mdiPackageVariant,
  mdiMapOutline,
  mdiPlus,
  mdiTrashCanOutline,
  mdiPencil,
  mdiFolder,
  mdiFileDocumentOutline,
  mdiCloudDownloadOutline,
  mdiSteering,
  mdiLayersPlus,
  mdiExportVariant
} from '@mdi/js'
import MapCacheArticle from './Article/MapCacheArticle'

const addGeoPackagePath = "M12.2 0.55L12.25 0.56L12.3 0.57L12.35 0.58L12.39 0.59L12.44 0.61L12.49 0.63L12.53 0.65L12.57 0.67L12.62 0.69L12.66 0.72L12.7 0.75L21.75 5.83L21.8 5.86L21.84 5.89L21.89 5.92L21.93 5.95L21.97 5.98L22.01 6.02L22.05 6.06L22.08 6.09L22.09 6.11L22.12 6.12L22.37 6.5L22.4 6.62L22.42 6.66L22.45 6.78L22.45 6.86L22.47 6.97L22.45 7.09L22.45 9.67L22.45 9.68L22.45 9.78L22.45 9.8L22.45 9.86L22.43 9.86L22.42 9.92L22.35 10.02L22.24 10.1L22.11 10.12L20.26 10.12L20.13 10.1L20.02 10.02L19.95 9.92L19.94 9.86L19.92 9.86L19.92 9.8L19.92 9.78L19.92 9.68L19.92 9.67L19.92 8.79L13.87 12.16L13.3 12.49L13.3 20.29L14.4 19.67L14.46 19.65L14.51 19.62L14.51 19.63L14.55 19.62L14.7 19.63L14.84 19.7L14.94 19.82L15.68 21.12L15.72 21.27L15.71 21.42L15.64 21.56L15.56 21.63L15.57 21.65L14.41 22.3L14.39 22.31L14.3 22.35L12.66 23.28L12.66 23.28L12.62 23.31L12.57 23.33L12.53 23.35L12.49 23.37L12.44 23.39L12.39 23.41L12.35 23.42L12.3 23.43L12.25 23.44L12.2 23.45L12.15 23.46L12.1 23.46L12.05 23.46L11.99 23.46L11.94 23.46L11.89 23.45L11.84 23.44L11.79 23.43L11.74 23.42L11.7 23.41L11.65 23.39L11.6 23.37L11.56 23.35L11.52 23.33L11.47 23.31L11.43 23.28L11.39 23.25L2.34 18.17L2.26 18.12L2.19 18.07L2.12 18.02L2.06 17.96L2 17.89L1.94 17.82L1.9 17.75L1.85 17.68L1.82 17.6L1.79 17.51L1.76 17.43L1.74 17.34L1.73 17.25L1.73 17.16L1.73 10.81L1.66 10.85L1.58 10.88L1.5 10.91L1.42 10.93L1.33 10.95L1.25 10.95L1.17 10.96L1.08 10.96L1 10.95L0.91 10.93L0.83 10.91L0.75 10.88L0.66 10.85L0.58 10.81L0.47 10.73L0.36 10.65L0.27 10.55L0.19 10.45L0.13 10.34L0.08 10.23L0.04 10.11L0.01 9.99L0 9.86L0 9.73L0.02 9.61L0.05 9.48L0.1 9.36L0.16 9.24L1.88 6.27L1.91 6.22L1.94 6.18L1.97 6.13L2 6.09L2.04 6.05L2.08 6.01L2.11 5.98L2.15 5.94L2.2 5.91L2.24 5.88L2.28 5.86L2.33 5.83L2.37 5.81L2.42 5.79L11.39 0.75L11.43 0.72L11.47 0.69L11.52 0.67L11.56 0.65L11.6 0.63L11.65 0.61L11.7 0.59L11.74 0.58L11.79 0.57L11.84 0.56L11.89 0.55L11.94 0.54L11.99 0.54L12.05 0.54L12.1 0.54L12.15 0.54L12.15 0.54L12.2 0.55ZM20.65 11.62L20.66 11.62L20.66 11.62L20.67 11.62L20.67 11.63L20.68 11.63L20.69 11.63L20.69 11.63L20.7 11.63L20.7 11.64L20.71 11.64L20.71 11.64L20.72 11.64L20.72 11.65L20.73 11.65L20.73 11.66L20.74 11.66L20.74 11.66L20.74 11.67L20.75 11.67L20.75 11.68L20.75 11.68L20.76 11.69L20.76 11.69L20.76 11.69L20.77 11.7L20.77 11.71L20.77 11.71L20.77 11.72L20.78 11.72L20.78 11.73L20.78 11.73L20.78 11.74L20.78 11.74L20.78 11.75L20.78 11.76L20.78 11.76L20.78 11.77L20.78 14.76L23.85 14.76L23.85 14.76L23.86 14.76L23.87 14.76L23.87 14.76L23.88 14.76L23.88 14.76L23.89 14.76L23.9 14.76L23.9 14.76L23.91 14.77L23.91 14.77L23.92 14.77L23.92 14.77L23.93 14.78L23.93 14.78L23.94 14.78L23.94 14.79L23.95 14.79L23.95 14.79L23.96 14.8L23.96 14.8L23.96 14.81L23.97 14.81L23.97 14.82L23.97 14.82L23.98 14.83L23.98 14.83L23.98 14.84L23.99 14.84L23.99 14.85L23.99 14.85L23.99 14.86L23.99 14.86L24 14.87L24 14.87L24 14.88L24 14.89L24 14.89L24 14.9L24 14.9L24 17.29L24 17.3L24 17.31L24 17.31L24 17.32L24 17.32L24 17.33L23.99 17.34L23.99 17.34L23.99 17.35L23.99 17.35L23.99 17.36L23.98 17.36L23.98 17.37L23.98 17.37L23.97 17.38L23.97 17.38L23.97 17.39L23.96 17.39L23.96 17.4L23.96 17.4L23.95 17.4L23.95 17.41L23.94 17.41L23.94 17.41L23.93 17.42L23.93 17.42L23.92 17.42L23.92 17.43L23.91 17.43L23.91 17.43L23.9 17.43L23.9 17.44L23.89 17.44L23.88 17.44L23.88 17.44L23.87 17.44L23.87 17.44L23.86 17.44L23.85 17.44L23.85 17.44L20.78 17.44L20.78 20.43L20.78 20.44L20.78 20.44L20.78 20.45L20.78 20.45L20.78 20.46L20.78 20.47L20.78 20.47L20.78 20.48L20.77 20.48L20.77 20.49L20.77 20.49L20.77 20.5L20.76 20.5L20.76 20.51L20.76 20.51L20.75 20.52L20.75 20.52L20.75 20.53L20.74 20.53L20.74 20.54L20.74 20.54L20.73 20.54L20.73 20.55L20.72 20.55L20.72 20.55L20.71 20.56L20.71 20.56L20.7 20.56L20.7 20.56L20.69 20.57L20.69 20.57L20.68 20.57L20.67 20.57L20.67 20.57L20.66 20.58L20.66 20.58L20.65 20.58L20.64 20.58L20.64 20.58L20.63 20.58L18.18 20.58L18.18 20.58L18.17 20.58L18.16 20.58L18.16 20.58L18.15 20.58L18.14 20.57L18.14 20.57L18.13 20.57L18.13 20.57L18.12 20.57L18.12 20.56L18.11 20.56L18.11 20.56L18.1 20.56L18.1 20.55L18.09 20.55L18.09 20.55L18.08 20.54L18.08 20.54L18.07 20.54L18.07 20.53L18.07 20.53L18.06 20.52L18.06 20.52L18.05 20.51L18.05 20.51L18.05 20.5L18.05 20.5L18.04 20.49L18.04 20.49L18.04 20.48L18.04 20.48L18.03 20.47L18.03 20.47L18.03 20.46L18.03 20.45L18.03 20.45L18.03 20.44L18.03 20.44L18.03 20.43L18.03 17.44L14.97 17.44L14.96 17.44L14.95 17.44L14.95 17.44L14.94 17.44L14.94 17.44L14.93 17.44L14.92 17.44L14.92 17.44L14.91 17.43L14.91 17.43L14.9 17.43L14.9 17.43L14.89 17.42L14.89 17.42L14.88 17.42L14.88 17.41L14.87 17.41L14.87 17.41L14.86 17.4L14.86 17.4L14.85 17.4L14.85 17.39L14.85 17.39L14.84 17.38L14.84 17.38L14.84 17.37L14.83 17.37L14.83 17.36L14.83 17.36L14.82 17.35L14.82 17.35L14.82 17.34L14.82 17.34L14.82 17.33L14.82 17.32L14.81 17.32L14.81 17.31L14.81 17.31L14.81 17.3L14.81 17.29L14.81 14.9L14.81 14.9L14.81 14.89L14.81 14.89L14.81 14.88L14.82 14.87L14.82 14.87L14.82 14.86L14.82 14.86L14.82 14.85L14.82 14.85L14.83 14.84L14.83 14.84L14.83 14.83L14.84 14.83L14.84 14.82L14.84 14.82L14.85 14.81L14.85 14.81L14.85 14.8L14.86 14.8L14.86 14.79L14.87 14.79L14.87 14.79L14.88 14.78L14.88 14.78L14.89 14.78L14.89 14.77L14.9 14.77L14.9 14.77L14.91 14.77L14.91 14.76L14.92 14.76L14.92 14.76L14.93 14.76L14.94 14.76L14.94 14.76L14.95 14.76L14.95 14.76L14.96 14.76L14.97 14.76L18.03 14.76L18.03 11.77L18.03 11.76L18.03 11.76L18.03 11.75L18.03 11.74L18.03 11.74L18.03 11.73L18.03 11.73L18.04 11.72L18.04 11.72L18.04 11.71L18.04 11.71L18.05 11.7L18.05 11.69L18.05 11.69L18.05 11.69L18.06 11.68L18.06 11.68L18.07 11.67L18.07 11.67L18.07 11.66L18.08 11.66L18.08 11.66L18.09 11.65L18.09 11.65L18.1 11.64L18.1 11.64L18.11 11.64L18.11 11.64L18.12 11.63L18.12 11.63L18.13 11.63L18.13 11.63L18.14 11.63L18.14 11.62L18.15 11.62L18.16 11.62L18.16 11.62L18.17 11.62L18.18 11.62L18.18 11.62L20.63 11.62L20.64 11.62L20.64 11.62L20.64 11.62L20.65 11.62ZM10.9 12.66L4.02 8.8L4.02 16.48L10.9 20.35L10.9 20.35L10.9 12.66ZM12.08 10.65L14.24 9.45L18.88 6.84L12.05 3L12.05 10.68L12.05 10.68L12.05 10.68L12.08 10.65Z"

export default {
  components: {MapCacheArticle},
  data () {
    return {
      selectedArticle: null,
      sections: [
        {
          title: 'GeoPackage',
          icon: mdiPackageVariant,
          color: 'primary',
          articles: [
            {
              title: `<b>What is</b> a GeoPackage?`,
              article: {
                title: 'What is a GeoPackage?',
                introduction: 'GeoPackage is an open, standards-based, platform-independent, portable, self-describing, compact format for transferring geospatial information. Under the hood it is a SQLite database that utilizes a well defined table structure to store geospatial information.',
                sections: [{
                  title: 'GeoPackage capabilities',
                  paragraph: '<ul><li>Vector features</li><li>Tile matrix sets of imagery and raster maps at various scales</li><li>Attributes (non-spatial data)</li><li>Extensions</li></ul>',
                  tabItems: [
                    {
                      title: 'Features',
                      paragraph: 'Vector features are used to describe the world. Buildings, roads, lakes, boundaries, etc. MapCache allows you to add feature layers and populate them in several ways. You can draw the features yourself or you can import features from web services (WFS and ArcGIS FS) or geospatial files (GeoJSON, KML, and Shapefile)'
                    },
                    {
                      title: 'Imagery',
                      paragraph: 'GeoPackage supports storage of imagery/raster in tile sets. These tile sets are defined to help the map understand the position and resolution of the data. MapCache let\'s users import imagery from web services (WMS, WMTS, and XYZ) or geospatial files (GeoTIFF, and zipped XYZ file structures). MapCache then let\'s users create their own GeoPackage imagery layers by simply selecting their layers, the bounds, and the zoom levels.'
                    },
                    {
                      title: 'Attributes',
                      paragraph: 'As nice as features can look on the map, sometimes there is critical information needed to better understand what we see. GeoPackage provides the ability to store information related to these features such as text, numbers, and even media. MapCache opens the door to understanding your data by allowing users to add fields, edit content, and attach files and images.'
                    },
                    {
                      title: 'Extensions',
                      paragraph: 'GeoPackage has many extensions and MapCache makes use of several of them, such as the NGA style extension and the related tables extension. The NGA style extension provides a simple style spec, allowing users to provide context to their features, using icons and color. The related tables extension provides users the ability to attach media such as images, video, and other files to their features.'
                    }
                  ]
                },
                {
                  title: 'GeoPackage Libraries',
                  paragraph: 'MapCache utilizes the NGA\'s OGC Certified GeoPackage Javascript SDK, but the NGA also provides SDKs in Java, Android, and iOS.',
                },
                {
                  title: 'Portability',
                  paragraph: 'GeoPackage is the choice of MapCache for it\'s portability. Your maps and information live in a file that can go wherever you go. The MapCache suite of products includes an Android and iOS applications, so you can view and edit your GeoPackages on the go.',
                }]
              }
            },
            {
              title: `<b>Create</b> a GeoPackage`,
              article: {
                title: 'Create a GeoPackage',
                introduction: 'MapCache provides users the ability to create a GeoPackage with the click of a button. As the container that will house all of your features and imagery, creating a GeoPackage is the first step to creating your map.',
                sections: [
                  {
                    title: 'How to create a GeoPackage in MapCache',
                    paragraph: `In your project, navigate to the <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg> GeoPackages section of the side panel. At the bottom, click the add GeoPackage button <svg width="22px" height="22" viewBox="0 0 24 24" style="margin-bottom: -6px;"><path d="${addGeoPackagePath}"></path></svg>. You'll be provided with the option to import an existing GeoPackage from your computer or add a new GeoPackage. Click the <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPlus}"></path></svg> button. A file dialog will appear and you can specify the name of your GeoPackage and where to save it on your computer.`,
                    image: '/images/documentation/geopackage_articles/create_geopackage.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Rename</b> a GeoPackage`,
              article: {
                title: 'Rename a GeoPackage',
                introduction: '',
                sections: [
                  {
                    title: 'How to remove a GeoPackage in MapCache',
                    paragraph: `In your project, navigate to the <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg> GeoPackages section of the side panel. Click on your GeoPackage and the GeoPackage information will be displayed.`,
                    image: '/images/documentation/geopackage_articles/select_geopackage.jpg'
                  },
                  {
                    paragraph: `Click the rename <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg> button and a dialog will appear.`,
                    image: '/images/documentation/geopackage_articles/rename_geopackage.jpg',
                  },
                  {
                    paragraph: `Enter the new name for your GeoPackage and click the <b>Rename</b> button.`,
                    image: '/images/documentation/geopackage_articles/rename_geopackage_dialog.jpg',
                  }
                ],
              }
            },
            {
              title: `<b>Remove</b> a GeoPackage`,
              article: {
                title: 'Remove a GeoPackage',
                introduction: 'You\'ve made your map and shipped it out and prefer to keep a tidy workplace. When that time comes, it is okay to remove your GeoPackage from your project. This process simply removes the reference to that file in MapCache, but your GeoPackage will still remain on your computer.',
                sections: [
                  {
                    title: 'How to remove a GeoPackage in MapCache',
                    paragraph: `In your project, navigate to the <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg> GeoPackages section of the side panel. Click on your GeoPackage and the GeoPackage information will be displayed.`,
                    image: '/images/documentation/geopackage_articles/select_geopackage.jpg'
                  },
                  {
                    paragraph: `Click the remove <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg> button and a dialog will appear.`,
                    image: '/images/documentation/geopackage_articles/remove_geopackage.jpg',
                  },
                  {
                    paragraph: `Confirm that you wish to remove this GeoPackage from MapCache by clicking the confirm button.`,
                    image: '/images/documentation/geopackage_articles/remove_geopackage_dialog.jpg',
                    note: 'Removing the GeoPackage will not delete it from your computer. It only removes the reference to the file in MapCache.'
                  }
                ],
              }
            },
            {
              title: `<b>Access</b> your GeoPackage <b>outside</b> of MapCache`,
              article: {
                title: 'Access your GeoPackage outside of MapCache',
                introduction: 'If you can\'t remember where you saved your GeoPackage on your computer, MapCache can help you find it.',
                sections: [
                  {
                    paragraph: `In your project, navigate to the <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg> GeoPackages section of the side panel. Click on your GeoPackage and the GeoPackage information will be displayed.`,
                    image: '/images/documentation/geopackage_articles/select_geopackage.jpg'
                  },
                  {
                    paragraph: `Click the show <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiFolder}"></path></svg> button and your GeoPackage will be highlighted in your computer's file explorer.`,
                    image: '/images/documentation/geopackage_articles/show_geopackage.jpg',
                  }
                ],
              }
            }
          ]
        },
        {
          title: 'Feature layer',
          image: '/images/polygon.png',
          color: 'primary',
          no_divider: true,
          articles: [
            {
              title: `TODO: <b>What is</b> a GeoPackage feature layer?`,
              article: {
                title: 'What is a GeoPackage feature?',
                introduction: '',
                sections: [],
              }
            },
            {
              title: `TODO: <b>Manage</b> a GeoPackage feature layer`,
              article: {
                title: 'Manage a GeoPackage feature layer',
                introduction: '',
                sections: [],
              }
            },
            {
              title: `TODO: <b>Create</b> a GeoPackage feature layer`,
              article: {
                title: 'Create a GeoPackage feature layer',
                introduction: '',
                sections: [],
              }
            },
            {
              title: `TODO: <b>Delete</b> a GeoPackage feature layer`,
              article: {
                title: 'Delete a GeoPackage feature layer',
                introduction: '',
                sections: [],
              }
            },
          ]
        },
        {
          title: 'Tile layer',
          image: '/images/colored_layers.png',
          color: 'primary',
          no_divider: true,
          articles: [
            {
              title: `TODO: <b>What is</b> a GeoPackage tile layer?`,
              article: {
                title: 'What is a GeoPackage tile layer?',
                introduction: 'In the simplest terms, a GeoPackage tile layer is where imagery/raster data is stored.',
                sections: [
                    'Advanced definition'
                ],
              }
            },
            {
              title: `TODO: <b>Create</b> a GeoPackage tile layer`,
              article: {
                title: 'Create a a GeoPackage tile layer',
                introduction: '',
                sections: [],
              }
            },
          ]
        },
        {
          title: 'Data source',
          icon: mdiLayersOutline,
          color: 'primary',
          articles: [
            {
              title: `<b>What</b> is a data source?`,
              article: {
                title: 'What is a data source?',
                introduction: 'A data source is any geospatial file or service in which vector features or imagery/raster tiles can be extracted. The data provided by these sources can be imported/downloaded into MapCache for use in creating GeoPackages.',
                sections: [
                  {
                    title: `What files and services does MapCache support?`,
                    paragraph: `MapCache handles several file formats and web services for importing features and tiles.`,
                    tabHeight: 116,
                    tabItems: [
                      {
                        title: 'Feature files',
                        paragraph: `<ul><li>GeoJSON (.json)</li><li>Shapefiles (.shp, .zip)</li><li>KML/KMZ - Placemarks (.kml, .kmz)</li></ul>`
                      },
                      {
                        title: 'Feature services',
                        paragraph: `<ul><li>OpenStreetMap Overpass API</li><li>Web Feature Service (WFS)</li><li>ArcGIS Feature Service</li></ul>`
                      },
                      {
                        title: 'Tile files',
                        paragraph: `<ul><li>KML/KMZ - Ground Overlays (.kml, .kmz)</li><li>GeoTIFF (.tif)</li><li>XYZ Tiles (.zip)</li><li>MBTiles (.mbtiles)</li></ul>`
                      },
                      {
                        title: 'Tile services',
                        paragraph: `<ul><li>Web Map Service (WMS)</li><li>Web Map Tile Service (WMTS)</li><li>XYZ Tile Service</li></ul>`
                      }
                    ]
                  },
                  {
                    title: 'Does modifying a data source affect the original files or modify content on the server?',
                    paragraph: `No. MapCache will never modify the original files or content on the server.`
                  },
                  {
                    title: 'What does MapCache do with imported features?',
                    paragraph: `When a user imports a file or connects to a service that returns features, MapCache will convert that data (it's geometry, associated properties, and styles) into an internal GeoPackage feature layer. That data will then be able to be displayed on the map, searched using a feature table, and used in the creation of GeoPackage feature and tile layers.`
                  },
                  {
                    title: 'What does MapCache do with imported imagery/raster data?',
                    paragraph: `Imagery/raster data files are copied and stored in the user's data directory. This data is then accessed when displayed on the map or when used to create a GeoPackage tile layer. In the case of web services, MapCache requests data as needed to be displayed on the map or to be used in the creation of a GeoPackage tile layer.`
                  }
                ]
              }
            },
            {
              title: `TODO: <b>Style</b> a data source`,
              article: {
                title: 'Style a data source',
                introduction: 'Your data sources can provide a lot of information, but visually some of that information isn\'t immediately apparent. Styling your points, lines and polygons, manipulating GeoTIFFs, and specifying opacity are all ways you can bring your data to life.',
                sections: [
                  {
                    title: `How to style a data source?`,
                    paragraph: `In the data sources <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg> section, click on your data source, and you will see the management view.`,
                    image: '/images/documentation/datasource_articles/click_data_source.jpg',
                  },
                  {
                    paragraph: `In the management view, click on the style button.`,
                    image: '/images/documentation/datasource_articles/style_button.jpg',
                    tabItems: [
                      {
                        title: 'Vector styling',
                        section: {
                          title: `Vector styling`,
                          paragraph: `The video below demonstrates how to create a vector style and apply it to all features of a particular geometry type (Polygon).`,
                          video: '/images/documentation/datasource_articles/vector_styling.webm',
                        }
                      },
                      {
                        title: 'Tile styling',
                        section: {
                          title: `Tile styling`,
                          paragraph: ``,
                          video: '',
                        }
                      },
                      {
                        title: 'GeoTIFF styling',
                        section: {
                          title: `GeoTIFF styling`,
                          paragraph: ``,
                          video: '',
                        }
                      }],
                    tabHeight: 600
                  },
                ],
              }
            },
            {
              title: `<b>Add</b> a data source`,
              article: {
                title: 'Add a data source',
                introduction: 'Not all geospatial data is represented using the same format. In fact, there are dozens of formats for representing geospatial data. There are also web services that host this data and provide mechanisms for retrieving data. MapCache looks to consolidate your data, allowing you to import various data formats and web services, in order to create your map using GeoPackage. Follow the guide below to see a few ways in which you can add your data into MapCache.',
                sections: [
                  {
                    title: `How to add a data source?`,
                    paragraph: `In the data sources <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg> section, click the add data source <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersPlus}"></path></svg> button to reveal several methods for adding data sources.`,
                    image: '/images/documentation/datasource_articles/add_data_source_button.jpg',
                    tabItems: [
                      {
                        title: 'File',
                        section: {
                          title: `Importing a supported file type`,
                          paragraph: `Click on the import from file <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiFileDocumentOutline}"></path></svg> button and an open file dialog will appear. Select a supported file type (such as KML, GeoJSON, Shapefile, or GeoTIFF). The video below shows the import of a shapefile zip.`,
                          video: '/images/documentation/datasource_articles/file_source.webm',
                          note: 'The source file(s) are copied to a temporary directory for the data to be extracted. The original file(s) are never modified.'
                        }
                      },
                      {
                        title: 'Url',
                        section: {
                          title: `Adding a supported web service url`,
                          paragraph: `Click on the import from file <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCloudDownloadOutline}"></path></svg> button and watch the guided process shown in the video below.`,
                          video: '/images/documentation/datasource_articles/web_service.webm',
                          note: 'Verify the service\'s terms of use prior to importing into MapCache.'
                        }
                      },
                      {
                        title: 'Overpass',
                        section: {
                          title: `Adding OpenStreetMap data using the Overpass API`,
                          paragraph: `Click on the import from file <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiSteering}"></path></svg> button and watch the guided process shown in the video below.`,
                          video: '/images/documentation/datasource_articles/overpass.webm',
                          note: 'This service is not meant to download large areas of data. The Overpass API will prevent excessively large downloads. If a larger area is needed, visit https://planet.openstreetmap.org/ for more information.'
                        }
                      }],
                    tabHeight: 600
                  },
                ],
              }
            },
            {
              title: `<b>Export</b> directly to GeoPackage`,
              article: {
                title: 'Export directly to GeoPackage',
                introduction: 'This functionality is only available for data sources containing vector features. MapCache will copy the underlying GeoPackage to a location of your choosing. It will then be automatically imported under the GeoPackages section.',
                sections: [
                  {
                    paragraph: `In your project, navigate to the data sources <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg> section of the side panel. Click on the feature <img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/> data source you wish to export to open its management view. Click on the export <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiExportVariant}"></path></svg> button. A file dialog will appear and you can specify the name of your GeoPackage and where to save it on your computer.`,
                    image: '/images/documentation/datasource_articles/export.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Manage</b> a data source`,
              article: {
                title: 'Manage a data source',
                introduction: `Need to style your data source, view the features, or even delete it? Accessing the data source management view will provide you with this functionality and more.`,
                sections: [
                  {
                    paragraph: `In your project, navigate to the data sources <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg> section of the side panel. Click on the data source you wish to manage and the management view will be displayed.`,
                    image: '/images/documentation/datasource_articles/click_data_source.jpg'
                  },
                  {
                    paragraph: `Depending on the type of the data source, different functionality will be available. The image below shows the options for a feature layer.`,
                    image: '/images/documentation/datasource_articles/manage_data_source.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Zoom to</b> the extent of a data source?`,
              article: {
                title: 'Zoom to the extent of a data source',
                introduction: `While navigating the map, you may find that you've moved too far away from your data source and want to quickly get back. Luckily, anywhere you see the vector <img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/> symbol or tile <img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/> symbol, you can click on that to zoom to your data source. Below are a few places where you'll find those symbols.`,
                sections: [
                  {
                    paragraph: `In your project, navigate to the data sources <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg> section of the side panel. Scroll down until you find your layer and click on the vector or tile symbol.`,
                    image: '/images/documentation/datasource_articles/zoom_list.jpg'
                  },
                  {
                    paragraph: `You can also navigate to your data source's management view and click the symbol in the top left.`,
                    image: '/images/documentation/datasource_articles/zoom_data_source.jpg'
                  },
                  {
                    paragraph: `If you'd rather not navigate to the data sources section, on the map, if you click on the layer order button, each data source listed will also include their symbol.`,
                    image: '/images/documentation/datasource_articles/zoom_map_layer.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Remove</b> a data source`,
              article: {
                title: 'Remove a data source',
                introduction: 'Removing a data source will remove the reference in MapCache and any files that were generated during the import process. The web service and/or the original files used for import are not affected.',
                sections: [
                  {
                    paragraph: `In your project, navigate to the data sources <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg> section of the side panel. Click on the data source you wish to manage and the management view will be displayed.`,
                    image: '/images/documentation/datasource_articles/remove_data_source.jpg'
                  },
                  {
                    paragraph: `Click the remove <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg> button and a dialog will appear. Click confirm to delete.`,
                    image: '/images/documentation/datasource_articles/confirm_remove_data_source.jpg'
                  }
                ],
              }
            },
          ]
        },
        {
          title: 'Map',
          icon: mdiMapOutline,
          color: 'primary',
          articles: [
            {
              title: `<b>How</b> do I <b>change</b> my base map?`,
              article: {
                title: 'How do I change my base map?',
                introduction: 'Different problems may require different information. Adjusting your base map can help provide the information you need to get started on your task.',
                sections: [
                  {
                    paragraph: `To change your base map, you'll first need to click on the <b>base map</b> map control`,
                    image: '/images/documentation/map_articles/base_map_control.jpg'
                  },
                  {
                    paragraph: `Then a list of your available base maps will appear. Select the base map you wish to use and the map will be updated.`,
                    image: '/images/documentation/map_articles/base_map_selection.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>How</b> do I <b>display</b> a grid overlay?`,
              article: {
                title: 'How do I display a grid overlay?',
                introduction: 'Grid overlays help to provide spatial awareness. They help you dive down to the area or place you need to be to start building your map.',
                sections: [
                  {
                    paragraph: `To display a grid overlay, you'll first need to click on the <b>grid overlay</b> map control`,
                    image: '/images/documentation/map_articles/grid_map_control.jpg'
                  },
                  {
                    paragraph: `Then a list of your available grid overlays will appear. Select the grid overlay you wish to use and the map will be updated.`,
                    image: '/images/documentation/map_articles/select_grid_overlay.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Search</b> the map for content`,
              article: {
                title: 'Search the map for content?',
                introduction: 'While creating a map, there may be times where a landmark, building, or street address is needed. You might also be interested in what something on the map is. This can all be done in MapCache thanks to OpenStreetMap nominatim service.',
                sections: [
                  {
                    title: 'Search bar',
                    paragraph: `Searching the map by panning and zooming works pretty well, but there are times where you need to navigate to a specific location on the earth. Using the search bar you can find what you're looking for by entering it's name of address. Watch the video below for an example of how to do this.`,
                    video: '/images/documentation/map_articles/map_search.webm'
                  },
                  {
                    title: `What's here?`,
                    paragraph: `If you're interested in finding out what a building is or the name of a street, the <b>What's here</b> feature will help you out. Follow the guide below on how to use this feature.`,
                    video: '/images/documentation/map_articles/whats_here.webm'
                  }
                ],
              }
            },
            {
              title: `<b>Arrange</b> map layers`,
              article: {
                title: 'Arrange map layers',
                sections: [
                  {
                    paragraph: `All layers that have been enabled will be displayed on the map. The maps are initially ordered in the manner in which they are enabled, where the last enabled layer is shown on top. If you need to adjust the layer order you can click on the layer order <svg style="margin-bottom: -6px;" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g><rect fill="none" height="602" width="802" y="-1" x="-1"/></g><g><path d="m8.33641,16.13578l6.81733,-5.30751l1.51908,-1.17636l-8.33641,-6.48387l-8.33641,6.48387l1.50982,1.17636m6.82659,7.66023l-6.83586,-5.30751l-1.50055,1.1671l8.33641,6.48387l8.33641,-6.48387l-1.50982,-1.17636l-6.82659,5.31678z"/><g fill="currentColor" id="svg_4"><path fill="currentColor" id="svg_1" d="m18.26648,11.39818l5.73352,-0.01077l-2.87463,-4.83841l-2.85889,4.84918z"/><path fill="currentColor" id="svg_3" d="m23.99987,12.62895l-5.73339,-0.04327l2.83508,4.86532l2.89831,-4.82205z"/></g></g></svg> button and the layer order will appear.`,
                    image: '/images/documentation/map_articles/layer_order.jpg',
                  },
                  {
                    paragraph: `As we can see the XYZ tile layer is displayed on top of the buildings layer and the rivers layers. If we'd like the features to be displayed, we can drag the XYZ layer to the bottom, as shown below.`,
                    video: '/images/documentation/map_articles/order_layers.webm'
                  },
                ],
              }
            },
            {
              title: `<b>Clear all</b> map layers`,
              article: {
                title: 'Clear all map layers',
                introduction: `To clear all map layers, you could navigate to each layer and disable them, or you can click the clear layers <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="width: 24px; height: 24px; margin-bottom: -7px;"><path fill="currentColor" d="M3.27,1L2,2.27L6.22,6.5L3,9L4.63,10.27L12,16L14.1,14.37L15.53,15.8L12,18.54L4.63,12.81L3,14.07L12,21.07L16.95,17.22L20.73,21L22,19.73L3.27,1M19.36,10.27L21,9L12,2L9.09,4.27L16.96,12.15L19.36,10.27M19.81,15L21,14.07L19.57,12.64L18.38,13.56L19.81,15Z"/></svg> button on the map.`,
                sections: [
                  {
                    image: '/images/documentation/map_articles/clear_layers.jpg'
                  },
                ],
              }
            },
            {
              title: `<b>View</b> the cursor's <b>coordinates</b>`,
              article: {
                title: `View the cursor's coordinates on the map`,
                introduction: `As you move your mouse's cursor around the map, the coordinates associated with your cursor update. If you have the coordinates map control enabled (enabled by default), the coordinates will be displayed in the bottom right of the map. If you need to copy the coordinates, you can right click the map and a context menu will appear. Click on the coordinates in one of the several formats and that text will be copied to your clipboard.`,
                sections: [
                  {
                    image: '/images/documentation/map_articles/map_coordinates.jpg'
                  },
                ],
              }
            },
            {
              title: `<b>Zoom to</b> extent of all map layers?`,
              article: {
                title: 'Zoom to the extent of all visible map layers ',
                introduction: `Clicking on the zoom to extent <svg xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px; margin-bottom: -7px;" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,12H17V15H14V17H19V12M7,9H10V7H5V12H7V9M21,3H3A2,2 0 0,0 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5A2,2 0 0,0 21,3M21,19H3V5H21V19Z" /></svg> button will move the map so that all of your visible layers, both data sources and GeoPackage layers, are visible.`,
                sections: [
                  {
                    image: '/images/documentation/map_articles/zoom_to_extent.jpg'
                  },
                ],
              }
            }
          ]
        },
      ],
    }
  }
}
</script>

<style scoped>
 .fs-11 {
   font-size: 11pt;
 }
 .link-color {
   color: #326482;
 }
 .link-color:active {
   color: #37A5AC;
 }
</style>