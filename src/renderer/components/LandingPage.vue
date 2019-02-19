<template>
  <div id="wrapper">
    <main>
      <div class="welcome-sidebar">
        <mapcache-welcome></mapcache-welcome>
      </div>

      <div class="work-area">
        <projects></projects>
      </div>
    </main>
  </div>
</template>

<script>
  import MapcacheWelcome from './LandingPage/MapcacheWelcome'
  import Projects from './LandingPage/Projects'

  console.log('process.execPath', process.execPath)

  export default {
    name: 'landing-page',
    components: { MapcacheWelcome, Projects },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      }
    }
  }
</script>

<style>

  @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Source Sans Pro', sans-serif;
    line-height: 1.6;
    font-size: 15px;
  }

  #wrapper {
    height: 100vh;
    width: 100vw;
  }

  main {
    display: flex;
    justify-content: space-between;
  }

  .welcome-sidebar {
    margin: 0 2em;
    padding-top: 2em;
    text-align: center;
    width: 300px;
    height: 100vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .work-area {
    flex: 1;
  }
</style>
