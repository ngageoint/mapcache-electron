<template>
  <map-cache-section :sections="sections"></map-cache-section>
</template>


<script>
import {
  mdiCogOutline,
  mdiFolderOutline,
  mdiMapOutline,
  mdiTrashCanOutline,
  mdiPencil
} from '@mdi/js'
import MapCacheSection from './MapCacheSection'


export default {
  components: {MapCacheSection},
  data () {
    return {
      sections: [
        {
          title: 'General',
          icon: mdiCogOutline,
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>Change</strong>&nbsp;the theme`,
              introduction: 'Adjusting the theme to the dark mode will reduce the overall brightness of the app. Dark mode provides an experience more suited to low light environments.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under General, toggle the theme switch to enable dark mode.`,
                  image: '/images/documentation/settings_articles/toggle_theme.jpg'
                }
              ],
            },
            {
              order: 2,
              title: `<strong>Enable</strong>&nbsp;system notifications`,
              introduction: 'MapCache supports alerting users when long running operations complete using system notifications. Some of these operations include creating a feature layer, creating a tile layer, and importing a data source. This allows a user to minimize a window, perform other tasks, and receive a notification when the MapCache operation is finished. Clicking on the notification will show the MapCache window.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under General, toggle the notifications switch to enable or disable system notifications.`,
                  image: '/images/documentation/settings_articles/system_notifications.jpg',
                  note: 'Depending on how your system\'s notification settings are configured, enabling this setting may or may not display notifications.'
                }
              ],
            },
            {
              order: 4,
              title: `<strong>Disable</strong>&nbsp;tooltips`,
              introduction: `Tooltips are provided to help provide context for the meaning of certain buttons in MapCache. These tooltips can be disabled if they are no longer useful.`,
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under General, toggle the tooltips switch to disable tooltips.`,
                  image: '/images/documentation/settings_articles/toggle_tooltips.jpg'
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Manage</strong>&nbsp;saved urls`,
              introduction: 'Any data source imported using a url will be saved for future use. Saved urls are available for use in each project. The saved urls can be managed by navigating to the settings section.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under General, click on manage urls.`,
                  image: '/images/documentation/settings_articles/manage_urls.jpg'
                },
                {
                  paragraph: `A dialog will appear providing options for managing the saved urls.`,
                  image: '/images/documentation/settings_articles/manage_url_dialog.jpg'
                },
                {
                  title: '<strong>Add</strong>&nbsp;url',
                  paragraph: `Click the add url button in the dialog and a dialog will appear. Enter a url and click save.`,
                  image: '/images/documentation/settings_articles/add_url.jpg',
                  divider: true
                },
                {
                  title: '<strong>Edit</strong>&nbsp;url',
                  paragraph: `Click the edit&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg>&nbsp;button and a dialog will appear. Enter the updated url and click save.`,
                  image: '/images/documentation/settings_articles/edit_url.jpg',
                  divider: true
                },
                {
                  title: '<strong>Delete</strong>&nbsp;url',
                  paragraph: `Click delete&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a confirmation dialog will appear. Confirm by clicking delete.`,
                  image: '/images/documentation/settings_articles/delete_url.jpg',
                  note: 'A deleted url will no longer appear when adding a new data source from a url.',
                  divider: true
                }
              ],
            },
            {
              order: 3,
              title: `<strong>Manage</strong>&nbsp;base maps`,
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under General, click on base maps.`,
                  image: '/images/documentation/settings_articles/manage_base map.jpg'
                },
                {
                  paragraph: `A list of base maps will be displayed, which can be managed, as well as a create new base map button.`,
                  image: '/images/documentation/settings_articles/base_map_list.jpg'
                },
                {
                  title: '<strong>Add</strong>&nbsp;base map',
                  paragraph: `Watch the following video on adding a base map. `,
                  video: '/images/documentation/settings_articles/add_base_map.webm',
                  note: 'Base maps are available across all projects.'
                },
                {
                  title: '<strong>Manage</strong>&nbsp;base map',
                  paragraph: `To view information about base map, or make changes to it, click on its associated entry in the list.`,
                  image: '/images/documentation/settings_articles/base_map_view.jpg'
                },
                {
                  paragraph: `This view provides several actions that include renaming, styling and removing the base map.`,
                  image: '/images/documentation/settings_articles/base_map_actions.jpg',
                  tabItems: [
                    {
                      title: 'Rename',
                      section: {
                        title: 'Rename a base map.',
                        paragraph: `To rename a base map, click on the rename button and a dialog will appear. Enter the desired name and click the rename button to save the change.`,
                        image: '/images/documentation/settings_articles/base_map_rename.jpg'
                      }
                    },
                    {
                      title: 'Style',
                      section: {
                        title: 'Style a base map.',
                        paragraph: `Depending on the type of base map, there will several ways to adjust the style. The most common of these are adjusting the background color and adjusting the opacity. Below shows an adjustment of the opacity`,
                        image: '/images/documentation/settings_articles/base_map_style.jpg'
                      }
                    },
                    {
                      title: 'Remove',
                      section: {
                        title: 'Remove a base map.',
                        paragraph: `To remove a base map, click on the remove button and a dialog will appear. Click remove to confirm.`,
                        image: '/images/documentation/settings_articles/base_map_remove.jpg'
                      }
                    }],
                  tabHeight: 500
                },
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
              title: `<strong>Hide</strong>&nbsp;zoom controls`,
              introduction: 'The zoom control provides zoom in and zoom out buttons for adjusting the zoom level of the map. However, some users will only need to use their mouse wheel or track pad gestures for adjusting the zoom level on the map, rather than the zoom control. Follow the instructions below to hide the zoom control from the map.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Map, toggle the zoom controls switch to hide it form the map.`,
                  image: '/images/documentation/settings_articles/zoom_control.jpg'
                }
              ],
            },
            {
              order: 2,
              title: `<strong>Hide</strong>&nbsp;current zoom`,
              introduction: 'This control provides insight into the map\'s current zoom level. This is helpful in making decisions when creating new layers. However, if this is not needed, it can be hidden. Follow the instructions below to hide the current zoom.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Map, toggle the current zoom switch to hide it from the map.`,
                  image: '/images/documentation/settings_articles/current_zoom.jpg'
                }
              ],
            },
            {
              order: 4,
              title: `<strong>Hide</strong>&nbsp;the address search`,
              introduction: 'The address search requires network access to use. If you are in a disconnected environment or simply do not wish to have the search bar displayed, follow the instructions below to hide it.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Map, toggle the address search switch to hide it from the map.`,
                  image: '/images/documentation/settings_articles/address_search.jpg'
                }
              ],
            },
            {
              order: 1,
              title: `<strong>Hide</strong>&nbsp;coordinates`,
              introduction: 'Coordinates are displayed on the map to show the last location of the mouse cursor. If you do not wish to see these coordinates, follow the instructions below to hide the coordinates',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Map, toggle the display coordinates switch to hide them from the map.`,
                  image: '/images/documentation/settings_articles/coordinates.jpg'
                }
              ],
            },
            {
              order: 3,
              title: `<strong>Hide</strong>&nbsp;map scale`,
              introduction: 'MapCache displays a distance scale at the bottom left of the map. This provides insight into the size of features on the map. If you wish to hide this control, follow the instructions below.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Map, toggle the display scale switch to hide it from the map..`,
                  image: '/images/documentation/settings_articles/scale.jpg'
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
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Map, click on the max features button.`,
                  image: '/images/documentation/settings_articles/max_features.jpg'
                },
                {
                  paragraph: `Once the max features have been adjusted, click on the save button.`,
                  image: '/images/documentation/settings_articles/adjust_max_features.jpg'
                }
              ],
            },
          ]
        },
        {
          title: 'Project',
          icon: mdiFolderOutline,
          color: 'primary',
          articles: [
            {
              order: 0,
              title: `<strong>Rename</strong>&nbsp;a project`,
              introduction: 'The name of a project helps users distinguish between workspaces, and that name may need to be adjusted from time to time. Follow the instructions below for renaming a project.',
              sections: [
                {
                  paragraph: `In the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Project, click on Rename project and a confirmation dialog will apppear.`,
                  image: '/images/documentation/settings_articles/rename_project.jpg'
                },
                {
                  paragraph: `Enter the desired project name and click the rename button.`,
                  image: '/images/documentation/settings_articles/rename_confirmation.jpg'
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
                  paragraph: `First, in the settings&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg>&nbsp;section, under Project, click on Delete project and a confirmation dialog will appear.`,
                  image: '/images/documentation/settings_articles/delete_project.jpg'
                },
                {
                  paragraph: `Click the delete button to confirm the deletion of the project.`,
                  image: '/images/documentation/settings_articles/confirm_delete_project.jpg'
                },
                {
                  paragraph: `Second, a project can be removed from the landing page. Click on the trash&nbsp;<svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg>&nbsp;button and a confirmation dialog will appear.`,
                  image: '/images/documentation/settings_articles/delete_project_lp.jpg'
                },
                {
                  paragraph: `Click the delete button to confirm the deletion of the project.`,
                  image: '/images/documentation/settings_articles/confirm_delete_project_lp.jpg'
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