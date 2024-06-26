<template>
  <v-card>
    <v-dialog
        v-model="deleteDialog"
        max-width="350"
        persistent
        @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2" icon="mdi-trash-can"/>
          Delete style
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the <b>{{ this.styleRow.name }}</b> style? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="deleteStyle">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card-title>
      {{ isNew ? 'Create style' : 'Edit style' }}
      <v-spacer/>
      <v-row no-gutters justify="end" align="center">
        <geometry-style-svg :geometry-type="1" :color="color" :fill-color="fillColor" :fill-opacity="fillOpacity"/>
        <geometry-style-svg :geometry-type="2" :color="color" :fill-color="fillColor" :fill-opacity="fillOpacity"/>
        <geometry-style-svg :geometry-type="3" :color="color" :fill-color="fillColor" :fill-opacity="fillOpacity"/>
      </v-row>
    </v-card-title>
    <v-card-text>
      <v-row no-gutters class="pl-4">
        <v-col cols="11">
          <v-text-field variant="underlined" autofocus label="Name" v-model="name" :rules="nameRules"></v-text-field>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-4">
        <v-col cols="11">
          <v-text-field variant="underlined" label="Description" v-model="description"></v-text-field>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-4">
        <v-col cols="5">
          <color-picker :color="color" v-model="color" label="Point / Line color"/>
        </v-col>
        <v-col offset="1" cols="5">
          <color-picker :color="fillColor" v-model="fillColor" label="Fill color"/>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-4">
        <v-col cols="5" class="align-center">
          <number-picker :number="opacity" label="Point / Line opacity" :step="Number(0.1)" :min="Number(0.0)"
                        :max="Number(1.0)" @update-number="updateOpacity" @update-valid="setOpacityValid"/>
        </v-col>
        <v-col offset="1" cols="5" class="align-center">
          <number-picker :number="fillOpacity" label="Fill opacity" :step="Number(0.1)" :min="Number(0.0)"
                        :max="Number(1.0)" @update-number="updateFillOpacity" @update-valid="setFillOpacityValid"/>
        </v-col>
      </v-row>
      <v-row no-gutters class="justify-space-between pl-4" align="center">
        <v-col cols="5" class="align-center">
          <number-picker :number="width" label="Width (px)" :step="Number(0.1)" :min="Number(0.1)" arrows-only
                        @update-number="updateWidth" @update-valid="setWidthValid"/>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
          v-if="styleRow.id !== null && styleRow.id !== undefined"
          color="warning"
          variant="text"
          @click="deleteDialog = true">
        Delete
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="close">
        Close
      </v-btn>
      <v-btn
          :disabled="!this.opacityValid || !this.fillOpacityValid || !this.widthValid || this.name == null || this.name.trim().length === 0"
          color="primary"
          variant="text"
          @click="save">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import ColorPicker from '../Common/ColorPicker.vue'
import NumberPicker from '../Common/NumberPicker.vue'
import GeometryStyleSvg from '../Common/GeometryStyleSvg.vue'
import { createStyleRow, deleteStyleRow, updateStyleRow } from '../../../../lib/vue/vuex/ProjectActions'

export default {
  props: {
    id: String,
    tableName: String,
    geometryType: String,
    styleRow: Object,
    projectId: String,
    isGeoPackage: {
      type: Boolean,
      default: true
    },
    isBaseMap: {
      type: Boolean,
      default: false
    },
    close: Function
  },
  data () {
    return {
      name: this.styleRow.name,
      description: this.styleRow.description || '',
      color: this.styleRow.color,
      opacity: this.styleRow.opacity,
      fillColor: this.styleRow.fillColor,
      fillOpacity: this.styleRow.fillOpacity,
      width: this.styleRow.width,
      deleteDialog: false,
      isNew: isNil(this.styleRow.id),
      opacityValid: true,
      fillOpacityValid: true,
      widthValid: true,
      nameRules: [
        v => !!v || 'Name is required'
      ]
    }
  },
  components: {
    GeometryStyleSvg,
    ColorPicker,
    NumberPicker
  },
  methods: {
    setOpacityValid (val) {
      this.opacityValid = val
    },
    setFillOpacityValid (val) {
      this.fillOpacityValid = val
    },
    setWidthValid (val) {
      this.widthValid = val
    },
    updateOpacity (val) {
      this.opacity = val
    },
    updateFillOpacity (val) {
      this.fillOpacity = val
    },
    updateWidth (val) {
      this.width = val
    },
    async save () {
      let styleRow = {
        name: this.name,
        description: this.description,
        color: this.color,
        opacity: this.opacity,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
        width: this.width
      }
      if (this.styleRow.id) {
        styleRow.id = this.styleRow.id
        await updateStyleRow(this.projectId, this.id, this.tableName, styleRow, this.isGeoPackage, this.isBaseMap)
      } else {
        await createStyleRow(this.projectId, this.id, this.tableName, styleRow, this.isGeoPackage, this.isBaseMap)
      }
      this.close()
    },
    async deleteStyle () {
      await deleteStyleRow(this.projectId, this.id, this.styleRow.id, this.isGeoPackage, this.isBaseMap)
      this.close()
    }
  }
}
</script>

<style scoped>
.fs12 {
  font-size: 12px;
}
</style>
