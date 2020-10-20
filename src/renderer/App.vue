<template>
  <v-app id="app" light>
    <v-main>
      <router-view></router-view>
    </v-main>
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
    rgba(30, 77, 124, .5) 5%,
    rgba(0, 0, 0, 0.87) 100%
  ), url("./assets/nasa_earth.png") bottom right no-repeat;
  background-size: cover;
}

html {
  overflow: hidden;
}
</style>
