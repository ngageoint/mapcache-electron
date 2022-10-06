<template>
  <map-cache-section :sections="sections"></map-cache-section>
</template>

<script>
import MapCacheSection from './MapCacheSection'
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
  mdiExportVariant,
  mdiOpenInNew,
  mdiTableEye,
  mdiDragHorizontalVariant,
  mdiPalette,
  mdiPaperclip,
  mdiContentCopy,
  mdiSpeedometer,
  mdiInformationOutline,
  mdiCameraOutline, mdiLock
} from '@mdi/js'

const addGeoPackagePath = "M12.2 0.55L12.25 0.56L12.3 0.57L12.35 0.58L12.39 0.59L12.44 0.61L12.49 0.63L12.53 0.65L12.57 0.67L12.62 0.69L12.66 0.72L12.7 0.75L21.75 5.83L21.8 5.86L21.84 5.89L21.89 5.92L21.93 5.95L21.97 5.98L22.01 6.02L22.05 6.06L22.08 6.09L22.09 6.11L22.12 6.12L22.37 6.5L22.4 6.62L22.42 6.66L22.45 6.78L22.45 6.86L22.47 6.97L22.45 7.09L22.45 9.67L22.45 9.68L22.45 9.78L22.45 9.8L22.45 9.86L22.43 9.86L22.42 9.92L22.35 10.02L22.24 10.1L22.11 10.12L20.26 10.12L20.13 10.1L20.02 10.02L19.95 9.92L19.94 9.86L19.92 9.86L19.92 9.8L19.92 9.78L19.92 9.68L19.92 9.67L19.92 8.79L13.87 12.16L13.3 12.49L13.3 20.29L14.4 19.67L14.46 19.65L14.51 19.62L14.51 19.63L14.55 19.62L14.7 19.63L14.84 19.7L14.94 19.82L15.68 21.12L15.72 21.27L15.71 21.42L15.64 21.56L15.56 21.63L15.57 21.65L14.41 22.3L14.39 22.31L14.3 22.35L12.66 23.28L12.66 23.28L12.62 23.31L12.57 23.33L12.53 23.35L12.49 23.37L12.44 23.39L12.39 23.41L12.35 23.42L12.3 23.43L12.25 23.44L12.2 23.45L12.15 23.46L12.1 23.46L12.05 23.46L11.99 23.46L11.94 23.46L11.89 23.45L11.84 23.44L11.79 23.43L11.74 23.42L11.7 23.41L11.65 23.39L11.6 23.37L11.56 23.35L11.52 23.33L11.47 23.31L11.43 23.28L11.39 23.25L2.34 18.17L2.26 18.12L2.19 18.07L2.12 18.02L2.06 17.96L2 17.89L1.94 17.82L1.9 17.75L1.85 17.68L1.82 17.6L1.79 17.51L1.76 17.43L1.74 17.34L1.73 17.25L1.73 17.16L1.73 10.81L1.66 10.85L1.58 10.88L1.5 10.91L1.42 10.93L1.33 10.95L1.25 10.95L1.17 10.96L1.08 10.96L1 10.95L0.91 10.93L0.83 10.91L0.75 10.88L0.66 10.85L0.58 10.81L0.47 10.73L0.36 10.65L0.27 10.55L0.19 10.45L0.13 10.34L0.08 10.23L0.04 10.11L0.01 9.99L0 9.86L0 9.73L0.02 9.61L0.05 9.48L0.1 9.36L0.16 9.24L1.88 6.27L1.91 6.22L1.94 6.18L1.97 6.13L2 6.09L2.04 6.05L2.08 6.01L2.11 5.98L2.15 5.94L2.2 5.91L2.24 5.88L2.28 5.86L2.33 5.83L2.37 5.81L2.42 5.79L11.39 0.75L11.43 0.72L11.47 0.69L11.52 0.67L11.56 0.65L11.6 0.63L11.65 0.61L11.7 0.59L11.74 0.58L11.79 0.57L11.84 0.56L11.89 0.55L11.94 0.54L11.99 0.54L12.05 0.54L12.1 0.54L12.15 0.54L12.15 0.54L12.2 0.55ZM20.65 11.62L20.66 11.62L20.66 11.62L20.67 11.62L20.67 11.63L20.68 11.63L20.69 11.63L20.69 11.63L20.7 11.63L20.7 11.64L20.71 11.64L20.71 11.64L20.72 11.64L20.72 11.65L20.73 11.65L20.73 11.66L20.74 11.66L20.74 11.66L20.74 11.67L20.75 11.67L20.75 11.68L20.75 11.68L20.76 11.69L20.76 11.69L20.76 11.69L20.77 11.7L20.77 11.71L20.77 11.71L20.77 11.72L20.78 11.72L20.78 11.73L20.78 11.73L20.78 11.74L20.78 11.74L20.78 11.75L20.78 11.76L20.78 11.76L20.78 11.77L20.78 14.76L23.85 14.76L23.85 14.76L23.86 14.76L23.87 14.76L23.87 14.76L23.88 14.76L23.88 14.76L23.89 14.76L23.9 14.76L23.9 14.76L23.91 14.77L23.91 14.77L23.92 14.77L23.92 14.77L23.93 14.78L23.93 14.78L23.94 14.78L23.94 14.79L23.95 14.79L23.95 14.79L23.96 14.8L23.96 14.8L23.96 14.81L23.97 14.81L23.97 14.82L23.97 14.82L23.98 14.83L23.98 14.83L23.98 14.84L23.99 14.84L23.99 14.85L23.99 14.85L23.99 14.86L23.99 14.86L24 14.87L24 14.87L24 14.88L24 14.89L24 14.89L24 14.9L24 14.9L24 17.29L24 17.3L24 17.31L24 17.31L24 17.32L24 17.32L24 17.33L23.99 17.34L23.99 17.34L23.99 17.35L23.99 17.35L23.99 17.36L23.98 17.36L23.98 17.37L23.98 17.37L23.97 17.38L23.97 17.38L23.97 17.39L23.96 17.39L23.96 17.4L23.96 17.4L23.95 17.4L23.95 17.41L23.94 17.41L23.94 17.41L23.93 17.42L23.93 17.42L23.92 17.42L23.92 17.43L23.91 17.43L23.91 17.43L23.9 17.43L23.9 17.44L23.89 17.44L23.88 17.44L23.88 17.44L23.87 17.44L23.87 17.44L23.86 17.44L23.85 17.44L23.85 17.44L20.78 17.44L20.78 20.43L20.78 20.44L20.78 20.44L20.78 20.45L20.78 20.45L20.78 20.46L20.78 20.47L20.78 20.47L20.78 20.48L20.77 20.48L20.77 20.49L20.77 20.49L20.77 20.5L20.76 20.5L20.76 20.51L20.76 20.51L20.75 20.52L20.75 20.52L20.75 20.53L20.74 20.53L20.74 20.54L20.74 20.54L20.73 20.54L20.73 20.55L20.72 20.55L20.72 20.55L20.71 20.56L20.71 20.56L20.7 20.56L20.7 20.56L20.69 20.57L20.69 20.57L20.68 20.57L20.67 20.57L20.67 20.57L20.66 20.58L20.66 20.58L20.65 20.58L20.64 20.58L20.64 20.58L20.63 20.58L18.18 20.58L18.18 20.58L18.17 20.58L18.16 20.58L18.16 20.58L18.15 20.58L18.14 20.57L18.14 20.57L18.13 20.57L18.13 20.57L18.12 20.57L18.12 20.56L18.11 20.56L18.11 20.56L18.1 20.56L18.1 20.55L18.09 20.55L18.09 20.55L18.08 20.54L18.08 20.54L18.07 20.54L18.07 20.53L18.07 20.53L18.06 20.52L18.06 20.52L18.05 20.51L18.05 20.51L18.05 20.5L18.05 20.5L18.04 20.49L18.04 20.49L18.04 20.48L18.04 20.48L18.03 20.47L18.03 20.47L18.03 20.46L18.03 20.45L18.03 20.45L18.03 20.44L18.03 20.44L18.03 20.43L18.03 17.44L14.97 17.44L14.96 17.44L14.95 17.44L14.95 17.44L14.94 17.44L14.94 17.44L14.93 17.44L14.92 17.44L14.92 17.44L14.91 17.43L14.91 17.43L14.9 17.43L14.9 17.43L14.89 17.42L14.89 17.42L14.88 17.42L14.88 17.41L14.87 17.41L14.87 17.41L14.86 17.4L14.86 17.4L14.85 17.4L14.85 17.39L14.85 17.39L14.84 17.38L14.84 17.38L14.84 17.37L14.83 17.37L14.83 17.36L14.83 17.36L14.82 17.35L14.82 17.35L14.82 17.34L14.82 17.34L14.82 17.33L14.82 17.32L14.81 17.32L14.81 17.31L14.81 17.31L14.81 17.3L14.81 17.29L14.81 14.9L14.81 14.9L14.81 14.89L14.81 14.89L14.81 14.88L14.82 14.87L14.82 14.87L14.82 14.86L14.82 14.86L14.82 14.85L14.82 14.85L14.83 14.84L14.83 14.84L14.83 14.83L14.84 14.83L14.84 14.82L14.84 14.82L14.85 14.81L14.85 14.81L14.85 14.8L14.86 14.8L14.86 14.79L14.87 14.79L14.87 14.79L14.88 14.78L14.88 14.78L14.89 14.78L14.89 14.77L14.9 14.77L14.9 14.77L14.91 14.77L14.91 14.76L14.92 14.76L14.92 14.76L14.93 14.76L14.94 14.76L14.94 14.76L14.95 14.76L14.95 14.76L14.96 14.76L14.97 14.76L18.03 14.76L18.03 11.77L18.03 11.76L18.03 11.76L18.03 11.75L18.03 11.74L18.03 11.74L18.03 11.73L18.03 11.73L18.04 11.72L18.04 11.72L18.04 11.71L18.04 11.71L18.05 11.7L18.05 11.69L18.05 11.69L18.05 11.69L18.06 11.68L18.06 11.68L18.07 11.67L18.07 11.67L18.07 11.66L18.08 11.66L18.08 11.66L18.09 11.65L18.09 11.65L18.1 11.64L18.1 11.64L18.11 11.64L18.11 11.64L18.12 11.63L18.12 11.63L18.13 11.63L18.13 11.63L18.14 11.63L18.14 11.62L18.15 11.62L18.16 11.62L18.16 11.62L18.17 11.62L18.18 11.62L18.18 11.62L20.63 11.62L20.64 11.62L20.64 11.62L20.64 11.62L20.65 11.62ZM10.9 12.66L4.02 8.8L4.02 16.48L10.9 20.35L10.9 20.35L10.9 12.66ZM12.08 10.65L14.24 9.45L18.88 6.84L12.05 3L12.05 10.68L12.05 10.68L12.05 10.68L12.08 10.65Z"

