<template>
  <map-cache-section :sections="sections"></map-cache-section>
</template>


<script>
import {
  mdiCogOutline,
  mdiTrashCanOutline,
  mdiPencil,
  mdiPalette,
  mdiPlus,
  mdiMinus,
  mdiCloudBraces
} from '@mdi/js'
import MapCacheSection from './MapCacheSection.vue'


export default {
  components: { MapCacheSection },
  data () {
    return {
      sections: [
        {
          title: 'General',
          icon: 'mdi-cog-outline',
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>Change</strong>&nbsp;the theme`,
              introduction: 'Adjusting the theme to the dark mode will reduce the overall brightness of the app. Dark mode provides an experience more suited to low light environments.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, toggle the&nbsp;<strong>Theme</strong>&nbsp;switch to enable dark mode.`,
                  image: '/images/documentation/settings/general/article_01/image_01.jpg'
                }
              ],
            },
            {
              order: 2,
              title: `<strong>Enable</strong>&nbsp;system notifications`,
              introduction: 'MapCache supports alerting users when long running operations complete using system notifications. Some of these operations include creating a feature layer, creating a tile layer, and importing a data source. This allows a user to minimize a window, perform other tasks, and receive a notification when the MapCache operation is finished. Clicking on the notification will show the MapCache window.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, toggle the&nbsp;<strong>Notifications</strong>&nbsp;switch to enable or disable system notifications.`,
                  image: '/images/documentation/settings/general/article_02/image_01.jpg',
                  note: 'The system’s (i.e. Mac, Windows, Linux) notifications will also need to be enabled for MapCache notifications to display properly.'
                }
              ],
            },
            {
              order: 4,
              title: `<strong>Disable</strong>&nbsp;tooltips`,
              introduction: `Tooltips are provided to help provide context for the meaning of certain buttons in MapCache. These tooltips can be disabled if they are no longer useful.`,
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, toggle the&nbsp;<strong>Tooltips</strong>&nbsp;switch to disable tooltips.`,
                  image: '/images/documentation/settings/general/article_03/image_01.jpg'
                }
              ],
            },
            {
              order: 6,
              title: `<strong>Manage</strong>&nbsp;saved urls`,
              introduction: 'Any data source imported using a url will be saved for future use. Saved urls are available for use in each project. The saved urls can be managed by navigating to the settings section.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, click on&nbsp;<strong>Saved urls</strong>&nbsp;.`,
                  image: '/images/documentation/settings/general/article_04/image_01.jpg'
                },
                {
                  paragraph: `A dialog will appear providing options for managing the saved urls.`,
                  image: '/images/documentation/settings/general/article_04/image_02.jpg'
                },
                {
                  title: '<strong>Add</strong>&nbsp;url',
                  paragraph: `Click the&nbsp;<strong>Add url</strong>&nbsp;button in the dialog and a dialog will appear. Enter a url and click the&nbsp;<strong>Add</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_04/image_03.jpg',
                  divider: true
                },
                {
                  title: '<strong>Edit</strong>&nbsp;url',
                  paragraph: `Click the&nbsp;<strong>Edit</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear. Enter the updated url and click the&nbsp;<strong>Save</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_04/image_04.jpg',
                  divider: true
                },
                {
                  title: '<strong>Delete</strong>&nbsp;url',
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a confirmation dialog will appear. Confirm by clicking the&nbsp;<strong>Delete</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_04/image_05.jpg',
                  note: 'A deleted url will no longer appear when adding a new data source from a url.',
                  divider: true
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Manage</strong>&nbsp;base maps`,
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, click on&nbsp;<strong>Base maps</strong>&nbsp;.`,
                  image: '/images/documentation/settings/general/article_05/image_01.jpg'
                },
                {
                  paragraph: `A list of base maps will be displayed, which can be managed, as well as a create new base map button.`,
                  image: '/images/documentation/settings/general/article_05/image_02.jpg'
                },
                {
                  title: '<strong>Add</strong>&nbsp;base map',
                  paragraph: `Watch the following video on adding a base map. `,
                  video: '/images/documentation/settings/general/article_05/video_01.webm',
                  note: 'Base maps are available across all projects.'
                },
                {
                  title: '<strong>Manage</strong>&nbsp;base map',
                  paragraph: `To view information about a base map, or make changes to it, click on its associated entry in the list.`,
                  image: '/images/documentation/settings/general/article_05/image_03.jpg'
                },
                {
                  paragraph: `This view provides several actions that include renaming, styling and removing the base map.`,
                  image: '/images/documentation/settings/general/article_05/image_04.jpg',
                  tabItems: [
                    {
                      title: 'Rename',
                      section: {
                        title: '<strong>Rename</strong>&nbsp;a base map.',
                        paragraph: `To rename a base map, click on the&nbsp;<strong>Rename</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear. Enter the desired name and click the&nbsp;<strong>Rename</strong>&nbsp;button to save the change.`,
                        image: '/images/documentation/settings/general/article_05/image_05.jpg'
                      }
                    },
                    {
                      title: 'Style',
                      section: {
                        title: 'Style a base map.',
                        paragraph: `Depending on the type of base map, there will be several ways to adjust the style. The most common of these are adjusting the background color and adjusting the opacity. To make an adjustment to the opacity, start by clicking on the&nbsp;<strong>Style</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPalette}"></path></svg>&nbsp;button. This will display the style management view and allow for adjustments, as shown below.`,
                        image: '/images/documentation/settings/general/article_05/image_06.jpg'
                      }
                    },
                    {
                      title: 'Network',
                      section: {
                        title: 'Edit network settings.',
                        paragraph: `To edit the network settings of the base map, click on the&nbsp;<strong>Network</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCloudBraces}"></path></svg>&nbsp;button and a dialog will appear. Adjust the network settings and Click&nbsp;<strong>Save</strong>&nbsp;to confirm the changes.`,
                        image: '/images/documentation/settings/general/article_05/image_07.jpg'
                      }
                    },
                    {
                      title: 'Remove',
                      section: {
                        title: 'Remove a base map.',
                        paragraph: `To remove a base map, click on the&nbsp;<strong>Remove</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a dialog will appear. Click&nbsp;<strong>Remove</strong>&nbsp;to confirm.`,
                        image: '/images/documentation/settings/general/article_05/image_08.jpg'
                      }
                    }],
                  tabHeight: 500
                },
              ],
            },
            {
              order: 3,
              title: `<strong>Adjust</strong>&nbsp;the nominatim url`,
              introduction: 'This setting allows the user to specify a different nominatim url. Though unlikely needed to be changed, this is made available if you have a specific OpenStreetMap nominatim server you wish to target.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, click on the&nbsp;<strong>Nominatim URL</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_06/image_01.jpg'
                },
                {
                  paragraph: `Once the url has been adjusted, click on the&nbsp;<strong>Save</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_06/image_02.jpg'
                }
              ],
            },
            {
              order: 5,
              title: `<strong>Adjust</strong>&nbsp;the overpass url`,
              introduction: 'This setting allows the user to specify a different overpass interpreter url. Though unlikely needed to be changed, this is made available if you have a specific OpenStreetMap overpass server you wish to target.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>General</strong>, click on the&nbsp;<strong>Overpass URL</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_07/image_01.jpg'
                },
                {
                  paragraph: `Once the url has been adjusted, click on the&nbsp;<strong>Save</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/general/article_07/image_02.jpg'
                }
              ],
            }
          ]
        },
        {
          title: 'Map',
          icon: 'mdi-map-outline',
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>Change</strong>&nbsp;map projection`,
              introduction: `MapCache supports displaying vector and imagery data in two projections.&nbsp;<strong>Web Mercator (EPSG:3857)</strong>&nbsp;and&nbsp;<strong>Plate Carrée (EPSG:4326)</strong>.`,
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, select the&nbsp;<strong>Map projection</strong>&nbsp;you wish to use.`,
                  image: '/images/documentation/settings/map/article_07/image_01.jpg'
                }
              ],
            },
            {
              order: 2,
              title: `<strong>Hide</strong>&nbsp;zoom controls`,
              introduction: `The zoom control provides&nbsp;<strong>Zoom in</strong><svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPlus}"></path></svg>and&nbsp;<strong>Zoom out</strong><svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiMinus}"></path></svg>&nbsp;buttons for adjusting the zoom level of the map. However, some users will only need to use their mouse wheel or tra
ck pad gestures for adjusting the zoom level on the map, rather than the zoom control. Follow the instructions below to hide the zoom control from the map.`,
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, toggle the&nbsp;<strong>Zoom control</strong>&nbsp;switch to hide it form the map.`,
                  image: '/images/documentation/settings/map/article_01/image_01.jpg'
                }
              ],
            },
            {
              order: 4,
              title: `<strong>Hide</strong>&nbsp;current zoom`,
              introduction: 'This control provides insight into the map\'s current zoom level. This is helpful in making decisions when creating new layers. However, if this is not needed, it can be hidden. Follow the instructions below to hide the current zoom.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, toggle the&nbsp;<strong>Display current zoom</strong>&nbsp;switch to hide it from the map.`,
                  image: '/images/documentation/settings/map/article_02/image_01.jpg'
                }
              ],
            },
            {
              order: 6,
              title: `<strong>Hide</strong>&nbsp;the address search`,
              introduction: 'The address search requires network access to use. If you are in a disconnected environment or simply do not wish to have the search bar displayed, follow the instructions below to hide it.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, toggle the&nbsp;<strong>Address search</strong>&nbsp;switch to hide it from the map.`,
                  image: '/images/documentation/settings/map/article_03/image_01.jpg'
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Hide</strong>&nbsp;coordinates`,
              introduction: 'Coordinates are displayed on the map to show the last location of the mouse cursor. If you do not wish to see these coordinates, follow the instructions below to hide the coordinates',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, toggle the&nbsp;<strong>Display coordinates</strong>&nbsp;switch to hide them from the map.`,
                  image: '/images/documentation/settings/map/article_04/image_01.jpg'
                }
              ],
            },
            {
              order: 3,
              title: `<strong>Hide</strong>&nbsp;map scale`,
              introduction: 'MapCache displays a distance scale at the bottom left of the map. This provides insight into the size of features on the map. If you wish to hide this control, follow the instructions below.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, toggle the&nbsp;<strong>Display scale</strong>&nbsp;switch to hide it from the map.`,
                  image: '/images/documentation/settings/map/article_05/image_01.jpg'
                }
              ],
            },
            {
              order: 5,
              title: `<strong>Adjust</strong>&nbsp;max features`,
              introduction: 'Occasionally, you may have a feature layer or data source with a very large number of features. The more features there are, the longer it takes to draw them on the map. If a feature layer is taking too long to render, it may be a good idea to reduce the max features setting.',
              note: 'This only affects features rendered on the map. When creating a tile layer using feature layers, each feature will be drawn.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Map</strong>, click on the&nbsp;<strong>Max features</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/map/article_06/image_01.jpg'
                },
                {
                  paragraph: `Once the max features have been adjusted, click on the&nbsp;<strong>Save</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/map/article_06/image_02.jpg'
                }
              ],
            },
          ]
        },
        {
          title: 'Project',
          icon: 'mdi-folder-outline',
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>Rename</strong>&nbsp;a project`,
              introduction: 'The name of a project helps users distinguish between workspaces, and that name may need to be adjusted from time to time. Follow the instructions below for renaming a project.',
              sections: [
                {
                  paragraph: `In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Project</strong>, click on&nbsp;<strong>Rename project</strong>&nbsp;and a confirmation dialog will apppear.`,
                  image: '/images/documentation/settings/project/article_01/image_01.jpg'
                },
                {
                  paragraph: `Enter the desired project name and click the&nbsp;<strong>Rename</strong>&nbsp;button.`,
                  image: '/images/documentation/settings/project/article_01/image_02.jpg'
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Delete</strong>&nbsp;project`,
              introduction: 'If a project is no longer needed, it can be removed from the list of projects in a couple of ways.',
              note: 'Deleting a project will&nbsp;<strong>not</strong>&nbsp;delete the GeoPackages from your computer.',
              sections: [
                {
                  paragraph: `First, In the&nbsp;<strong>Settings</strong>&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under&nbsp;<strong>Project</strong>, click on&nbsp;<strong>Delete project</strong>&nbsp;and a confirmation dialog will appear.`,
                  image: '/images/documentation/settings/project/article_02/image_01.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;button to confirm the deletion of the project.`,
                  image: '/images/documentation/settings/project/article_02/image_02.jpg'
                },
                {
                  paragraph: `Second, a project can be removed from the landing page. Click on the trash can&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a confirmation dialog will appear.`,
                  image: '/images/documentation/settings/project/article_02/image_03.jpg'
                },
                {
                  paragraph: `Click the&nbsp;<strong>Delete</strong>&nbsp;button to confirm the deletion of the project.`,
                  image: '/images/documentation/settings/project/article_02/image_04.jpg'
                },
              ],
            },
          ]
        }
      ],
    }
  }
}
</script>