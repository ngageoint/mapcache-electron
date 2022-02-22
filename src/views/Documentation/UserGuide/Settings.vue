<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <map-cache-article v-if="selectedArticle != null" :article="selectedArticle" :back="() => selectedArticle = null"></map-cache-article>
    <v-container v-else>
      <v-row no-gutters>
        <v-col cols="12" v-for="(section, i) of sections" :key="i">
          <v-divider v-if="i > 0" class="mt-2 mb-4"/>
          <v-card class="mt-0 pt-0" flat tile>
            <v-card-title class="ml-0 pl-0 mt-0 pt-0">
              <v-icon v-if="section.icon" class="mr-4" :color="section.color">{{section.icon}}</v-icon>
              <img v-if="section.imageIcon" :style="{verticalAlign: 'middle'}" :src="section.imageIcon" width="24px" height="20px">
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
  mdiCogOutline,
  mdiFolderOutline,
  mdiMapOutline,
  mdiTrashCanOutline,
  mdiPencil
} from '@mdi/js'
import MapCacheArticle from './Article/MapCacheArticle'


export default {
  components: {MapCacheArticle},
  data () {
    return {
      selectedArticle: null,
      sections: [
        {
          title: 'General',
          icon: mdiCogOutline,
          color: 'primary',
          articles: [
            {
              title: `<b>Change</b> the theme`,
              article: {
                title: 'Change the theme',
                introduction: 'Depending on your preference, you may wish to adjust the theme to reduce the overall brightness of the app. Dark mode provides an experience more suited to low light environments.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under General, toggle the theme switch to enable dark mode.`,
                    image: '/images/documentation/settings_articles/toggle_theme.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Manage</b> saved urls`,
              article: {
                title: 'Manage saved urls',
                introduction: 'Any data source you import using a url will be saved for future use. Saved urls are available for use across all of your projects. When you need to manage these urls, head to the settings.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under General, click on manage urls.`,
                    image: '/images/documentation/settings_articles/manage_urls.jpg'
                  },
                  {
                    paragraph: `A dialog will appear providing you options for managing your saved urls.`,
                    image: '/images/documentation/settings_articles/manage_url_dialog.jpg'
                  },
                  {
                    title: '<b>Add</b> url',
                    paragraph: `Click the add url button in the dialog and a dialog will appear. Enter your url and click save.`,
                    image: '/images/documentation/settings_articles/add_url.jpg',
                    divider: true
                  },
                  {
                    title: '<b>Edit</b> url',
                    paragraph: `Click the edit <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiPencil}"></path></svg> button and a dialog will appear. Enter the updated url and click save.`,
                    image: '/images/documentation/settings_articles/edit_url.jpg',
                    divider: true
                  },
                  {
                    title: '<b>Delete</b> url',
                    paragraph: `Click delete <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg> button and a confirmation dialog will appear. Confirm by clicking delete.`,
                    image: '/images/documentation/settings_articles/delete_url.jpg',
                    note: 'A deleted url will no longer appear when adding a new data source from a url.',
                    divider: true
                  }
                ],
              }
            },
            {
              title: `<b>Disable</b> tooltips`,
              article: {
                title: 'Disable tooltips',
                introduction: 'Once you know your way around MapCache, you may no longer want to see the tooltips that help newer users.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under General, toggle the tooltips switch to disable tooltips.`,
                    image: '/images/documentation/settings_articles/toggle_tooltips.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Manage</b> base maps`,
              article: {
                title: 'Manage base maps',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under General, click on base maps.`,
                    image: '/images/documentation/settings_articles/manage_basemap.jpg'
                  },
                  {
                    paragraph: `A list of your base maps will be displayed providing you the ability to create or view a base map.`,
                    image: '/images/documentation/settings_articles/base_map_list.jpg'
                  },
                  {
                    title: '<b>Add</b> base map',
                    paragraph: `Watch the following video on adding a base map. `,
                    video: '/images/documentation/settings_articles/add_base_map.webm',
                    note: 'Base maps you add are available across all of your projects.'
                  },
                  {
                    title: '<b>View</b> base map',
                    paragraph: `If you'd like to view information about your recently added base map, or make changes to it, you can click on your base map.`,
                    image: '/images/documentation/settings_articles/base_map_view.jpg'
                  },
                  {
                    paragraph: `From this view you'll be able to perform several actions that include renaming, styling and removing your base map.`,
                    image: '/images/documentation/settings_articles/base_map_actions.jpg',
                    tabItems: [
                      {
                        title: 'Rename',
                        section: {
                          title: 'Rename your base map.',
                          paragraph: `To rename your base map, click on the rename button and a dialog will appear. Enter your desired name and click the rename button to save your change.`,
                          image: '/images/documentation/settings_articles/base_map_rename.jpg'
                        }
                      },
                      {
                        title: 'Style',
                        section: {
                          title: 'Style your base map.',
                          paragraph: `Depending on the type of base map, there will several ways to adjust the style. The most common of these are adjusting the background color and adjusting the opacity. Below shows an adjustment of the opacity`,
                          image: '/images/documentation/settings_articles/base_map_style.jpg'
                        }
                      },
                      {
                        title: 'Remove',
                        section: {
                          title: 'Remove your base map.',
                          paragraph: `To remove your base map, click on the remove button and a dialog will appear. Click remove to confirm.`,
                          image: '/images/documentation/settings_articles/base_map_remove.jpg'
                        }
                      }],
                    tabHeight: 500
                  },
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
              title: `<b>Hide</b> zoom controls`,
              article: {
                title: 'Hide zoom controls',
                introduction: 'Many users will only need to use their mouse wheel or track pad gestures for adjusting the zoom level on the map. If you do not need to use the zoom control, you can hide it from the map.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Map, toggle the zoom controls switch to hide it form the map.`,
                    image: '/images/documentation/settings_articles/zoom_control.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Hide</b> coordinates`,
              article: {
                title: 'Hide coordinates',
                introduction: 'Coordinates are displayed on the map to show you the last location of the mouse cursor. If you do not wish to see these coordinates, you can hide them in the settings.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Map, toggle the display coordinates switch to hide them from the map.`,
                    image: '/images/documentation/settings_articles/coordinates.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Hide</b> current zoom`,
              article: {
                title: 'Hide current zoom',
                introduction: 'If you do not wish to see the current zoom level on the map, you can choose to hide it',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Map, toggle the current zoom switch to hide it from the map.`,
                    image: '/images/documentation/settings_articles/current_zoom.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Hide</b> map scale`,
              article: {
                title: 'Hide map scale',
                introduction: 'Having an understanding of the scale of your features and tiles can be useful in map making. If you find that you do not need to view the scale, you can hide it in the settings.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Map, toggle the display scale switch to hide it from the map..`,
                    image: '/images/documentation/settings_articles/scale.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Hide</b> the address search`,
              article: {
                title: 'Hide the address search bar',
                introduction: 'The address search requires network access to use. If you are in a disconnected environment or simply do not wish to have the search bar displayed, you can hide it in the settings.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Map, toggle the address search switch to hide it from the map.`,
                    image: '/images/documentation/settings_articles/address_search.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Adjust</b> max features`,
              article: {
                title: 'Adjust max features',
                introduction: 'Occasionally, you may have a feature layer or data source with a very large number of features. The more features there are, the longer it takes to draw them on the map. If you find your feature layers are taking too long to render, it may be a good idea to reduce the max features setting.',
                note: 'This only affects features rendered on the map. When creating a tile layer using feature layers, each feature will be drawn.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Map, click on the max features button.`,
                    image: '/images/documentation/settings_articles/max_features.jpg'
                  },
                  {
                    paragraph: `Once you've set the max features to the updated value, click on the save button.`,
                    image: '/images/documentation/settings_articles/adjust_max_features.jpg'
                  }
                ],
              }
            },
          ]
        },
        {
          title: 'Project',
          icon: mdiFolderOutline,
          color: 'primary',
          articles: [
            {
              title: `<b>Rename</b> a project`,
              article: {
                title: 'Rename a proejct',
                introduction: 'If you decide to change the name of your project, you can do so in the settings.',
                sections: [
                  {
                    paragraph: `In the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Project, click on Rename project and a confirmation dialog will apppear.`,
                    image: '/images/documentation/settings_articles/rename_project.jpg'
                  },
                  {
                    paragraph: `Enter your desired project name and click the rename button.`,
                    image: '/images/documentation/settings_articles/rename_confirmation.jpg'
                  }
                ],
              }
            },
            {
              title: `<b>Delete</b> project`,
              article: {
                title: 'Delete project',
                introduction: 'If you no longer need a project and wish to remove it from your list of projects you can delete that project in a couple of ways.',
                note: 'Deleting your project will <b>not</b> delete your GeoPackages from your computer.',
                sections: [
                  {
                    paragraph: `First, in the settings <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiCogOutline}"></path></svg> section, under Project, click on Delete project and a confirmation dialog will appear.`,
                    image: '/images/documentation/settings_articles/delete_project.jpg'
                  },
                  {
                    paragraph: `Click the delete button to delete your project.`,
                    image: '/images/documentation/settings_articles/confirm_delete_project.jpg'
                  },
                  {
                    paragraph: `Second, you can remove your project from the landing page. Click on the trash <svg width="24px" height="24" style="margin-bottom: -6px;"><path d="${mdiTrashCanOutline}"></path></svg> button and a confirmation dialog will appear.`,
                    image: '/images/documentation/settings_articles/delete_project_lp.jpg'
                  },
                  {
                    paragraph: `Click the delete button to delete your project.`,
                    image: '/images/documentation/settings_articles/confirm_delete_project_lp.jpg'
                  },
                ],
              }
            },
          ]
        }
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