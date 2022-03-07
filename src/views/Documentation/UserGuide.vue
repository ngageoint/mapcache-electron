<template>
  <v-sheet class="overflow-hidden">
    <v-card flat tile>
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
      <v-card-text id="scroll-target" class="ma-0 pa-0 overflow-y-auto" style="height: calc(100vh - 212px)">
        <v-tabs-items v-model="tab">
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
            <v-row no-gutters>
              <v-btn
                  v-scroll:#scroll-target="onScroll"
                  v-show="fab"
                  fab
                  dark
                  fixed
                  bottom
                  right
                  color="primary"
                  @click="toTop"
              >
                <v-icon large>{{ mdiChevronUp }}</v-icon>
              </v-btn>
            </v-row>
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>
    </v-card>
  </v-sheet>
</template>

<script>

import GettingStarted from './UserGuide/GettingStarted'
import UsingMapCache from './UserGuide/UsingMapCache'
import Settings from './UserGuide/Settings'
import FrequentlyAskedQuestions from './UserGuide/FrequentlyAskedQuestions'
import {mdiChevronUp} from '@mdi/js'

export default {
  components: {FrequentlyAskedQuestions, Settings, GettingStarted, UsingMapCache},
  data () {
    return {
      mdiChevronUp,
      fab: false,
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
    onScroll (e) {
      if (typeof window === 'undefined') return
      const top = window.scrollY || e.target.scrollTop || 0
      this.fab = top > 20
    },
    toTop () {
      document.getElementById('scroll-target').scrollTo({top: 0, behavior: 'smooth'})
    }
  }
}
</script>

<style scoped>
</style>
