<template>
  <v-app id="app" light>
    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
  export default {
    name: 'MapCache',
    mounted: function () {
      this.$vuetify.theme.themes.light.primary = '#3B779A'
      this.$vuetify.theme.themes.light.accent = '#73C1C5'
      this.$vuetify.theme.themes.light.warning = '#FF1744'
      this.$vuetify.theme.themes.dark.primary = '#113856'
      this.$vuetify.theme.themes.dark.accent = '#AEDBDD'
      this.$vuetify.theme.themes.dark.warning = '#FF8A80'
    }
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
