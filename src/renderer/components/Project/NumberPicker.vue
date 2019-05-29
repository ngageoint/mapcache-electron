<template>
  <div class="number-picker" ref="numberpicker">
    <div>
      <input type="number" class="text-box"  v-model="numberValue" @input="updateFromInput" step=".1"/>
    </div>
  </div>
</template>

<script>
  export default {
    props: ['number'],
    data () {
      return {
        numberValue: 0.0
      }
    },
    mounted () {
      this.setNumber(this.number || 0.0)
    },
    methods: {
      setNumber (number) {
        this.numberValue = number
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
  .text-box {
      height: 32px;
      font-size: 15px;
  }
</style>
