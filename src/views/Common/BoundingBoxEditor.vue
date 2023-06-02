<template>
  <v-card flat tile>
    <v-card-text>
      <v-row no-gutters class="ml-4">
        <v-col>
          <v-text-field variant="underlined" v-if="boundingBox == null && !editingDirectly" disabled label="Minimum latitude"
                        value="Not set"></v-text-field>
          <number-picker v-else :disabled="!editingDirectly" ref="minLatRef"
                         :additional-rules="[v => (Number(v) < this.maxLatitude || 'Min latitude should be less than max latitude.')]"
                         :autofocus="true" hint="range is -90 to 90" :number="minLatitude" label="Minimum latitude"
                         :step="1" @update-number="(val) => { updateMinLat(val) }"
                         @update-valid="(val) => {this.minLatValid = val}" :min="-90.0" :max="90.0"/>
        </v-col>
      </v-row>
      <v-row no-gutters class="ml-4">
        <v-col>
          <v-text-field variant="underlined" v-if="boundingBox == null && !editingDirectly" disabled label="Maximum latitude"
                        value="Not set"></v-text-field>
          <number-picker v-else :disabled="!editingDirectly" ref="maxLatRef"
                         :additional-rules="[v => (Number(v) > this.minLatitude || 'Max latitude should be greater than min latitude.')]"
                         :autofocus="false" hint="range is -90 to 90" :number="maxLatitude" label="Maximum latitude"
                         :step="1" @update-number="updateMaxLat" @update-valid="(val) => {this.maxLatValid = val}"
                         :min="-90.0" :max="90.0"/>
        </v-col>
      </v-row>
      <v-row no-gutters class="ml-4">
        <v-col>
          <v-text-field variant="underlined" v-if="boundingBox == null && !editingDirectly" disabled label="Minimum longitude"
                        value="Not set"></v-text-field>
          <number-picker v-else :disabled="!editingDirectly" ref="minLongRef"
                         :additional-rules="[v => (Number(v) < this.maxLongitude || 'Min longitude should be less than max longitude.')]"
                         :autofocus="false" hint="range is -180 to 180" :number="minLongitude" label="Minimum longitude"
                         :step="1" @update-number="updateMinLong" @update-valid="(val) => {this.minLonValid = val}"
                         :min="-180.0" :max="180.0"/>
        </v-col>
      </v-row>
      <v-row no-gutters class="ml-4">
        <v-col>
          <v-text-field variant="underlined" v-if="boundingBox == null && !editingDirectly" disabled label="Maximum longitude"
                        value="Not set"></v-text-field>
          <number-picker v-else :disabled="!editingDirectly" ref="maxLongRef"
                         :additional-rules="[v => (Number(v) > this.minLongitude || 'Max longitude should be greater than min longitude.')]"
                         :autofocus="false" hint="range is -180 to 180" :number="maxLongitude" label="Maximum longitude"
                         :step="1" @update-number="updateMaxLong" @update-valid="(val) => {this.maxLonValid = val}"
                         :min="-180.0" :max="180.0"/>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          v-if="!editingDirectly && !drawingBounds && !pickingGrid && boundingBox != null"
          variant="text"
          color="warning"
          class="mr-2"
          @click="reset">
        Reset
      </v-btn>
      <v-btn
          v-if="editingDirectly"
          variant="text"
          @click="editingDirectly = false">
        Cancel
      </v-btn>
      <v-btn
          color="primary"
          v-if="pickingGrid"
          class="mr-2"
          @click="stopPickingGrid">
        Finish
      </v-btn>
      <v-btn
          color="primary"
          v-if="drawingBounds"
          class="mr-2"
          @click="stopDrawingBoundingBox">
        Finish
      </v-btn>
      <v-btn
          v-if="editingDirectly && minLatValid && minLonValid && maxLatValid && maxLonValid"
          color="primary"
          @click="updateBoundingBoxInput">
        Save
      </v-btn>
      <v-menu
          v-if="!editingDirectly && !drawingBounds && !pickingGrid"
          top
          close-on-click
      >
        <template v-slot:activator="{ props }">
          <v-btn
              color="primary"
              v-bind="props">
            {{ 'Edit' }}
          </v-btn>
        </template>
        <v-list dense>
          <v-list-item dense @click="editingDirectly = true">
            <v-list-item-title>Type in</v-list-item-title>
          </v-list-item>
          <v-list-item dense @click="drawBoundingBox">
            <v-list-item-title>Draw on map</v-list-item-title>
          </v-list-item>
          <v-list-item dense @click="() => gridBoundingBox(0)">
            <v-list-item-title>Use XYZ</v-list-item-title>
          </v-list-item>
          <v-list-item dense @click="() => gridBoundingBox(1)">
            <v-list-item-title>Use GARS</v-list-item-title>
          </v-list-item>
          <v-list-item dense @click="() => gridBoundingBox(2)">
            <v-list-item-title>Use MGRS</v-list-item-title>
          </v-list-item>
          <v-list-item dense v-if="allowExtent" @click="setBoundingBoxFilterToExtent">
            <v-list-item-title>Use data extent</v-list-item-title>
          </v-list-item>
          <v-list-item dense @click="setBoundingBoxToMapExtent">
            <v-list-item-title>Use map extent</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-actions>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import NumberPicker from './NumberPicker.vue'
import EventBus from '../../lib/vue/EventBus'
import { getExtentOfActiveLayers } from '../../lib/vue/vuex/ProjectActions'

