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
    rgb(22, 117, 170) 5%,
    rgba(0, 0, 0, 0.87) 100%
  );
}
</style>
