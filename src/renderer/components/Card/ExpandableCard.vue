<template>
  <v-card class="pa-2 card">
    <v-container class="pa-0 ma-0 clickable" @click.stop="toggle()">
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
      <div v-show="expanded">
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
      onExpandCollapse: Function
    },
    data () {
      return {
        expanded: this.initiallyExpanded || false
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
    }
  }
</script>

<style scoped>
  .card {
    background-color: white;
    min-height: 3rem;
    margin-top: 8px;
    margin-bottom: 8px;
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
