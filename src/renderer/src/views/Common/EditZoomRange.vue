<template>
  <v-card>
    <v-card-title>
      <v-icon color="primary" class="pr-2" icon="mdi-pencil"/>
      Edit zoom levels
    </v-card-title>
    <v-card-text>
      <v-card-subtitle>
        Specify the minimum and maximum zoom levels.
      </v-card-subtitle>
      <v-container>
        <v-row no-gutters>
          <number-picker ref="minZoom" :number="Number(minZoom)"
                         @update-valid="(valid) => {this.editedMinZoomValid = valid}"
                         @update-number="(val) => {this.editedMinZoom = val}" label="Minimum zoom" :min="Number(0)"
                         :max="Number(20)" :step="Number(1)"/>
        </v-row>
        <v-row no-gutters>
          <number-picker ref="maxZoom" :number="Number(maxZoom)"
                         @update-valid="(valid) => {this.editedMaxZoomValid = valid}"
                         @update-number="(val) => {this.editedMaxZoom = val}" label="Maximum zoom" :min="Number(0)"
                         :max="Number(20)" :step="Number(1)"/>
        </v-row>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="close">
        Cancel
      </v-btn>
      <v-btn
          :disabled="!editedMinZoomValid || !editedMaxZoomValid"
          color="primary"
          variant="text"
          @click="updateLayerZoomRange">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import NumberPicker from './NumberPicker.vue'

export default {
  props: {
    close: Function,
    saveZoomRange: Function,
    minZoom: Number,
    maxZoom: Number
  },
  components: {
    NumberPicker
  },
  data () {
    return {
      editZoomLevelsDialog: true,
      editedMinZoom: this.minZoom,
      editedMaxZoom: this.maxZoom,
      editedMinZoomValid: true,
      editedMaxZoomValid: true
    }
  },
  methods: {
    updateLayerZoomRange () {
      this.saveZoomRange(this.editedMinZoom, this.editedMaxZoom)
    }
  }
}
</script>

<style scoped>
</style>
