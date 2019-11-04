<template>
  <div class="card">
    <div class="clickable" v-on:click="toggle()">
      <div class="flex-row">
        <div class="clickable" @click.stop="toggle()">
          <font-awesome-icon icon="chevron-down" class="expand-collapse" size="lg" v-if="!expanded"/>
          <font-awesome-icon icon="chevron-up" class="expand-collapse" size="lg" v-if="expanded"/>
        </div>
        <div class="full-width">
          <slot name="card-header">
            default collapsed card
          </slot>
        </div>
      </div>
    </div>
    <transition-expand>
      <div v-show="expanded">
        <slot name="card-expanded-body">
          default expanded card
        </slot>
      </div>
    </transition-expand>
  </div>
</template>

<script>
  import TransitionExpand from '../../TransitionExpand'
  export default {
    data () {
      return {
        expanded: false
      }
    },
    methods: {
      toggle () {
        this.expanded = !this.expanded
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
    padding: 0.5rem;
    border-radius: 0.25rem;
    min-height: 3rem;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
    margin: 0.25rem;
  }
  .full-width {
    width: 100%;
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
    margin-right: 0.5rem;
  }
  .expand-collapse:hover {
    color: black;
  }
</style>
