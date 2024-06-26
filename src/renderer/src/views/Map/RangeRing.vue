<template>
  <v-card outlined class="range-ring-card">
    <v-card-title>
      <v-btn variant="text" color="primary" class="mr-2" @click="zoomToRangeRing" icon="mdi-circle-multiple-outline"/>
      Range rings
    </v-card-title>
    <v-card-subtitle>Specify the center of your ranged rings, then add rings.</v-card-subtitle>
    <v-card-text class="pb-2 overflow-y-auto" style="height: 248px !important;">
      <v-card-subtitle class="ma-0 pb-4 pl-0">Center point</v-card-subtitle>
      <v-row no-gutters justify="space-between">
        <v-col cols="5">
          <v-text-field variant="underlined" class="pr-2" density="compact" hide-details type="number" label="Latitude" v-model="rangeRingCenter.lat"></v-text-field>
        </v-col>
        <v-col cols="5">
          <v-text-field variant="underlined" class="pr-2" density="compact" hide-details type="number" label="Longitude" v-model="rangeRingCenter.lon"></v-text-field>
        </v-col>
        <v-spacer/>
        <v-btn variant="text" icon="mdi-map-marker" @click="drawRangeRingCenterPoint"/>
      </v-row>
      <v-card-subtitle class="ma-0 pb-4 pl-0">Rings</v-card-subtitle>
      <v-row no-gutters justify="space-between">
        <v-col cols="10">
          <v-select hide-details variant="underlined" density="compact" label="Distance units" :items="distanceUnits" v-model="distanceUnit" item-text="text" item-value="value"></v-select>
        </v-col>
        <v-spacer/>
        <v-btn variant="text" :disabled="!distancesValid" @click="addRingDistance" icon="mdi-plus"/>
      </v-row>
      <v-row no-gutters>
        <v-list style="width: 100% !important;" class="ma-0 pa-0">
          <v-list-item style="width: 100% !important;" class="ma-0 pa-0" v-for="(item, i) in ringDistances" :key="i">
            <v-row no-gutters>
              <v-col cols="10">
                <number-picker :number="Number(item.distance)"
                               @update-valid="(valid) => {item.valid = valid}"
                               @update-number="(val) => {item.distance = val}" :min="Number(0)"
                               :step="Number(1)" hide-details/>
              </v-col>
              <v-spacer/>
              <v-btn class="mt-4" density="compact" variant="text" @click="() => deleteRingDistance(i)" icon="mdi-trash-can-outline"/>
            </v-row>
          </v-list-item>
        </v-list>
      </v-row>
    </v-card-text>
    <v-divider/>
    <v-card-actions>
      <v-spacer/>
      <v-btn variant="text" @click="cancel" color="warning">Cancel</v-btn>
      <v-btn :disabled="!distancesValid" @click="saveRangeRingFeature" variant="text" color="primary">Save</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { L } from '../../../../lib/leaflet/vendor'
import { convertLength } from '@turf/helpers'
import { DRAWING_LAYER_PANE } from '../../../../lib/leaflet/map/panes/MapPanes'
import { generateCircularFeature } from '../../../../lib/util/geojson/GeoJSONUtilities'
import NumberPicker from '../Common/NumberPicker.vue'