export default {
  components: {
    NumberPicker
  },
  props: {
    project: Object,
    boundingBox: Array,
    updateBoundingBox: Function,
    allowExtent: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      id: window.mapcache.createUniqueID(),
      minLat: -90.0,
      maxLat: 90.0,
      minLon: -180.0,
      maxLon: 180.0,
      minLatValid: true,
      maxLatValid: true,
      minLonValid: true,
      maxLonValid: true,
      editingDirectly: false,
      drawingBounds: false,
      pickingGrid: false
    }
  },
  computed: {
    minLongitude () {
      return isNil(this.boundingBox) ? this.minLon : Number(this.boundingBox[0])
    },
    maxLongitude () {
      return isNil(this.boundingBox) ? this.maxLon : Number(this.boundingBox[2])
    },
    minLatitude () {
      return isNil(this.boundingBox) ? this.minLat : Number(this.boundingBox[1])
    },
    maxLatitude () {
      return isNil(this.boundingBox) ? this.maxLat : Number(this.boundingBox[3])
    }
  },
  beforeDestroy () {
    this.stopEditing()
  },
  methods: {
    reset () {
      this.minLat = -90.0
      this.maxLat = 90.0
      this.minLon = -180.0
      this.maxLon = 180.0
      this.updateBoundingBox()
    },
    getBoundingBoxText () {
      let boundingBoxText = 'Not specified'
      if (!isNil(this.boundingBox)) {
        const bbox = this.boundingBox
        boundingBoxText = '(' + bbox[1].toFixed(4) + ',' + bbox[0].toFixed(4) + '), (' + bbox[3].toFixed(4) + ',' + bbox[2].toFixed(4) + ')'
      }
      return boundingBoxText
    },
    isEditing () {
      return this.pickingGrid || this.editingDirectly || this.drawingBounds
    },
    stopEditing () {
      if (this.drawingBounds) {
        EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_STOP)
      } else if (this.pickingGrid) {
        EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX_STOP)
      }
      this.drawingBounds = false
      this.editingDirectly = false
      this.pickingGrid = false
      EventBus.$off(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id))
      EventBus.$off(EventBus.EventTypes.DRAW_BOUNDING_BOX_CANCELLED(this.id))
      EventBus.$off(EventBus.EventTypes.GRID_BOUNDING_BOX_CANCELLED(this.id))
    },
    setBoundingBoxFilterToExtent () {
      getExtentOfActiveLayers(this.project.id).then(boundingBox => {
        this.updateBoundingBox(boundingBox)
      }).catch(() => {
        // eslint-disable-next-line no-console
        console.error('Failed to set bounding box filter to the extent of visible layers.')
      })
    },
    setBoundingBoxToMapExtent () {
      EventBus.$once(EventBus.EventTypes.RESPONSE_MAP_DETAILS, ({ extent }) => {
        this.updateBoundingBox(extent)
      })
      const options = {
        padBounds: false
      }
      EventBus.$emit(EventBus.EventTypes.REQUEST_MAP_DETAILS, options)
    },
    stopDrawingBoundingBox () {
      EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX_STOP)
      EventBus.$off(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id))
    },
    drawBoundingBox () {
      EventBus.$on(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id), (boundingBox) => {
        boundingBox[0] = Number(boundingBox[0].toFixed(8))
        boundingBox[1] = Number(boundingBox[1].toFixed(8))
        boundingBox[2] = Number(boundingBox[2].toFixed(8))
        boundingBox[3] = Number(boundingBox[3].toFixed(8))
        this.updateBoundingBox(boundingBox)
      })
      EventBus.$on(EventBus.EventTypes.DRAW_BOUNDING_BOX_CANCELLED(this.id), () => {
        EventBus.$off(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id))
        this.drawingBounds = false
      })

      if (this.boundingBox == null) {
        EventBus.$once(EventBus.EventTypes.RESPONSE_MAP_DETAILS, ({ extent }) => {
          this.updateBoundingBox(extent)
          EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX, this.id, extent, false)
        })
        const options = {
          padBounds: true
        }
        EventBus.$emit(EventBus.EventTypes.REQUEST_MAP_DETAILS, options)
      } else {
        EventBus.$emit(EventBus.EventTypes.DRAW_BOUNDING_BOX, this.id, this.boundingBox)
      }
      this.drawingBounds = true
    },
    stopPickingGrid () {
      EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX_STOP)
      EventBus.$off(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id))
    },
    gridBoundingBox (type) {
      EventBus.$on(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id), (boundingBox) => {
        this.updateBoundingBox(boundingBox)
      })
      EventBus.$on(EventBus.EventTypes.GRID_BOUNDING_BOX_CANCELLED(this.id), () => {
        EventBus.$off(EventBus.EventTypes.BOUNDING_BOX_UPDATED(this.id))
        this.pickingGrid = false
      })
      EventBus.$emit(EventBus.EventTypes.GRID_BOUNDING_BOX, this.id, type)
      this.pickingGrid = true
    },
    updateBoundingBoxInput () {
      this.editingDirectly = false
      this.updateBoundingBox([this.minLongitude, this.minLatitude, this.maxLongitude, this.maxLatitude])
    },
    updateMinLat (val) {
      this.minLat = val
      this.$refs['maxLatRef'].revalidate()
    },
    updateMaxLat (val) {
      this.maxLat = val
      this.$refs['minLatRef'].revalidate()
    },
    updateMinLong (val) {
      this.minLon = val
      this.$refs['maxLongRef'].revalidate()
    },
    updateMaxLong (val) {
      this.maxLon = val
      this.$refs['minLongRef'].revalidate()
    }
  }
}
</script>

<style scoped>
</style>
