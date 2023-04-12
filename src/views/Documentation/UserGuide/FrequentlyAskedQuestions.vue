<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <v-card-title>
      <v-icon size="24px" class="mr-2" color="primary" icon="mdi-chat-question-outline"/>
      Frequently Asked Questions
    </v-card-title>
    <v-container>
      <v-expansion-panels>
        <v-expansion-panel
            v-for="(entry, i) in entries"
            :key="i"
        >
          <v-expansion-panel-title>
            <span class="regular--text font-weight-medium" style="line-height: 150%" v-html="entry.question"></span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="detail--text" v-html="entry.answer"></p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-container>
  </v-card>
</template>

<script>
import { mdiChatQuestionOutline } from '@mdi/js'


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
          answer: `There are a couple of ways this can be handled. You can reach out to the MapCache team and request a data source or web service be supported. Alternatively, other tools, such as GDAL, can be used to convert data into a format already supported by MapCache.`
        },
        {
          question: 'Why can\'t I select a different certificate?',
          answer: 'Similar to Google Chrome, once a certificate has been selected, the session will remember that selection. If a different certificate is necessary, users will need to restart the application.'
        },
        {
          question: 'What happens when I remove a GeoPackage from MapCache?',
          answer: 'MapCache will remove it\'s reference to the GeoPackage. The GeoPackage will remain on your computer.'
        },
        {
          question: 'When I add a drawing to a GeoPackage feature table, why does it not appear?',
          answer: 'If the GeoPackage feature layer is not enabled, that layer\'s features will not be visible. This includes the newly added drawing. Enable the GeoPackage feature layer to view the recently added drawing.'
        },
        {
          question: 'Why are some map tiles blank for my WMS/XYZ data source and/or base map?',
          answer: 'If one or more tiles for a WMS/XYZ source are missing, it is likely that the request timeout (ms) and/or max retry attempts are too low. These network settings can be adjusted in the data source or base map. If the max timeout is set to the highest value and is still timing out, it can be disabled by setting the value to zero.'
        },
        {
          question: 'How does tile scaling affect a GeoPackage tile layer?',
          answer: 'Tile scaling is used to reduce the overall number of tiles in the created tile layer, which reduces the size of the GeoPackage. The draw back to tile scaling is that some of the tiles may be less detailed due to scaling and there could be unintended visual artifacts.'
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