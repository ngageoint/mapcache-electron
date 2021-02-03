<template>
  <v-sheet>
    <v-text-field
      :label="label"
      v-model="colorValue"
      readonly
    >
      <div slot="append">
        <v-menu v-model="menu" top nudge-bottom="105" nudge-left="16" :close-on-content-click="false">
          <template v-slot:activator="{ on }">
            <div class="themed-border" :style="swatchStyle" v-on="on"></div>
          </template>
          <v-card>
            <v-card-text class="pa-0">
              <v-color-picker v-model="colorValue" flat/>
            </v-card-text>
          </v-card>
        </v-menu>
      </div>
    </v-text-field>
  </v-sheet>
</template>

<script>
  export default {
    props: ['color', 'label'],
    data () {
      return {
        colorValue: this.color,
        menu: false
      }
    },
    mounted () {
      this.setColor(this.color || '#000000')
    },
    methods: {
      setColor (color) {
        this.colorValue = color
      }
    },
    computed: {
      swatchStyle () {
        const { colorValue, menu } = this
        return {
          backgroundColor: colorValue,
          cursor: 'pointer',
          height: '24px',
          width: '24px',
          borderRadius: menu ? '50%' : '4px',
          transition: 'border-radius 200ms ease-in-out'
        }
      }
    },
    watch: {
      colorValue (val) {
        if (val) {
          this.$emit('input', val)
        }
      }
    }
  }
</script>

<style scoped>
  .themed-border {
    border: 2px solid var(--v-scroll_track-base)
  }
</style>
