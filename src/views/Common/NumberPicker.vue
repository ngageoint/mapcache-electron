<template>
  <v-text-field v-model="numberValue" type="number" :label="label" :step="step" :min="min" :max="max" @keydown="handleKeyDown($event, arrowsOnly)"/>
</template>

<script>
  export default {
    props: {
      number: Number,
      label: String,
      step: Number,
      min: Number,
      max: Number,
      arrowsOnly: Boolean
    },
    data () {
      return {
        numberValue: this.number.toString()
      }
    },
    methods: {
      handleKeyDown: (e, arrowsOnly) => {
        if ((arrowsOnly && e.keyCode !== 38 && e.keyCode !== 40 && e.keyCode !== 9) || e.keyCode === 69) {
          e.stopPropagation()
          e.preventDefault()
          return false
        }
      }
    },
    watch: {
      numberValue: {
        handler (val) {
          let updatedNumber = Number(val)
          if (updatedNumber < this.min) {
            updatedNumber = this.min
            val = this.min.toString()
            this.numberValue = this.min.toString()
          } else if (updatedNumber > this.max) {
            updatedNumber = this.max
            val = this.max.toString()
            this.numberValue = this.max.toString()
          }
          this.$emit('update-number', updatedNumber)
        }
      },
      number: {
        handler (val) {
          this.numberValue = Number(val)
        }
      }
    }
  }
</script>

<style scoped>
</style>