export default {
  components: { NumberPicker },
  props: {
    map: {
      type: Object,
      required: true
    },
    saveFeature: Function,
    close: Function
  },
  data () {
    return {
      rangeRingCenter: { lat: 0.0, lon: 0.0 },
      ringMapLayers: [],
      ringCenterLayer: null,
      distanceUnits: [{title: 'Feet', value: 'feet'}, {title: 'Miles', value: 'miles'}, {title: 'Meters',  value: 'meters'}, {title: 'Kilometers', value: 'kilometers'}],
      distanceUnit: 'miles',
      ringDistances: [],
      distancesValid: true
    }
  },
  methods: {
    zoomToRangeRing () {
      if (this.ringMapLayers.length > 0) {
        const mapLayer = this.ringMapLayers.sort((a, b) => a.options.distance - b.options.distance)[this.ringDistances.length - 1]
        this.map.fitBounds(mapLayer.getBounds().pad(0.5));
      } else {
        this.map.fitBounds(L.latLngBounds(L.latLng(this.rangeRingCenter.lat, this.rangeRingCenter.lon), L.latLng(this.rangeRingCenter.lat, this.rangeRingCenter.lon)).pad(0.5), {maxZoom: 14});
      }
    },
    cancel () {
      if (this.ringCenterLayer != null) {
        this.map.removeLayer(this.ringCenterLayer)
      }
      this.ringMapLayers.forEach(mapLayer => {
        this.map.removeLayer(mapLayer)
      })
      this.close()
    },
    saveRangeRingFeature () {
      const feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiLineString',
          coordinates: this.ringDistances.sort((a, b) => a.distance - b.distance).map(ring => {
            return this.getRadiusFeature(ring.distance, this.distanceUnit).geometry.coordinates[0]
          })
        },
        isRangeRing: true
      }
      this.saveFeature(feature)
      this.cancel()
    },
    convertDistance (value, sourceUnit, targetUnit) {
      return convertLength(value, sourceUnit, targetUnit)
    },
    drawRangeRingCenterPoint () {
      this.map.pm.enableDraw('Marker', {
        snappable: true,
      })
    },
    getRadiusFeature (distance, units) {
      return generateCircularFeature([this.rangeRingCenter.lon, this.rangeRingCenter.lat], {distance: distance, units: units}, this.convertDistance(distance, units, 'meters'), 128)
    },
    getDistancePattern () {
      let distance = null
      if (this.ringDistances.length === 0) {
        distance = 1
      } else if (this.ringDistances.length === 1) {
        distance = this.ringDistances[0].distance * 2.0
      } else if (this.ringDistances.length > 1) {
        let differences = []
        const sortedDistances = this.ringDistances.map(ring => ring.distance).sort((a, b) => a - b)
        for (let i = 1; i < sortedDistances.length; i++) {
          const prevDistance = sortedDistances[i - 1]
          const distance = sortedDistances[i]
          differences.push(Math.abs(distance - prevDistance))
        }
        distance = sortedDistances[sortedDistances.length - 1] + (differences.reduce((a, b) => {
          return a + b
        }, 0) / differences.length)
      }
      return distance
    },
    addRingDistance () {
      const distance = this.getDistancePattern() || 1
      const ringLayer = L.circle(L.latLng(this.rangeRingCenter.lat, this.rangeRingCenter.lon), {
        radius: this.convertDistance(distance, this.distanceUnit, 'meters'),
        pane: DRAWING_LAYER_PANE.name,
        zIndex: DRAWING_LAYER_PANE.zIndex,
        distance: distance,
        fill: false
      })
      this.ringMapLayers.push(ringLayer)
      ringLayer.addTo(this.map)
      this.ringDistances.push({
        distance: distance,
        valid: distance > 0
      })
    },
    deleteRingDistance (index) {
      const layerToDelete = this.ringMapLayers.splice(index, 1)[0]
      this.map.removeLayer(layerToDelete)
      this.ringDistances.splice(index, 1)
    },
    redrawRings () {
      for (let i = 0; i < this.ringMapLayers.length; i++) {
        const ringMapLayer = this.ringMapLayers[i]
        this.map.removeLayer(ringMapLayer)
        if (this.ringDistances[i].distance >= 0) {
          const newRingMapLayer = L.circle(L.latLng(this.rangeRingCenter.lat, this.rangeRingCenter.lon), {
            radius: this.convertDistance(this.ringDistances[i].distance, this.distanceUnit, 'meters'),
            pane: DRAWING_LAYER_PANE.name,
            zIndex: DRAWING_LAYER_PANE.zIndex,
            distance: this.ringDistances[i].distance,
            fill: false
          })
          newRingMapLayer.addTo(this.map)
          this.ringMapLayers[i] = newRingMapLayer
        }
      }
    }
  },
  mounted () {
    if(this.map == null){
      this.cancel()
    }
    this.handlePlacemarkSetting = ({ layer }) => {
      const feature = layer.toGeoJSON()
      this.map.removeLayer(layer)
      this.rangeRingCenter.lat = feature.geometry.coordinates[1]
      this.rangeRingCenter.lon = feature.geometry.coordinates[0]
    }
    this.map.on('pm:create', this.handlePlacemarkSetting)
    this.ringCenterLayer = L.circleMarker(L.latLng(this.rangeRingCenter.lat, this.rangeRingCenter.lon), {
      color: '#FF0000',
      radius: 1
    })
    this.handleDrawStart = ({ workingLayer }) => {
      workingLayer.setLatLng(this.map.getCenter())
    }
    this.map.on('pm:drawstart', this.handleDrawStart)
    this.ringCenterLayer.addTo(this.map)
    this.addRingDistance()
  },
  beforeDestroy () {
    this.map.off('pm:create', this.handlePlacemarkSetting)
    this.map.off('pm:drawstart', this.handleDrawStart)
  },
  watch: {
    ringDistances: {
      handler () {
        let valid = true
        this.ringDistances.forEach(ringDistance => {
          ringDistance.distance = Number(ringDistance.distance)
          if (ringDistance.valid === false) {
            valid = false
          }
        })
        if (this.ringDistances.length === this.ringMapLayers.length) {
          for (let i = 0; i < this.ringDistances.length; i++) {
            const ringDistance = Number(this.ringDistances[i].distance)
            const featureDistance = Number(this.ringMapLayers[i].options.distance)
            if (ringDistance < 0) {
              this.map.removeLayer(this.ringMapLayers[i])
            } else if (ringDistance !== featureDistance) {
              this.map.removeLayer(this.ringMapLayers[i])
              const ringLayer = L.circle(L.latLng(this.rangeRingCenter.lat, this.rangeRingCenter.lon), {
                radius: this.convertDistance(ringDistance, this.distanceUnit, 'meters'),
                pane: DRAWING_LAYER_PANE.name,
                zIndex: DRAWING_LAYER_PANE.zIndex,
                distance: ringDistance,
                fill: false
              })
              ringLayer.addTo(this.map)
              this.ringMapLayers[i] = ringLayer
            }
          }
        }
        this.distancesValid = valid
      },
      deep: true
    },
    rangeRingCenter: {
      handler (newValue) {
        if (newValue != null) {
          if (this.ringCenterLayer != null) {
            this.map.removeLayer(this.ringCenterLayer)
          }
          this.ringCenterLayer = L.circleMarker(L.latLng(newValue.lat, newValue.lon), {
            color: '#FF0000',
            radius: 1
          })
          this.ringCenterLayer.addTo(this.map)
          this.redrawRings()
        }
      },
      deep: true
    },
    distanceUnit: {
      handler () {
        this.redrawRings()
      }
    },
  }
}
</script>

<style scoped>
.range-ring-card {
  top: 364px;
  min-width: 348px;
  max-width: 348px !important;
  position: absolute !important;
  right: 50px !important;
  max-height: 450px !important;
  border: 2px solid rgba(0, 0, 0, 0.2) !important;
}
</style>