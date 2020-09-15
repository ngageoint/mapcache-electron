<template>
  <v-card :class="expandedEmphasis && expanded ? 'mb-4 pa-2 card' : 'pa-2 card'" :elevation="expandedEmphasis && expanded ? 6 : 2">
    <v-container :class="allowExpand ? 'pa-0 ma-0 clickable' : 'pa-0 ma-0'" @click.stop="toggle()">
      <v-row no-gutters justify="center">
        <v-col v-if="allowExpand" align-self="center" justify="center" cols="1" class="clickable pl-1" @click.stop="toggle()">
          <font-awesome-icon :icon="(expanded ? 'chevron-up' : 'chevron-down')" class="expand-collapse" size="lg"/>
        </v-col>
        <v-col cols="11" :offset="allowExpand ? 0 : 1">
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
      onExpandCollapse: Function,
      allowExpand: {
        type: Boolean,
        default: true
      },
      expandedEmphasis: {
        type: Boolean,
        default: false
      }
    },
    data () {
      return {
        expanded: this.initiallyExpanded || false
      }
    },
    methods: {
      toggle () {
        if (this.allowExpand) {
          this.expanded = !this.expanded
          if (this.onExpandCollapse) {
            this.onExpandCollapse()
          }
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
  }
  .flex-row {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .expand-collapse {
    color: darkgray;
    margin-right: 8px;
  }
  .expand-collapse:hover {
    color: black;
  }
</style>
