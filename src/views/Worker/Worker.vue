<template>
  <div/>
</template>

<script>
export default {
  name: 'worker-page',
  created: function () {
    window.mapcache.removeListeners()
    window.mapcache.addListeners()
    window.mapcache.sendReady()
  }
}
</script>
