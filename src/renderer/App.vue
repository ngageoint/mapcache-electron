<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
  export default {
    name: 'MapCache'
  }
</script>

<style>

#app {
  background:
    radial-gradient(
      ellipse at bottom right,
    rgba(22, 117, 170, .5) 5%,
    rgba(0, 0, 0, 0.87) 100%
  ), url("./assets/nasa_earth.png") bottom right no-repeat;
  background-size: cover;

}
</style>
