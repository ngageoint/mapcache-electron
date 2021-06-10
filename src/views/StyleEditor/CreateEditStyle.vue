<template>
  <v-card>
    <v-dialog
      v-model="deleteDialog"
      max-width="350"
      persistent
      @keydown.esc="deleteDialog = false">
      <v-card v-if="deleteDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete style
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete the <b>{{this.styleRow.name}}</b> style? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="deleteStyle">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-card-title>
      {{isNew ? 'Create Style' : 'Edit Style'}}
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
          <v-text-field autofocus label="Name" v-model="name"></v-text-field>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-4">
        <v-col cols="11">
          <v-text-field label="Description" v-model="description"></v-text-field>
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-4">
        <v-col cols="5">
          <colorpicker :color="color" v-model="color" label="Point / Line Color" />
        </v-col>
        <v-col offset="1" cols="5">
          <colorpicker :color="fillColor" v-model="fillColor" label="Fill Color" />
        </v-col>
      </v-row>
      <v-row no-gutters class="pl-4">
        <v-col cols="5" class="align-center">
          <numberpicker :number="opacity" label="Point / Line Opacity" :step="Number(0.1)" :min="Number(0.0)" :max="Number(1.0)" @update-number="updateOpacity" @update-valid="setOpacityValid"/>
        </v-col>
        <v-col offset="1" cols="5" class="align-center">
          <numberpicker :number="fillOpacity" label="Fill Opacity" :step="Number(0.1)" :min="Number(0.0)" :max="Number(1.0)" @update-number="updateFillOpacity" @update-valid="setFillOpacityValid" />
        </v-col>
      </v-row>
      <v-row no-gutters class="justify-space-between pl-4" align="center">
        <v-col cols="5" class="align-center">
          <numberpicker :number="width" label="Width (px)" :step="Number(0.1)" :min="Number(0.1)" arrows-only @update-number="updateWidth" @update-valid="setWidthValid"/>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
        v-if="styleRow.id !== null && styleRow.id !== undefined"
        color="warning"
        text
        @click="deleteDialog = true">
        Delete
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        text
        @click="close">
        Close
      </v-btn>
      <v-btn
        v-if="this.opacityValid && this.fillOpacityValid && this.widthValid"
        color="primary"
        text
        @click="save">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import ColorPicker from '../Common/ColorPicker'
import NumberPicker from '../Common/NumberPicker'
import GeometryStyleSvg from '../Common/GeometryStyleSvg'
import {mdiTrashCan} from '@mdi/js'

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
        mdiTrashCan: mdiTrashCan,
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
        widthValid: true
      }
    },
    components: {
      GeometryStyleSvg,
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker
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
      save () {
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
          window.mapcache.updateStyleRow({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            styleRow: styleRow,
            isGeoPackage: this.isGeoPackage,
            isBaseMap: this.isBaseMap
          })
        } else {
          window.mapcache.createStyleRow({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            style: styleRow,
            isGeoPackage: this.isGeoPackage,
            isBaseMap: this.isBaseMap
          })
        }
        this.close()
      },
      deleteStyle () {
        window.mapcache.deleteStyleRow({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          styleId: this.styleRow.id,
          isGeoPackage: this.isGeoPackage,
          isBaseMap: this.isBaseMap
        })
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
