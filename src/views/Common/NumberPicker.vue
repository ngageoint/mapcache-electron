<template>
  <v-form v-on:submit.prevent v-model="valid" style="width: 100%">
    <v-text-field :hint="hint" :rules="rules" :autofocus="autofocus" v-model="numberValue" type="number" :label="label" :step="step" :min="min" :max="max" @keydown="handleKeyDown($event)"/>
  </v-form>
</template>

<script>
  export default {
    props: {
      number: Number,
      label: String,
      step: Number,
      min: Number,
      max: Number,
      autofocus: {
        type: Boolean,
        default: false
      },
      hint: String
    },
    data () {
      return {
        numberValue: this.number.toString(),
        valid: true
      }
    },
    computed: {
      rules () {
        const rules = [v => (v !== null && v !== undefined && v.toString().length > 0) || 'value is required']
        if (this.min !== null && this.min !== undefined) {
          rules.push(v => Number(v) >= this.min || 'value may not be less than ' + this.min)
        }
        if (this.max !== null && this.max !== undefined) {
          rules.push(v => Number(v) <= this.max || 'value may not be more than ' + this.max)
        }
        return rules
      }
    },
    methods: {
      handleKeyDown: (e) => {
        if (e.keyCode === 69) {
          e.stopPropagation()
          e.preventDefault()
          return false
        }
      },
      isValid () {
        return this.valid
      }
    },
    watch: {
      numberValue: {
        handler (val) {
          let updatedNumber = Number(val)
          this.$emit('update-number', updatedNumber)
        }
      },
      number: {
        handler (val) {
          this.numberValue = Number(val)
        }
      },
      valid: {
        handler (val) {
          this.$emit('update-valid', val)
        }
      }
    }
  }
</script>

<style scoped>
</style>
