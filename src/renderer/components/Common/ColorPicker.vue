<template>
  <div class="color-picker" ref="colorpicker">
    <div class="input-add-on">
      <input type="text" class="input-add-on-field text-box" v-model="colorValue" @focus="showPicker()" @input="updateFromInput" />
      <span class="input-add-on-item current-color" :style="'background-color: ' + colorValue" @click="togglePicker()"></span>
    </div>
    <span class="color-picker-container">
      <chrome-picker :value="colors" @input="updateFromPicker" v-if="displayPicker" />
    </span>
  </div>
</template>

<script>
  import { Chrome } from 'vue-color'

  export default {
    props: ['color'],
    components: {
      'chrome-picker': Chrome
    },
    data () {
      return {
        colors: {
          hex: '#000000'
        },
        colorValue: '',
        displayPicker: false
      }
    },
    mounted () {
      this.setColor(this.color || '#000000')
    },
    methods: {
      setColor (color) {
        this.updateColors(color)
        this.colorValue = color
      },
      updateColors (color) {
        if (color.slice(0, 1) === '#') {
          this.colors = {
            hex: color
          }
        } else if (color.slice(0, 4) === 'rgba') {
          const rgba = color.replace(/^rgba?\(|\s+|\)$/g, '').split(',')
          const hex = '#' + ((1 << 24) + (parseInt(rgba[0]) << 16) + (parseInt(rgba[1]) << 8) + parseInt(rgba[2])).toString(16).slice(1)
          this.colors = {
            hex: hex,
            a: rgba[3]
          }
        }
      },
      showPicker () {
        document.addEventListener('click', this.documentClick)
        this.displayPicker = true
      },
      hidePicker () {
        document.removeEventListener('click', this.documentClick)
        this.displayPicker = false
      },
      togglePicker () {
        this.displayPicker ? this.hidePicker() : this.showPicker()
      },
      updateFromInput () {
        this.updateColors(this.colorValue)
      },
      updateFromPicker (color) {
        this.colors = color
        if (color.rgba.a === 1) {
          this.colorValue = color.hex
        } else {
          this.colorValue = 'rgba(' + color.rgba.r + ', ' + color.rgba.g + ', ' + color.rgba.b + ', ' + color.rgba.a + ')'
        }
      },
      documentClick (e) {
        const el = this.$refs.colorpicker
        const target = e.target
        if (el !== target && !el.contains(target)) {
          this.hidePicker()
        }
      }
    },
    watch: {
      colorValue (val) {
        if (val) {
          this.updateColors(val)
          this.$emit('input', val)
        }
      }
    }
  }
</script>

<style scoped>
  .current-color {
    display: inline-block;
    width: 32px;
    height: 32px;
    background-color: #000;
    cursor: pointer;
  }
  .text-box {
      height: 32px;
      font-size: 15px;
  }
  .input-add-on {
      display: flex;
      margin-bottom: .5em;
  }
  .input-add-on-field {
      flex: 1;
      /* field styles */
  }
  .input-add-on-item {
      /* item styles */
  }
  .input-add-on-field:not(:first-child) {
      border-left: 0;
  }
  .input-add-on-field:not(:last-child) {
      border-right: 0;
  }
  .input-add-on-item {
      background-color: rgba(147, 128, 108, 0.1);
      color: #666666;
      font: inherit;
      font-weight: normal;
  }
  .input-add-on-field,
  .input-add-on-item {
      border: 1px solid rgba(147, 128, 108, 0.25);
      padding: 0.5em 0.75em;
  }
  .input-add-on-field:first-child,
  .input-add-on-item:first-child {
      border-radius: 2px 0 0 2px;
  }
  .input-add-on-field:last-child,
  .input-add-on-item:last-child {
      border-radius: 0 2px 2px 0;
  }

</style>
