<template>
  <v-card>
    <v-card-title>
      {{ title }}
      <v-spacer/>
      <geometry-style-svg v-if="geometryType === 1" :geometry-type="1" :color="color" :fill-color="fillColor"
                          :fill-opacity="fillOpacity"/>
      <geometry-style-svg v-if="geometryType === 2" :geometry-type="2" :color="color" :fill-color="fillColor"
                          :fill-opacity="fillOpacity"/>
      <geometry-style-svg v-if="geometryType === 3" :geometry-type="3" :color="color" :fill-color="fillColor"
                          :fill-opacity="fillOpacity"/>
    </v-card-title>
    <v-card-text>
      <v-row no-gutters>
        <v-col cols="5">
          <colorpicker :color="color" v-model="color" label="Point / Line color"/>
        </v-col>
        <v-col offset="1" cols="5">
          <colorpicker :color="fillColor" v-model="fillColor" label="Fill color"/>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col cols="5" class="align-center">
          <numberpicker :number="opacity" label="Point / Line opacity" :step="Number(0.1)" :min="Number(0.0)"
                        :max="Number(1.0)" @update-number="updateOpacity"/>
        </v-col>
        <v-col offset="1" cols="5" class="align-center">
          <numberpicker :number="fillOpacity" label="Fill opacity" :step="Number(0.1)" :min="Number(0.0)"
                        :max="Number(1.0)" @update-number="updateFillOpacity"/>
        </v-col>
      </v-row>
      <v-row no-gutters class="justify-space-between" align="center">
        <v-col cols="5" class="align-center">
          <numberpicker :number="width" label="Width (px)" :step="Number(0.1)" :min="Number(0.1)" arrows-only
                        @update-number="updateWidth"/>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="close">
        Close
      </v-btn>
      <v-btn
          color="primary"
          variant="text"
          @click="saveStyle">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import ColorPicker from '../ColorPicker.vue'
import NumberPicker from '../NumberPicker.vue'
import GeometryStyleSvg from '../GeometryStyleSvg.vue'

export default {
  props: {
    title: String,
    geometryType: Number,
    styleObject: Object,
    save: Function,
    close: Function
  },
  data () {
    return {
      color: this.styleObject.color,
      opacity: this.styleObject.opacity,
      fillColor: this.styleObject.fillColor,
      fillOpacity: this.styleObject.fillOpacity,
      width: this.styleObject.width
    }
  },
  components: {
    GeometryStyleSvg,
    'colorpicker': ColorPicker,
    'numberpicker': NumberPicker
  },
  methods: {
    updateOpacity (val) {
      this.opacity = val
    },
    updateFillOpacity (val) {
      this.fillOpacity = val
    },
    updateWidth (val) {
      this.width = val
    },
    saveStyle () {
      this.save({
        color: this.color,
        opacity: this.opacity,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
        width: this.width
      })
    }
  }
}
</script>

<style scoped>
</style>
