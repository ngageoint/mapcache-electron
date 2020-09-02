<template>
  <v-card class="pa-2 card">
    <v-container class="pa-0 ma-0 clickable">
      <v-row no-gutters>
        <v-col align-self="center" cols="1" class="clickable pl-1" @click.stop="toggle()">
          <font-awesome-icon :icon="(expanded ? 'chevron-up' : 'chevron-down')" class="expand-collapse" size="lg"/>
        </v-col>
        <v-col cols="11">
          <slot name="card-header">
            default collapsed card
          </slot>
        </v-col>
      </v-row>
    </v-container>
    <transition-expand>
      <div v-show="currentlyExpanded">
        <slot name="card-expanded-body">
          default expanded card
        </slot>
      </div>
    </transition-expand>
  </v-card>
</template>

<script>
  import TransitionExpand from './TransitionExpand'
  export default {
    props: {
      initiallyExpanded: Boolean,
      onExpandCollapse: Function,
      currentlyExpanded: String
    },
    data () {
      return {
        // expanded: this.initiallyExpanded || false
        expanded: this.currentlyExpanded || false
      }
    },
    methods: {
      toggle () {
        this.expanded = !this.expanded
        if (this.onExpandCollapse) {
          this.onExpandCollapse()
        }
      }
    },
    components: {
      TransitionExpand
    },
    watch: {
      // Watching for collapse call from the collapse all function in Project.vue
      currentlyExpanded: function () {
        this.expanded = !this.expanded
      }
    }
  }
</script>

<style scoped>
  .card {
    background-color: white;
    min-height: 3rem;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .clickable:hover {
    cursor: pointer;
  }
  .expand-collapse {
    color: darkgray;
    margin-right: 8px;
  }
  .expand-collapse:hover {
    color: black;
  }
</style>