export default {
  components: { MapCacheSection },
  data () {
    return {
      sections: [
        {
          title: 'GeoPackage',
          icon: mdiPackageVariant,
          color: 'primary',
          articles: [
            {
              title: `<strong>What is</strong>&nbsp;a GeoPackage?`,
              order: 0,
              introduction: 'GeoPackage is an open, standards-based, platform-independent, portable, self-describing, compact format for transferring geospatial information. Under the hood it is a SQLite database that utilizes a well defined table structure to store geospatial information.',
              sections: [
                {
                  title: 'GeoPackage capabilities',
                  paragraph: '<ul><li>Vector features</li><li>Tile matrix sets of imagery and raster maps at various scales</li><li>Attributes (non-spatial data)</li><li>Extensions</li></ul>',
                  tabItems: [
                    {
                      title: 'Features',
                      paragraph: 'Vector features are used to describe the world. Buildings, roads, lakes, boundaries, etc. MapCache allows users to add feature layers and populate them in several ways. Features can be drawn in the application or they can be imported from web services (WFS and ArcGIS FS) or geospatial files (GeoJSON, KML, and Shapefile)'
                    },
                    {
                      title: 'Imagery',
                      paragraph: 'GeoPackage supports storage of imagery/raster in tile sets. These tile sets are defined to help the map understand the position and resolution of the data. MapCache lets users import imagery from web services (WMS, WMTS, and XYZ) or geospatial files (GeoTIFF, and zipped XYZ file structures). MapCache then let\'s users create their own GeoPackage imagery layers by simply selecting their layers, the bounds, and the zoom levels.'
                    },
                    {
                      title: 'Attributes',
                      paragraph: 'As nice as features can look on the map, sometimes there is critical information needed to better understand those features. GeoPackage provides the ability to store information related to these features such as text, numbers, and even media. MapCache opens the door to understanding feature data by allowing users to add fields, edit content, and attach files and images.'
                    },
                    {
                      title: 'Extensions',
                      paragraph: 'GeoPackage has many extensions and MapCache makes use of several of them, such as the NGA style extension and the related tables extension. The NGA style extension provides a simple style spec, allowing users to provide context to their features, using icons and color. The related tables extension provides users the ability to attach media such as images, video, and other files to their features.'
                    }
                  ]
                },
                {
                  title: 'GeoPackage Libraries',
                  paragraph: 'MapCache utilizes the NGA\'s OGC (Open Geospatial Consortium) Certified GeoPackage Javascript SDK, but the NGA also provides SDKs in Java, Android, and iOS.',
                },
                {
                  title: 'Portability',
                  paragraph: 'GeoPackage is the choice of MapCache for it\'s portability. The maps and information are stored in a single file, making it easy to share and transport. The MapCache suite of products includes Android and iOS applications, allowing users to view and edit those GeoPackages on their phone.',
                }
              ]
            },
            {
              title: `<strong>Create</strong>&nbsp;a GeoPackage`,
              order: 2,
              introduction: 'MapCache provides users the ability to create a GeoPackage with the click of a button. GeoPackage is the container for features and imagery, and creating a GeoPackage is the first step to building and aggregating map layers.',
              sections: [
                {
                  title: 'How to create a GeoPackage in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. At the bottom, click the&nbsp;<strong>Add GeoPackage</strong>&nbsp;<svg width="22px" height="22" viewBox="0 0 24 24" style="margin-bottom: -6px;"><path d="${addGeoPackagePath}"></path></svg>&nbsp;button. There will be an option to import an existing GeoPackage from the computer or add a new GeoPackage. Click the&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPlus}"></path></svg>&nbsp;button. A file dialog will appear. Enter the name of the GeoPackage and where to save it on the computer.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_02/image_01.jpg'
                }
              ],
            },
            {
              title: `<strong>View</strong>&nbsp;GeoPackage&nbsp;<strong>details</strong>`,
              order: 4,
              introduction: 'Advanced users may wish to see some internal details of a GeoPackage. These details include table information and spatial reference systems.',
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage and the GeoPackage management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_03/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Details</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiInformationOutline}"></path></svg>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_03/image_02.jpg',
                },
                {
                  paragraph: `A dialog will appear with the GeoPackage's internal details.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_03/image_03.jpg',
                }
              ],
            },
            {
              title: `<strong>Access</strong>&nbsp;a GeoPackage&nbsp;<strong>outside</strong>&nbsp;of MapCache`,
              order: 6,
              introduction: 'To show the folder where the GeoPackage file exists, follow the instructions below.',
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage and the GeoPackage management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_04/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Show</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiFolder}"></path></svg>&nbsp;button and the GeoPackage will be highlighted in the computer's file explorer.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_04/image_02.jpg',
                }
              ],
            },
            {
              title: `<strong>Rename</strong>&nbsp;a GeoPackage`,
              order: 1,
              sections: [
                {
                  title: 'How to rename a GeoPackage in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage and the GeoPackage information will be displayed.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_05/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Rename</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_05/image_02.jpg',
                },
                {
                  paragraph: `Enter the new name for the GeoPackage and click the&nbsp;<strong>Rename</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_05/image_03.jpg',
                }
              ],
            },
            {
              title: `<strong>Copy</strong>&nbsp;a GeoPackage`,
              order: 3,
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage and the GeoPackage's management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_06/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Copy</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiContentCopy}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_06/image_02.jpg',
                },
                {
                  paragraph: `Enter the filename for the copy and click the&nbsp;<strong>Copy</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_06/image_03.jpg',
                }
              ],
            },
            {
              title: `<strong>Remove</strong>&nbsp;a GeoPackage`,
              order: 5,
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage and the GeoPackage's management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_07/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Remove</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_07/image_02.jpg',
                },
                {
                  paragraph: `Confirm by clicking the&nbsp;<strong>Remove</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/geopackage/article_07/image_03.jpg',
                  note: 'Removing the GeoPackage will not delete it from the computer. It only removes the reference to the file in MapCache.'
                }
              ],
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
              title: `<strong>What is</strong>&nbsp;a GeoPackage feature layer?`,
              order: 0,
              introduction: 'A GeoPackage feature layer represents a collection of vector features and optionally, attributes and/or media associated with those features.',
              note: `Within MapCache, feature layers are indicated by the&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;symbol.`,
              sections: [
                {
                  title: 'What is vector feature?',
                  paragraph: 'A vector feature is a point, line, polygon or other geometrical shape where the vertices are represented by coordinates on the Earth.'
                },
                {
                  title: 'What attributes can a vector feature have?',
                  paragraph: 'Vector features can have any number of attributes, such as a name, description, etc. The attributes can be any of the following types: <br/><ul><li>Text</li><li>Number</li><li>Checkbox (true/false)</li><li>Date</li><li>Date and Time</li></ul>'
                },
                {
                  title: 'What about media?',
                  paragraph: 'GeoPackage allows for any file to be associated with a vector feature, however, MapCache is only able to display content of certain file types, shown below.<br/><ul><li>Images (.png, .jpg, .gif, .svg, .bmp)</li><li>Videos (.mp4, .ogg, .webm)</li><li>Audio (.mp3, .mp4)</li><li>Other files (.pdf, .xml, .json, .txt, .html)</li></ul>'
                },
              ],
            },
            {
              order: 2,
              title: `<strong>Create</strong>&nbsp;feature layer`,
              sections: [
                {
                  paragraph: `Creating a GeoPackage feature layer can be a complicated process, but MapCache looks to simplify this process by providing a step-by-step guide. In order to get started, navigate to the GeoPackages&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section in the side panel and select a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_01.jpg'
                },
                {
                  paragraph: `Click on the&nbsp;<strong>Add layer</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersPlus}"></path></svg>&nbsp;button at the bottom of the view. This will present two options, one for creating a feature layer&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;and the other for creating a tile layer&nbsp;<img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;. Click on the&nbsp;<strong>Add feature layer</strong>&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;option.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_02.jpg'
                },
                {
                  paragraph: `The step-by-step guide will now be displayed. Start by entering the name of the feature layer.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_03.jpg'
                },
                {
                  paragraph: `Next, select zero or more data source layers. The features in these layers will be included in the&nbsp;<strong>Buildings</strong>&nbsp;GeoPackage feature layer.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_04.jpg'
                },
                {
                  paragraph: `Next, select zero or more existing GeoPackage feature layers to include in the&nbsp;<strong>Buildings</strong>&nbsp;GeoPackage feature layer`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_05.jpg',
                  note: 'A GeoPackage feature layer can be created without any features by not selecting any data source layers or existing GeoPackage feature layers.'
                },
                {
                  paragraph: `Next, the order of the selected layers can be set. The order will help decide which features get drawn first.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_06.jpg'
                },
                {
                  paragraph: `Optionally, users can set the bounds of the GeoPackage feature layer. Setting the bounds will filter any feature that does not intersect the bounds.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_02/video_01.webm'
                },
                {
                  paragraph: `A summary of the GeoPackage feature layer will be displayed. Click the&nbsp;<strong>Add</strong>&nbsp;button to create the feature layer.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_02/image_07.jpg'
                },
                {
                  paragraph: `The feature layer creation process is demonstrated in the video below.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_02/video_02.webm'
                }
              ],
            },
            {
              order: 4,
              title: `<strong>Manage</strong>&nbsp;feature layer`,
              introduction: `MapCache provides many ways to manage a feature layer. Need to apply a style, view features, copy or rename the layer? See the instructions below for accessing the GeoPackage feature layer management view.`,
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel and click on a GeoPackage containing a feature layer.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_03/image_01.jpg'
                },
                {
                  paragraph: `Next, click on a feature layer to manage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_03/image_02.jpg'
                },
                {
                  paragraph: `This will display the management view, where several management functions can be performed.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_03/image_03.jpg',
                }
              ],
            },
            {
              order: 6,
              title: `<strong>Rename</strong>&nbsp;feature layer`,
              sections: [
                {
                  title: 'How to rename a GeoPackage feature layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_04/image_01.jpg'
                },
                {
                  paragraph: `Select a feature layer and the GeoPackage feature layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_04/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Rename</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_04/image_03.jpg',
                },
                {
                  paragraph: `Enter the new name for the GeoPackage feature layer and click the&nbsp;<strong>Rename</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_04/image_04.jpg',
                }
              ],
            },
            {
              order: 8,
              title: `<strong>Zoom to</strong>&nbsp;the extent of a feature layer`,
              introduction: `Need to quickly navigate the map to the bounds of a feature layer? In MapCache, any vector&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;symbol can be clicked and will zoom to the associated feature layer's bounds. Below are a few places where these symbols can be found.`,
              sections: [
                {
                  paragraph: `In the project, navigate to the GeoPackage&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage to display its layers.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_05/image_01.jpg'
                },
                {
                  paragraph: `Look for a feature layer and click on the&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;symbol.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_05/image_02.jpg'
                },
                {
                  paragraph: `Navigate to the feature layer's management view and click the symbol in the top left.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_05/image_03.jpg',
                },
                {
                  paragraph: `Clicking on the&nbsp;<strong>Layer order</strong>&nbsp;<svg style="margin-bottom: -6px;" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g><rect fill="none" height="602" width="802" y="-1" x="-1"/></g><g><path d="m8.33641,16.13578l6.81733,-5.30751l1.51908,-1.17636l-8.33641,-6.48387l-8.33641,6.48387l1.50982,1.17636m6.82659,7.66023l-6.83586,-5.30751l-1.50055,1.1671l8.33641,6.48387l8.33641,-6.48387l-1.50982,-1.17636l-6.82659,5.31678z"/><g fill="currentColor" id="svg_4"><path fill="currentColor" id="svg_1" d="m18.26648,11.39818l5.73352,-0.01077l-2.87463,-4.83841l-2.85889,4.84918z"/><path fill="currentColor" id="svg_3" d="m23.99987,12.62895l-5.73339,-0.04327l2.83508,4.86532l2.89831,-4.82205z"/></g></g></svg>&nbsp;button, each data source listed will also include their symbol.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_05/image_04.jpg'
                }
              ],
            },
            {
              order: 10,
              title: `<strong>Index</strong>&nbsp;feature layer`,
              introduction: 'Indexing a feature layer improves the performance of searching for features based on their geometry, which improves the time it takes MapCache to display a layer on the map.',
              sections: [
                {
                  title: 'How to index a GeoPackage feature layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_06/image_01.jpg',
                  note: 'A feature layer only needs to be indexed once and any GeoPackage feature layer created in MapCache will already be indexed.'
                },
                {
                  paragraph: `Select a feature layer and the GeoPackage feature layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_06/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Index</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiSpeedometer}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_06/image_03.jpg',
                },
                {
                  paragraph: `Indexing may take some time depending on how many features are in the layer. See the video below for a demonstration of indexing a feature layer.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_06/video_01.webm',
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Copy</strong>&nbsp;feature layer`,
              sections: [
                {
                  title: 'How to copy a GeoPackage feature layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_07/image_01.jpg'
                },
                {
                  paragraph: `Select the feature layer to copy and the GeoPackage feature layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_07/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Copy</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiContentCopy}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_07/image_03.jpg',
                },
                {
                  paragraph: `Enter the name for the copied GeoPackage feature layer and click the&nbsp;<strong>Copy</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_07/image_04.jpg',
                }
              ],
            },
            {
              order: 3,
              title: `<strong>Manage</strong>&nbsp;fields`,
              introduction: 'The feature data in a GeoPackage can be much more than shapes on a map. All kinds of information can be added to describe those features.',
              sections: [
                {
                  title: 'How to manage a GeoPackage feature layer\'s fields in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_01.jpg'
                },
                {
                  paragraph: `Select a feature layer.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_02.jpg',
                },
                {
                  paragraph: `Below is the field management view. In this view fields can be created and managed.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_03.jpg',
                },
                {
                  title: 'Adding a field',
                  paragraph: `Adding a field to a feature layer enables additional information to be provided for each feature. Taking a look at the&nbsp;<strong>Buildings</strong>&nbsp;layer (added in a previous section), it already has several fields defined. A user can add more fields by clicking on the&nbsp;<strong>Add Field</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_04.jpg',
                },
                {
                  paragraph: `In the&nbsp;<strong>Add field</strong>&nbsp;dialog a user can enter the name of the field and specify its type. As a sample case, a user may wish to express whether a building is damaged. Calling the field&nbsp;<strong>damage</strong>&nbsp;and selecting the&nbsp;<strong>checkbox</strong>&nbsp;type will allow the user to specify if a building is damaged or not. Once the field has been configured, click the&nbsp;<strong>Save</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_05.jpg',
                },
                {
                  paragraph: `The field will now be listed in the fields section and be available to set when editing features.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_06.jpg',
                },
                {
                  title: 'Ordering fields',
                  paragraph: `The order of the fields determines their order in the feature view as well as the feature table view. Click and drag the field using the&nbsp;<strong>Drag</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiDragHorizontalVariant}"></path></svg>&nbsp;icon.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_08/video_01.webm',
                },
                {
                  title: 'Manage a field',
                  paragraph: `Click on a field to display the management view.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_07.jpg',
                },
                {
                  title: 'Rename a field',
                  paragraph: `Click the&nbsp;<strong>Rename</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear. Enter the new name and click the&nbsp;<strong>Rename</strong>&nbsp;button to save the change.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_08.jpg',
                },
                {
                  title: 'Deleting a field',
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a confirmation dialog will appear. Click the&nbsp;<strong>Delete</strong>&nbsp;button to confirm. This action is permanent and can't be undone.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_08/image_09.jpg',
                  note: 'Deleting a field will erase all data previously stored in that field for each feature in the layer.'
                }
              ],
            },
            {
              order: 5,
              title: `<strong>Using</strong>&nbsp;the feature table view`,
              introduction: 'The feature table view is a powerful tool for navigating a feature layer\'s data. It allows users to search across all the layer\'s fields as well as sort the results. It helps identify features on the map by highlighting features under the mouse\'s cursor. Users can also zoom directly to a feature by double clicking. When it comes to interacting with a feature layer, the table view is a necessary component to understand.',
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel and click on a GeoPackage containing feature layers.`,
                  image: `/images/documentation/using_mapcache/feature_layer/article_09/image_01.jpg`
                },
                {
                  paragraph: `Select a feature layer from the list.`,
                  image: `/images/documentation/using_mapcache/feature_layer/article_09/image_02.jpg`
                },
                {
                  paragraph: `Click on the&nbsp;<strong>View features</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTableEye}"></path></svg>&nbsp;button.`,
                  image: `/images/documentation/using_mapcache/feature_layer/article_09/image_03.jpg`
                },
                {
                  paragraph: `The feature table will first appear in the map view. The feature table can be viewed in a separate window by clicking the&nbsp;<strong>Pop out</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiOpenInNew}"></path></svg>&nbsp;button.`,
                  image: `/images/documentation/using_mapcache/feature_layer/article_09/image_04.jpg`
                },
                {
                  paragraph: `Taking a closer look at the feature table, now popped out, there are several actions for interacting with the data.`,
                  image: `/images/documentation/using_mapcache/feature_layer/article_09/image_05.jpg`
                },
                {
                  paragraph: `These actions include:<ul><li>Searching features</li><li>Sorting and arranging fields</li><li>Deleting features</li><li>Adjusting the page and page size</li><li>Viewing features (click)</li><li>Zooming to a feature (double click)</li></ul><br/>Below is a more detailed explanation of each of these actions.`,
                },
                {
                  title: `Searching features`,
                  paragraph: `Searching features is a powerful capability that can help users find a specific feature within a large data set. Given a feature set that contains a field with identifiable information, it can be much easier to search using that information rather than looking for it on the map or scrolling through pages of features.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_09/video_01.webm'
                },
                {
                  title: `Sorting and arranging fields`,
                  paragraph: `Sorting the data is a great way to look for trends and arranging fields helps to put specific information into view.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_09/video_02.webm'
                },
                {
                  title: `Deleting features`,
                  paragraph: `Deleting features one at a time can be cumbersome. MapCache's feature table provides a way to delete multiple features, at once. Follow the video below to see how.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_09/video_03.webm',
                  note: `Deleting features from here is a permanent action and can't be undone. The GeoPackage on the file system will be modified.`
                },
                {
                  title: `Adjusting the page and page size`,
                  paragraph: `MapCache lets users specify how many features they wish to see on a page. Users can also move from the first page to the last page in a single click.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_09/video_04.webm'
                },
                {
                  title: `Viewing and zooming to features`,
                  paragraph: `Like the features on the map, features in the table view are interactive. Clicking on a feature will show it's feature management view and double clicking on a feature will zoom to it on the map.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_09/video_05.webm'
                },
              ],
            },
            {
              order: 7,
              title: `<strong>Manage</strong>&nbsp;features`,
              introduction: `Feature management is an important tool to keep features up-to-date. MapCache provides a couple of mechanisms for accessing a feature's management view. First, clicking on a feature on the map and second, clicking on a row in the feature table.`,
              sections: [
                {
                  title: 'Access feature management view',
                  paragraph: 'Clicking on a feature on the map will display its management view. Additionally, recall the instructions for viewing a feature layer\'s features in the table view. Clicking on a feature in the table will also display its management view.',
                  image: '/images/documentation/using_mapcache/feature_layer/article_10/image_01.jpg'
                },
                {
                  paragraph: `There are several actions that can be done from the feature's management view, they include: <ul><li>Zooming to the feature on the map</li><li>Editing</li><li>Styling</li><li>Attaching files</li><li>Deleting</li></ul>`,
                },
                {
                  paragraph: `The following sections will describe each of these actions.`,
                },
                {
                  title: 'Zooming to the feature',
                  paragraph: `Clicking on the feature's styled shape designator in the top left of the management view will zoom the map onto that feature.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_10/image_02.jpg'
                },
                {
                  title: 'Editing a feature',
                  paragraph: `Clicking the&nbsp;<strong>Edit</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button will allow fields to become editable and the geometry of the field will be editable on the map. Watch the video below on how to edit a feature and save those changes.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_10/video_01.webm'
                },
                {
                  title: 'Styling a feature',
                  paragraph: `Clicking the&nbsp;<strong>Style</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPalette}"></path></svg>&nbsp;button will display a dialog allowing users to select a style from the available styles. The video below demonstrates this action.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_10/video_02.webm'
                },
                {
                  title: 'Attaching files',
                  paragraph: `Clicking the&nbsp;<strong>Attach</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPaperclip}"></path></svg>&nbsp;button will display the media attachement dialog. This dialog allows users to add and remove file attachments to a feature. The video below shows adding an image to a feature.`,
                  video: '/images/documentation/using_mapcache/feature_layer/article_10/video_03.webm'
                },
                {
                  title: 'Deleting a feature',
                  paragraph: `Clicking the&nbsp;<strong>Delete</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button will display a dialog allowing users to permanently delete the feature.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_10/image_03.jpg',
                  note: 'Deleting a feature is a permanent action and removes it from the GeoPackage feature layer. This action can\'t be undone.'
                },
              ],
            },
            {
              order: 9,
              title: `<strong>Delete</strong>&nbsp;feature layer`,
              sections: [
                {
                  title: 'How to delete a GeoPackage feature layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_11/image_01.jpg'
                },
                {
                  paragraph: `Select a feature layer and the GeoPackage feature layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_11/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_11/image_03.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;button to confirm.`,
                  image: '/images/documentation/using_mapcache/feature_layer/article_11/image_04.jpg',
                  note: 'Deleting a feature layer is a permanent action. The layer will be removed from the underlying GeoPackage file on the computer.'
                }
              ],
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
              order: 0,
              title: `<strong>What is</strong>&nbsp;a GeoPackage tile layer?`,
              introduction: `A GeoPackage tile layer is where imagery/raster data is stored. The data is stored in a tile pyramid. A&nbsp;<strong>Tile pyramid</strong>&nbsp;refers to the concept of a pyramid structure of tiles of different spatial extent and resolution at different zoom levels, and the tile data itself. This concept can be broken down into simpler terms. When viewing a map of the world at zoom level zero, only continents and oceans can be seen. As the zoom level increases, more and more detail is provided and more tiles are needed to represent all of that additional information.`,
              sections: [
                {
                  paragraph: `Most web based maps utilize a web mercator map. Web mercator is a projection that allows the world to be viewed in a square view. This view can be broken down into tiles and as the zoom level increase, in order to capture more detail, the number of tiles quadruples. At zoom level zero there is 1 tile, at zoom level one there are 4 tiles, at zoom level two there are 16 tiles, etc...`,
                  note: 'MapCache only supports generating GeoPackage tile layers in web mercator, currently.'
                },
                {
                  paragraph: `In MapCache, imagery and raster data can be imported from a variety of sources. Some of those sources require an internet connection to access, such as WMS, WMTS, and XYZ tile servers. By creating a GeoPackage tile layer, the tiles from those web services can be stored for offline use.`
                }
              ],
            },
            {
              order: 2,
              title: `<strong>Create</strong>&nbsp;tile layer`,
              sections: [
                {
                  paragraph: `MapCache provides a step-by-step guide for creating a tile layer. In order to get started, navigate to the GeoPackages&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section in the side panel and select a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_01.jpg'
                },
                {
                  paragraph: `Click on the&nbsp;<strong>Add layer</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersPlus}"></path></svg>&nbsp;button at the bottom of the view. This will present two options, one for creating a feature layer&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;and the other for creating a tile layer&nbsp;<img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;. Click on the&nbsp;<strong>Add tile layer</strong>&nbsp;<img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;option.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_02.jpg'
                },
                {
                  paragraph: `The step-by-step guide will now be displayed. Start by entering the name for the tile layer.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_03.jpg'
                },
                {
                  paragraph: `Select zero or more data source layers to include in the&nbsp;<strong>Imagery</strong>&nbsp;GeoPackage tile layer.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_04.jpg'
                },
                {
                  paragraph: `Select zero or more existing GeoPackage layers to include in the&nbsp;<strong>Imagery</strong>&nbsp;GeoPackage tile layer.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_05.jpg',
                  note: 'A GeoPackage tile layer must include at least one data source or GeoPackage layer to be created.'
                },
                {
                  paragraph: `After selecting the layers, specify the order in which they are rendered. The layer on the top is drawn on top.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_06.jpg'
                },
                {
                  paragraph: `Once the layers are ordered, specify the target projection.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_07.jpg',
                  note: 'The standard projection for web map tiles is Web Mercator (EPSG:3857).'
                },
                {
                  paragraph: `Specify the bounds of the GeoPackage tile layer.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_08.jpg',
                  note: 'Keep in mind that the larger this area is, the more tiles will need to be generated at lower zoom levels. This will result in a larger GeoPackage file size.'
                },
                {
                  paragraph: `Once the bounds are specified, adjust the zoom levels for the GeoPackage tile layer. The allowed zoom levels are between 0 and 20.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_09.jpg',
                  note: 'The higher the max zoom level, the more tiles will be generated.'
                },
                {
                  paragraph: `If there are large number of tiles, that would be generated, but a particular zoom range,&nbsp;<strong>tile scaling</strong>&nbsp;can be enabled. Tile scaling reduces the number of tiles generated and stored in the GeoPackage tile layer by scaling tiles at nearby zoom levels.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_10.jpg',
                  note: 'Some of the tiles may be less detailed due to scaling and there could be unintended visual artifacts from feature layers.'
                },
                {
                  paragraph: `The Summary gives an indication of how many tiles will be generated. If the number is very large, a warning will be displayed.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_11.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Add</strong>&nbsp;button and the layer creation process will begin. The progress will be shown, as seen below.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_12.jpg'
                },
                {
                  paragraph: `Once complete, the tile layer will be available to view on the map.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_02/image_13.jpg'
                }
              ],
            },
            {
              order: 4,
              title: `<strong>Manage</strong>&nbsp;tile layer`,
              introduction: `Need to view the tiles, copy or rename the layer? See the instructions below for accessing the GeoPackage tile layer management view.`,
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel and click on a GeoPackage containing a tile layer.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_03/image_01.jpg'
                },
                {
                  paragraph: `Next, click on a tile layer to manage.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_03/image_02.jpg'
                },
                {
                  paragraph: `This will display the management view, which provides several management functions.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_03/image_03.jpg',
                }
              ],
            },
            {
              order: 6,
              title: `<strong>Zoom to</strong>&nbsp;the extent of a tile layer`,
              introduction: `Need to quickly navigate the map to the bounds of a tile layer? In MapCache, any tile&nbsp;<img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;symbol can be clicked and will zoom to the associated tile layer's bounds. Below are a few places where these symbols can be found.`,
              sections: [
                {
                  paragraph: `In the project, navigate to the GeoPackage&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage containing a tile layer.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_04/image_01.jpg'
                },
                {
                  paragraph: `Find the tile layer and click on the&nbsp;<img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;symbol.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_04/image_02.jpg'
                },
                {
                  paragraph: `Navigate to the tile layer's management view and click the symbol in the top left.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_04/image_03.jpg',
                },
                {
                  paragraph: `Clicking on the&nbsp;<strong>Layer order</strong>&nbsp;<svg style="margin-bottom: -6px;" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g><rect fill="none" height="602" width="802" y="-1" x="-1"/></g><g><path d="m8.33641,16.13578l6.81733,-5.30751l1.51908,-1.17636l-8.33641,-6.48387l-8.33641,6.48387l1.50982,1.17636m6.82659,7.66023l-6.83586,-5.30751l-1.50055,1.1671l8.33641,6.48387l8.33641,-6.48387l-1.50982,-1.17636l-6.82659,5.31678z"/><g fill="currentColor" id="svg_4"><path fill="currentColor" id="svg_1" d="m18.26648,11.39818l5.73352,-0.01077l-2.87463,-4.83841l-2.85889,4.84918z"/><path fill="currentColor" id="svg_3" d="m23.99987,12.62895l-5.73339,-0.04327l2.83508,4.86532l2.89831,-4.82205z"/></g></g></svg>&nbsp;button, each data source listed will also include their symbol.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_04/image_04.jpg'
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Rename</strong>&nbsp;tile layer`,
              sections: [
                {
                  title: 'How to rename a GeoPackage tile layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_05/image_01.jpg'
                },
                {
                  paragraph: `Select a tile layer and the GeoPackage tile layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_05/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Rename</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_05/image_03.jpg',
                },
                {
                  paragraph: `Enter the new name for the GeoPackage tile layer and click the&nbsp;<strong>Rename</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_05/image_04.jpg',
                }
              ],
            },
            {
              order: 3,
              title: `<strong>Copy</strong>&nbsp;tile layer`,
              sections: [
                {
                  title: 'How to copy a GeoPackage tile layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_06/image_01.jpg'
                },
                {
                  paragraph: `Select a tile layer and the GeoPackage tile layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_06/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Copy</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiContentCopy}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_06/image_03.jpg',
                },
                {
                  paragraph: `Enter the name for the GeoPackage tile layer copy and click the&nbsp;<strong>Copy</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_06/image_04.jpg',
                }
              ],
            },
            {
              order: 5,
              title: `<strong>Delete</strong>&nbsp;tile layer`,
              sections: [
                {
                  title: 'How to delete a GeoPackage tile layer in MapCache',
                  paragraph: `In the project, navigate to the&nbsp<strong>GeoPackages</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPackageVariant}"></path></svg>&nbsp;section of the side panel. Click on a GeoPackage.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_07/image_01.jpg'
                },
                {
                  paragraph: `Select the tile layer and the GeoPackage tile layer management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_07/image_02.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_07/image_03.jpg',
                },
                {
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;button to confirm.`,
                  image: '/images/documentation/using_mapcache/tile_layer/article_07/image_04.jpg',
                  note: 'Deleting a tile layer is a permanent action. The layer will be removed from the underlying GeoPackage file on the computer.'
                }
              ],
            },
          ]
        },
        {
          title: 'Data source',
          icon: mdiLayersOutline,
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>What</strong>&nbsp;is a data source?`,
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
            },
            {
              order: 2,
              title: `<strong>Add</strong>&nbsp;a data source`,
              introduction: 'Not all geospatial data is represented using the same format. In fact, there are dozens of formats for representing geospatial data. There are also web services that host this data and provide mechanisms for retrieving data. MapCache looks to consolidate this data, allowing users to import various data formats and web services, in order to aggregate this information into a GeoPackage. Follow the guide below to see a few ways in which data can be added to MapCache.',
              sections: [
                {
                  title: `How to add a data source?`,
                  paragraph: `In the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section, click the&nbsp;<strong>Add data source</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersPlus}"></path></svg>&nbsp;button to reveal several methods for adding data sources.`,
                  image: '/images/documentation/using_mapcache/data_source/article_02/image_01.jpg',
                  tabItems: [
                    {
                      title: 'File',
                      section: {
                        title: `Importing a supported file type`,
                        paragraph: `Click on the&nbsp;<strong>Import from file</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiFileDocumentOutline}"></path></svg>&nbsp;button and an open file dialog will appear. Select a supported file type (such as KML, GeoJSON, Shapefile, or GeoTIFF). The video below shows the import of a shapefile zip.`,
                        video: '/images/documentation/using_mapcache/data_source/article_02/video_01.webm',
                        note: 'The source file(s) are copied to a temporary directory for the data to be extracted. The original file(s) are never modified.'
                      }
                    },
                    {
                      title: 'Url',
                      section: {
                        title: `Adding a supported web service url`,
                        paragraph: `Click on the&nbsp;<strong>Download from URL</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCloudDownloadOutline}"></path></svg>&nbsp;button and watch the guided process shown in the video below.`,
                        video: '/images/documentation/using_mapcache/data_source/article_02/video_02.webm',
                        note: 'Verify the service\'s terms of use prior to importing into MapCache.'
                      }
                    }],
                  tabHeight: 600
                },
              ],
            },
            {
              order: 4,
              title: `<strong>Import</strong>&nbsp;features with&nbsp;<strong>Overpass</strong>`,
              introduction: `OpenStreetMap provides a rich, community-driven, data set; which is used to create the OSM BaseMaps that are available in MapCache. In addition to this, OpenStreetMap provides the Overpass API to make queries against that data set. This allows users to query for buildings, roads, or any feature they can see in the base map. Follow the directions below to see how MapCache supports importing features from OpenStreetMap.`,
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section, click the&nbsp;<strong>Add data source</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersPlus}"></path></svg>&nbsp;button and then click on the&nbsp;<strong>Download OpenStreetMap features with Overpass</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiSteering}"></path></svg>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_01.jpg'
                },
                {
                  paragraph: `Specify a name for this overpass import.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_02.jpg'
                },
                {
                  paragraph: `There are two methods for specifying content to download. The first is by <strong>Category</strong>. If this option is selected, a dropdown will allow for the selection of several categories of features to download, such as <strong>Roadways</strong> or <strong>Buildings</strong>.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_03.jpg'
                },
                {
                  paragraph: `Alternatively, the <strong>Search</strong> method allows for a more fine-grained search term, such as <strong>Building and type:way</strong>`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_04.jpg'
                },
                {
                  paragraph: `The <strong>Modify Query</strong> section provides advanced users the capability to edit the Overpass query directly. To make edits, click the <strong>Unlock</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLock}"></path></svg>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_05.jpg',
                  note: 'This operation is only recommended for those with Overpass QL experience. The output format is preset and can\'t be changed.'
                },
                {
                  paragraph: `Next, an area must be specified. If the area is larger than 10 square miles, the user will receive a warning.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_06.jpg'
                },
                {
                  paragraph: `Click the <strong>Import</strong> button to perform the request.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_07.jpg'
                },
                {
                  paragraph: `If a large number of results will be returned, a prompt appears requesting permission to continue.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_08.jpg',
                  note: 'The larger the number of results, the longer the processing will take.'
                },
                {
                  paragraph: `Once the data is fully processed, it will be available to view on the map.`,
                  image: '/images/documentation/using_mapcache/data_source/article_09/image_09.jpg'
                }
              ],
            },
            {
              order: 6,
              title: `<strong>Manage</strong>&nbsp;a data source`,
              introduction: `Need to style a data source, view the features, or even delete it? Accessing the data source management view will provide this functionality and more.`,
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section of the side panel. Click on the data source and the management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/data_source/article_03/image_01.jpg'
                },
                {
                  paragraph: `Depending on the type of the data source, different functionality will be available. The image below shows the options for a feature layer.`,
                  image: '/images/documentation/using_mapcache/data_source/article_03/image_02.jpg'
                }
              ],
            },
            {
              order: 8,
              title: `<strong>Rename</strong>&nbsp;a data source`,
              sections: [
                {
                  title: 'How to rename a data source in MapCache',
                  paragraph: `In the project, navigate to the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section of the side panel. Click on a data source and the data source management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/data_source/article_04/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Rename</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/data_source/article_04/image_02.jpg',
                },
                {
                  paragraph: `Enter the new name for the data source and click the&nbsp;<strong>Rename</strong>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/data_source/article_04/image_03.jpg',
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Style</strong>&nbsp;a data source`,
              introduction: 'Data sources can provide a lot of information, but visually some of that information isn\'t immediately apparent. Styling points, lines and polygons, manipulating GeoTIFFs, and specifying opacity are all ways to add valuable context.',
              sections: [
                {
                  title: `How to style a data source?`,
                  paragraph: `In the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section, click on a data source to show the management view.`,
                  image: '/images/documentation/using_mapcache/data_source/article_05/image_01.jpg',
                },
                {
                  paragraph: `In the management view, click on the&nbsp;<strong>Style</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPalette}"></path></svg>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/data_source/article_05/image_02.jpg',
                  tabItems: [
                    {
                      title: 'Vector styling',
                      section: {
                        title: `Vector styling`,
                        paragraph: `The video below demonstrates how to create a vector style and apply it to all features of a particular geometry type (Polygon).`,
                        video: '/images/documentation/using_mapcache/data_source/article_05/video_01.webm',
                      }
                    },
                    {
                      title: 'Opacity',
                      section: {
                        title: `Opacity`,
                        paragraph: `Imagery and raster data sources will typically cover layers beneath them. The layer's opacity can be adjusted to make it partially visible. Watch the video below to see how.`,
                        video: '/images/documentation/using_mapcache/data_source/article_05/video_02.webm',
                      }
                    },
                    {
                      title: 'GeoTIFF styling',
                      section: {
                        title: `GeoTIFF styling`,
                        paragraph: `The unique structure of the GeoTIFF format allows for use in a variety of ways, such as imagery and even digital elevation models. The video below demonstrates modifying the style of a GeoTIFF containing SRTM (Shuttle Radar Topography Mission) elevation data to remove some unnecessary information and adjust opacity so the base map is still visible.`,
                        video: '/images/documentation/using_mapcache/data_source/article_05/video_03.webm',
                      }
                    }],
                  tabHeight: 600
                },
              ],
            },
            {
              order: 3,
              title: `<strong>Export</strong>&nbsp;directly to GeoPackage`,
              introduction: 'This functionality is only available for data sources containing vector features. MapCache will copy the underlying GeoPackage to a user-specified location. It will then be automatically imported under the GeoPackages section.',
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section of the side panel. Click on a feature&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>data source to open its management view. Click on the&nbsp;<strong>Export</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiExportVariant}"></path></svg>&nbsp;button. A file dialog will appear in order to specify where to save the exported GeoPackage. Watch the video below to see export in action.`,
                  video: '/images/documentation/using_mapcache/data_source/article_06/video_01.webm'
                }
              ],
            },
            {
              order: 5,
              title: `<strong>Zoom to</strong>&nbsp;the extent of a data source`,
              introduction: `Need to quickly navigate the map to the bounds of a data source? In MapCache, any vector&nbsp;<img src="/images/polygon.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;or tile&nbsp;<img src="/images/colored_layers.png" style="max-width: 22px; max-height: 22px; margin-bottom: -5px;"/>&nbsp;symbol can be clicked and will zoom to the associated data source's bounds. Below are a few places where these symbols can be found.`,
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section of the side panel. Each layer has a vector or tile symbol.`,
                  image: '/images/documentation/using_mapcache/data_source/article_07/image_01.jpg'
                },
                {
                  paragraph: `Inside a data source's management view.`,
                  image: '/images/documentation/using_mapcache/data_source/article_07/image_02.jpg'
                },
                {
                  paragraph: `Clicking on the&nbsp;<strong>Layer order</strong>&nbsp;<svg style="margin-bottom: -6px;" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g><rect fill="none" height="602" width="802" y="-1" x="-1"/></g><g><path d="m8.33641,16.13578l6.81733,-5.30751l1.51908,-1.17636l-8.33641,-6.48387l-8.33641,6.48387l1.50982,1.17636m6.82659,7.66023l-6.83586,-5.30751l-1.50055,1.1671l8.33641,6.48387l8.33641,-6.48387l-1.50982,-1.17636l-6.82659,5.31678z"/><g fill="currentColor" id="svg_4"><path fill="currentColor" id="svg_1" d="m18.26648,11.39818l5.73352,-0.01077l-2.87463,-4.83841l-2.85889,4.84918z"/><path fill="currentColor" id="svg_3" d="m23.99987,12.62895l-5.73339,-0.04327l2.83508,4.86532l2.89831,-4.82205z"/></g></g></svg>&nbsp;button, each data source listed will also include their symbol.`,
                  image: '/images/documentation/using_mapcache/data_source/article_07/image_03.jpg'
                }
              ],
            },
            {
              order: 7,
              title: `<strong>Remove</strong>&nbsp;a data source`,
              introduction: 'Removing a data source will remove the reference in MapCache and any files that were generated during the import process. The web service and/or the original files used for import are not affected.',
              sections: [
                {
                  paragraph: `In the project, navigate to the&nbsp;<strong>Data sources</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiLayersOutline}"></path></svg>&nbsp;section of the side panel. Click on a data source and the management view will be displayed.`,
                  image: '/images/documentation/using_mapcache/data_source/article_08/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Remove</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a dialog will appear.`,
                  image: '/images/documentation/using_mapcache/data_source/article_08/image_02.jpg'
                },
                {
                  paragraph: `Click&nbsp;<strong>Remove</strong>&nbsp;to delete.`,
                  image: '/images/documentation/using_mapcache/data_source/article_08/image_03.jpg',
                }
              ],
            },
          ]
        },
        {
          title: 'Map',
          icon: mdiMapOutline,
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>Change</strong>&nbsp;the base map`,
              introduction: 'Changing the base map can provide different information about the world. For instance, the humanitarian base map provides visual elevation information.',
              sections: [
                {
                  paragraph: `To change a base map, click on the&nbsp;<strong>Base map</strong>&nbsp;<svg style="width:24px; height:24px; margin-bottom: -6px;" viewBox="0 0 24 24"><path fill="currentColor" d="M20.5,3L20.34,3.03L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21L3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19.03 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3M10,5.47L14,6.87V18.53L10,17.13V5.47M5,6.46L8,5.45V17.15L5,18.31V6.46M19,17.54L16,18.55V6.86L19,5.7V17.54Z" /></svg>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/map/article_01/image_01.jpg'
                },
                {
                  paragraph: `Then a list of available base maps will appear. Select a base map and the map will be updated.`,
                  image: '/images/documentation/using_mapcache/map/article_01/image_02.jpg'
                }
              ],
            },
            {
              order: 2,
              title: `<strong>Search</strong>&nbsp;the map for content`,
              introduction: 'MapCache provides two mechanism for searching the map. The&nbsp;<strong>Search bar</strong>&nbsp;and the&nbsp;<strong>What\'s here?</strong>&nbsp;button.',
              sections: [
                {
                  title: 'Search bar',
                  paragraph: `Searching the map by panning and zooming works pretty well, but there are times where it would be easier to navigate to a known specific location on the earth by providing its name. This can be done using the search bar. Watch the video below for an example of how to do this.`,
                  video: '/images/documentation/using_mapcache/map/article_02/video_01.webm'
                },
                {
                  title: `What's here?`,
                  paragraph: `Interested in finding out what a building is or the name of a street? The&nbsp;<strong>What's here</strong>&nbsp;feature can do just that. Follow the guide below on how to use this feature.`,
                  video: '/images/documentation/using_mapcache/map/article_02/video_02.webm'
                }
              ],
            },
            {
              order: 4,
              title: `Take a&nbsp;<strong>snapshot</strong>&nbsp;of the map`,
              introduction: `To take a snapshot of the map, click the&nbsp;<strong>Snapshot</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCameraOutline}"></path></svg>&nbsp;button on the map.`,
              sections: [
                {
                  image: '/images/documentation/using_mapcache/map/article_03/image_01.jpg'
                },
                {
                  paragraph: 'The resulting image includes all of the visible map layers and does not show any of the map controls.',
                  image: '/images/documentation/using_mapcache/map/article_03/image_02.jpg'
                },
              ],
            },
            {
              order: 6,
              title: `<strong>Clear all</strong>&nbsp;map layers`,
              introduction: `To clear all map layers, click the&nbsp;<strong>Clear layers</strong>&nbsp;<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="width: 24px; height: 24px; margin-bottom: -7px;"><path fill="currentColor" d="M3.27,1L2,2.27L6.22,6.5L3,9L4.63,10.27L12,16L14.1,14.37L15.53,15.8L12,18.54L4.63,12.81L3,14.07L12,21.07L16.95,17.22L20.73,21L22,19.73L3.27,1M19.36,10.27L21,9L12,2L9.09,4.27L16.96,12.15L19.36,10.27M19.81,15L21,14.07L19.57,12.64L18.38,13.56L19.81,15Z"/></svg>&nbsp;button on the map. This will remove all data sources and GeoPackage feature and tile layers from the map.`,
              sections: [
                {
                  image: '/images/documentation/using_mapcache/map/article_04/image_01.jpg'
                },
              ],
            },
            {
              order: 8,
              title: `<strong>Zoom to</strong>&nbsp;extent of all map layers`,
              introduction: `Clicking on the&nbsp;<strong>Zoom to extent</strong>&nbsp;<svg xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px; margin-bottom: -7px;" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,12H17V15H14V17H19V12M7,9H10V7H5V12H7V9M21,3H3A2,2 0 0,0 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5A2,2 0 0,0 21,3M21,19H3V5H21V19Z" /></svg>&nbsp;button will move the map so that all the visible layers, both data sources and GeoPackage layers, are visible.`,
              sections: [
                {
                  image: '/images/documentation/using_mapcache/map/article_05/image_01.jpg'
                },
              ],
            },
            {
              order: 1,
              title: `<strong>Display</strong>&nbsp;a grid overlay`,
              introduction: 'Grid overlays are useful in helping to locate positions and areas on the map.',
              sections: [
                {
                  paragraph: `To display a grid overlay, click on the&nbsp;<strong>Grid overlay</strong>&nbsp;<svg style="width:24px; height:24px; margin-bottom: -6px;" viewBox="0 0 24 24"><path fill="currentColor" d="M10,4V8H14V4H10M16,4V8H20V4H16M16,10V14H20V10H16M16,16V20H20V16H16M14,20V16H10V20H14M8,20V16H4V20H8M8,14V10H4V14H8M8,8V4H4V8H8M10,14H14V10H10V14M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4C2.92,22 2,21.1 2,20V4A2,2 0 0,1 4,2Z" /></svg>&nbsp;button.`,
                  image: '/images/documentation/using_mapcache/map/article_06/image_01.jpg'
                },
                {
                  paragraph: `Then a list of available grid overlays will appear. Select a grid overlay and the map will be updated.`,
                  image: '/images/documentation/using_mapcache/map/article_06/image_02.jpg'
                }
              ],
            },
            {
              order: 3,
              title: `<strong>Arrange</strong>&nbsp;map layers`,
              sections: [
                {
                  paragraph: `All layers that have been enabled will be displayed on the map. The maps are initially ordered in the manner in which they are enabled, where the last enabled layer is shown on top. To adjust the layer order, click on the&nbsp;<strong>Layer order</strong>&nbsp;<svg style="margin-bottom: -6px;" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g><rect fill="none" height="602" width="802" y="-1" x="-1"/></g><g><path d="m8.33641,16.13578l6.81733,-5.30751l1.51908,-1.17636l-8.33641,-6.48387l-8.33641,6.48387l1.50982,1.17636m6.82659,7.66023l-6.83586,-5.30751l-1.50055,1.1671l8.33641,6.48387l8.33641,-6.48387l-1.50982,-1.17636l-6.82659,5.31678z"/><g fill="currentColor" id="svg_4"><path fill="currentColor" id="svg_1" d="m18.26648,11.39818l5.73352,-0.01077l-2.87463,-4.83841l-2.85889,4.84918z"/><path fill="currentColor" id="svg_3" d="m23.99987,12.62895l-5.73339,-0.04327l2.83508,4.86532l2.89831,-4.82205z"/></g></g></svg>&nbsp;button and the layer order will appear.`,
                  image: '/images/documentation/using_mapcache/map/article_07/image_01.jpg',
                },
                {
                  paragraph: `In this example, the XYZ tile layer is displayed on top of the buildings layer and the rivers layers. If a user would prefer the features to be displayed, they can drag the XYZ layer to the bottom, as shown below.`,
                  video: '/images/documentation/using_mapcache/map/article_07/video_01.webm'
                },
              ],
            },
            {
              order: 5,
              title: `<strong>View</strong>&nbsp;the cursor's&nbsp;<strong>coordinates</strong>&nbsp`,
              introduction: `As the mouse's cursor is moved around the map, the coordinates associated with the cursor update. If the coordinates map control is enabled (enabled by default), the coordinates will be displayed in the bottom-left corner of the map, next to the distance scale. To copy the coordinates, right click the map and a context menu will appear. Click on the coordinates in one of the several formats and that text will be copied to the clipboard.`,
              sections: [
                {
                  image: '/images/documentation/using_mapcache/map/article_08/image_01.jpg'
                },
              ],
            },
            {
              order: 7,
              title: `<strong>Create</strong>&nbsp;range rings`,
              introduction: `MapCache provides an interactive dialog for creating ranged rings.`,
              sections: [
                {
                  paragraph: `To get started, click on the&nbsp;<strong>range ring</strong>&nbsp;<svg xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px; margin-bottom: -7px;" width="24" height="24" viewBox="0 0 24 24">  <path fill="currentColor" d="M16,8H14V11H11V13H14V16H16V13H19V11H16M2,12C2,9.21 3.64,6.8 6,5.68V3.5C2.5,4.76 0,8.09 0,12C0,15.91 2.5,19.24 6,20.5V18.32C3.64,17.2 2,14.79 2,12M15,3C10.04,3 6,7.04 6,12C6,16.96 10.04,21 15,21C19.96,21 24,16.96 24,12C24,7.04 19.96,3 15,3M15,19C11.14,19 8,15.86 8,12C8,8.14 11.14,5 15,5C18.86,5 22,8.14 22,12C22,15.86 18.86,19 15,19Z" /></svg>&nbsp;button on the map.`,
                  image: '/images/documentation/using_mapcache/map/article_09/image_01.jpg'
                },
                {
                  paragraph: `Watch the following video for a demonstration of creating ranged rings in MapCache.`,
                  video: '/images/documentation/using_mapcache/map/article_09/video_01.webm'
                },
              ],
            },
          ]
        },
      ],
    }
  }
}
</script>

<style scoped>
</style>