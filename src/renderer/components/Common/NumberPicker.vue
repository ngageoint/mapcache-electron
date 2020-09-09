<template>
  <v-text-field v-model="numberValue" type="number" :label="label" :step="step" :min="min" :max="max" @keypress="handleKeyPress($event, arrowsOnly)"/>
</template>

<script>
  export default {
    props: {
      number: Number,
      label: String,
      step: Number,
      min: Number,
      max: Number,
      arrowsOnly: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      numberValue: {
        get () {
          return this.number
        },
        set (val) {
          if (val) {
            let updatedNumber = Number(val)
            if (updatedNumber < this.min) {
              updatedNumber = this.min
            } else if (updatedNumber > this.max) {
              updatedNumber = this.max
            }
            this.$emit('update-number', updatedNumber)
          }
        }
      }
    },
    methods: {
      handleKeyPress: (evt, arrowsOnly) => {
        if (arrowsOnly) {
          evt.preventDefault()
          evt.stopPropagation()
        }
      }
    }
  }
</script>

<style scoped>
</style>
