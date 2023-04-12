<template>
  <v-sheet class="overflow-hidden">
    <v-card flat rounded="0">
      <v-toolbar
          image="/images/documentation/toolbar.jpg"
          theme="dark"
          flat
          height="164"
      >
        <v-row no-gutters class="justify-center pt-4" align="center" style="width: 100vw;">
          <h1>MapCache User Guide</h1>
        </v-row>
        <v-spacer></v-spacer>
        <template v-slot:extension>
          <v-tabs
              style="width: 100vw;"
              v-model="tab"
              slider-color="#45ced7"
              align-tabs="center"
              align="center"
          >
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
      <v-card-text @scroll="onScroll" id="scroll-target" class="ma-0 pa-0 overflow-y-auto" style="height: calc(100vh - 212px)">
        <v-window v-model="tab">
          <v-window-item
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
                  class="fab-container"
                  v-show="fab"
                  theme="dark"
                  color="primary"
                  icon="mdi-chevron-up"
                  @click="toTop"
              />
            </v-row>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-sheet>
</template>

<script>

import GettingStarted from './UserGuide/GettingStarted.vue'
import UsingMapCache from './UserGuide/UsingMapCache.vue'
import Settings from './UserGuide/Settings.vue'
import FrequentlyAskedQuestions from './UserGuide/FrequentlyAskedQuestions.vue'
import { mdiChevronUp } from '@mdi/js'

export default {
  components: { FrequentlyAskedQuestions, Settings, GettingStarted, UsingMapCache },
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
    toTop (smooth = true) {
      document.getElementById('scroll-target').scrollTo({ left: 0, top: 0, behavior: smooth ? 'smooth' : 'auto' })
    }
  },
  mounted () {
    this.toTop(false)
    this.loaded = true
  },
  watch: {
    tab: {
      handler () {
        this.toTop(false)
      }
    }
  }
}
</script>

<style scoped>
.fab-container{
  position:fixed;
  bottom:24px;
  right:24px;
  cursor:pointer;
}
</style>
