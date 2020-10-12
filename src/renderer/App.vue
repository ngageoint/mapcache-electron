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
    created: function () {
      this.$vuetify.theme.themes.light.primary = '#326482'
      this.$vuetify.theme.themes.light.accent = '#37A5AC'
      this.$vuetify.theme.themes.light.secondary = '#089247'
      this.$vuetify.theme.themes.light.warning = '#FF1744'
      this.$vuetify.theme.themes.light.neutral = '#414042'
      this.$vuetify.theme.themes.dark.primary = '#414042'
      this.$vuetify.theme.themes.dark.primary = '#192F43'
      this.$vuetify.theme.themes.dark.accent = '#80C2D4'
      this.$vuetify.theme.themes.dark.secondary = '#76C043'
      this.$vuetify.theme.themes.dark.warning = '#FF8A80'
      this.$vuetify.theme.themes.dark.neutral = '#808285'
    }
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
