<template>
  <v-app id="app">
    <v-content>
      <router-view></router-view>
    </v-content>
  </v-app>
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

html {
  overflow: hidden;
}
</style>
