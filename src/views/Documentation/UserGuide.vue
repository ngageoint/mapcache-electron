<template>
  <v-sheet class="overflow-hidden">
    <v-card>
      <v-toolbar
          src="/images/documentation/toolbar.jpg"
          dark
          flat
          height="164"
      >
        <v-toolbar-title>
          <v-row no-gutters class="justify-center pt-4" align="center" style="width: 100vw;">
            <h1>MapCache User Guide</h1>
          </v-row>
        </v-toolbar-title>

        <v-spacer></v-spacer>

        <template v-slot:extension>
          <v-tabs
              v-model="tab"
              centered
          >
            <v-tabs-slider color="#45ced7"></v-tabs-slider>

            <v-tab
                v-for="item in items"
                :key="item"
                @click="() => forceUpdate()"
            >
              {{ item }}
            </v-tab>
          </v-tabs>
        </template>
      </v-toolbar>

      <v-tabs-items id="tab-items" v-model="tab" class="overflow-y-auto" style="height: calc(100vh - 208px)">
        <v-tab-item
            v-for="item in items"
            :key="item"
        >
          <v-row no-gutters class="justify-center" align="center">
            <getting-started v-if="tab === 0" :key="key"/>
            <using-map-cache ref="using" v-else-if="tab === 1" :key="key"/>
            <settings ref="settings" v-else-if="tab === 2" :key="key"/>
            <frequently-asked-questions v-else-if="tab === 3" :key="key"/>
          </v-row>
        </v-tab-item>
      </v-tabs-items>
    </v-card>
  </v-sheet>
</template>

<script>

import GettingStarted from './UserGuide/GettingStarted'
import UsingMapCache from './UserGuide/UsingMapCache'
import Settings from './UserGuide/Settings'
import FrequentlyAskedQuestions from './UserGuide/FrequentlyAskedQuestions'

export default {
  components: {FrequentlyAskedQuestions, Settings, GettingStarted, UsingMapCache},
  data () {
    return {
      tab: null,
      key: 0,
      items: [
        'Getting started', 'Using MapCache', 'Settings', 'FAQ',
      ]
    }
  },
  methods: {
    forceUpdate () {
      this.key++
    },
    scrollToElement (version) {
      const el = this.$refs[version][0]
      if (el) {
        el.scrollIntoView({behavior: 'smooth'})
      }
    }
  }
}
</script>

<style scoped>
</style>
