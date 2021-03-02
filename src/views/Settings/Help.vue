<template>
  <v-sheet>
    <v-card flat tile>
      <v-card-title><v-icon class="mr-2">mdi-help-circle-outline</v-icon>Help</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-group
            v-for="item in helpItems"
            :key="item.title"
            v-model="item.active"
            :prepend-icon="item.action"
            no-action
            color="primary"
          >
            <template v-slot:activator>
              <v-list-item-content>
                <v-list-item-title v-text="item.title"></v-list-item-title>
              </v-list-item-content>
            </template>
            <v-card
              flat
              class="ma-2 pa-0"
              v-for="child in item.items"
              :key="child.title"
            >
              <v-card-text class="ma-0 pa-0">
                <h4 class="pl-12 mt-0 mb-0 pt-0 pb-0" v-if="child.title" v-text="child.title"></h4>
                <v-card-subtitle class="pl-12 mt-0 mb-0 pt-0 pb-0" v-text="child.content"></v-card-subtitle>
              </v-card-text>
            </v-card>
          </v-list-group>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn text @click.stop.prevent="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-sheet>
</template>

<script>
  export default {
    props: {
      close: Function
    },
    data () {
      return {
        helpItems: [{
          action: 'mdi-folder-outline',
          items: [
            {
              content: 'A project is a workspace for creating and editing content for a GeoPackage. A user can import data sources and populate a GeoPackage with that content.'
            },
            {
              title: 'Edit Name',
              content: 'The project\'s name can be edited by navigating to \'Settings > General > Project name\''
            },
            {
              title: 'Delete Project',
              content: 'The project can be deleted by navigating to \'Settings > General > Delete project\''
            }
          ],
          title: 'Project',
          active: true
        },
        {
          action: 'mdi-package-variant',
          items: [
            {
              title: '',
              content: '\'GeoPackage is an open, standards-based, platform-independent, portable, self-describing, compact format for transferring geospatial information\' - OGC. This section provides functionality for creating and managing GeoPackages.'
            },
            {
              title: 'Create new GeoPackage',
              content: 'A new GeoPackage can be created by navigating to the \'GeoPackage\' tab and clicking on the Add GeoPackage button at the bottom of the page. Click the \'New GeoPackage\' button. Enter the file name for your GeoPackage and the tool will create an empty GeoPackage ready for your data to be added.'
            },
            {
              title: 'Import GeoPackage',
              content: 'A GeoPackage can be imported by navigating to the \'GeoPackage\' tab and clicking on the Add GeoPackage button at the bottom of the page. Click the \'Import from file\' button and navigate to the GeoPackage file you wish to import.'
            },
            {
              title: 'Delete GeoPackage',
              content: 'A GeoPackage can be deleted by navigating to the \'GeoPackage\' tab and clicking on the GeoPackage you wish to delete. Click on the \'Delete\' button.'
            },
            {
              title: 'Copy GeoPackage',
              content: 'A GeoPackage can be copied by navigating to the \'GeoPackage\' tab and clicking on the GeoPackage you wish to copy. Click on the \'Copy\' button.'
            },
            {
              title: 'Rename GeoPackage',
              content: 'A GeoPackage can be renamed by navigating to the \'GeoPackage\' tab and clicking on the GeoPackage you wish to rename. Click on the \'Rename\' button.'
            },
            {
              title: 'Show GeoPackage',
              content: 'Showing the GeoPackage will open the folder on the file system containing the GeoPackage. This can be done by navigating to the \'GeoPackage\' tab and clicking on the GeoPackage you wish to show. Click on the \'Show\' button.'
            },
            {
              title: 'View GeoPackage Details',
              content: 'Showing the GeoPackage\'s details can be done by navigating to the \'GeoPackage\' tab and clicking on the GeoPackage you wish to view. Click on the \'Details\' button.'
            },
            {
              title: 'Add Feature Layer',
              content: 'To add a feature layer to your GeoPackage, first, navigate to the \'GeoPackage\' tab and click on the GeoPackage you wish to add the layer to. Second, click on the \'Add Layer\' button at the bottom of the page. Select the \'Add feature layer\' button and complete the steps.'
            },
            {
              title: 'Add Tile Layer',
              content: 'To add a tile layer to your GeoPackage, first, navigate to the \'GeoPackage\' tab and click on the GeoPackage you wish to add the layer to. Second, click on the \'Add Layer\' button at the bottom of the page. Select the \'Add tile layer\' button and complete the steps.'
            }
          ],
          title: 'GeoPackage'
        },
        {
          action: 'mdi-layers-outline',
          items: [
            {
              title: '',
              content: 'Data sources consist of files in a variety of supported geospatial formats (KML/KMZ, GeoJSON, Shapefile, MBTiles, XYZ tile zip, and GeoTIFF) or online services such as WMS, WFS, XYZ, and ArcGIS Feature Service. The contents of a data source can either be features or imagery.'
            },
            {
              title: 'Import Data Source from file',
              content: 'A data source can be imported by navigating to the \'Data Source\' tab and clicking on the \'Add Data Source\' button at the bottom of the page. Click the \'Import from file\' button and navigate to the file you wish to import. Supported file formats include GeoJSON, KMZ/KML, SHP (.zip or .shp), and GeoTIFF.'
            },
            {
              title: 'Import Data Source from URL',
              content: 'A data source can be imported by navigating to the \'Data Source\' tab and clicking on the \'Add Data Source\' button at the bottom of the page. Click the \'Download from URL\' button and complete the steps to import. Supported geospatial services include WMS, WFS, XYZ, and ArcGIS Feature Service.'
            },
            {
              title: 'Export Data Source as GeoPackage',
              content: 'A data source containing features can be exported as a GeoPackage by navigating to the \'Data Source\' tab and clicking on the feature data source you wish to export. Click on the \'Export\' button'
            },
            {
              title: 'Delete Data Source',
              content: 'A data source can be deleted by navigating to the \'Data Source\' tab and clicking on the data source you wish to delete. Click on the \'Delete\' button.'
            },
            {
              title: 'Rename Data Source',
              content: 'A data source can be renamed by navigating to the \'Data Source\' tab and clicking on the data source you wish to rename. Click on the \'Rename\' button.'
            }
          ],
          title: 'Data Source'
        },
        {
          action: 'mdi-cog-outline',
          items: [
            {
              title: '',
              content: 'The settings section allows for customization of the user experience.'
            },
            {
              title: 'Theme',
              content: 'There are two available themes. Light theme, which is the default and dark theme. You can change the theme by navigating to \'Settings > General > Theme\'.'
            },
            {
              title: 'Tooltips',
              content: 'Tooltips display additional information for various buttons within the application. If you would like to disable tooltips, navigate to \'Settings > General > Tooltips\'.'
            },
            {
              title: 'Saved URLs',
              content: 'URLs are used to import data sources from the internet are saved internally. If you would like to manage the saved URLs, navigate to \'Settings > General > Saved URLs\'.'
            },
            {
              title: 'Base Maps',
              content: 'A base map is the underlying layer on the map view that is always visible. To manage your base maps, navigate to \'Settings > General > Base Maps\'.'
            },
            {
              title: 'Zoom control',
              content: 'The zoom control allows the user to click to zoom in or zoom out on the map. If disabled, a user may still zoom in and out using a mouse or touch pad. If you would like to hide the zoom control, navigate to \'Settings > Map > Zoom Control\' and disable it.'
            },
            {
              title: 'Display current zoom',
              content: 'Displaying the current zoom will show the current zoom level on the map. If disabled, the current zoom will not be shown. If you would like to hide the current zoom, navigate to \'Settings > Map > Display current zoom\' and disable it.'
            },
            {
              title: 'Address search',
              content: 'The address search bar allows a user to search for addresses/coordinates on the map. If disabled, the address search bar will not be shown. If you would like to hide the address search bar, navigate to \'Settings > Map > Address search\' and disable it.'
            },
            {
              title: 'Max features',
              content: 'The max features is an advanced setting used to tell the GeoPackage API how many features it is allowed to render in a given tile. If the number of tiles exceeds the value set, the placeholder tile will be generated showing how many features are in that tile. If you would like to adjust the maximum number of features navigate to \'Settings > Map > Max features\' and click on it.'
            }
          ],
          title: 'Settings'
        },
        {
          action: 'mdi-chat-question-outline',
          items: [
            {
              title: 'Why can\'t I select a different certificate?',
              content: 'Similar to Google Chrome, once you have decided on your certificate, or chosen to not select a certificate, the session will remember your selection. If you would like to select a different certificate, you will need to restart the application.'
            },
            {
              title: 'What happens when I remove a GeoPackage from MapCache?',
              content: 'MapCache will remove the GeoPackage entry from the GeoPackage list. The underlying GeoPackage file will remain on the file system.'
            },
            {
              title: '',
              content: ''
            }
          ],
          title: 'Frequently asked questions (FAQs)'
        }]
      }
    }
  }
</script>

<style scoped>
</style>
