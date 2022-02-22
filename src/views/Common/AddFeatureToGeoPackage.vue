<template>
  <v-card flat tile>
    <v-card-title>
      Add feature to GeoPackage
    </v-card-title>
    <v-card-text>
      <v-card-subtitle>
        Specify an existing GeoPackage or create a new one. Then you will be able to select a feature layer from that GeoPackage or create a new one.
      </v-card-subtitle>
      <v-row no-gutters justify="start" align="baseline" class="ml-4 mr-4">
        <v-col cols="11"><v-select :disabled="geopackageItems.length === 0" :label="geopackageItems.length > 0 ? 'Select a GeoPackage' : 'No GeoPackages exist, add a new one'" class="ml-2 mr-2" clearable v-model="geoPackageModel" :items="geopackageItems" persistent-hint hint="To create a new GeoPackage, press the + button."></v-select></v-col>
        <v-col cols="1">
          <v-tooltip right :disabled="!project.showToolTips">
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon @click="addGeoPackage" v-bind="attrs" v-on="on"><v-icon color="primary">{{mdiPlus}}</v-icon></v-btn>
            </template>
            <span>Create GeoPackage</span>
          </v-tooltip>
        </v-col>
      </v-row>
      <v-row v-if="!addFeatureLayerMode" no-gutters justify="start" align="baseline" class="ml-4 mr-4 mt-4">
        <v-col cols="11">
          <v-select clearable :disabled="geoPackageModel == null || featureLayers.length === 0" :label="featureLayers.length > 0 ? 'Select a feature layer' : 'No feature layers exist, add a new one'" class="ml-2 mr-2" v-model="featureTableModel" :items="featureLayers" persistent-hint hint="To create a new feature layer, press the + button."></v-select>
        </v-col>
        <v-col cols="1">
          <v-tooltip right :disabled="!project.showToolTips">
            <template v-slot:activator="{ on, attrs }">
              <v-btn :disabled="geoPackageModel == null" icon @click="enableAddFeatureLayerMode" v-bind="attrs" v-on="on"><v-icon color="primary">{{mdiPlus}}</v-icon></v-btn>
            </template>
            <span>Add feature layer</span>
          </v-tooltip>
        </v-col>
      </v-row>
      <v-row v-else no-gutters justify="start" align="baseline" class="ml-4 mr-4 mt-4">
        <v-col cols="10">
          <v-form v-on:submit.prevent v-model="newFeatureNameValid">
            <v-text-field v-model="newFeatureTableName" :disabled="geoPackageModel == null" class="ml-2 mr-2" label="Type in feature layer name" :rules="featureTableRules"></v-text-field>
          </v-form>
        </v-col>
        <v-col cols="1">
          <v-tooltip right :disabled="!project.showToolTips">
            <template v-slot:activator="{ on, attrs }">
              <v-btn :disabled="geoPackageModel == null" icon @click="addFeatureLayerMode = false" v-bind="attrs" v-on="on"><v-icon>{{mdiClose}}</v-icon></v-btn>
            </template>
            <span>Cancel</span>
          </v-tooltip>
        </v-col>
        <v-col cols="1">
          <v-tooltip right :disabled="!project.showToolTips">
            <template v-slot:activator="{ on, attrs }">
              <v-btn @click="handleAddFeatureLayer" :disabled="geoPackageModel == null || !newFeatureNameValid" icon v-bind="attrs" v-on="on"><v-icon color="primary">{{mdiCheck}}</v-icon></v-btn>
            </template>
            <span>Save feature layer</span>
          </v-tooltip>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer/>
      <v-btn text @click="cancel">
        Cancel
      </v-btn>
      <v-btn text color="primary" :disabled="!featureTableValid" @click="() => save(geoPackageModel, featureTableModel)">
        Add feature
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import {mdiPlus, mdiClose, mdiCheck} from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'

