<template>
  <v-text-field v-model="numberValue" type="number" :label="label" @input="updateFromInput" :step="step" :min="min" :max="max"></v-text-field>
</template>

<script>
  import _ from 'lodash'

  export default {
    props: {
      number: Number,
      label: String,
      step: Number,
      min: Number,
      max: Number
    },
    data () {
      return {
        numberValue: this.number || 250
      }
    },
    methods: {
      setNumber (number) {
        if (!_.isNil(this.min)) {
          if (this.numberValue < this.min) {
            this.numberValue = this.min
          }
        } else if (!_.isNil(this.max)) {
          if (this.numberValue > this.max) {
            this.numberValue = this.max
          }
        } else {
          this.numberValue = number
        }
      },
      updateFromInput () {
        this.setNumber(this.numberValue)
      }
    },
    watch: {
      numberValue (val) {
        if (val) {
          this.$emit('input', val)
        }
      }
    }
  }
</script>

<style scoped>
</style>
