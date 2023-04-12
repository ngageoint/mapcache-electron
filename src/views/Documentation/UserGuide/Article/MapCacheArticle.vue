<template>
  <div>
    <v-card v-if="loaded" flat style="width: 640px;">
      <v-container>
        <v-row no-gutters justify="space-between" align="center" class="pb-4">
          <v-card-title class="pa-0 ma-0" v-html="article.title"></v-card-title>
          <v-btn variant="flat" v-if="back != null" icon="mdi-close" @click="back"/>
        </v-row>
        <v-row no-gutters v-if="article.introduction">
          <p class="detail--text" v-html="article.introduction"></p>
        </v-row>
        <tip v-if="article.note" :tip="article.note" class="mt-2 mb-4"/>
        <div v-for="(section, index) of article.sections" :key="index" class="mb-4">
          <article-section :title="section.title" :note="section.note" :paragraph="section.paragraph"
                           :divider="section.divider" :image="section.image" :video="section.video"></article-section>
          <v-row no-gutters v-if="section.tabItems">
            <v-tabs
                style="width: 100vw;"
                v-model="tabs[index]"
                align-tabs="center"
            >
              <v-tab
                  color="#45ced7"
                  v-for="item in section.tabItems"
                  :key="item.title"
              >
                {{ item.title }}
              </v-tab>
            </v-tabs>
            <v-window v-model="tabs[index]"
                          :style="{width: 640 + 'px', height: (section.tabHeight ? section.tabHeight : 164) + 'px'}">
              <v-window-item
                  v-for="(item, itemIndex) in section.tabItems"
                  :key="itemIndex"
              >
                <p class="detail--text mt-4" v-html="item.paragraph"></p>
                <article-section v-if="item.section" :title="item.section.title" :note="item.section.note"
                                 :paragraph="item.section.paragraph" :divider="item.section.divider"
                                 :image="item.section.image" :video="item.section.video"></article-section>
              </v-window-item>
            </v-window>
          </v-row>
        </div>
      </v-container>
      <v-card-actions v-if="nextArticleTitle != null" class="mb-8">
        <v-spacer/>
        Next article:&nbsp;<span class="clickable fake-link" style="color: #326482" @click="nextArticle"
                                 v-html="nextArticleTitle"></span>
      </v-card-actions>
    </v-card>
    <article-skeleton v-if="!loaded"></article-skeleton>
  </div>
</template>

<script>
import { mdiClose } from '@mdi/js'
import Tip from './Tip.vue'
import ArticleSection from './ArticleSection.vue'
import ArticleSkeleton from './ArticleSkeleton.vue'

export default {
  components: { ArticleSkeleton, ArticleSection, Tip },
  props: {
    article: Object,
    nextArticleTitle: String,
    nextArticle: Function,
    back: Function
  },
  data () {
    return {
      mdiClose,
      tabs: [null, null, null, null, null, null, null, null, null],
      loaded: false
    }
  },
  mounted () {
    document.getElementById('scroll-target').scrollTo({ left: 0, top: 0 })
    this.loaded = true
  },
  watch: {
    article: {
      handler () {
        this.loaded = false
        document.getElementById('scroll-target').scrollTo({ left: 0, top: 0 })
        setTimeout(() => {
          this.loaded = true
        }, 0)
      }
    }
  }
}
</script>

<style scoped>
video:focus {
  outline: none;
}
</style>
