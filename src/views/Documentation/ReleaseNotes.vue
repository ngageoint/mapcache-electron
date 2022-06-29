<template>
  <v-sheet class="overflow-hidden">
    <v-card flat tile>
      <v-toolbar
          src="/images/documentation/toolbar.jpg"
          dark
          flat
          height="172">
        <v-row no-gutters class="justify-center mt-13" align="center" style="width: 100vw;">
          <h1>MapCache Release Notes</h1>
        </v-row>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-row no-gutters>
        <v-col cols="4">
          <v-row no-gutters class="pt-8">
            <h4 class="ml-4 mb-3">Release notes</h4>
          </v-row>
          <v-row v-for="item in releaseNotes" :key="item.title" no-gutters>
            <p class="fake-link allowselect ml-8 mt-1"
               :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}"
               @click="() => scrollToElement(item.title)">
              {{ item.title }}
            </p>
          </v-row>
        </v-col>
        <v-col cols="8" class="overflow-y-auto pt-4 pb-8" style="height: calc(100vh - 114px)">
          <v-row v-for="item in releaseNotes" :key="item.title" no-gutters :ref="item.title">
            <v-col cols="12" no-gutters class="mt-4">
              <h3>{{ item.title }}</h3>
            </v-col>
            <v-col cols="12" no-gutters class="mb-4">
              <h5>{{ item.releaseDate }}</h5>
            </v-col>
            <v-col cols="12">
              <v-row v-if="item.bugFixes && item.bugFixes.length > 0" no-gutters class="mb-4">
                <v-col cols="12" no-gutters class="mb-1">
                  <h4>Bug fixes</h4>
                </v-col>
                <ul>
                  <li v-for="(fix, i) in item.bugFixes" :key="i">
                    {{ fix }}
                  </li>
                </ul>
              </v-row>
            </v-col>
            <v-col cols="12">
              <v-row v-if="item.newFeatures && item.newFeatures.length > 0" no-gutters class="mb-4">
                <v-col cols="12" no-gutters class="mb-1">
                  <h4>New features</h4>
                </v-col>
                <ul>
                  <li v-for="(feature, i) in item.newFeatures" :key="i">
                    {{ feature }}
                  </li>
                </ul>
              </v-row>
            </v-col>
            <v-col cols="12">
              <v-row v-if="item.security && item.security.length > 0" no-gutters class="mb-4">
                <v-col cols="12" no-gutters class="mb-1">
                  <h4>Security changes</h4>
                </v-col>
                <ul>
                  <li v-for="(sec, i) in item.security" :key="i">
                    {{ sec }}
                  </li>
                </ul>
              </v-row>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-card>
  </v-sheet>
</template>

<script>

