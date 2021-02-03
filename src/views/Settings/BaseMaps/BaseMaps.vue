<template>
  <add-base-map v-if="addBaseMapDialog" :base-maps="baseMaps" :project="project" :close="() => {addBaseMapDialog = false}"></add-base-map>
  <base-map v-else-if="selectedBaseMap !== null && selectedBaseMap !== undefined" :project="project" :base-map="selectedBaseMap" :base-maps="baseMaps" :back="hideBaseMap"></base-map>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>Base Maps</v-toolbar-title>
    </v-toolbar>
    <v-sheet class="mapcache-sheet-content">
      <v-list class="pa-0">
        <template v-for="item in baseMapItems">
          <v-list-item :key="item.id + '-base-map'" @click="() => showBaseMap(item.id)">
            <v-list-item-icon class="mt-auto mb-auto">
              <v-btn
                icon
                color="whitesmoke"
                @click="(e) => item.zoomTo(e, project.id)"
              >
                <v-icon>mdi-map-outline</v-icon>
              </v-btn>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title :title="item.name" :style="{marginBottom: '0px'}" v-html="item.name" ></v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider :key="item.id + 'divider'"></v-divider>
        </template>
      </v-list>
    </v-sheet>
    <v-tooltip right :disabled="!project.showToolTips">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          fab
          class="fab-position"
          color="primary"
          @click.stop="addBaseMapDialog = true"
          v-bind="attrs"
          v-on="on">
          <img :style="{verticalAlign: 'middle'}" src="../../../assets/add-basemap.svg" width="24px" height="24px">
        </v-btn>
      </template>
      <span>Add base map</span>
    </v-tooltip>
  </v-sheet>
</template>

<script>
  import { mapState } from 'vuex'
  import _ from 'lodash'
  import AddBaseMap from './AddBaseMap'
  import ActionUtilities from '../../../lib/ActionUtilities'
  import BaseMap from './BaseMap'

  export default {
    components: {
      AddBaseMap,
      BaseMap
    },
    props: {
      project: Object,
      back: Function
    },
    computed: {
      ...mapState({
        baseMaps: state => {
          return state.BaseMaps.baseMaps || []
        },
        baseMapItems: state => {
          return (state.BaseMaps.baseMaps || []).map(baseMap => {
            return {
              id: baseMap.id,
              name: baseMap.name,
              readonly: baseMap.readonly,
              background: baseMap.background || '#ddd',
              zoomTo: function (e, projectId) {
                e.stopPropagation()
                e.preventDefault()
                const extent = baseMap.extent || [-180, -90, 180, 90]
                ActionUtilities.zoomToExtent({projectId, extent})
              }
            }
          })
        }
      })
    },
    data () {
      return {
        addBaseMapDialog: false,
        selectedBaseMap: null
      }
    },
    methods: {
      showBaseMap (baseMapId) {
        this.selectedBaseMap = this.baseMaps.find(baseMap => baseMap.id === baseMapId)
      },
      hideBaseMap () {
        this.selectedBaseMap = null
      }
    },
    watch: {
      baseMaps: {
        handler (newBaseMaps) {
          if (!_.isNil(this.selectedBaseMap)) {
            this.selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === this.selectedBaseMap.id)
          }
        }
      }
    }
  }
</script>

<style scoped>
</style>