export default {
  props: {
    cancel: Function,
    save: Function,
    geopackages: Object,
    activeGeoPackage: Object,
    project: Object
  },
  data () {
    return {
      mdiPlus,
      mdiClose,
      mdiCheck,
      valid: false,
      step: 1,
      geoPackageModel: this.project.activeGeoPackage ? this.project.activeGeoPackage.geopackageId : null,
      search: '',
      lastAddedGeoPackageId: null,
      featureTableModel: this.project.activeGeoPackage ? this.project.activeGeoPackage.tableName : null,
      featureLayers: this.project.activeGeoPackage ? this.getFeatureLayerItemsForGeoPackageId(this.project.activeGeoPackage.geopackageId) : [],
      featureTableValid: this.project.activeGeoPackage && this.project.activeGeoPackage.tableName,
      addFeatureLayerMode: false,
      newFeatureTableName: '',
      newFeatureTableRules: [],
      newFeatureNameValid: false
    }
  },
  computed: {
    geopackageItems () {
      return Object.values(this.geopackages).map(geopackage => {
        return {
          text: geopackage.name,
          value: geopackage.id
        }
      })
    },
    defaultGeoPackage () {
      return this.activeGeoPackage ? this.activeGeoPackage.geopackageId : null
    },
    defaultFeatureTable () {
      return this.activeGeoPackage ? this.activeGeoPackage.tableName : null
    },
    featureTableRules () {
      return [
        v => !!v || 'Name is required',
        v => (this.geoPackageModel ? this.getFeatureLayerItemsForGeoPackageId(this.geoPackageModel) : []).map(name => name.toLowerCase()).indexOf(v.toLowerCase()) === -1 || 'Feature layer already exists'
      ]
    }
  },
  methods: {
    getFeatureLayerItemsForGeoPackageId (geopackageId) {
      const geopackage = this.geopackages[geopackageId] || null
      return geopackage != null ? Object.keys(geopackage.tables.features) : []
    },
    addGeoPackage () {
      window.mapcache.showSaveDialog({
        title: 'New GeoPackage',
      }).then(({canceled, filePath}) => {
        if (!canceled && !isNil(filePath)) {
          if (!filePath.endsWith('.gpkg')) {
            filePath = filePath + '.gpkg'
          }
          if (!window.mapcache.fileExists(filePath)) {
            window.mapcache.addGeoPackage({projectId: this.project.id, filePath: filePath}).then((geopackageId) => {
              if (geopackageId != null) {
                this.lastAddedGeoPackageId = geopackageId
              }
            })
          } else {
            EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'GeoPackage already exists.')
          }
        }
      })
    },
    handleAddFeatureLayer () {
      this.addFeatureLayer(this.newFeatureTableName.trim())
    },
    addFeatureLayer (tableName) {
      window.mapcache.addFeatureTableToGeoPackage({projectId: this.project.id, geopackageId: this.geoPackageModel, tableName: tableName, featureCollection: { type: 'FeatureCollection', features: []}}).then(() => {
        this.featureTableModel = tableName
        this.addFeatureLayerMode = false
        this.newFeatureTableName = ''
      })
    },
    updateFeatureLayers(geopackageId) {
      this.featureLayers = this.getFeatureLayerItemsForGeoPackageId(geopackageId)
    },
    enableAddFeatureLayerMode () {
      this.newFeatureTableName = ''
      this.newFeatureNameValid = false
      this.addFeatureLayerMode = true
      this.featureTableModel = null
    }
  },
  watch: {
    geopackages: {
      handler () {
        if (this.lastAddedGeoPackageId != null) {
          this.geoPackageModel = this.lastAddedGeoPackageId
          this.lastAddedGeoPackageId = null
        }
        if (this.geoPackageModel != null && this.geopackages[this.geoPackageModel] != null) {
          this.updateFeatureLayers(this.geoPackageModel)
        }
        this.featureTableValid = this.geoPackageModel != null && this.geopackages[this.geoPackageModel] != null && this.featureTableModel != null && this.featureTableModel.trim().length > 0 && this.geopackages[this.geoPackageModel].tables.features[this.featureTableModel.trim()] != null
      },
      deep: true
    },
    featureTableModel: {
      handler (newValue) {
        this.featureTableValid = this.geoPackageModel != null && this.geopackages[this.geoPackageModel] != null && newValue != null && newValue.trim().length > 0 && this.geopackages[this.geoPackageModel].tables.features[newValue.trim()] != null
      }
    },
    search: {
      handler (newValue) {
        this.featureTableValid = this.geoPackageModel != null && this.geopackages[this.geoPackageModel] != null && newValue != null && newValue.trim().length > 0 && this.geopackages[this.geoPackageModel].tables.features[newValue.trim()] != null
      }
    },
    geoPackageModel: {
      handler (newValue) {
        this.featureTableModel = null
        if (newValue != null && this.geopackages[newValue] != null) {
          this.updateFeatureLayers(newValue)
        } else {
          this.addFeatureLayerMode = false
        }
      }
    }
  },
}
</script>

<style scoped>

</style>