export default {
  data () {
    return {
      releaseNotes: [
        {
          title: 'MapCache 1.5.0',
          releaseDate: 'TBD',
          bugFixes: [
            'Fix for decimal zoom levels in tile creation.',
            'Fix for MAGE KMZ exports not importing.',
            'Grid no longer rendered over context menu.',
            'Fixed MGRS conversion errors in special regions.',
            'Fix for error with too many styles/icons and styles with null values.',
            'Ensure that bounds is set to edit mode when first displayed.'
          ],
          newFeatures: [
            'Support a 4326 leaflet map.',
            'Create 4326 GeoPackage tile layer.',
            'Added Overpass categories and ability to manually edit the query\'s filter.'
          ],
        },
        {
          title: 'MapCache 1.4.0',
          releaseDate: 'Jun. 1, 2022',
          bugFixes: [
            'Vuex file writing bug seen on windows virtual machines.',
            'Date format in feature view.',
            'Fix for shapefile zip with multiple shapefiles.'
          ],
          newFeatures: [
            'Update to Electron v18.',
            'Update to GeoPackage v4.1.0.',
            'Nominatim/Overpass URL Adjustment.',
            'Support for preloaded data sources.',
            'Dynamic WMS/WMTS data sources.',
            'Support for XYZ tile services using EPSG:4326 tile set.',
            'Option to set bounding box to visual extent of the map.',
            'Improved drawing/editing tools (including vertex snapping).',
            'Map snapshot.',
            'Smooth map zooming.'
          ],
        },
        {
          title: 'MapCache 1.3.1',
          releaseDate: 'Mar. 21, 2022',
          bugFixes: [
            'KML/KMZ GroundOverlay and style fixes.',
          ]
        },
        {
          title: 'MapCache 1.3.0',
          releaseDate: 'Mar. 14, 2022',
          bugFixes: [
            'Fix for dark mode style issue for nominatim results.',
            'Fix for grids in dark mode being hard to see.',
            'More consistent alerts.'
          ],
          newFeatures: [
            'Dark theme added for OSM base maps.',
            'Release notes are now shipped with the application for viewing offline.',
            'Feature layers now utilize streaming during the build to prevent high memory utilization.',
            'Added user guide.',
            'Added system notification setting.'
          ],
        },
        {
          title: 'MapCache 1.2.0',
          releaseDate: 'Jan. 21, 2022',
          bugFixes: [
            'Fix for clipping network tiles with specific bounds',
            'Fix UI slowdown when renaming/copying/deleting large GeoPackage tables',
            'Fix for nominatim results not showing address',
            'Fix for bug when creating a tile layer from an existing GeoPackage tile layer',
            'Fix for tile rendering bug when performing multiple zooms at once',
          ],
          newFeatures: [
            'GARS Grid Overlay',
            'MGRS Grid Overlay',
            'WMTS support',
            'Animated zoom/pan in map',
            'Upgrade to Electron 16',
            'Pop-out feature table',
            'Added file association for .gpkg files',
            'Window state management',
            'Added feature view to manage feature editing',
            'Adjusted feature table to support batch operations, sorting, and column order',
          ],
        },
        {
          title: 'MapCache 1.1.1',
          releaseDate: 'Oct. 25, 2021',
          bugFixes: [
            'Prevent multiple instances of MapCache from running.',
            'Better error handling for XYZ layers.',
            'CSS styling.',
            'Fix for processing sources incorrectly reporting failure.',
            'Rectangles are now edited as rectangles instead of as polygons.',
            'Improved feature table paging to prevent reading all features into memory.',
          ],
          newFeatures: [
            'Support WMS layers in non-3857 projections.',
            'Zoom level and bounding box filtering for XYZ layers.',
            'Support manual entry of bounding boxes.',
            'Zooming to a layer will ensure that the zoom of the map is at least the minimum zoom level of the layer.',
            'More accurate tile determination when scaling.',
            'Improved OSM Nominatim support.',
            'Map context menu has a \'What\'s here?\' button that performs an OSM Nominatim reverse query.',
            'OSM Overpass API data source support.',
            'Updated KML/KMZ to utilize streaming to allow for larger files to be processed.',
            'Added support for KML icon heading and scale.',
            'Handle KML that is in a .zip (same as .kmz, but with .zip extension).',
          ],
        },
        {
          title: 'MapCache 1.1.0',
          releaseDate: 'Jul. 8, 2021',
          bugFixes: [
            'Do not show feature tables while drawing, during layer selection, or when zooming in',
            'Fix error when parsing shapefiles with projection other than 4326',
            'Reverse layer ordering',
            'Allow editing of holes in Polygon feature',
            'Allow non-3857 layers from ArcGIS WMS, based on documentation it supports EPSG:3857.',
          ],
          newFeatures: [
            'Migrated several background processes from Electron BrowserWindows to Node worker_threads',
            'Offloaded CPU intensive rendering to node worker_threads',
            'Launch windows as needed, to prevent idle memory usage',
            'GeoTIFF raster data is now saved into a data file for random access functionality. This prevents the need to keep the file in memory.',
            'GeoTIFF data is now read in chunks to avoid excessive memory usage on import.',
            'Added in treeshaking for a few libraries to reduce overall bundle size',
            'Reworked code structure to decrease size of Landing Page',
            'Removed unused files',
            'Allow cancellation of long running web requests',
          ],
          security: [
            'webSecurity is enabled',
            'contextIsolation is enabled',
            'Changed application protocol from app:// to mapcache://',
            'added Content-Security-Policy to prevent external scripts from running',

          ],
        },
        {
          title: 'MapCache 1.0.9',
          releaseDate: 'Apr. 19, 2021',
          bugFixes: [
            'Address security scan findings',
          ],
          newFeatures: [
            'None',
          ],
        },
        {
          title: 'MapCache 1.0.8',
          releaseDate: 'Mar. 11, 2021',
          bugFixes: [
            'Tile clipping error',
            'WMS Capabilities parsing bug',
            'Fix for WMS servers that do not support image/png format for GetMap request',
            'Fix opacity issue for MBTiles styling',
          ],
          newFeatures: [
            'Remote data source / base map network settings',
            'Rate limiting (max requests per second)',
            'Request timeout in milliseconds',
            'Retry attempts',
            'Added FAQs to Help',
          ],
        },
        {
          title: 'MapCache 1.0.7',
          releaseDate: 'Feb. 23, 2021',
          bugFixes: [
            'Dark theme fixes for Preview Map and coordinates popup',
            'Allow icon assignment for MultiPoint features',
            'Fix for XYZ server urls with preceding \'$\' for coordinate/zoom designators failing to successfully request tiles',
            'Fix for GeoTIFFs with bounds greater than web mercator bounds',
            'Fix for mbtiles not being supported in drag and drop',
            'Multi[Point|LineString|Polygon] and GeometryCollection editing',
            'Fix for KML icon file paths being named incorrectly',

          ],
          newFeatures: [
            'Support for XYZ server subdomains',
            'Base map management',
            'Authentication reworked',
            'To provide better security, url credentials are no longer stored on the file system',
            'Credentials are stored as part of the web session, this allows for host based authentication',
            'Certificate authentication (Limited to one certificate selection per session)',
            'URL data source / Base map connection troubleshooting',
            'Allows for updating credentials when 401 http response code is received',
            'Disconnected from internet warning',
            'Add min/max zoom for XYZ tiles zip data source',

          ],
        },
        {
          title: 'MapCache 1.0.6',
          releaseDate: 'Jan. 26, 2021',
          bugFixes: [
            'UI responsiveness when accessing geopackage fixed',

          ],
          newFeatures: [
            'Support for MBTiles containing raster or vector data',
            'Support for XYZ tiles zip file',
            'Dark mode for map controls',
          ],
        },
        {
          title: 'MapCache 1.0.5',
          releaseDate: 'Jan. 20, 2021',
          bugFixes: [
            'Fix min/max zoom defaults on tile layer creation to be based on current zoom on map',
            'Undo fix from v1.0.4 to correct tile grid lines, it ended up causing grid lines to appear when pixels are transparent',
            'Fix for missing parameter \'styles\' in WMS requests',
            'Fix for table styling not being copied correctly (only when one layer is included in new feature layer)',
            'Updated to latest geopackage-js 4.0.0-beta.19 for bug fixes',
            'Scroll bar for sheets with toolbar now have the scroll bar appear under the toolbar, rather than including it',
            'Fix for renaming GeoPackage on Windows',
          ],
          newFeatures: [
            'When adding drawings to an existing feature layer, if there are no fields in that layer, do not show edit feature dialog.',
            'Use list on landing page',
            'User is able to input project name when creating a new project',
            'Add opacity style setting for raster data sources',
            'Feature editing in GeoPackage feature layers and vector data sources',
            'GeoPackage layers are now ordered by table type then by table name in GeoPackage layer list view',
            'Layer rendering order is editable from map and consistent with \'Add Tile Layer\' view\'s rendering order step',
            'Loading indicator when data sources are initializing',
            'Preview for imagery data source URLs (WMS and XYZ)',
            'Consistent dialog interactions (escape to close, autofocus to first available input)',
            'Attach media to features of a GeoPackage feature layer or data source',
            'View/download/delete media attachments',
            'Vuex store migration script management',
          ],
        },
        {
          title: 'MapCache 1.0.4',
          releaseDate: 'Jan. 4, 2021',
          bugFixes: [
            'Fix for incorrectly setting a feature\'s icon to be a table icon when it has an assigned feature style',
            'Make button naming consistent',
            'Fix to allow GeoTIFF opacity of 0',
            'Fix for GeoTIFF gray scale rendering',
            'Icon aspect ratio set for new icon',
            'Fix to prevent invalid tile zoom levels',
            'Fix for style description not being saved',
            'Prevent user from using an existing GeoPackage filename when creating a new GeoPackage',
            'Upgraded to GeoPackage 4.0.0-beta.18 to support GeometryCollections in rendered tiles',
          ],
          newFeatures: [
            'Added scale to map',
            'Right clicking on map shows a popup with the clicked location\'s latitude and longitude in decimal degrees and degrees, minutes, seconds.',
            'Parsing support for WFS responses in GML2, GML3, and GML3.2 format',
            'User informed when tasks are running in the background when attempting to close project window',
            'Help page updates',
            'Manage saved URLs from settings tab',
            'Support for GeoTIFF photometricInterpretations of CMYK, YCbCr, and CIELab',
            'Vuex store versioning',
          ],
        },
        {
          title: 'MapCache 1.0.3',
          releaseDate: 'Dec. 9, 2020',
          bugFixes: [
            'Fix for GeoTIFF gray scale rendering',
            'Removed unused vue components'
          ],
          newFeatures: [
            'None',
          ],
        },
      ],
    }
  },
  methods: {
    scrollToElement (version) {
      const el = this.$refs[version][0]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }
}
</script>

<style scoped>
</style>
