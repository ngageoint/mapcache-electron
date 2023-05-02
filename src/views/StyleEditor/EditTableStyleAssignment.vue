<template>
  <v-card style="max-height: 400px;">
    <v-card-title>{{ assignment.name + ' style assignment' }}</v-card-title>
    <v-card-subtitle class="mt-1">Select a style to assign. Deselect to remove assignment.</v-card-subtitle>
    <v-card-text>
      <v-virtual-scroll
          v-if="items.length > 0"
          :bench="10"
          :items="items"
          :height="Math.min(200, items.length * 48)"
          item-height="48">
        <template v-slot:default="{ index, item }">
          <v-list-item link @click="() => setModel(index)">
            <div>
              <v-row no-gutters justify="space-between" align="center">
                <v-col cols="8">
                  <v-radio-group hide-details dense class="ml-2 mt-0 pt-0" :value="model === index ? index : null">
                    <v-radio class="ma-0 pa-0" dense :label="item.name" :value="index"></v-radio>
                  </v-radio-group>
                </v-col>
                <v-row no-gutters justify="end" align="center">
                  <v-img v-if="item.url != null" class="icon-box" :src="item.url"/>
                  <geometry-style-svg v-else :geometry-type="assignment.geometryType" :color="item.color" :fill-color="item.fillColor" :fill-opacity="item.fillOpacity"/>
                </v-row>
              </v-row>
            </div>
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </v-card-text>
    <v-card-actions>
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
import GeometryStyleSvg from '../Common/GeometryStyleSvg.vue'
import { setTableIcon, setTableStyle } from '../../lib/vue/vuex/ProjectActions'

export default {
  components: { GeometryStyleSvg },
  props: {
    id: String,
    tableName: String,
    projectId: String,
    styles: Array,
    icons: Array,
    assignment: Object,
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
      model: this.assignment.icon ? this.icons.findIndex(icon => icon.id === this.assignment.icon.id) : (this.assignment.style ? this.styles.findIndex(style => style.id === this.assignment.style.id) + (this.assignment.geometryType === 1 || this.assignment.geometryType === 4 ? this.icons.length : 0) : null)
    }
  },
  computed: {
    items () {
      let items = []
      if (this.assignment != null) {
        // point or multi point
        if (this.assignment.geometryType === 1 || this.assignment.geometryType === 4) {
          items = this.icons.concat(this.styles)
        } else {
          items = this.styles
        }
      }
      return items
    }
  },
  methods: {
    setModel (index) {
      if (this.model === index) {
        this.model = null
      } else {
        this.model = index
      }
    },
    async save () {
      if (this.model != null && this.model >= 0) {
        const selection = this.items[this.model]
        if (selection.url == null) {
          await setTableStyle(this.projectId, this.id, this.tableName, this.assignment.geometryType, selection.id, this.isGeoPackage, this.isBaseMap)
          await setTableIcon(this.projectId, this.id, this.tableName, this.assignment.geometryType, -1, this.isGeoPackage, this.isBaseMap)
        } else {
          await setTableIcon(this.projectId, this.id, this.tableName, this.assignment.geometryType, selection.id, this.isGeoPackage, this.isBaseMap)
          await setTableStyle(this.projectId, this.id, this.tableName, this.assignment.geometryType, -1, this.isGeoPackage, this.isBaseMap)
        }
      } else {
        await setTableStyle(this.projectId, this.id, this.tableName, this.assignment.geometryType, -1, this.isGeoPackage, this.isBaseMap)
        await setTableIcon(this.projectId, this.id, this.tableName, this.assignment.geometryType, -1, this.isGeoPackage, this.isBaseMap)
      }
      this.close()
    }
  }
}
</script>

<style scoped>
</style>
