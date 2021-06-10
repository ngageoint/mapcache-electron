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
import MapcacheWelcome from './MapcacheWelcome'
import Projects from './Projects'

export default {
    name: 'landing-page',
    components: {
      MapcacheWelcome,
      Projects
    }
  }
</script>

<style>
  #wrapper {
    background:
      radial-gradient(
        ellipse at bottom right,
        rgba(30, 77, 124, .5) 5%,
        rgba(0, 0, 0, 0.87) 100%
      ), url("../../assets/nasa_earth.png") bottom right no-repeat;
    background-size: cover;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: Roboto, sans-serif;
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
    display: inline-block;
    margin: 2em;
    text-align: center;
    width: 350px;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .work-area {
    position: absolute;
    top: 0;
    left: 410px;
    width: 350px;
    height: 100vh;
    flex: 1;
    margin-top: 2em;
    margin-bottom: 2em;
    margin-right: 2em;
  }
</style>
