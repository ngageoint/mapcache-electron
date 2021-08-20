<template>
  <v-list two-line subheader>
    <v-subheader>Tile background color</v-subheader>
    <v-list-item class="pt-2">
      <v-row no-gutters>
        <v-col cols="12">
          <color-picker :color="backgroundColor" v-model="backgroundColor" label="Tile background" />
        </v-col>
      </v-row>
    </v-list-item>
  </v-list>
</template>

<script>
import isNil from 'lodash/isNil'
import debounce from 'lodash/debounce'
import ColorPicker from '../ColorPicker'

export default {
    components: {
      ColorPicker
    },
    created () {
      this.debounceBackgroundValue = debounce((value) => {
        if (!isNil(value)) {
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
