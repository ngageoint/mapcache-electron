<template>
  <v-sheet>
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title><b class="ml-2">{{displayName}}</b> Style Editor</v-toolbar-title>
    </v-toolbar>
    <v-card>
      <v-card-text>
        <v-list two-line subheader>
          <v-subheader>Transparency</v-subheader>
          <v-list-item class="pt-2">
            <v-list-item-content style="max-width: 100px; padding-right: 0px; padding-top: 0; padding-bottom: 0;">
              Opacity
            </v-list-item-content>
            <v-slider class="mx-auto" thumb-label="always" hide-details dense v-model="opacity" :min="0" :max="100" :interval="1">
              <template v-slot:thumb-label="{ value }">
                {{ value / 100.0 }}
              </template>
            </v-slider>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-sheet>
</template>

<script>
  import _ from 'lodash'
  import ActionUtilities from '../../lib/ActionUtilities'

  export default {
    created () {
      this.debounceLayerField = _.debounce((value, key) => {
        if (!_.isNil(value)) {
          let updatedLayer = Object.assign({}, this.source)
          updatedLayer[key] = value
          ActionUtilities.setDataSource({
            projectId: this.projectId,
            source: updatedLayer
          })
        }
      }, 250)
    },
    props: {
      source: Object,
      projectId: String,
      back: Function
    },
    computed: {
      displayName () {
        return this.source.displayName ? this.source.displayName : this.source.name
      },
      opacity: {
        get () {
          return (this.source.opacity === null || this.source.opacity === undefined ? 1.0 : this.source.opacity) * 100.0
        },
        set (value) {
          this.debounceLayerField(Number(value) / 100.0, 'opacity')
        }
      }
    },
    methods: {
      zoomToExtent (extent) {
        this.setProjectExtents({projectId: this.projectId, extents: extent})
        this.$emit('zoom-to', extent)
      }
    }
  }
</script>

<style scoped>
</style>
