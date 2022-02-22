<template>
  <v-card tile flat>
    <v-row no-gutters v-if="title">
      <h4 class="detail--text" v-html="title"></h4>
    </v-row>
    <v-row no-gutters class="mt-2 mb-2" v-if="divider">
      <v-divider/>
    </v-row>
    <v-row no-gutters v-if="paragraph">
      <p class="detail--text" v-html="paragraph"></p>
    </v-row>
    <tip v-if="note" :tip="note" class="mt-2 mb-2"/>
    <v-row no-gutters v-if="image">
      <p>
        <v-img :src="image" width="560"></v-img>
      </p>
    </v-row>
    <v-row no-gutters v-if="video">
      <video controls width="560" controlsList="nodownload nofullscreen noremoteplayback" muted disablepictureinpicture>
        <source :src="video"
                type="video/webm">

        Sorry, your browser doesn't support embedded videos.
      </video>
    </v-row>
  </v-card>
</template>

<script>
import Tip from './Tip'

export default {
  components: {Tip},
  props: {
    title: String,
    note: String,
    paragraph: String,
    divider: Boolean,
    image: String,
    video: String
  }
}
</script>

<style scoped>
video:focus { outline:none; }
</style>
