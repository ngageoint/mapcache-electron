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
  @import '~xel/themes/macos.css';

  @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body { font-family: 'Source Sans Pro', sans-serif; }

  #wrapper {
    background:
      radial-gradient(
        ellipse at top left,
        rgba(255, 255, 255, 1) 40%,
        rgba(229, 229, 229, .9) 100%
      );
    height: 100vh;
    width: 100vw;
  }

  main {
    display: flex;
    justify-content: space-between;
  }

  .welcome-sidebar {
    margin-left: 10px;
    text-align: center;
    width: 300px;
  }

  .work-area {
    flex: 1;
  }
</style>
