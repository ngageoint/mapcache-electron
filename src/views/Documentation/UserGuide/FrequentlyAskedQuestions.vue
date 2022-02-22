<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <v-card-title><v-icon class="mr-2" color="primary">{{mdiChatQuestionOutline}}</v-icon>Frequently Asked Questions</v-card-title>
    <v-container>
      <v-expansion-panels>
        <v-expansion-panel
            v-for="(entry, i) in entries"
            :key="i"
        >
          <v-expansion-panel-header>
            <span class="regular--text font-weight-medium" style="line-height: 150%" v-html="entry.question"></span>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <p class="detail--text" v-html="entry.answer"></p>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-container>
  </v-card>
</template>

<script>
import {
  mdiChatQuestionOutline,
} from '@mdi/js'


export default {
  data () {
    return {
      mdiChatQuestionOutline,
      entries: [
        {
          question: 'Can I use MapCache to create a GeoPackage containing tiles for the whole world at every zoom level?',
          answer: `This isn't recommended for MapCache. This action would result in a GeoPackage that has <b>billions</b> of tiles, is <b>terabytes</b> in size, and would take <b>years</b> to create.`
        },
        {
          question: 'Am I allowed to use any tile service in MapCache?',
          answer: `Each tile/imagery provider may have varying terms of service. It is recommended to review the service provider's terms of service before importing into MapCache.`
        },
        {
          question: 'My file or web service is not supported in MapCache. How can I import my data?',
          answer: `There are a couple of ways this can be handled. You can reach out to the MapCache team and request a data source or web service be supported. Alternatively, you can use tools, such as GDAL, to convert your data into a format already supported by MapCache.`
        },
        {
          question: 'Why can\'t I select a different certificate?',
          answer: 'Similar to Google Chrome, once you have decided on your certificate, the session will remember your selection. If you would like to select a different certificate, you will need to restart the application.'
        },
        {
          question: 'What happens when I remove a GeoPackage from MapCache?',
          answer: 'MapCache will remove it\'s reference to the GeoPackage. The GeoPackage will remain on your computer.'
        },
        {
          question: 'When I add a drawing to a GeoPackage feature table, why does it not appear?',
          answer: 'If the GeoPackage feature layer is not enabled, that layer\'s features will not be visible. This includes the newly added drawing. If you would like to see your drawing, enable the GeoPackage feature layer.'
        },
        {
          question: 'Why are some map tiles blank for my WMS/XYZ data source and/or base map?',
          answer: 'If you find that one or more tiles for your WMS/XYZ source are missing, it is likely that your request timeout (ms) and/or max retry attempts are too low. You can adjust these network settings in the data source or base map. If you think your max timeout is still too low, you can disable the timeout by setting it to 0.'
        },
        {
          question: 'How does tile scaling affect a GeoPackage tile layer?',
          answer: 'Tile scaling is used to reduce the overall number of tiles in your tile layer, which reduces the size of your GeoPackage. The draw back to tile scaling is that some of your tiles may be less detailed due to scaling and there could be unintended visual artifacts.'
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