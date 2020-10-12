<template>
  <v-card>
    <v-dialog
      v-model="deleteDialog"
      max-width="350"
      persistent>
      <v-card>
        <v-card-title style="color: grey; font-weight: 600;">
          <v-row no-gutters justify="start" align="center">
            <v-icon>mdi-trash-can-outline</v-icon>Delete Style
          </v-row>
        </v-card-title>
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
    <v-card-title>{{isNew ? 'Create Style' : 'Edit Style'}}</v-card-title>
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
            <svg height="25" width="25">
              <polyline points="5,20 20,15, 5,10, 20,5" :stroke="color" :stroke-width="(Math.min(width, 5) + 'px')" fill="none"></polyline>
            </svg>
            <svg height="25" width="25">
              <polygon points="5,10 20,5 20,20 5,20" :stroke="color" :fill="fillColor" :stroke-width="(Math.min(width, 5) + 'px')"></polygon>
            </svg>
          </v-row>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col cols="9">
          <v-text-field label="Description" v-model="description"></v-text-field>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col cols="5">
          <colorpicker :color="color" v-model="color" label="Point / Line Color" />
        </v-col>
        <v-col offset="1" cols="5">
          <colorpicker :color="fillColor" v-model="fillColor" label="Fill Color" />
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col cols="5" class="align-center">
          <numberpicker :number="opacity" label="Point / Line Opacity" :step="Number(0.1)" :min="Number(0.0)" :max="Number(1.0)" @update-number="updateOpacity" />
        </v-col>
        <v-col offset="1" cols="5" class="align-center">
          <numberpicker :number="fillOpacity" label="Fill Opacity" :step="Number(0.1)" :min="Number(0.0)" :max="Number(1.0)" @update-number="updateFillOpacity" />
        </v-col>
      </v-row>
      <v-row no-gutters class="justify-space-between" align="center">
        <v-col cols="5" class="align-center">
          <numberpicker :number="width" label="Width (px)" :step="Number(1)" :min="Number(1)" arrows-only @update-number="updateWidth" />
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
        color="primary"
        text
        @click="save">
        Save
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import { mapActions } from 'vuex'
  import _ from 'lodash'
  import ColorPicker from '../Common/ColorPicker'
  import NumberPicker from '../Common/NumberPicker'

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
        isNew: _.isNil(this.styleRow.id)
      }
    },
    components: {
      'colorpicker': ColorPicker,
      'numberpicker': NumberPicker
    },
    methods: {
      ...mapActions({
        updateStyleRow: 'Projects/updateStyleRow',
        deleteStyleRow: 'Projects/deleteStyleRow',
        createStyleRow: 'Projects/createStyleRow'
      }),
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
          this.updateStyleRow({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            styleRow: styleRow,
            isGeoPackage: this.isGeoPackage
          })
        } else {
          this.createStyleRow({
            projectId: this.projectId,
            id: this.id,
            tableName: this.tableName,
            style: styleRow,
            isGeoPackage: this.isGeoPackage
          })
        }
        this.close()
      },
      deleteStyle () {
        this.deleteStyleRow({
          projectId: this.projectId,
          id: this.id,
          tableName: this.tableName,
          styleId: this.styleRow.id,
          isGeoPackage: this.isGeoPackage
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
