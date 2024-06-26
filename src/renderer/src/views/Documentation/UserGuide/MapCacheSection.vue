<template>
  <v-card flat class="ml-8 mt-8" style="width: 640px;">
    <map-cache-article v-if="selectedArticle != null" :article="selectedArticle" :back="() => selectedArticle = null"
                       :next-article-title="nextArticleTitle" :next-article="showNext"></map-cache-article>
    <v-container v-else>
      <v-row no-gutters>
        <v-col cols="12" v-for="(section, sectionIndex) of sections" :key="sectionIndex">
          <v-divider v-if="sectionIndex > 0 && !section.no_divider" class="mb-4"/>
          <v-card class="mt-0 pt-0" flat tile>
            <v-card-title class="ml-0 pl-0 mt-0 pt-0">
              <v-icon size="24px" v-if="section.icon" class="mr-2" :color="section.color" :icon="section.icon"/>
              <v-avatar rounded="0" v-if="section.image" class="mr-2" size="22px">
                <v-img
                    :src="section.image"
                    alt="John"
                ></v-img>
              </v-avatar>
              <span>{{ section.title }}</span>
            </v-card-title>
            <v-card-text class="ml-1">
              <v-row justify="space-between">
                <v-col class="pa-2" cols="6" v-for="(article, articleIndex) of section.articles" :order="article.order"
                       :key="articleIndex">
                  <li class="clickable fake-link ma-0 pa-0 link-color fs-11" v-html="article.title"
                      @click="() => showArticle(sectionIndex, articleIndex)"></li>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import MapCacheArticle from './Article/MapCacheArticle.vue'

export default {
  components: { MapCacheArticle },
  methods: {
    showArticle (sectionIdx, articleIdx) {
      this.selectedSectionIndex = sectionIdx
      this.selectedArticle = this.sections[sectionIdx].articles[articleIdx]
      if (this.sections[sectionIdx].articles.length > (articleIdx + 1)) {
        this.nextArticleIndex = articleIdx + 1
        this.nextArticleTitle = this.sections[sectionIdx].articles[articleIdx + 1].title
      } else {
        if (this.sections.length > (sectionIdx + 1)) {
          this.selectedSectionIndex = sectionIdx + 1
          this.nextArticleIndex = 0
          this.nextArticleTitle = this.sections[sectionIdx + 1].articles[0].title
        } else {
          this.nextArticleIndex = -1
          this.nextArticleTitle = null
        }
      }
    },
    showNext () {
      this.showArticle(this.selectedSectionIndex, this.nextArticleIndex)
    }
  },
  props: {
    sections: Array
  },
  data () {
    return {
      selectedArticle: null,
      selectedSectionIndex: -1,
      nextArticleIndex: -1,
      nextArticleTitle: null,
    }
  }
}
</script>

<style scoped>
.fs-11 {
  font-size: 11pt;
}

.link-color {
  color: #326482;
}

.link-color:active {
  color: #37A5AC;
}
</style>