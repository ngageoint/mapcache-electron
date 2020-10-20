<template>
  <div>
    <div class="app-title-block">
      <img class="gp-img" src="~@/assets/256x256.png">
      <h4>MapCache</h4>
      <p>
        Version: <strong id="mapcache-version">{{version}}</strong>
      </p>
    </div>

    <div class="divider"></div>
    <div v-for="item in sidebarItems">
      <button class="sidebar-item" @click="open(item.link)">
        <img class="sidebar-item-img" :src="item.image"/>

        <div class="sidebar-item-info">
          <div class="sidebar-item-title">
            {{item.title}}
          </div>

          <div class="sidebar-item-detail">
            {{item.description}}
          </div>
        </div>
      </button>

      <div class="divider"></div>
    </div>

  </div>
</template>

<script>
  import { remote } from 'electron'

  const app = remote.app

  const sidebarItems = [{
    title: 'What is a GeoPackage?',
    description: 'Visit geopackage.org to learn more',
    link: 'http://www.geopackage.org',
    image: require('../../assets/geopackage-2.png')
  }, {
    title: 'NGA GeoPackage Libraries',
    description: 'Learn about the GeoPackage libraries develoepd by NGA',
    link: 'http://ngageoint.github.io/GeoPackage/',
    image: require('../../assets/nga.png')
  }, {
    title: 'EventKit',
    description: 'Import GeoPackage files created with EventKit',
    link: 'https://eventkit.gs.mil/',
    image: require('../../assets/eventkit.png')
  }]

  export default {
    data () {
      return {
        electron: process.versions.electron,
        name: this.$route.name,
        node: process.versions.node,
        path: this.$route.path,
        platform: require('os').platform(),
        version: app.getVersion(),
        vue: require('vue/package.json').version,
        sidebarItems
      }
    },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      }
    }
  }
</script>

<style scoped>

  .app-title-block {
    color: rgba(255, 255, 255, .87);
    margin-bottom: 2em;
  }

  .title {
    color: #888;
    font-size: 18px;
    font-weight: initial;
    letter-spacing: .25px;
    margin-top: 1em;
  }

  .items { margin-top: 8px; }

  .item {
    display: flex;
    margin-bottom: 1em;
  }

  .item .name {
    color: #6a6a6a;
    margin-right: 6px;
  }

  .item .value {
    color: #35495e;
    font-weight: bold;
  }

  .gp-img {
    width: 200px;
  }

  .divider {
    width: 150px;
    height: 2px;
    float: right;
    background-color: #192F43;
    opacity: .07;
    margin-bottom: 10px;
  }

  .sidebar-item {
    display: flex;
    flex-direction: row;
    width: 100%;
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .sidebar-item-img {
    width: 50px;
    align-self: center;
  }

  .sidebar-item-info {
    flex: 1;
    text-align: left;
    padding-left: 2em;
  }

  button {
    font-size: .8em;
    cursor: pointer;
    outline: none;
    padding: 0.75em 2em;
    border-radius: 1em;
    display: inline-block;
    color: rgba(255, 255, 255, .87);
    background-color: #192F43;
    transition: all 0.15s ease;
    box-sizing: border-box;
    border: 1px solid #192F43;
  }

  button:hover {
    background-color: #326482;
  }

  button.alt {
    color: rgb(22, 117, 170);
    background-color: transparent;
  }
</style>
