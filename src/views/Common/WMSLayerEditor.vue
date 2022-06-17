<template>
  <v-card flat tile v-if="configuration.layerType === 'WMS'" class="ma-0 pa-0 detail-bg">
    <v-row no-gutters>
      <v-col>
        <p :style="{fontSize: '16px', fontWeight: '500', marginBottom: '0px'}">
          Layers
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
          id="sortable-list"
          dense
          class="detail-bg"
          v-sortable-list="{onEnd:updateSortedLayerOrder}">
        <v-list-item
            :disabled="errored"
            v-for="(item) in sortedLayers"
            class="sortable-list-item"
            :key="item.name">
          <v-list-item-icon class="sortHandle"
                            style="vertical-align: middle !important; align-self: center !important;">
            <v-icon :disabled="errored">{{ mdiDragHorizontalVariant }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <div v-if="item.title">
              <div class="list-item-title no-clamp" v-text="item.title"></div>
            </div>
            <div v-if="item.subtitles && item.subtitles.length > 0">
              <div class="list-item-subtitle no-clamp" v-for="(title, i) in item.subtitles"
                   :key="i + 'service-layer-title'" v-text="title"></div>
            </div>
          </v-list-item-content>
          <v-list-item-action>
            <v-switch :disabled="errored" :input-value="item.enabled" color="primary"
                      @change="() => toggleLayer(item)"></v-switch>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-text class="ma-0 pa-0 detail-bg" v-else>
      <v-skeleton-loader
          v-for="i in configuration.layers.length || 3"
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
import { mdiDragHorizontalVariant } from '@mdi/js'
import { SERVICE_TYPE } from '../../lib/network/HttpUtilities'
import { testServiceConnection } from '../../lib/network/ServiceConnectionUtils'
import Sortable from 'sortablejs'
import cloneDeep from 'lodash/cloneDeep'
import WMSLayer from '../../lib/layer/tile/WMSLayer'

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
    setError: Function
  },
  directives: {
    'sortable-list': {
      inserted: (el, binding) => {
        Sortable.create(el, binding.value ? {
          ...binding.value,
          dragClass: 'detail-bg',
          handle: '.sortHandle',
          ghostClass: 'ghost',
          forceFallback: true,
          onChoose: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onStart: function () {
            document.body.style.cursor = 'grabbing'
          }, // Dragging started
          onUnchoose: function () {
            document.body.style.cursor = 'default'
          }, // Dragging started
        } : {})
      },
    },
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
    sourceError: {
      get () {
        return this.configuration.error != null
      }
    }
  },
  data () {
    return {
      mdiDragHorizontalVariant,
      sortedRenderingLayers: [],
      loaded: false,
      errored: false
    }
  },
  methods: {
    _updateConfiguration (configuration) {
      this.updateConfiguration(configuration)
    },
    toggleLayer (item) {
      const configuration = cloneDeep(this.configuration)
      item.enabled = !item.enabled
      configuration.layers = this.sortedLayers
      configuration.extent = WMSLayer.getExtentForLayers(this.sortedLayers)
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
      configuration.extent = WMSLayer.getExtentForLayers(configuration.layers)
      this._updateConfiguration(configuration)
    },
    getUpdatedLayers () {
      this.loaded = false
      this.sortedRenderingLayers = []
      const options = {}
      options.version = this.configuration.version
      testServiceConnection(this.configuration.filePath, SERVICE_TYPE.WMS, options).then(result => {
        if (!isNil(result.serviceInfo)) {
          this.sortedRenderingLayers = result.serviceInfo.serviceLayers.map(serviceLayer => {
            const sourceLayer = this.configuration.layers.find(l => l.name === serviceLayer.name)
            return {
              name: serviceLayer.name,
              title: serviceLayer.title,
              subtitles: serviceLayer.subtitles,
              enabled: sourceLayer != null ? sourceLayer.enabled : false,
              srs: serviceLayer.srs,
              version: serviceLayer.version,
              extent: serviceLayer.extent,
              supportedProjections: serviceLayer.supportedProjections
            }
          }).sort((a, b) => {
            return this.configuration.layers.findIndex(l => l.name === a.name) - this.configuration.layers.findIndex(l => l.name === b.name)
          })
          this.loaded = true
          const configuration = cloneDeep(this.configuration)
          configuration.layers = this.sortedRenderingLayers
          configuration.extent = WMSLayer.getExtentForLayers(configuration.layers)
          this._updateConfiguration(configuration)
        } else if (result.error) {
          this.loaded = true
          this.setError(result.error)
          this.sortedRenderingLayers = this.configuration.layers.slice()
        }
      })
    },
  },
  mounted () {
    this.getUpdatedLayers()
    this.errored = this.error != null
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
.skeleton >>> .v-skeleton-loader__list-item-two-line {
  background: var(--v-detailbg-base) !important;
  background-color: var(--v-detailbg-base) !important;
}
</style>
