<template>
  <div>
    <div class="app-title-block">
      <img class="gp-img" src="/images/256x256.png" alt="GeoPackage Icon">
      <h4>MapCache</h4>
      <p>
        Version: <strong id="mapcache-version">{{ version }}</strong>
      </p>
    </div>

    <div class="divider"></div>
    <div v-for="item in sidebarItems" :key="item.id">
      <button v-if="item.link != null" class="sidebar-item" @click="open(item.link)">
        <img class="sidebar-item-img" :src="item.image" :alt="item.alt"/>

        <div class="sidebar-item-info">
          <div class="sidebar-item-title">
            {{ item.title }}
          </div>

          <div class="sidebar-item-detail">
            {{ item.description }}
          </div>
        </div>
      </button>

      <div class="divider"></div>
    </div>

  </div>
</template>

<script>
import { environment } from '../../../../lib/env/env'

const sidebarItems = [{
  title: 'What is a GeoPackage?',
  description: 'Visit geopackage.org to learn more',
  link: environment.geopackageUrl,
  image: 'images/geopackage-2.png',
  key: 'sidebar-item-0',
  alt: 'GeoPackage'
}, {
  title: 'NGA GeoPackage Libraries',
  description: 'Learn about the GeoPackage libraries developed by NGA',
  link: environment.geopackageLibrariesUrl,
  image: 'images/nga.png',
  key: 'sidebar-item-1',
  alt: 'NGA GeoPackage Libraries'
}, {
  title: 'EventKit',
  description: 'Import GeoPackage files created with EventKit',
  link: environment.eventkitUrl,
  image: 'images/eventkit.png',
  key: 'sidebar-item-2',
  alt: 'EventKit'
}, {
  title: 'Want to help make MapCache better?',
  description: 'Answer a few questions to help us know what to build next.',
  link: environment.surveyUrl,
  image: 'images/survey.png',
  key: 'sidebar-item-3',
  alt: 'Survey'
}]

export default {
  data () {
    return {
      version: window.mapcache.getAppVersion(),
      sidebarItems
    }
  },
  mounted () {
    if(this.$matomo){
      this.$matomo.trackEvent("App Launch", "Welcome Page");
    }
  },
  methods: {
    open (link) {
      window.mapcache.openExternal(link)
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

.items {
  margin-top: 8px;
}

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

button:disabled {
  background-color: #626c73;
  cursor: default !important;
}

button.alt {
  color: rgb(22, 117, 170);
  background-color: transparent;
}
</style>
