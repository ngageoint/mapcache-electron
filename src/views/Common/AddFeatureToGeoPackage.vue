<template>
  <v-card flat tile>
    <v-card-title class="pl-6 pt-4">
      Add feature to GeoPackage
    </v-card-title>
    <v-card-text>
      <v-card-subtitle class="text-wrap pb-6">
        Specify an existing GeoPackage or create a new one. Then you will be able to select a feature layer from that
        GeoPackage or create a new one.
      </v-card-subtitle>
      <v-row no-gutters justify="start" align="baseline" class="ml-4 mr-4">
        <v-select variant="underlined" :disabled="geopackageItems.length === 0"
                  :label="geopackageItems.length > 0 ? 'Select a GeoPackage' : 'No GeoPackages exist, add a new one'"
                  class="ml-2 mr-2" clearable v-model="geoPackageModel" :items="geopackageItems" persistent-hint
                  hint="To create a new GeoPackage, press the + button."/>
        <v-spacer/>
        <v-col>
          <v-tooltip location="end" :disabled="!project.showToolTips">
            <template v-slot:activator="{ props }">
              <v-btn style="margin-top: -24px !important;" density="comfortable" variant="text" color="primary" icon="mdi-plus" @click="addGeoPackage" v-bind="props"/>
            </template>
            <span>Create GeoPackage</span>
          </v-tooltip>
        </v-col>
      </v-row>
      <v-row v-if="!addFeatureLayerMode" no-gutters justify="start" align="baseline" class="ml-4 mr-4 mt-4">
        <v-select variant="underlined" clearable :disabled="geoPackageModel == null || featureLayers.length === 0"
                  :label="featureLayers.length > 0 ? 'Select a feature layer' : 'No feature layers exist, add a new one'"
                  class="ml-2 mr-2" v-model="featureTableModel" :items="featureLayers" persistent-hint
                  hint="To create a new feature layer, press the + button."/>
        <v-spacer/>
        <v-col>
          <v-tooltip location="end" :disabled="!project.showToolTips">
            <template v-slot:activator="{ props }">
              <v-btn style="margin-top: -24px !important;" density="comfortable" variant="text" :disabled="geoPackageModel == null" color="primary" icon="mdi-plus" @click="enableAddFeatureLayerMode" v-bind="props"/>
            </template>
            <span>Add feature layer</span>
          </v-tooltip>
        </v-col>
      </v-row>
      <v-row v-else no-gutters justify="start" align="baseline" class="ml-4 mr-4 mt-4">
        <v-col cols="9">
          <v-form v-on:submit.prevent="() => {}" v-model="newFeatureNameValid">
            <v-text-field variant="underlined" v-model="newFeatureTableName" :disabled="geoPackageModel == null" class="ml-2 mr-2"
                          label="Feature layer name" :rules="featureTableRules" persistent-hint hint="Type in the feature layer name"></v-text-field>
          </v-form>
        </v-col>
        <v-spacer/>
        <v-col>
          <v-tooltip location="end" :disabled="!project.showToolTips" text="Cancel">
            <template v-slot:activator="{ props }">
              <v-btn style="margin-top: -24px !important;" density="comfortable" variant="text" :disabled="geoPackageModel == null" icon="mdi-close" @click="addFeatureLayerMode = false" v-bind="props"/>
            </template>
          </v-tooltip>
        </v-col>
        <v-col>
          <v-tooltip location="end" :disabled="!project.showToolTips" text="Save feature layer">
            <template v-slot:activator="{ props }">
              <v-btn style="margin-top: -24px !important;" density="comfortable" variant="text" @click="handleAddFeatureLayer" :disabled="geoPackageModel == null || !newFeatureNameValid" icon="mdi-check" color="primary" v-bind="props"/>
            </template>
          </v-tooltip>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer/>
      <v-btn variant="text" @click="cancel">
        Cancel
      </v-btn>
      <v-btn variant="text" color="primary" :disabled="!featureTableValid"
             @click="() => save(geoPackageModel, featureTableModel)">
        Add feature
      </v-btn>
    </v-card-actions>
    <v-snackbar
        v-if="showAlert"
        v-model="showAlert"
        style="position: fixed; bottom: 0;"
    >
      GeoPackage already exists.
      <template v-slot:actions>
        <v-btn
            color="warning"
            variant="text"
            @click="showAlert = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import { addGeoPackage } from '../../lib/vue/vuex/CommonActions'
import { addFeatureTableToGeoPackage } from '../../lib/vue/vuex/ProjectActions'

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
      valid: false,
      showAlert: false,
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
          title: geopackage.name,
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
        v => (this.geoPackageModel ? this.getFeatureLayerItemsForGeoPackageId(this.geoPackageModel) : []).map(name => name.toLowerCase()).indexOf(v.toLowerCase()) === -1 || 'Feature layer name already exists'
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
      }).then(({ canceled, filePath }) => {
        if (!canceled && !isNil(filePath)) {
          if (!filePath.endsWith('.gpkg')) {
            filePath = filePath + '.gpkg'
          }
          if (!window.mapcache.fileExists(filePath)) {
            addGeoPackage(this.project.id, filePath).then((geopackageId) => {
              if (geopackageId != null) {
                this.lastAddedGeoPackageId = geopackageId
              }
            })
          } else {
            this.showAlert = true
          }
        }
      })
    },
    handleAddFeatureLayer () {
      this.addFeatureLayer(this.newFeatureTableName.trim())
    },
    addFeatureLayer (tableName) {
      addFeatureTableToGeoPackage(this.project.id, this.geoPackageModel, tableName).then(() => {
        this.featureTableModel = tableName
        this.addFeatureLayerMode = false
        this.newFeatureTableName = ''
      })
    },
    updateFeatureLayers (geopackageId) {
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