<template>
  <v-card class="card">
    <slot name="card">
      default card
    </slot>
  </v-card>
</template>

<style scoped>
  .card {
    background-color: white;
    padding: 8px;
    min-height: 3rem;
    margin-top: 8px;
    margin-bottom: 8px;
  }
</style>
