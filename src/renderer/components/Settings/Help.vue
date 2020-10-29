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
              content: 'A GeoPackage can be deleted by navigating to the \'GeoPackage\' tab and clicking on the GeoPackage you wish to delete. This will display the GeoPackage and it\'s contents. Click on the \'Delete\' button and confirm you wish to delete the GeoPackage.'
            },
            {
              title: '',
              content: ''
            }
          ],
          title: 'GeoPackage'
        },
        {
          action: 'mdi-layers-outline',
          items: [
            {
              title: '',
              content: 'Data sources consist of files in a variety of supported geospatial formats (KML, GeoJSON, SHP) or online services such as WMS, WFS, XYZ. The contents of a data source can either be features or imagery.'
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
        }]
      }
    }
  }
</script>

<style scoped>
</style>
