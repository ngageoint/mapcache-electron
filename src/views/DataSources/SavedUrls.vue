<template>
  <v-card>
    <v-dialog
      v-model="deleteDialog"
      max-width="500"
      persistent>
    </v-dialog>
    <v-card-title>URL History</v-card-title>
    <v-card-text>
      <v-row no-gutters>
        <v-col cols="9">
          <v-text-field label="Name" v-model="name"></v-text-field>
        </v-col>
        <v-col align-self="center">
          <v-row no-gutters justify="end" align="center">
            <svg height="25" width="25">
              <circle cx="12.5" cy="12.5" r="5" :stroke="color" :fill="color" :stroke-width="(Math.min(width, 5) + 'px')"></circle>
            </svg>
          </v-row>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
        text
        @click="close">
        Close
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>

  export default {
    props: {
      close: Function
    }
  }
</script>

<style scoped>
  .fs12 {
    font-size: 12px;
  }
</style>
