<template>
  <v-card>
    <v-card-title>
      <v-icon color="warning" class="pr-2">{{ icon ? icon : mdiInformation }}</v-icon>
      {{ title }}
    </v-card-title>
    <v-card-text>
      {{ message }}
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          variant="text"
          @click="onNo">
        No
      </v-btn>
      <v-btn
          color="primary"
          variant="text"
          @click="onYes">
        Yes
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import EventBus from '../../../../lib/vue/EventBus'

export default {
  props: {
    id: String,
    title: String,
    icon: String,
    message: String,
    close: Function
  },
  methods: {
    onYes () {
      EventBus.$emit(EventBus.EventTypes.CONFIRMATION_MESSAGE_RESPONSE(this.id), true)
      this.close()
    },
    onNo () {
      EventBus.$emit(EventBus.EventTypes.CONFIRMATION_MESSAGE_RESPONSE(this.id), false)
      this.close()
    }
  }
}
</script>

<style scoped>
</style>
