<template>
  <v-list two-line subheader>
    <v-subheader>Tile Background Color</v-subheader>
    <v-list-item class="pt-2">
      <v-row no-gutters>
        <v-col cols="12">
          <color-picker :color="backgroundColor" v-model="backgroundColor" label="Tile Background" />
        </v-col>
      </v-row>
    </v-list-item>
  </v-list>
</template>

<script>
  import _ from 'lodash'
  import ColorPicker from '../ColorPicker'

  export default {
    components: {
      ColorPicker
    },
    created () {
      this.debounceBackgroundValue = _.debounce((value) => {
        if (!_.isNil(value)) {
          this.onBackgroundUpdated(value)
        }
      }, 250)
    },
    props: {
      backgroundValue: String,
      onBackgroundUpdated: Function,
    },
    computed: {
      backgroundColor: {
        get () {
          return this.backgroundValue || '#DDDDDD'
        },
        set (value) {
          this.debounceBackgroundValue(value)
        }
      }
    }
  }
</script>

<style scoped>
</style>
