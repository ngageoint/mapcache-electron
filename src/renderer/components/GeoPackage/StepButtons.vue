<template>
  <div class="step-buttons" :class="{top: top, bottom: bottom}">
    <div v-if="!back" class="step-button back"/>
    <a v-if="back" class="step-button back" @click.stop="back()">
      <font-awesome-icon icon="arrow-circle-left" size="lg"/>
      {{backText || 'Back'}}
    </a>
    <div class="step-indicators">
      <template v-for="n in steps">
        <font-awesome-icon v-if="n !== step" style="vertical-align: middle;" icon="circle"/>
        <font-awesome-icon v-if="n === step" class="current-step" style="vertical-align: middle; margin-right: 2px;" icon="circle" size="lg"/>
      </template>
    </div>
    <div v-if="!next" class="step-button next"/>
    <a v-if="next" class="step-button next" @click.stop="next()">
      {{nextText || 'Next'}}
      <font-awesome-icon icon="arrow-circle-right" size="lg"/>
    </a>
  </div>
</template>

<script>
  export default {
    props: {
      top: Boolean,
      bottom: Boolean,
      step: Number,
      steps: Number,
      next: Function,
      back: Function,
      nextText: String,
      backText: String
    }
  }
</script>

<style scoped>
  .step-buttons {
    width: 100%;
    display: flex;
    flex-flow: row;
    justify-content: center;
  }

  .step-buttons.top {
    padding-bottom: 1em;
  }

  .step-buttons.bottom {
    padding-top: 1em;
  }

  .step-indicators {
    font-size: .5em;
    line-height: 28px;
    flex-grow: 1;
    text-align: center;
  }

  .step-button {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
    font-size: 1.2em;
    font-weight: bold;
    width: 40%;
  }

  .step-button.back {
    text-align: left;
  }

  .step-button.next {
    text-align: right;
  }

  .current-step {
    color: rgba(68, 152, 192, .95);
  }
</style>
