<template>
  <v-card flat tile v-if="configuration.layerType === 'WMTS'" class="ma-0 pa-0 detail-bg">
    <v-row no-gutters>
      <v-col>
        <p :style="{fontSize: '16px', fontWeight: '500', marginBottom: '0px'}">
          Layers
          <v-progress-circular class="pl-2" size="24" color="primary" v-if="!loaded" indeterminate></v-progress-circular>
        </p>
        <p class="detail--text" v-if="!loaded" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
          {{ 'Retrieving layer details' }}
        </p>
        <p class="detail--text" v-if="!errored" :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
          {{
            configuration.layers.filter(l => l.enabled).length === 0 ? 'No layers enabled' : (configuration.layers.filter(l => l.enabled).length === configuration.layers.length ? 'All layers enabled' : (configuration.layers.filter(l => l.enabled).length + ' of ' + configuration.layers.length + ' layers enabled'))
          }}
        </p>
        <p class="detail--text" v-else :style="{fontSize: '14px', fontWeight: '500', marginBottom: '0px'}">
          {{ 'Unable to connect to server' }}
        </p>
      </v-col>
    </v-row>
    <v-card-text class="ma-0 pa-0" v-if="loaded">
      <v-list
          :disabled="errored"
          dense
          class="detail-bg"
          v-sortable="{onEnd:updateSortedLayerOrder}">
        <v-list-item
            :disabled="errored"
            v-for="(item) in sortedLayers"
            class="sortable-list-item"
            :key="item.name">
          <template v-slot:prepend class="sortHandle"
                            style="vertical-align: middle !important; align-self: center !important;">
            <v-icon @click.stop.prevent :disabled="errored" icon="mdi-drag-horizontal-variant"></v-icon>
          </template>
          <div>
            <div v-if="item.name">
              <div class="list-item-title no-clamp" v-text="item.name"></div>
            </div>
            <div v-if="item.subtitles && item.subtitles.length > 0">
              <div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles"
                   :key="i + 'service-layer-title'" v-text="title"></div>
            </div>
          </div>
          <v-list-item-action>
            <v-switch :disabled="errored" :model-value="item.enabled" color="primary"
                      @change="() => toggleLayer(item)"></v-switch>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-text class="ma-0 pa-0 detail-bg" v-else>
      <v-skeleton-loader
          v-for="i in configuration.layers.length"
          tile
          flat
          class="skeleton"
          type="list-item-two-line"
          :key="i"
      ></v-skeleton-loader>
    </v-card-text>
  </v-card>
</template>

<script>
import isNil from 'lodash/isNil'
import { SERVICE_TYPE } from '../../lib/network/HttpUtilities'
import { testServiceConnection } from '../../lib/network/ServiceConnectionUtils'
import cloneDeep from 'lodash/cloneDeep'
import WMTSLayer from '../../lib/layer/tile/WMTSLayer'

export default {
  props: {
    configuration: {
      type: Object,
      default: () => {
        return {
          name: ''
        }
      }
    },
    error: Object,
    updateConfiguration: Function,
    setError: Function,
    project: Object
  },
  computed: {
    sortedLayers: {
      get () {
        return this.sortedRenderingLayers
      },
      set (val) {
        this.sortedRenderingLayers = val
      }
    },
  },
  data () {
    return {
      sortedRenderingLayers: [],
      loaded: false,
      errored: this.error != null,
      wmtsInfo: this.configuration.wmtsInfo
    }
  },
  methods: {
    _updateConfiguration (configuration) {
      configuration.wmtsInfo = this.wmtsInfo
      configuration.extent = WMTSLayer.getExtentForLayers(this.sortedLayers)
      this.updateConfiguration(configuration)
    },
    toggleLayer (item) {
      const configuration = cloneDeep(this.configuration)
      item.enabled = !item.enabled
      configuration.layers = this.sortedLayers
      this._updateConfiguration(configuration)
    },
    updateSortedLayerOrder (evt) {
      document.body.style.cursor = 'default'
      const layerOrderTmp = this.sortedLayers.slice()
      const oldIndex = evt.oldIndex
      let newIndex = Math.max(0, evt.newIndex)
      if (newIndex >= layerOrderTmp.length) {
        let k = newIndex - layerOrderTmp.length + 1
        while (k--) {
          layerOrderTmp.push(undefined)
        }
      }
      layerOrderTmp.splice(newIndex, 0, layerOrderTmp.splice(oldIndex, 1)[0])
      this.sortedLayers = layerOrderTmp
      const configuration = cloneDeep(this.configuration)
      configuration.layers = this.sortedLayers
      this._updateConfiguration(configuration)
    },
    getUpdatedLayers () {
      this.loaded = false
      this.sortedRenderingLayers = []
      const options = {}
      options.version = this.configuration.version
      options.withCredentials = this.configuration.withCredentials || false
      testServiceConnection(this.configuration.filePath, SERVICE_TYPE.WMTS, options).then(result => {
        if (!isNil(result.serviceInfo)) {
          this.wmtsInfo = result.serviceInfo.wmtsInfo
          this.sortedRenderingLayers = (result.serviceInfo.serviceLayers || []).map(serviceLayer => {
            const sourceLayer = this.configuration.layers.find(l => l.name === serviceLayer.title)
            const { tileMatrixSet } = WMTSLayer.getLayerTileMatrixInfo(result.serviceInfo.wmtsInfo, serviceLayer)
            return {
              name: serviceLayer.title,
              enabled: sourceLayer != null ? sourceLayer.enabled : false,
              version: serviceLayer.version,
              extent: serviceLayer.extent,
              srs: tileMatrixSet.supportedCRS,
              tileMatrixSets: serviceLayer.tileMatrixSets,
              identifier: serviceLayer.identifier,
              resource: serviceLayer.resource,
              style: serviceLayer.style
            }
          }).sort((a, b) => {
            return this.configuration.layers.findIndex(l => l.name === a.name) - this.configuration.layers.findIndex(l => l.name === b.name)
          })
          this.loaded = true
          const configuration = cloneDeep(this.configuration)
          configuration.layers = this.sortedRenderingLayers
          configuration.wmtsInfo = this.wmtsInfo
          configuration.error = undefined
          if (this.project.sources[configuration.id] != null) {
            this._updateConfiguration(configuration)
          }
        } else if (result.error) {
          this.loaded = true
          this.setError(result.error)
          // window.mapcache.setSourceError({id: this.configuration.id, error: result.error})
          this.sortedRenderingLayers = this.configuration.layers.slice()
        }
      })
    },
  },
  mounted () {
    this.getUpdatedLayers()
    this.errored = this.configuration.error != null
  },
  watch: {
    error: {
      handler () {
        if (this.error == null && this.errored) {
          this.getUpdatedLayers()
        }
        this.errored = this.error != null
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.skeleton:deep(.v-skeleton-loader__list-item-two-line) {
  background: rgb(var(--v-theme-detailbg)) !important;
  background-color: rgb(var(--v-theme-detailbg)) !important;
}
</style>
